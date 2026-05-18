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

  async findOverlappingStatement(schoolId, statementDate, statementEndDate) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('statementDate', sql.Date, statementDate)
      .input('statementEndDate', sql.Date, statementEndDate)
      .query(`SELECT TOP 1 *
              FROM BankStatements
              WHERE SchoolID = @schoolId
                AND StatementDate IS NOT NULL
                AND StatementEndDate IS NOT NULL
                AND StatementDate <= @statementEndDate
                AND StatementEndDate >= @statementDate
              ORDER BY StatementDate DESC`);
    return result.recordset[0] || null;
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

  async getStatementsBySchool(schoolId, options = {}) {
    const pool = await getPool();
    const req = pool.request().input('schoolId', sql.Int, schoolId);
    let where = 'WHERE bs.SchoolID = @schoolId';

    if (options.fromDate) {
      req.input('fromDate', sql.Date, options.fromDate);
      where += ' AND COALESCE(bs.StatementEndDate, bs.StatementDate) >= @fromDate';
    }

    if (options.toDate) {
      req.input('toDate', sql.Date, options.toDate);
      where += ' AND COALESCE(bs.StatementEndDate, bs.StatementDate) < @toDate';
    }

    const result = await req.query(`SELECT bs.*,
                u.Email AS UploadedByEmail,
                (SELECT COUNT(*) FROM Transactions t WHERE t.BankStatementID = bs.BankStatementID AND t.SchoolID = bs.SchoolID) AS TransactionCount,
                (SELECT COUNT(*) FROM Transactions t WHERE t.BankStatementID = bs.BankStatementID AND t.SchoolID = bs.SchoolID AND t.AllocationStatus = 'Allocated') AS AllocatedCount,
                (SELECT COUNT(*) FROM Transactions t WHERE t.BankStatementID = bs.BankStatementID AND t.SchoolID = bs.SchoolID AND t.AllocationStatus = 'Unallocated') AS UnallocatedCount
              FROM BankStatements bs
              LEFT JOIN Users u ON bs.UploadedBy = u.UserID
              ${where}
              ORDER BY COALESCE(bs.StatementEndDate, bs.StatementDate) DESC, bs.CreatedDate DESC`);
    return result.recordset;
  }

  async getAllStatements(options = {}) {
    const pool = await getPool();
    const req = pool.request();
    let where = 'WHERE 1 = 1';

    if (options.schoolId) {
      req.input('schoolId', sql.Int, options.schoolId);
      where += ' AND bs.SchoolID = @schoolId';
    }

    if (options.fromDate) {
      req.input('fromDate', sql.Date, options.fromDate);
      where += ' AND COALESCE(bs.StatementEndDate, bs.StatementDate) >= @fromDate';
    }

    if (options.toDate) {
      req.input('toDate', sql.Date, options.toDate);
      where += ' AND COALESCE(bs.StatementEndDate, bs.StatementDate) < @toDate';
    }

    const result = await req.query(`SELECT bs.*,
                u.Email AS UploadedByEmail,
                (SELECT COUNT(*) FROM Transactions t WHERE t.BankStatementID = bs.BankStatementID AND t.SchoolID = bs.SchoolID) AS TransactionCount,
                (SELECT COUNT(*) FROM Transactions t WHERE t.BankStatementID = bs.BankStatementID AND t.SchoolID = bs.SchoolID AND t.AllocationStatus = 'Allocated') AS AllocatedCount,
                (SELECT COUNT(*) FROM Transactions t WHERE t.BankStatementID = bs.BankStatementID AND t.SchoolID = bs.SchoolID AND t.AllocationStatus = 'Unallocated') AS UnallocatedCount
              FROM BankStatements bs
              LEFT JOIN Users u ON bs.UploadedBy = u.UserID
              ${where}
              ORDER BY COALESCE(bs.StatementEndDate, bs.StatementDate) DESC, bs.CreatedDate DESC`);
    return result.recordset;
  }

  async getStatementById(statementId, schoolId = null) {
    const pool = await getPool();
    const req = pool.request()
      .input('statementId', sql.Int, statementId);
    let where = 'WHERE bs.BankStatementID = @statementId';

    if (schoolId) {
      req.input('schoolId', sql.Int, schoolId);
      where += ' AND bs.SchoolID = @schoolId';
    }

    const result = await req.query(`SELECT bs.*,
                u.Email AS UploadedByEmail,
                (SELECT COUNT(*) FROM Transactions t WHERE t.BankStatementID = bs.BankStatementID AND t.SchoolID = bs.SchoolID) AS TransactionCount,
                (SELECT COUNT(*) FROM Transactions t WHERE t.BankStatementID = bs.BankStatementID AND t.SchoolID = bs.SchoolID AND t.AllocationStatus = 'Allocated') AS AllocatedCount,
                (SELECT COUNT(*) FROM Transactions t WHERE t.BankStatementID = bs.BankStatementID AND t.SchoolID = bs.SchoolID AND t.AllocationStatus = 'Unallocated') AS UnallocatedCount
              FROM BankStatements bs
              LEFT JOIN Users u ON bs.UploadedBy = u.UserID
              ${where}`);
    return result.recordset[0] || null;
  }
}

module.exports = BankStatementRepository;
