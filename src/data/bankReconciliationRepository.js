// Data Layer - Bank reconciliation statement + import + transaction repositories.

const { getPool, sql } = require('./db');
const crypto = require('crypto');

function normalizeRef(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function computeTransactionHash({ tenantId, schoolId, bankAccountId, date, amount, direction, reference, description }) {
  const h = crypto.createHash('sha256');
  h.update(`${tenantId}|${schoolId || ''}|${bankAccountId}|${date}|${Number(amount).toFixed(2)}|${direction}|${normalizeRef(reference)}|${normalizeRef(description)}`);
  return h.digest('hex');
}

class BankReconciliationStatementRepository {
  async getOrCreateForMonth({ tenantId, schoolId, bankAccountId, statementYear, statementMonth, statementMonthName, importedByUserId }) {
    const pool = await getPool();
    const found = await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .input('schoolId', sql.Int, schoolId)
      .input('bankAccountId', sql.Int, bankAccountId)
      .input('statementYear', sql.Int, statementYear)
      .input('statementMonth', sql.Int, statementMonth)
      .query(`
        SELECT BankReconciliationStatementId, StatementNumber, Status
        FROM dbo.BankReconciliationStatements
        WHERE TenantId = @tenantId AND SchoolId = @schoolId
          AND BankAccountId = @bankAccountId
          AND StatementYear = @statementYear AND StatementMonth = @statementMonth
      `);
    if (found.recordset[0]) return found.recordset[0];

    const cnt = await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .input('schoolId', sql.Int, schoolId)
      .input('bankAccountId', sql.Int, bankAccountId)
      .query(`
        SELECT COUNT(*) AS Cnt FROM dbo.BankReconciliationStatements
        WHERE TenantId = @tenantId AND SchoolId = @schoolId AND BankAccountId = @bankAccountId
      `);
    const number = (cnt.recordset[0].Cnt || 0) + 1;

    const result = await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .input('schoolId', sql.Int, schoolId)
      .input('bankAccountId', sql.Int, bankAccountId)
      .input('statementYear', sql.Int, statementYear)
      .input('statementMonth', sql.Int, statementMonth)
      .input('statementMonthName', sql.NVarChar, statementMonthName || null)
      .input('statementNumber', sql.Int, number)
      .input('importedByUserId', sql.Int, importedByUserId)
      .query(`
        INSERT INTO dbo.BankReconciliationStatements
          (TenantId, SchoolId, BankAccountId, StatementNumber, StatementYear, StatementMonth, StatementMonthName, Status, ImportedByUserId, CreatedAt, UpdatedAt)
        OUTPUT INSERTED.BankReconciliationStatementId, INSERTED.StatementNumber, INSERTED.Status
        VALUES (@tenantId, @schoolId, @bankAccountId, @statementNumber, @statementYear, @statementMonth, @statementMonthName, 'Open', @importedByUserId, SYSUTCDATETIME(), SYSUTCDATETIME())
      `);
    return result.recordset[0];
  }

  async getById(id, tenantId, schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.BigInt, id)
      .input('tenantId', sql.Int, tenantId)
      .input('schoolId', sql.Int, schoolId)
      .query(`
        SELECT BankReconciliationStatementId, TenantId, SchoolId, BankAccountId, StatementNumber, StatementYear, StatementMonth, StatementMonthName, Status, ImportedByUserId, ReconciledByUserId, ReconciledAt, CreatedAt, UpdatedAt
        FROM dbo.BankReconciliationStatements
        WHERE BankReconciliationStatementId = @id AND TenantId = @tenantId AND SchoolId = @schoolId
      `);
    return result.recordset[0] || null;
  }

  async list({ tenantId, schoolId, bankAccountId, statusFilter, page = 1, pageSize = 50 } = {}) {
    const pool = await getPool();
    const request = pool.request();
    const where = ['TenantId = @tenantId', 'SchoolId = @schoolId'];
    request.input('tenantId', sql.Int, tenantId);
    request.input('schoolId', sql.Int, schoolId);
    if (bankAccountId) {
      request.input('bankAccountId', sql.Int, bankAccountId);
      where.push('BankAccountId = @bankAccountId');
    }
    if (statusFilter === 'open') {
      where.push("Status IN ('Open', 'InProgress')");
    } else if (statusFilter === 'reconciled') {
      where.push("Status = 'Reconciled'");
    }
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeSize = Math.min(200, Math.max(1, parseInt(pageSize, 10) || 50));
    request.input('offset', sql.Int, (safePage - 1) * safeSize);
    request.input('size', sql.Int, safeSize);
    const result = await request.query(`
      SELECT BankReconciliationStatementId, TenantId, SchoolId, BankAccountId, StatementNumber,
             StatementYear, StatementMonth, StatementMonthName, Status, ImportedByUserId, ReconciledByUserId, ReconciledAt, CreatedAt, UpdatedAt
      FROM dbo.BankReconciliationStatements
      WHERE ${where.join(' AND ')}
      ORDER BY StatementYear DESC, StatementMonth DESC
      OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
    `);
    return result.recordset;
  }

  async setStatus(id, tenantId, schoolId, status, reconciledByUserId) {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.BigInt, id)
      .input('tenantId', sql.Int, tenantId)
      .input('schoolId', sql.Int, schoolId)
      .input('status', sql.NVarChar, status)
      .input('reconciledByUserId', sql.Int, reconciledByUserId || null)
      .query(`
        UPDATE dbo.BankReconciliationStatements
        SET Status = @status,
            ReconciledByUserId = CASE WHEN @status = 'Reconciled' THEN @reconciledByUserId ELSE ReconciledByUserId END,
            ReconciledAt = CASE WHEN @status = 'Reconciled' THEN SYSUTCDATETIME() ELSE ReconciledAt END,
            UpdatedAt = SYSUTCDATETIME()
        WHERE BankReconciliationStatementId = @id AND TenantId = @tenantId AND SchoolId = @schoolId
      `);
  }
}

class BankStatementImportRepository {
  async getByHashAndPeriod({ tenantId, schoolId, bankAccountId, fileHash, importYear, importMonth }) {
    const pool = await getPool();
    const result = await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .input('schoolId', sql.Int, schoolId)
      .input('bankAccountId', sql.Int, bankAccountId)
      .input('fileHash', sql.NVarChar, fileHash)
      .input('importYear', sql.Int, importYear)
      .input('importMonth', sql.Int, importMonth)
      .query(`
        SELECT BankStatementImportId, ImportYear, ImportMonth, OriginalFileName, Status
        FROM dbo.BankStatementImports
        WHERE TenantId = @tenantId AND SchoolId = @schoolId
          AND BankAccountId = @bankAccountId
          AND FileHash = @fileHash AND ImportYear = @importYear AND ImportMonth = @importMonth
          AND Status <> 'Failed'
      `);
    return result.recordset[0] || null;
  }

  async create({ tenantId, schoolId, bankAccountId, bankReconciliationStatementId, importYear, importMonth, originalFileName, fileHash, importedByUserId, totalTransactionsInFile, totalTransactionsImported, totalTransactionsSkippedOutsideMonth, totalDuplicatesSkipped, totalPaymentsCreated, status, errorMessage }) {
    const pool = await getPool();
    const result = await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .input('schoolId', sql.Int, schoolId)
      .input('bankAccountId', sql.Int, bankAccountId)
      .input('bankReconciliationStatementId', sql.BigInt, bankReconciliationStatementId)
      .input('importYear', sql.Int, importYear)
      .input('importMonth', sql.Int, importMonth)
      .input('originalFileName', sql.NVarChar, originalFileName || null)
      .input('fileHash', sql.NVarChar, fileHash)
      .input('importedByUserId', sql.Int, importedByUserId)
      .input('totalIn', sql.Int, totalTransactionsInFile || 0)
      .input('totalImp', sql.Int, totalTransactionsImported || 0)
      .input('totalSkipped', sql.Int, totalTransactionsSkippedOutsideMonth || 0)
      .input('totalDup', sql.Int, totalDuplicatesSkipped || 0)
      .input('totalPay', sql.Int, totalPaymentsCreated || 0)
      .input('status', sql.NVarChar, status || 'Completed')
      .input('error', sql.NVarChar, errorMessage || null)
      .query(`
        INSERT INTO dbo.BankStatementImports
          (TenantId, SchoolId, BankAccountId, BankReconciliationStatementId, ImportYear, ImportMonth, OriginalFileName, FileHash, ImportedByUserId, ImportedAt, Status,
           TotalTransactionsInFile, TotalTransactionsImported, TotalTransactionsSkippedOutsideMonth, TotalDuplicatesSkipped, TotalPaymentsCreated, ErrorMessage)
        OUTPUT INSERTED.BankStatementImportId
        VALUES (@tenantId, @schoolId, @bankAccountId, @bankReconciliationStatementId, @importYear, @importMonth, @originalFileName, @fileHash, @importedByUserId, SYSUTCDATETIME(), @status,
                @totalIn, @totalImp, @totalSkipped, @totalDup, @totalPay, @error)
      `);
    return result.recordset[0].BankStatementImportId;
  }
}

class BankTransactionRepository {
  async findByFitid({ tenantId, schoolId, bankAccountId, fitid }) {
    if (!fitid) return null;
    const pool = await getPool();
    const result = await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .input('schoolId', sql.Int, schoolId)
      .input('bankAccountId', sql.Int, bankAccountId)
      .input('fitid', sql.NVarChar, fitid)
      .query(`
        SELECT TOP 1 BankTransactionId, TenantId, SchoolId, BankAccountId, BankReconciliationStatementId, TransactionDate, PostedDate, BankEffectiveDate, Amount, Direction, Reference, Description, FITID, TransactionHash, Status
        FROM dbo.BankTransactions
        WHERE TenantId = @tenantId AND SchoolId = @schoolId
          AND BankAccountId = @bankAccountId AND FITID = @fitid
      `);
    return result.recordset[0] || null;
  }

  async findByHash({ tenantId, schoolId, bankAccountId, transactionHash }) {
    const pool = await getPool();
    const result = await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .input('schoolId', sql.Int, schoolId)
      .input('bankAccountId', sql.Int, bankAccountId)
      .input('hash', sql.NVarChar, transactionHash)
      .query(`
        SELECT TOP 1 BankTransactionId, TenantId, SchoolId, BankAccountId, BankReconciliationStatementId, TransactionDate, PostedDate, BankEffectiveDate, Amount, Direction, Reference, Description, FITID, TransactionHash, Status
        FROM dbo.BankTransactions
        WHERE TenantId = @tenantId AND SchoolId = @schoolId
          AND BankAccountId = @bankAccountId AND TransactionHash = @hash
      `);
    return result.recordset[0] || null;
  }

  async getById(id, tenantId, schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.BigInt, id)
      .input('tenantId', sql.Int, tenantId)
      .input('schoolId', sql.Int, schoolId)
      .query(`
        SELECT BankTransactionId, TenantId, SchoolId, BankAccountId, BankReconciliationStatementId,
               TransactionDate, PostedDate, BankEffectiveDate, Amount, Direction, Reference, Description, FITID, TransactionHash, Status
        FROM dbo.BankTransactions
        WHERE BankTransactionId = @id AND TenantId = @tenantId AND SchoolId = @schoolId
      `);
    return result.recordset[0] || null;
  }

  async create({ tenantId, schoolId, bankAccountId, bankReconciliationStatementId, bankStatementImportId, transactionDate, postedDate, bankEffectiveDate, amount, direction, reference, description, fitid, transactionHash, status }) {
    const pool = await getPool();
    const result = await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .input('schoolId', sql.Int, schoolId)
      .input('bankAccountId', sql.Int, bankAccountId)
      .input('bankReconciliationStatementId', sql.BigInt, bankReconciliationStatementId)
      .input('bankStatementImportId', sql.BigInt, bankStatementImportId || null)
      .input('transactionDate', sql.Date, transactionDate)
      .input('postedDate', sql.Date, postedDate || transactionDate)
      .input('bankEffectiveDate', sql.Date, bankEffectiveDate || postedDate || transactionDate)
      .input('amount', sql.Decimal(18, 2), amount)
      .input('direction', sql.NVarChar, direction)
      .input('reference', sql.NVarChar, reference || null)
      .input('description', sql.NVarChar, description || null)
      .input('fitid', sql.NVarChar, fitid || null)
      .input('transactionHash', sql.NVarChar, transactionHash)
      .input('status', sql.NVarChar, status || 'Imported')
      .query(`
        INSERT INTO dbo.BankTransactions
          (TenantId, SchoolId, BankAccountId, BankReconciliationStatementId, BankStatementImportId,
           TransactionDate, PostedDate, BankEffectiveDate, Amount, Direction, Reference, Description, FITID, TransactionHash, Status, CreatedAt, UpdatedAt)
        OUTPUT INSERTED.BankTransactionId
        VALUES (@tenantId, @schoolId, @bankAccountId, @bankReconciliationStatementId, @bankStatementImportId,
                @transactionDate, @postedDate, @bankEffectiveDate, @amount, @direction, @reference, @description, @fitid, @transactionHash, @status, SYSUTCDATETIME(), SYSUTCDATETIME())
      `);
    return result.recordset[0].BankTransactionId;
  }

  async setStatus(id, tenantId, schoolId, status) {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.BigInt, id)
      .input('tenantId', sql.Int, tenantId)
      .input('schoolId', sql.Int, schoolId)
      .input('status', sql.NVarChar, status)
      .query(`
        UPDATE dbo.BankTransactions
        SET Status = @status, UpdatedAt = SYSUTCDATETIME()
        WHERE BankTransactionId = @id AND TenantId = @tenantId AND SchoolId = @schoolId
      `);
  }

  async listForStatement(statementId, tenantId, schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.BigInt, statementId)
      .input('tenantId', sql.Int, tenantId)
      .input('schoolId', sql.Int, schoolId)
      .query(`
        SELECT bt.BankTransactionId, bt.TenantId, bt.SchoolId, bt.BankAccountId, bt.BankReconciliationStatementId,
               bt.TransactionDate, bt.PostedDate, bt.BankEffectiveDate, bt.Amount, bt.Direction, bt.Reference, bt.Description, bt.FITID, bt.TransactionHash, bt.Status,
               pay.TransactionID AS PaymentTransactionId,
               pay.InvoiceID AS AllocatedInvoiceId,
               inv.InvoiceNumber AS AllocatedInvoiceNumber,
               pay.AllocationStatus AS PaymentAllocationStatus
        FROM dbo.BankTransactions bt
        LEFT JOIN dbo.Transactions pay ON pay.SchoolID = bt.SchoolId AND pay.BankTransactionId = bt.BankTransactionId
        LEFT JOIN dbo.Invoices inv ON inv.InvoiceID = pay.InvoiceID AND inv.SchoolID = bt.SchoolId
        WHERE bt.BankReconciliationStatementId = @id AND bt.TenantId = @tenantId AND bt.SchoolId = @schoolId
        ORDER BY bt.BankEffectiveDate ASC, bt.BankTransactionId ASC
      `);
    return result.recordset;
  }

  async countForStatement(statementId, tenantId, schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.BigInt, statementId)
      .input('tenantId', sql.Int, tenantId)
      .input('schoolId', sql.Int, schoolId)
      .query(`
        SELECT Status, COUNT(*) AS Cnt
        FROM dbo.BankTransactions
        WHERE BankReconciliationStatementId = @id AND TenantId = @tenantId AND SchoolId = @schoolId
        GROUP BY Status
      `);
    const map = { Imported: 0, Matched: 0, Reconciled: 0, Ignored: 0, DuplicateSkipped: 0 };
    for (const r of result.recordset) map[r.Status] = r.Cnt;
    return map;
  }
}

async function assertBankAccountForSchool(schoolId, bankAccountId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('schoolId', sql.Int, schoolId)
    .input('bankAccountId', sql.Int, bankAccountId)
    .query(`
      SELECT TOP 1 BankAccountID AS BankAccountId, TenantId, SchoolID AS SchoolId, AccountName, AccountNumber, BankName
      FROM dbo.BankAccounts
      WHERE BankAccountID = @bankAccountId AND SchoolID = @schoolId AND IsActive = 1
    `);
  return result.recordset[0] || null;
}

async function resolveTenantIdForSchool(schoolId) {
  const pool = await getPool();
  const result = await pool.request()
    .input('schoolId', sql.Int, schoolId)
    .query('SELECT TenantId FROM dbo.Schools WHERE SchoolID = @schoolId');
  return result.recordset[0]?.TenantId || null;
}

module.exports = {
  BankReconciliationStatementRepository,
  BankStatementImportRepository,
  BankTransactionRepository,
  computeTransactionHash,
  assertBankAccountForSchool,
  resolveTenantIdForSchool
};
