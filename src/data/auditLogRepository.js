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

  async getBySchool(schoolId, page = 1, limit = 50) {
    const pool = await getPool();
    const offset = (page - 1) * limit;
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)
      .query(`SELECT * FROM AuditLogs WHERE SchoolID = @schoolId
              ORDER BY CreatedDate DESC
              OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
    return result.recordset;
  }

  async getAll(page = 1, limit = 50) {
    const pool = await getPool();
    const offset = (page - 1) * limit;
    const result = await pool.request()
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)
      .query(`SELECT * FROM AuditLogs
              ORDER BY CreatedDate DESC
              OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
    return result.recordset;
  }
}

module.exports = AuditLogRepository;
