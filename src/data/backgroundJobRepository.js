// Background job service with distributed locking.
//
// Replaces the in-process schedulers that ran auto-invoicing and
// overdue flagging. Jobs are persisted in dbo.BackgroundJobs and
// claimed with an SQL Server application lock (sp_getapplock) so
// horizontal scale and redeploys are safe.
//
// Lifecycle:
//   Pending   - row exists, no worker has claimed it
//   Running   - a worker has sp_getapplock on the row
//   Done      - finished successfully
//   Failed    - max attempts exceeded (or marked unrecoverable)
//
// API:
//   enqueue({ jobType, tenantId?, schoolId?, period?, runAt?, payload? })
//       -> Promise<{ jobId }>
//
//   claimNext({ jobType, workerId, lockMs? })
//       -> Promise<job | null>
//
//   markDone({ jobId })
//   markFailed({ jobId, error, requeueDelayMs? })
//   sweepStaleLocks({ staleMs })
//
// The HTTP layer never calls this directly. The job worker loop in
// src/app.js (or a separate worker process) calls claimNext -> handler
// -> markDone/markFailed.

const os = require('os');
const { getPool } = require('./db');

const JOB_STATUS_PENDING = 'Pending';
const JOB_STATUS_RUNNING = 'Running';
const JOB_STATUS_DONE = 'Done';
const JOB_STATUS_FAILED = 'Failed';

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_LOCK_MS = 5 * 60 * 1000;

function defaultWorkerId() {
  return `worker-${process.pid}-${os.hostname()}`;
}

async function enqueue({ jobType, tenantId = null, schoolId = null, period = null, runAt = null, payload = null, maxAttempts = DEFAULT_MAX_ATTEMPTS }) {
  if (!jobType) throw new Error('enqueue: jobType is required');
  const pool = await getPool();
  const request = pool.request();
  request.input('JobType', jobType);
  request.input('TenantId', tenantId);
  request.input('SchoolId', schoolId);
  request.input('Period', period || null);
  request.input('RunAt', runAt || new Date());
  request.input('MaxAttempts', maxAttempts);
  request.input('Payload', payload ? JSON.stringify(payload) : null);
  const result = await request.query(`
    INSERT INTO dbo.BackgroundJobs
      (JobType, TenantId, SchoolId, Period, Status, ScheduledAt, MaxAttempts, Payload, CreatedAt)
    OUTPUT inserted.BackgroundJobId
    VALUES
      (@JobType, @TenantId, @SchoolId, @Period, 'Pending', @RunAt, @MaxAttempts, @Payload, SYSUTCDATETIME())
  `);
  return { jobId: result.recordset[0].BackgroundJobId };
}

async function claimNext({ jobType, workerId = defaultWorkerId(), lockMs = DEFAULT_LOCK_MS }) {
  const pool = await getPool();
  const request = pool.request();
  request.input('JobType', jobType);
  request.input('WorkerId', workerId);
  request.input('LockMs', lockMs);
  const result = await request.query(`
    DECLARE @jobId INT = NULL;
    DECLARE @lockResult INT;

    BEGIN TRAN;
      SELECT TOP 1 @jobId = BackgroundJobId
      FROM dbo.BackgroundJobs WITH (ROWLOCK, UPDLOCK, READPAST)
      WHERE JobType = @JobType
        AND Status = 'Pending'
        AND (RunAt IS NULL OR RunAt <= SYSUTCDATETIME())
      ORDER BY ScheduledAt ASC;

      IF @jobId IS NOT NULL
      BEGIN
        EXEC @lockResult = sp_getapplock
          @Resource = N'BackgroundJob:' + CAST(@jobId AS NVARCHAR(20)),
          @LockMode = 'Exclusive',
          @LockTimeout = 1000;

        IF @lockResult >= 0
        BEGIN
          UPDATE dbo.BackgroundJobs
            SET Status = 'Running',
                LockedBy = @WorkerId,
                LockedUntil = DATEADD(MILLISECOND, @LockMs, SYSUTCDATETIME()),
                StartedAt = SYSUTCDATETIME(),
                Attempts = Attempts + 1
          WHERE BackgroundJobId = @jobId;

          SELECT @jobId AS BackgroundJobId;
        END
        ELSE
        BEGIN
          SET @jobId = NULL;
        END
      END
    COMMIT;

    IF @jobId IS NULL
      SELECT NULL AS BackgroundJobId WHERE 1 = 0;
  `);
  const row = result.recordset && result.recordset[0];
  if (!row || row.BackgroundJobId == null) return null;
  return await findById(row.BackgroundJobId);
}

async function findById(jobId) {
  const pool = await getPool();
  const r = await pool.request().input('JobId', jobId).query(`
    SELECT BackgroundJobId AS jobId, JobType AS jobType, TenantId AS tenantId,
           SchoolId AS schoolId, Period AS period, Status AS status,
           LockedBy AS lockedBy, LockedUntil AS lockedUntil,
           Attempts AS attempts, MaxAttempts AS maxAttempts,
           LastError AS lastError, Payload AS payloadRaw,
           ScheduledAt AS scheduledAt, StartedAt AS startedAt,
           FinishedAt AS finishedAt
    FROM dbo.BackgroundJobs
    WHERE BackgroundJobId = @JobId
  `);
  if (!r.recordset.length) return null;
  const row = r.recordset[0];
  if (row.payloadRaw) {
    try { row.payload = JSON.parse(row.payloadRaw); } catch (_) { row.payload = null; }
  }
  delete row.payloadRaw;
  return row;
}

async function markDone({ jobId }) {
  const pool = await getPool();
  await pool.request().input('JobId', jobId).query(`
    UPDATE dbo.BackgroundJobs
      SET Status = 'Done',
          FinishedAt = SYSUTCDATETIME(),
          LockedBy = NULL,
          LockedUntil = NULL,
          LastError = NULL
    WHERE BackgroundJobId = @JobId;

    EXEC sp_releaseapplock
      @Resource = N'BackgroundJob:' + CAST(@JobId AS NVARCHAR(20));
  `);
}

async function markFailed({ jobId, error, requeueDelayMs = null }) {
  const pool = await getPool();
  const r = await pool.request()
    .input('JobId', jobId)
    .input('Error', String(error && error.message ? error.message : error))
    .input('RequeueDelayMs', requeueDelayMs || 0)
    .query(`
      DECLARE @attempts INT;
      DECLARE @max INT;
      SELECT @attempts = Attempts, @max = MaxAttempts
      FROM dbo.BackgroundJobs
      WHERE BackgroundJobId = @JobId;

      IF @attempts >= @max
      BEGIN
        UPDATE dbo.BackgroundJobs
          SET Status = 'Failed',
              FinishedAt = SYSUTCDATETIME(),
              LockedBy = NULL,
              LockedUntil = NULL,
              LastError = @Error
        WHERE BackgroundJobId = @JobId;
      END
      ELSE
      BEGIN
        UPDATE dbo.BackgroundJobs
          SET Status = 'Pending',
              LockedBy = NULL,
              LockedUntil = NULL,
              LastError = @Error,
              RunAt = CASE WHEN @RequeueDelayMs > 0
                           THEN DATEADD(MILLISECOND, @RequeueDelayMs, SYSUTCDATETIME())
                           ELSE SYSUTCDATETIME() END
        WHERE BackgroundJobId = @JobId;
      END

      EXEC sp_releaseapplock
        @Resource = N'BackgroundJob:' + CAST(@JobId AS NVARCHAR(20));
    `);
  return r.rowsAffected && r.rowsAffected[0] === 1;
}

async function sweepStaleLocks({ staleMs = DEFAULT_LOCK_MS } = {}) {
  const pool = await getPool();
  await pool.request().input('StaleMs', staleMs).query(`
    UPDATE dbo.BackgroundJobs
      SET Status = 'Pending',
          LockedBy = NULL,
          LockedUntil = NULL,
          LastError = COALESCE(LastError, '') + ' [swept: lock expired]'
    WHERE Status = 'Running'
      AND LockedUntil IS NOT NULL
      AND LockedUntil < DATEADD(MILLISECOND, -@StaleMs, SYSUTCDATETIME())
  `);
}

function startWorkerLoop({ jobType, handler, intervalMs = 5000, workerId = defaultWorkerId(), lockMs = DEFAULT_LOCK_MS }) {
  let stopped = false;
  let timer = null;
  let running = false;

  async function tick() {
    if (stopped || running) return;
    running = true;
    try {
      await sweepStaleLocks({ staleMs: lockMs });
      const job = await claimNext({ jobType, workerId, lockMs });
      if (!job) return;
      try {
        await handler(job);
        await markDone({ jobId: job.jobId });
      } catch (err) {
        console.error(`[bg-job:${jobType}] handler error:`, err.message);
        await markFailed({
          jobId: job.jobId,
          error: err,
          requeueDelayMs: 60 * 1000
        });
      }
    } catch (err) {
      console.error(`[bg-job:${jobType}] tick error:`, err.message);
    } finally {
      running = false;
    }
  }

  function schedule() {
    if (stopped) return;
    timer = setTimeout(async () => {
      await tick();
      schedule();
    }, intervalMs);
  }

  schedule();
  return {
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
    tick
  };
}

module.exports = {
  JOB_STATUS_PENDING,
  JOB_STATUS_RUNNING,
  JOB_STATUS_DONE,
  JOB_STATUS_FAILED,
  enqueue,
  claimNext,
  markDone,
  markFailed,
  sweepStaleLocks,
  findById,
  startWorkerLoop,
  defaultWorkerId
};
