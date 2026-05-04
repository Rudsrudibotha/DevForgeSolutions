// Data Layer - Transaction repository

const { getPool, sql } = require('./db');

class TransactionRepository {
  async getTransactionsBySchool(schoolId, options = {}) {
    const pool = await getPool();
    const req = pool.request().input('schoolId', sql.Int, schoolId);
    let where = 'WHERE t.SchoolID = @schoolId';

    if (options.search) {
      req.input('search', sql.NVarChar, `%${options.search}%`);
      where += ' AND (t.Reference LIKE @search OR t.Description LIKE @search OR i.InvoiceNumber LIKE @search)';
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(200, Math.max(1, options.limit || 50));
    const offset = (page - 1) * limit;
    req.input('limit', sql.Int, limit);
    req.input('offset', sql.Int, offset);

    const result = await req.query(`
        SELECT t.*,
               i.InvoiceNumber,
               s.FirstName,
               s.LastName,
               b.FileName AS BankStatementFile
        FROM Transactions t
        LEFT JOIN Invoices i ON t.InvoiceID = i.InvoiceID
        LEFT JOIN Students s ON i.StudentID = s.StudentID
        LEFT JOIN BankStatements b ON t.BankStatementID = b.BankStatementID
        ${where}
        ORDER BY t.TransactionDate DESC, t.CreatedDate DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    return result.recordset;
  }

  async getAllTransactions(options = {}) {
    const pool = await getPool();
    const req = pool.request();
    let where = 'WHERE 1=1';

    if (options.search) {
      req.input('search', sql.NVarChar, `%${options.search}%`);
      where += ' AND (t.Reference LIKE @search OR t.Description LIKE @search OR i.InvoiceNumber LIKE @search)';
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(200, Math.max(1, options.limit || 50));
    const offset = (page - 1) * limit;
    req.input('limit', sql.Int, limit);
    req.input('offset', sql.Int, offset);

    const result = await req.query(`
        SELECT t.*,
               i.InvoiceNumber,
               s.FirstName,
               s.LastName,
               b.FileName AS BankStatementFile
        FROM Transactions t
        LEFT JOIN Invoices i ON t.InvoiceID = i.InvoiceID
        LEFT JOIN Students s ON i.StudentID = s.StudentID
        LEFT JOIN BankStatements b ON t.BankStatementID = b.BankStatementID
        ${where}
        ORDER BY t.TransactionDate DESC, t.CreatedDate DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    return result.recordset;
  }

  // SQL aggregate summary — avoids loading all rows into memory
  async getSummaryBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`
        SELECT
          ISNULL(SUM(CASE WHEN TransactionType IN ('Credit','Payment') THEN Amount ELSE 0 END), 0) AS totalCredit,
          ISNULL(SUM(CASE WHEN TransactionType = 'Debit' THEN Amount ELSE 0 END), 0) AS totalDebit,
          ISNULL(SUM(CASE WHEN TransactionType = 'Bank' THEN Amount ELSE 0 END), 0) AS totalBank
        FROM Transactions
        WHERE SchoolID = @schoolId
      `);
    return result.recordset[0];
  }

  async getSummaryAll() {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT
          ISNULL(SUM(CASE WHEN TransactionType IN ('Credit','Payment') THEN Amount ELSE 0 END), 0) AS totalCredit,
          ISNULL(SUM(CASE WHEN TransactionType = 'Debit' THEN Amount ELSE 0 END), 0) AS totalDebit,
          ISNULL(SUM(CASE WHEN TransactionType = 'Bank' THEN Amount ELSE 0 END), 0) AS totalBank
        FROM Transactions
      `);
    return result.recordset[0];
  }

  async getOutstandingBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT ISNULL(SUM(Amount - ISNULL(AmountPaid, 0)), 0) AS outstanding
              FROM Invoices
              WHERE SchoolID = @schoolId AND Status <> 'Paid' AND IsDeleted = 0`);
    return Number(result.recordset[0].outstanding);
  }

  async getOutstandingAll() {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT ISNULL(SUM(Amount - ISNULL(AmountPaid, 0)), 0) AS outstanding
              FROM Invoices
              WHERE Status <> 'Paid' AND IsDeleted = 0`);
    return Number(result.recordset[0].outstanding);
  }

  async createTransaction(transactionData) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, transactionData.schoolId)
      .input('invoiceId', sql.Int, transactionData.invoiceId || null)
      .input('bankStatementId', sql.Int, transactionData.bankStatementId || null)
      .input('paymentMethod', sql.NVarChar, transactionData.paymentMethod || null)
      .input('reference', sql.NVarChar, transactionData.reference || null)
      .input('description', sql.NVarChar, transactionData.description || null)
      .input('transactionType', sql.NVarChar, transactionData.transactionType || 'Credit')
      .input('amount', sql.Decimal(10,2), transactionData.amount)
      .input('transactionDate', sql.DateTime, transactionData.transactionDate || new Date())
      .query(`INSERT INTO Transactions (
                SchoolID, InvoiceID, BankStatementID, PaymentMethod, Reference, Description,
                TransactionType, Amount, TransactionDate
              )
              OUTPUT INSERTED.*
              VALUES (
                @schoolId, @invoiceId, @bankStatementId, @paymentMethod, @reference, @description,
                @transactionType, @amount, @transactionDate
              )`);
    return result.recordset[0];
  }

  async getUnmatchedBankTransactionsBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT TOP 100 t.*, b.FileName AS BankStatementFile
              FROM Transactions t
              LEFT JOIN BankStatements b ON t.BankStatementID = b.BankStatementID
              WHERE t.SchoolID = @schoolId
                AND t.TransactionType = 'Bank'
                AND t.InvoiceID IS NULL
              ORDER BY t.TransactionDate DESC, t.CreatedDate DESC`);
    return result.recordset;
  }

  async getUnmatchedBankTransactionsAll() {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT TOP 100 t.*, b.FileName AS BankStatementFile
              FROM Transactions t
              LEFT JOIN BankStatements b ON t.BankStatementID = b.BankStatementID
              WHERE t.TransactionType = 'Bank'
                AND t.InvoiceID IS NULL
              ORDER BY t.TransactionDate DESC, t.CreatedDate DESC`);
    return result.recordset;
  }

  async approveBankMatch(transactionId, invoiceId, approvedBy) {
    const pool = await getPool();
    const dbTransaction = new sql.Transaction(pool);

    await dbTransaction.begin();

    try {
      const txResult = await new sql.Request(dbTransaction)
        .input('transactionId', sql.Int, transactionId)
        .query(`SELECT * FROM Transactions WHERE TransactionID = @transactionId`);
      const bankTransaction = txResult.recordset[0];

      if (!bankTransaction || bankTransaction.TransactionType !== 'Bank' || bankTransaction.InvoiceID) {
        throw new Error('Bank transaction is not available for matching');
      }

      const invoiceResult = await new sql.Request(dbTransaction)
        .input('invoiceId', sql.Int, invoiceId)
        .query(`SELECT * FROM Invoices WHERE InvoiceID = @invoiceId AND IsDeleted = 0`);
      const invoice = invoiceResult.recordset[0];

      if (!invoice || invoice.SchoolID !== bankTransaction.SchoolID || invoice.Status === 'Paid') {
        throw new Error('Invoice is not available for this bank transaction');
      }

      const remaining = Number(invoice.Amount) - Number(invoice.AmountPaid || 0);
      const paymentAmount = Number(bankTransaction.Amount || 0);

      if (paymentAmount <= 0 || paymentAmount > remaining) {
        throw new Error(`Bank amount exceeds remaining invoice balance of ${remaining.toFixed(2)}`);
      }

      await new sql.Request(dbTransaction)
        .input('invoiceId', sql.Int, invoiceId)
        .input('paymentAmount', sql.Decimal(10, 2), paymentAmount)
        .query(`UPDATE Invoices SET
                  AmountPaid = ISNULL(AmountPaid, 0) + @paymentAmount,
                  Status = CASE WHEN ISNULL(AmountPaid, 0) + @paymentAmount >= Amount THEN 'Paid' ELSE 'Partial' END,
                  PaidDate = CASE WHEN ISNULL(AmountPaid, 0) + @paymentAmount >= Amount THEN GETDATE() ELSE PaidDate END,
                  UpdatedDate = GETDATE()
                WHERE InvoiceID = @invoiceId`);

      const updateTxResult = await new sql.Request(dbTransaction)
        .input('transactionId', sql.Int, transactionId)
        .input('invoiceId', sql.Int, invoiceId)
        .query(`UPDATE Transactions SET
                  InvoiceID = @invoiceId,
                  TransactionType = 'Payment',
                  PaymentMethod = 'Approved bank match',
                  UpdatedDate = GETDATE()
                OUTPUT INSERTED.*
                WHERE TransactionID = @transactionId`);

      const existingMatch = await new sql.Request(dbTransaction)
        .input('transactionId', sql.Int, transactionId)
        .input('invoiceId', sql.Int, invoiceId)
        .query(`SELECT ReconciliationMatchID
                FROM ReconciliationMatches
                WHERE TransactionID = @transactionId AND InvoiceID = @invoiceId`);

      if (existingMatch.recordset[0]) {
        await new sql.Request(dbTransaction)
          .input('matchId', sql.Int, existingMatch.recordset[0].ReconciliationMatchID)
          .input('approvedBy', sql.Int, approvedBy || null)
          .query(`UPDATE ReconciliationMatches
                  SET Status = 'Approved', ApprovedBy = @approvedBy, ApprovedDate = GETDATE(), UpdatedDate = GETDATE()
                  WHERE ReconciliationMatchID = @matchId`);
      } else {
        await new sql.Request(dbTransaction)
          .input('schoolId', sql.Int, bankTransaction.SchoolID)
          .input('transactionId', sql.Int, transactionId)
          .input('invoiceId', sql.Int, invoiceId)
          .input('approvedBy', sql.Int, approvedBy || null)
          .query(`INSERT INTO ReconciliationMatches (SchoolID, TransactionID, InvoiceID, MatchScore, MatchReason, Status, ApprovedBy, ApprovedDate)
                  VALUES (@schoolId, @transactionId, @invoiceId, 100, 'Manual approval', 'Approved', @approvedBy, GETDATE())`);
      }

      await dbTransaction.commit();

      return updateTxResult.recordset[0];
    } catch (error) {
      await dbTransaction.rollback();
      throw error;
    }
  }
}

module.exports = TransactionRepository;
