// Data Layer - Bank statement repository

const { getPool, sql } = require('./db');

class BankStatementRepository {
  async createStatement(statementData) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, statementData.schoolId)
      .input('fileName', sql.NVarChar, statementData.fileName)
      .input('statementDate', sql.Date, statementData.statementDate)
      .input('statementEndDate', sql.Date, statementData.statementEndDate || null)
      .input('rawData', sql.NVarChar(sql.MAX), statementData.rawData)
      .input('uploadedBy', sql.Int, statementData.uploadedBy || null)
      .input('totalRows', sql.Int, statementData.totalRows || 0)
      .input('rowsImported', sql.Int, statementData.rowsImported || 0)
      .input('rowsSkippedDuplicate', sql.Int, statementData.rowsSkippedDuplicate || 0)
      .input('rowsSkippedPending', sql.Int, statementData.rowsSkippedPending || 0)
      .query(`INSERT INTO BankStatements (SchoolID, FileName, StatementDate, StatementEndDate, RawData, UploadedBy, TotalRows, RowsImported, RowsSkippedDuplicate, RowsSkippedPending)
              OUTPUT INSERTED.*
              VALUES (@schoolId, @fileName, @statementDate, @statementEndDate, @rawData, @uploadedBy, @totalRows, @rowsImported, @rowsSkippedDuplicate, @rowsSkippedPending)`);
    return result.recordset[0];
  }

  async updateStatementCounts(statementId, counts) {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, statementId)
      .input('totalRows', sql.Int, counts.totalRows || 0)
      .input('rowsImported', sql.Int, counts.rowsImported || 0)
      .input('rowsSkippedDuplicate', sql.Int, counts.rowsSkippedDuplicate || 0)
      .input('rowsSkippedPending', sql.Int, counts.rowsSkippedPending || 0)
      .query(`UPDATE BankStatements SET TotalRows = @totalRows, RowsImported = @rowsImported,
              RowsSkippedDuplicate = @rowsSkippedDuplicate, RowsSkippedPending = @rowsSkippedPending,
              UpdatedDate = GETDATE() WHERE BankStatementID = @id`);
  }

  async getStatementsBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT bs.*,
                u.Email AS UploadedByEmail,
                (SELECT COUNT(*) FROM Transactions t WHERE t.BankStatementID = bs.BankStatementID) AS TransactionCount,
                (SELECT COUNT(*) FROM Transactions t WHERE t.BankStatementID = bs.BankStatementID AND t.AllocationStatus = 'Allocated') AS AllocatedCount,
                (SELECT COUNT(*) FROM Transactions t WHERE t.BankStatementID = bs.BankStatementID AND t.AllocationStatus = 'Unallocated') AS UnallocatedCount
              FROM BankStatements bs
              LEFT JOIN Users u ON bs.UploadedBy = u.UserID
              WHERE bs.SchoolID = @schoolId ORDER BY bs.CreatedDate DESC`);
    return result.recordset;
  }

  async getAllStatements() {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT bs.*,
                u.Email AS UploadedByEmail,
                (SELECT COUNT(*) FROM Transactions t WHERE t.BankStatementID = bs.BankStatementID) AS TransactionCount
              FROM BankStatements bs
              LEFT JOIN Users u ON bs.UploadedBy = u.UserID
              ORDER BY bs.CreatedDate DESC`);
    return result.recordset;
  }
}

module.exports = BankStatementRepository;
