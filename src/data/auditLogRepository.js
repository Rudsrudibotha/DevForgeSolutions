// Data Layer - Audit log repository

const { getPool, sql } = require('./db');

class AuditLogRepository {
  async log(entry) {
    try {
      const pool = await getPool();
      await pool.request()
        .input('userId', sql.Int, entry.userId || null)
        .input('schoolId', sql.Int, entry.schoolId || null)
        .input('entityName', sql.NVarChar, entry.entityName)
        .input('entityId', sql.NVarChar, String(entry.entityId))
        .input('action', sql.NVarChar, entry.action)
        .input('beforeValue', sql.NVarChar(sql.MAX), entry.before ? JSON.stringify(entry.before) : null)
        .input('afterValue', sql.NVarChar(sql.MAX), entry.after ? JSON.stringify(entry.after) : null)
        .input('ipAddress', sql.NVarChar, entry.ipAddress || null)
        .query(`INSERT INTO AuditLogs (UserID, SchoolID, EntityName, EntityID, Action, BeforeValue, AfterValue, IpAddress)
                VALUES (@userId, @schoolId, @entityName, @entityId, @action, @beforeValue, @afterValue, @ipAddress)`);
    } catch (err) {
      console.error('Audit log write failed:', err.message);
    }
  }

  async getByEntity(entityName, entityId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('entityName', sql.NVarChar, entityName)
      .input('entityId', sql.NVarChar, String(entityId))
      .query(`SELECT * FROM AuditLogs WHERE EntityName = @entityName AND EntityID = @entityId
              ORDER BY CreatedDate DESC`);
    return result.recordset;
  }

  async getBySchool(schoolId, page = 1, limit = 50, filters = {}) {
    const pool = await getPool();
    const offset = (page - 1) * limit;
    const req = pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset);
    const where = ['SchoolID = @schoolId'];
    this.applyFilters(req, where, filters);
    const result = await req
      .query(`SELECT al.*, u.Email, u.Username
              FROM AuditLogs al
              LEFT JOIN Users u ON al.UserID = u.UserID
              WHERE ${where.map((item) => item === 'SchoolID = @schoolId' ? 'al.SchoolID = @schoolId' : item).join(' AND ')}
              ORDER BY al.CreatedDate DESC
              OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
    return result.recordset;
  }

  async getAll(page = 1, limit = 50, filters = {}) {
    const pool = await getPool();
    const offset = (page - 1) * limit;
    const req = pool.request()
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset);
    const where = ['1 = 1'];
    this.applyFilters(req, where, filters);
    const result = await req
      .query(`SELECT al.*, u.Email, u.Username
              FROM AuditLogs al
              LEFT JOIN Users u ON al.UserID = u.UserID
              WHERE ${where.join(' AND ')}
              ORDER BY al.CreatedDate DESC
              OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
    return result.recordset;
  }

  applyFilters(req, where, filters = {}) {
    if (filters.entityName) {
      req.input('entityName', sql.NVarChar, filters.entityName);
      where.push('al.EntityName = @entityName');
    }

    if (filters.action) {
      req.input('action', sql.NVarChar, filters.action);
      where.push('al.Action = @action');
    }

    if (filters.fromDate) {
      req.input('fromDate', sql.DateTime, filters.fromDate);
      where.push('al.CreatedDate >= @fromDate');
    }

    if (filters.toDate) {
      req.input('toDate', sql.DateTime, filters.toDate);
      where.push('al.CreatedDate < @toDate');
    }

    if (filters.sensitiveFinance) {
      where.push(`(
        (al.EntityName = 'Receipt' AND al.Action IN ('Issue','Create'))
        OR (al.EntityName = 'Student' AND al.Action IN ('Update','PayerChanged'))
        OR (al.EntityName = 'BankStatement' AND al.Action = 'Upload')
        OR (al.EntityName = 'Transaction' AND al.Action IN ('AllocateDebtor','AllocateCreditor','Reallocate'))
        OR (al.EntityName = 'ReconciliationMatch' AND al.Action = 'Approve')
        OR (al.EntityName = 'Invoice' AND al.Action IN ('Update','Create','Delete'))
        OR (al.EntityName = 'Payslip' AND al.Action IN ('ViewSingle','Export','Finalize','Edit','Create'))
        OR (al.EntityName = 'FinancePeriodLock')
        OR (al.EntityName = 'StudentStatement')
        OR (al.EntityName = 'OutstandingFees')
      )`);
    }
  }
}

module.exports = AuditLogRepository;
