// Data Layer - Bank statement repository

const { getPool, sql } = require('./db');

class BankStatementRepository {
  async createStatement(statementData) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, statementData.schoolId)
      .input('fileName', sql.NVarChar, statementData.fileName)
      .input('statementDate', sql.Date, statementData.statementDate)
      .input('rawData', sql.NVarChar(sql.MAX), statementData.rawData)
      .query(`INSERT INTO BankStatements (SchoolID, FileName, StatementDate, RawData)
              OUTPUT INSERTED.*
              VALUES (@schoolId, @fileName, @statementDate, @rawData)`);
    return result.recordset[0];
  }

  async getStatementsBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT * FROM BankStatements WHERE SchoolID = @schoolId ORDER BY CreatedDate DESC`);
    return result.recordset;
  }

  async getAllStatements() {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT * FROM BankStatements ORDER BY CreatedDate DESC`);
    return result.recordset;
  }
}

module.exports = BankStatementRepository;
