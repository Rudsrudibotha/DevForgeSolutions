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
    if (options.status) {
      req.input('allocStatus', sql.NVarChar, options.status);
      where += ' AND t.AllocationStatus = @allocStatus';
    }
    if (options.fromDate) {
      req.input('fromDate', sql.DateTime, options.fromDate);
      where += ' AND t.TransactionDate >= @fromDate';
    }
    if (options.toDate) {
      req.input('toDate', sql.DateTime, options.toDate);
      where += ' AND t.TransactionDate < @toDate';
    }
    if (options.transactionType) {
      req.input('txType', sql.NVarChar, options.transactionType);
      where += ' AND t.TransactionType = @txType';
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
               b.FileName AS BankStatementFile,
               f.FamilyName
        FROM Transactions t
        LEFT JOIN Invoices i ON t.InvoiceID = i.InvoiceID
        LEFT JOIN Students s ON i.StudentID = s.StudentID
        LEFT JOIN BankStatements b ON t.BankStatementID = b.BankStatementID
        LEFT JOIN Families f ON t.FamilyID = f.FamilyID
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
               b.FileName AS BankStatementFile,
               f.FamilyName
        FROM Transactions t
        LEFT JOIN Invoices i ON t.InvoiceID = i.InvoiceID
        LEFT JOIN Students s ON i.StudentID = s.StudentID
        LEFT JOIN BankStatements b ON t.BankStatementID = b.BankStatementID
        LEFT JOIN Families f ON t.FamilyID = f.FamilyID
        ${where}
        ORDER BY t.TransactionDate DESC, t.CreatedDate DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);
    return result.recordset;
  }

  async getSummaryBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`
        SELECT
          ISNULL(SUM(CASE WHEN TransactionType IN ('Credit','Payment') THEN Amount ELSE 0 END), 0) AS totalCredit,
          ISNULL(SUM(CASE WHEN TransactionType = 'Debit' THEN Amount ELSE 0 END), 0) AS totalDebit,
          ISNULL(SUM(CASE WHEN TransactionType = 'Bank' THEN Amount ELSE 0 END), 0) AS totalBank,
          ISNULL(SUM(CASE WHEN AllocationStatus = 'Allocated' THEN 1 ELSE 0 END), 0) AS allocatedCount,
          ISNULL(SUM(CASE WHEN AllocationStatus = 'Unallocated' THEN 1 ELSE 0 END), 0) AS unallocatedCount,
          ISNULL(SUM(CASE WHEN AllocationStatus = 'Suggested Match' THEN 1 ELSE 0 END), 0) AS suggestedCount
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
      .input('allocationStatus', sql.NVarChar, transactionData.allocationStatus || 'Unallocated')
      .input('bankTransactionKey', sql.NVarChar, transactionData.bankTransactionKey || null)
      .input('familyId', sql.Int, transactionData.familyId || null)
      .input('studentId', sql.Int, transactionData.studentId || null)
      .query(`INSERT INTO Transactions (
                SchoolID, InvoiceID, BankStatementID, PaymentMethod, Reference, Description,
                TransactionType, Amount, TransactionDate, AllocationStatus, BankTransactionKey, FamilyID, StudentID
              )
              OUTPUT INSERTED.*
              VALUES (
                @schoolId, @invoiceId, @bankStatementId, @paymentMethod, @reference, @description,
                @transactionType, @amount, @transactionDate, @allocationStatus, @bankTransactionKey, @familyId, @studentId
              )`);
    return result.recordset[0];
  }

  async transactionKeyExists(schoolId, bankTransactionKey) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('key', sql.NVarChar, bankTransactionKey)
      .query('SELECT 1 FROM Transactions WHERE SchoolID = @schoolId AND BankTransactionKey = @key');
    return result.recordset.length > 0;
  }

  async allocateTransaction(transactionId, allocation, userId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, transactionId)
      .input('invoiceId', sql.Int, allocation.invoiceId || null)
      .input('familyId', sql.Int, allocation.familyId || null)
      .input('studentId', sql.Int, allocation.studentId || null)
      .input('allocationType', sql.NVarChar, allocation.allocationType || 'Manual')
      .input('allocationStatus', sql.NVarChar, 'Allocated')
      .input('allocatedBy', sql.Int, userId)
      .input('paymentMethod', sql.NVarChar, allocation.paymentMethod || 'Manual allocation')
      .query(`UPDATE Transactions SET
                InvoiceID = COALESCE(@invoiceId, InvoiceID),
                FamilyID = COALESCE(@familyId, FamilyID),
                StudentID = COALESCE(@studentId, StudentID),
                AllocationType = @allocationType,
                AllocationStatus = @allocationStatus,
                AllocatedBy = @allocatedBy,
                AllocatedDate = GETDATE(),
                PaymentMethod = @paymentMethod,
                UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE TransactionID = @id`);
    return result.recordset[0];
  }

  async unallocateTransaction(transactionId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, transactionId)
      .query(`UPDATE Transactions SET
                InvoiceID = NULL, FamilyID = NULL, StudentID = NULL,
                AllocationType = NULL, AllocationStatus = 'Unallocated',
                AllocatedBy = NULL, AllocatedDate = NULL,
                PaymentMethod = NULL, TransactionType = 'Bank',
                UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE TransactionID = @id`);
    return result.recordset[0];
  }

  async getReconciliationTransactions(schoolId, options = {}) {
    const pool = await getPool();
    const req = pool.request().input('schoolId', sql.Int, schoolId);
    let where = 'WHERE t.SchoolID = @schoolId AND t.BankStatementID IS NOT NULL';

    if (options.status) {
      req.input('allocStatus', sql.NVarChar, options.status);
      where += ' AND t.AllocationStatus = @allocStatus';
    }
    if (options.fromDate) {
      req.input('fromDate', sql.DateTime, options.fromDate);
      where += ' AND t.TransactionDate >= @fromDate';
    }
    if (options.toDate) {
      req.input('toDate', sql.DateTime, options.toDate);
      where += ' AND t.TransactionDate < @toDate';
    }
    if (options.search) {
      req.input('search', sql.NVarChar, `%${options.search}%`);
      where += ' AND (t.Reference LIKE @search OR t.Description LIKE @search OR CAST(t.Amount AS NVARCHAR) LIKE @search OR s.FirstName LIKE @search OR s.LastName LIKE @search OR f.FamilyName LIKE @search)';
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(500, Math.max(1, options.limit || 100));
    const offset = (page - 1) * limit;
    req.input('limit', sql.Int, limit);
    req.input('offset', sql.Int, offset);

    const result = await req.query(`
      SELECT t.TransactionID, t.TransactionDate, t.Reference, t.Description,
        t.Amount, t.TransactionType, t.AllocationStatus, t.AllocationType,
        t.BankStatactionKey, t.BankStatementID, t.InvoiceID, t.FamilyID, t.StudentID,
        t.AllocatedBy, t.AllocatedDate,
        CASE WHEN t.Amount >= 0 THEN t.Amount ELSE 0 END AS CreditAmount,
        CASE WHEN t.Amount < 0 THEN ABS(t.Amount) ELSE 0 END AS DebitAmount,
        i.InvoiceNumber,
        s.FirstName AS AllocatedStudentFirstName, s.LastName AS AllocatedStudentLastName,
        f.FamilyName AS AllocatedFamilyName,
        b.FileName AS BankStatementFile,
        au.Email AS AllocatedByEmail
      FROM Transactions t
      LEFT JOIN Invoices i ON t.InvoiceID = i.InvoiceID
      LEFT JOIN Students s ON t.StudentID = s.StudentID
      LEFT JOIN Families f ON t.FamilyID = f.FamilyID
      LEFT JOIN BankStatements b ON t.BankStatementID = b.BankStatementID
      LEFT JOIN Users au ON t.AllocatedBy = au.UserID
      ${where}
      ORDER BY t.TransactionDate ASC, t.CreatedDate ASC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    return result.recordset;
  }

  async searchForAllocation(schoolId, query) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('q', sql.NVarChar, `%${query}%`)
      .query(`
        SELECT DISTINCT s.StudentID, s.FirstName, s.LastName, s.ClassName,
          f.FamilyID, f.FamilyName,
          f.PrimaryParentName, f.PrimaryParentPhone,
          f.SecondaryParentName, f.SecondaryParentPhone,
          ISNULL((
            SELECT SUM(inv.Amount - ISNULL(inv.AmountPaid, 0))
            FROM Invoices inv
            WHERE inv.StudentID = s.StudentID AND inv.Status <> 'Paid' AND inv.IsDeleted = 0
          ), 0) AS OutstandingBalance
        FROM Students s
        INNER JOIN Families f ON s.FamilyID = f.FamilyID
        WHERE s.SchoolID = @schoolId AND s.IsActive = 1
          AND (
            f.FamilyName LIKE @q
            OR s.FirstName LIKE @q
            OR s.LastName LIKE @q
            OR f.PrimaryParentName LIKE @q
            OR f.SecondaryParentName LIKE @q
            OR f.PrimaryParentPhone LIKE @q
            OR f.SecondaryParentPhone LIKE @q
          )
        ORDER BY s.LastName, s.FirstName
      `);
    return result.recordset;
  }

  async getOutstandingInvoicesForStudent(studentId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('studentId', sql.Int, studentId)
      .query(`SELECT InvoiceID, InvoiceNumber, Amount, ISNULL(AmountPaid, 0) AS AmountPaid,
                Amount - ISNULL(AmountPaid, 0) AS Remaining, Status, DueDate, IssueDate
              FROM Invoices
              WHERE StudentID = @studentId AND Status <> 'Paid' AND IsDeleted = 0
              ORDER BY DueDate ASC`);
    return result.recordset;
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
                AND t.AllocationStatus IN ('Unallocated', 'Suggested Match')
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
                AND t.AllocationStatus IN ('Unallocated', 'Suggested Match')
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
        .query('SELECT * FROM Transactions WHERE TransactionID = @transactionId');
      const bankTransaction = txResult.recordset[0];

      if (!bankTransaction || bankTransaction.TransactionType !== 'Bank' || bankTransaction.AllocationStatus === 'Allocated') {
        throw new Error('Bank transaction is not available for matching');
      }

      const invoiceResult = await new sql.Request(dbTransaction)
        .input('invoiceId', sql.Int, invoiceId)
        .query('SELECT * FROM Invoices WHERE InvoiceID = @invoiceId AND IsDeleted = 0');
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
        .input('allocatedBy', sql.Int, approvedBy || null)
        .query(`UPDATE Transactions SET
                  InvoiceID = @invoiceId,
                  TransactionType = 'Payment',
                  PaymentMethod = 'Approved bank match',
                  AllocationStatus = 'Allocated',
                  AllocationType = 'Match Approved',
                  AllocatedBy = @allocatedBy,
                  AllocatedDate = GETDATE(),
                  UpdatedDate = GETDATE()
                OUTPUT INSERTED.*
                WHERE TransactionID = @transactionId`);

      const existingMatch = await new sql.Request(dbTransaction)
        .input('transactionId', sql.Int, transactionId)
        .input('invoiceId', sql.Int, invoiceId)
        .query('SELECT ReconciliationMatchID FROM ReconciliationMatches WHERE TransactionID = @transactionId AND InvoiceID = @invoiceId');

      if (existingMatch.recordset[0]) {
        await new sql.Request(dbTransaction)
          .input('matchId', sql.Int, existingMatch.recordset[0].ReconciliationMatchID)
          .input('approvedBy', sql.Int, approvedBy || null)
          .query(`UPDATE ReconciliationMatches SET Status = 'Approved', ApprovedBy = @approvedBy, ApprovedDate = GETDATE(), UpdatedDate = GETDATE() WHERE ReconciliationMatchID = @matchId`);
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
