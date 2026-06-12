// Data Layer - Broadcast announcement, fault report, and AI request log
// repositories. Tasks 45-47, 57, 63.

const { getPool, sql } = require('./db');

class BroadcastAnnouncementRepository {
  async create({ tenantId, createdByUserId, broadcastType, messageBody, totalRecipients, status }) {
    const pool = await getPool();
    const result = await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .input('createdByUserId', sql.Int, createdByUserId)
      .input('broadcastType', sql.NVarChar, broadcastType || 'SchoolToParents')
      .input('messageBody', sql.NVarChar, messageBody)
      .input('totalRecipients', sql.Int, totalRecipients || 0)
      .input('status', sql.NVarChar, status || 'Pending')
      .query(`
        INSERT INTO dbo.BroadcastAnnouncements
          (TenantId, CreatedByUserId, BroadcastType, MessageBody, TotalRecipients, TotalDelivered, TotalFailed, Status, CreatedAt)
        OUTPUT INSERTED.BroadcastAnnouncementId
        VALUES (@tenantId, @createdByUserId, @broadcastType, @messageBody, @totalRecipients, 0, 0, @status, SYSUTCDATETIME())
      `);
    return result.recordset[0].BroadcastAnnouncementId;
  }

  async setCounts(id, totalDelivered, totalFailed, status) {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .input('totalDelivered', sql.Int, totalDelivered)
      .input('totalFailed', sql.Int, totalFailed)
      .input('status', sql.NVarChar, status)
      .query(`
        UPDATE dbo.BroadcastAnnouncements
        SET TotalDelivered = @totalDelivered, TotalFailed = @totalFailed, Status = @status, CompletedAt = CASE WHEN @status IN ('Completed', 'Failed') THEN SYSUTCDATETIME() ELSE CompletedAt END
        WHERE BroadcastAnnouncementId = @id
      `);
  }

  async list({ tenantId, status, page = 1, pageSize = 50 } = {}) {
    const pool = await getPool();
    const request = pool.request();
    const where = ['1 = 1'];
    if (tenantId) { request.input('tenantId', sql.Int, tenantId); where.push('TenantId = @tenantId'); }
    if (status) { request.input('status', sql.NVarChar, status); where.push('Status = @status'); }
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeSize = Math.min(200, Math.max(1, parseInt(pageSize, 10) || 50));
    request.input('offset', sql.Int, (safePage - 1) * safeSize);
    request.input('size', sql.Int, safeSize);
    const result = await request.query(`
      SELECT BroadcastAnnouncementId, TenantId, CreatedByUserId, BroadcastType, MessageBody, Status,
             TotalRecipients, TotalDelivered, TotalFailed, CreatedAt, CompletedAt
      FROM dbo.BroadcastAnnouncements
      WHERE ${where.join(' AND ')}
      ORDER BY CreatedAt DESC
      OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
    `);
    return result.recordset;
  }

  async getById(id, tenantId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('tenantId', sql.Int, tenantId)
      .query(`
        SELECT * FROM dbo.BroadcastAnnouncements
        WHERE BroadcastAnnouncementId = @id AND TenantId = @tenantId
      `);
    return result.recordset[0] || null;
  }
}

class BroadcastDeliveryRepository {
  async create({ broadcastAnnouncementId, tenantId, recipientUserId, recipientTenantId, conversationId, deliveryStatus }) {
    const pool = await getPool();
    const result = await pool.request()
      .input('broadcastAnnouncementId', sql.Int, broadcastAnnouncementId)
      .input('tenantId', sql.Int, tenantId)
      .input('recipientUserId', sql.Int, recipientUserId)
      .input('recipientTenantId', sql.Int, recipientTenantId)
      .input('conversationId', sql.Int, conversationId || null)
      .input('deliveryStatus', sql.NVarChar, deliveryStatus || 'Pending')
      .query(`
        INSERT INTO dbo.BroadcastDeliveries
          (BroadcastAnnouncementId, TenantId, RecipientUserId, RecipientTenantId, ConversationId, DeliveryStatus, AttemptCount, LastAttemptAt)
        OUTPUT INSERTED.BroadcastDeliveryId
        VALUES (@broadcastAnnouncementId, @tenantId, @recipientUserId, @recipientTenantId, @conversationId, @deliveryStatus, 0, NULL)
      `);
    return result.recordset[0].BroadcastDeliveryId;
  }

  async setStatus(id, status, errorMessage) {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .input('status', sql.NVarChar, status)
      .input('error', sql.NVarChar, errorMessage || null)
      .query(`
        UPDATE dbo.BroadcastDeliveries
        SET DeliveryStatus = @status,
            AttemptCount = AttemptCount + 1,
            LastAttemptAt = SYSUTCDATETIME(),
            DeliveredAt = CASE WHEN @status = 'Delivered' THEN SYSUTCDATETIME() ELSE DeliveredAt END,
            FailedAt = CASE WHEN @status = 'Failed' THEN SYSUTCDATETIME() ELSE FailedAt END,
            ErrorMessage = @error
        WHERE BroadcastDeliveryId = @id
      `);
  }

  // Returns pending or failed deliveries that should be retried.
  async listPending(broadcastAnnouncementId, { batchSize = 50 } = {}) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, broadcastAnnouncementId)
      .input('batchSize', sql.Int, batchSize)
      .query(`
        SELECT TOP (@batchSize) BroadcastDeliveryId, BroadcastAnnouncementId, TenantId, RecipientUserId, RecipientTenantId, ConversationId, DeliveryStatus, AttemptCount
        FROM dbo.BroadcastDeliveries
        WHERE BroadcastAnnouncementId = @id AND DeliveryStatus IN ('Pending', 'Failed') AND AttemptCount < 5
        ORDER BY BroadcastDeliveryId ASC
      `);
    return result.recordset;
  }

  async countByStatus(broadcastAnnouncementId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, broadcastAnnouncementId)
      .query(`
        SELECT DeliveryStatus, COUNT(*) AS Cnt
        FROM dbo.BroadcastDeliveries
        WHERE BroadcastAnnouncementId = @id
        GROUP BY DeliveryStatus
      `);
    const map = { Delivered: 0, Failed: 0, Pending: 0 };
    for (const r of result.recordset) map[r.DeliveryStatus] = r.Cnt;
    return map;
  }
}

// Writes to the single canonical dbo.FaultReports table (SchoolID /
// PagePath / ViewName / Remarks / Status) shared with the school "Report
// a fault" form and the DevForge review queue at /devforge/faults. The
// KCH chat fault modal's richer fields are folded in: screenName ->
// ViewName/PagePath, priority is prefixed onto Remarks.
class FaultReportRepository {
  async create({ schoolId, reportedByUserId, screenName, description, priority }) {
    const pool = await getPool();
    const remarks = (priority && priority !== 'Normal') ? `[${priority}] ${description}` : String(description || '');
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId || null)
      .input('userId', sql.Int, reportedByUserId || null)
      .input('pagePath', sql.NVarChar, String(screenName || '/sms').slice(0, 500))
      .input('viewName', sql.NVarChar, screenName ? String(screenName).slice(0, 120) : null)
      .input('remarks', sql.NVarChar, remarks.slice(0, 2000))
      .query(`
        INSERT INTO dbo.FaultReports (SchoolID, UserID, PagePath, ViewName, Remarks)
        OUTPUT INSERTED.FaultReportID
        VALUES (@schoolId, @userId, @pagePath, @viewName, @remarks)
      `);
    return result.recordset[0].FaultReportID;
  }
}

class AIRequestLogRepository {
  async write({ tenantId, schoolId, userId, dashboardType, aiRequestType, questionSummary, responseSummary, modelUsed, provider, requestStatus, responseTimeMs, blockedBySecurity }) {
    const pool = await getPool();
    await pool.request()
      .input('tenantId', sql.Int, tenantId || null)
      .input('schoolId', sql.Int, schoolId || null)
      .input('userId', sql.Int, userId || null)
      .input('dashboardType', sql.NVarChar, dashboardType || null)
      .input('aiRequestType', sql.NVarChar, aiRequestType || 'Chat')
      .input('questionSummary', sql.NVarChar, questionSummary || null)
      .input('responseSummary', sql.NVarChar, responseSummary || null)
      .input('modelUsed', sql.NVarChar, modelUsed || null)
      .input('provider', sql.NVarChar, provider || null)
      .input('requestStatus', sql.NVarChar, requestStatus || 'OK')
      .input('responseTimeMs', sql.Int, responseTimeMs || null)
      .input('blockedBySecurity', sql.Bit, blockedBySecurity ? 1 : 0)
      .query(`
        INSERT INTO dbo.AIRequestLogs
          (TenantId, SchoolId, UserId, DashboardType, AIRequestType, QuestionSummary, ResponseSummary, ModelUsed, Provider, RequestStatus, ResponseTimeMs, BlockedBySecurity, CreatedAt)
        VALUES (@tenantId, @schoolId, @userId, @dashboardType, @aiRequestType, @questionSummary, @responseSummary, @modelUsed, @provider, @requestStatus, @responseTimeMs, @blockedBySecurity, SYSUTCDATETIME())
      `);
  }

  async list({ tenantId, dashboardType, page = 1, pageSize = 50 } = {}) {
    const pool = await getPool();
    const request = pool.request();
    const where = ['1 = 1'];
    if (tenantId) { request.input('tenantId', sql.Int, tenantId); where.push('TenantId = @tenantId'); }
    if (dashboardType) { request.input('dashboardType', sql.NVarChar, dashboardType); where.push('DashboardType = @dashboardType'); }
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeSize = Math.min(200, Math.max(1, parseInt(pageSize, 10) || 50));
    request.input('offset', sql.Int, (safePage - 1) * safeSize);
    request.input('size', sql.Int, safeSize);
    const result = await request.query(`
      SELECT AIRequestLogId, TenantId, SchoolId, UserId, DashboardType, AIRequestType, QuestionSummary, ResponseSummary, ModelUsed, Provider, RequestStatus, ResponseTimeMs, BlockedBySecurity, CreatedAt
      FROM dbo.AIRequestLogs
      WHERE ${where.join(' AND ')}
      ORDER BY CreatedAt DESC
      OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
    `);
    return result.recordset;
  }
}

class BackgroundJobRepository {
  async create({ tenantId, jobType, payload, status }) {
    const pool = await getPool();
    const result = await pool.request()
      .input('tenantId', sql.Int, tenantId || null)
      .input('jobType', sql.NVarChar, jobType)
      .input('payload', sql.NVarChar, payload ? JSON.stringify(payload) : null)
      .input('status', sql.NVarChar, status || 'Pending')
      .query(`
        INSERT INTO dbo.BackgroundJobs (TenantId, JobType, Payload, Status, AttemptCount, CreatedAt)
        OUTPUT INSERTED.BackgroundJobId
        VALUES (@tenantId, @jobType, @payload, @status, 0, SYSUTCDATETIME())
      `);
    return result.recordset[0].BackgroundJobId;
  }

  async setStatus(id, status, errorMessage) {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .input('status', sql.NVarChar, status)
      .input('error', sql.NVarChar, errorMessage || null)
      .query(`
        UPDATE dbo.BackgroundJobs
        SET Status = @status, AttemptCount = AttemptCount + 1, LastAttemptAt = SYSUTCDATETIME(),
            CompletedAt = CASE WHEN @status IN ('Completed', 'Failed') THEN SYSUTCDATETIME() ELSE CompletedAt END,
            ErrorMessage = @error
        WHERE BackgroundJobId = @id
      `);
  }

  async listPending({ jobType, batchSize = 25 } = {}) {
    const pool = await getPool();
    const request = pool.request().input('batchSize', sql.Int, batchSize);
    let where = "Status = 'Pending'";
    if (jobType) { request.input('jobType', sql.NVarChar, jobType); where += ' AND JobType = @jobType'; }
    const result = await request.query(`
      SELECT TOP (@batchSize) BackgroundJobId, TenantId, JobType, Payload, Status, AttemptCount
      FROM dbo.BackgroundJobs
      WHERE ${where}
      ORDER BY BackgroundJobId ASC
    `);
    return result.recordset;
  }
}

module.exports = {
  BroadcastAnnouncementRepository,
  BroadcastDeliveryRepository,
  FaultReportRepository,
  AIRequestLogRepository,
  BackgroundJobRepository
};
