const { getPool, sql } = require('./db');

class FinancePeriodLockRepository {
  async getBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT l.*, lockedBy.Email AS LockedByEmail, reopenedBy.Email AS ReopenedByEmail
              FROM FinancePeriodLocks l
              LEFT JOIN Users lockedBy ON l.LockedBy = lockedBy.UserID
              LEFT JOIN Users reopenedBy ON l.ReopenedBy = reopenedBy.UserID
              WHERE l.SchoolID = @schoolId
              ORDER BY l.PeriodStart DESC, l.FinancePeriodLockID DESC`);
    return result.recordset;
  }

  async getById(id, schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT * FROM FinancePeriodLocks
              WHERE FinancePeriodLockID = @id AND SchoolID = @schoolId`);
    return result.recordset[0] || null;
  }

  async findActiveLockForDate(schoolId, dateValue) {
    if (!schoolId || !dateValue) return null;
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('dateValue', sql.Date, this.dateOnly(dateValue))
      .query(`SELECT TOP 1 *
              FROM FinancePeriodLocks
              WHERE SchoolID = @schoolId
                AND Status = 'Locked'
                AND @dateValue >= PeriodStart
                AND @dateValue <= PeriodEnd
              ORDER BY PeriodStart DESC`);
    return result.recordset[0] || null;
  }

  async findActiveLockForRange(schoolId, startDate, endDate) {
    if (!schoolId || !startDate || !endDate) return null;
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('startDate', sql.Date, this.dateOnly(startDate))
      .input('endDate', sql.Date, this.dateOnly(endDate))
      .query(`SELECT TOP 1 *
              FROM FinancePeriodLocks
              WHERE SchoolID = @schoolId
                AND Status = 'Locked'
                AND PeriodStart <= @endDate
                AND PeriodEnd >= @startDate
              ORDER BY PeriodStart DESC`);
    return result.recordset[0] || null;
  }

  async create(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId)
      .input('periodStart', sql.Date, data.periodStart)
      .input('periodEnd', sql.Date, data.periodEnd)
      .input('lockType', sql.NVarChar, data.lockType || 'Month')
      .input('reason', sql.NVarChar, data.reason)
      .input('lockedBy', sql.Int, data.lockedBy || null)
      .query(`IF EXISTS (
                SELECT 1
                FROM FinancePeriodLocks
                WHERE SchoolID = @schoolId
                  AND Status = 'Locked'
                  AND PeriodStart <= @periodEnd
                  AND PeriodEnd >= @periodStart
              )
                THROW 50000, 'A locked finance period already overlaps these dates', 1;

              INSERT INTO FinancePeriodLocks (SchoolID, PeriodStart, PeriodEnd, LockType, Status, Reason, LockedBy, LockedDate)
              OUTPUT INSERTED.*
              VALUES (@schoolId, @periodStart, @periodEnd, @lockType, 'Locked', @reason, @lockedBy, GETDATE())`);
    return result.recordset[0];
  }

  async reopen(id, schoolId, reason, reopenedBy) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('schoolId', sql.Int, schoolId)
      .input('reason', sql.NVarChar, reason)
      .input('reopenedBy', sql.Int, reopenedBy || null)
      .query(`UPDATE FinancePeriodLocks
              SET Status = 'Reopened for Correction',
                  ReopenedBy = @reopenedBy,
                  ReopenedDate = GETDATE(),
                  ReopenReason = @reason,
                  UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE FinancePeriodLockID = @id
                AND SchoolID = @schoolId
                AND Status = 'Locked'`);
    return result.recordset[0] || null;
  }

  async assertOpenForDate(schoolId, dateValue, actionLabel = 'This finance action') {
    const lock = await this.findActiveLockForDate(schoolId, dateValue);
    if (lock) {
      throw new Error(`${actionLabel} is blocked because ${this.dateOnly(dateValue)} falls in a locked finance period (${this.dateOnly(lock.PeriodStart)} to ${this.dateOnly(lock.PeriodEnd)}). Reopen the period for correction first.`);
    }
  }

  async assertOpenForRange(schoolId, startDate, endDate, actionLabel = 'This finance action') {
    const lock = await this.findActiveLockForRange(schoolId, startDate, endDate);
    if (lock) {
      throw new Error(`${actionLabel} is blocked because the date range overlaps a locked finance period (${this.dateOnly(lock.PeriodStart)} to ${this.dateOnly(lock.PeriodEnd)}). Reopen the period for correction first.`);
    }
  }

  dateOnly(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }
    return String(value || '').slice(0, 10);
  }
}

module.exports = FinancePeriodLockRepository;
