const { getPool, sql } = require('./db');

function optionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const cleaned = String(value).trim();
  return cleaned || null;
}

class FaultReportRepository {
  async create(report) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, report.schoolId)
      .input('userId', sql.Int, report.userId || null)
      .input('pagePath', sql.NVarChar, report.pagePath)
      .input('viewName', sql.NVarChar, optionalString(report.viewName))
      .input('remarks', sql.NVarChar, report.remarks)
      .input('userAgent', sql.NVarChar, optionalString(report.userAgent))
      .query(`INSERT INTO FaultReports (SchoolID, UserID, PagePath, ViewName, Remarks, UserAgent)
              OUTPUT INSERTED.*
              VALUES (@schoolId, @userId, @pagePath, @viewName, @remarks, @userAgent)`);

    return result.recordset[0];
  }

  async getAll(filters = {}) {
    const pool = await getPool();
    const limit = Number.isInteger(filters.limit) && filters.limit > 0 ? Math.min(filters.limit, 200) : 100;
    const offset = Number.isInteger(filters.offset) && filters.offset >= 0 ? filters.offset : 0;
    const request = pool.request()
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset);
    const where = ['1 = 1'];

    if (filters.status) {
      request.input('status', sql.NVarChar, filters.status);
      where.push('fr.Status = @status');
    }

    if (filters.schoolId) {
      request.input('schoolId', sql.Int, filters.schoolId);
      where.push('fr.SchoolID = @schoolId');
    }

    const result = await request.query(`SELECT fr.*, s.SchoolName, s.ContactPerson, s.ContactEmail,
                u.Username, u.Email, ru.Username AS ResolvedByUsername, ru.Email AS ResolvedByEmail
              FROM FaultReports fr
              LEFT JOIN Schools s ON fr.SchoolID = s.SchoolID
              LEFT JOIN Users u ON fr.UserID = u.UserID
              LEFT JOIN Users ru ON fr.ResolvedBy = ru.UserID
              WHERE ${where.join(' AND ')}
              ORDER BY fr.CreatedDate DESC
              OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);

    return result.recordset;
  }

  async updateStatus(id, status, adminUserId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('status', sql.NVarChar, status)
      .input('adminUserId', sql.Int, adminUserId || null)
      .query(`UPDATE FaultReports
              SET Status = @status,
                  UpdatedDate = GETDATE(),
                  ResolvedDate = CASE WHEN @status IN ('Resolved', 'Closed') THEN COALESCE(ResolvedDate, GETDATE()) ELSE NULL END,
                  ResolvedBy = CASE WHEN @status IN ('Resolved', 'Closed') THEN @adminUserId ELSE NULL END
              OUTPUT INSERTED.*
              WHERE FaultReportID = @id`);

    return result.recordset[0];
  }
}

module.exports = FaultReportRepository;
