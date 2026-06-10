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

  async getSummaryBySchool(schoolId, options = {}) {
    const pool = await getPool();
    const req = pool.request().input('schoolId', sql.Int, schoolId);
    let where = 'WHERE SchoolID = @schoolId';

    if (options.fromDate) {
      req.input('fromDate', sql.DateTime, options.fromDate);
      where += ' AND TransactionDate >= @fromDate';
    }

    if (options.toDate) {
      req.input('toDate', sql.DateTime, options.toDate);
      where += ' AND TransactionDate < @toDate';
    }

    const result = await req.query(`
        SELECT
          ISNULL(SUM(CASE WHEN TransactionType IN ('Credit','Payment') THEN Amount ELSE 0 END), 0) AS totalCredit,
          ISNULL(SUM(CASE WHEN TransactionType = 'Debit' THEN Amount ELSE 0 END), 0) AS totalDebit,
          ISNULL(SUM(CASE WHEN TransactionType = 'Bank' THEN Amount ELSE 0 END), 0) AS totalBank,
          ISNULL(SUM(CASE WHEN AllocationStatus = 'Allocated' THEN 1 ELSE 0 END), 0) AS allocatedCount,
          ISNULL(SUM(CASE WHEN AllocationStatus = 'Unallocated' THEN 1 ELSE 0 END), 0) AS unallocatedCount,
          ISNULL(SUM(CASE WHEN AllocationStatus = 'Suggested Match' THEN 1 ELSE 0 END), 0) AS suggestedCount
        FROM Transactions
        ${where}
      `);
    return result.recordset[0];
  }

  async getSummaryAll(options = {}) {
    const pool = await getPool();
    const req = pool.request();
    let where = 'WHERE 1 = 1';

    if (options.fromDate) {
      req.input('fromDate', sql.DateTime, options.fromDate);
      where += ' AND TransactionDate >= @fromDate';
    }

    if (options.toDate) {
      req.input('toDate', sql.DateTime, options.toDate);
      where += ' AND TransactionDate < @toDate';
    }

    const result = await req.query(`
        SELECT
          ISNULL(SUM(CASE WHEN TransactionType IN ('Credit','Payment') THEN Amount ELSE 0 END), 0) AS totalCredit,
          ISNULL(SUM(CASE WHEN TransactionType = 'Debit' THEN Amount ELSE 0 END), 0) AS totalDebit,
          ISNULL(SUM(CASE WHEN TransactionType = 'Bank' THEN Amount ELSE 0 END), 0) AS totalBank,
          ISNULL(SUM(CASE WHEN AllocationStatus = 'Allocated' THEN 1 ELSE 0 END), 0) AS allocatedCount,
          ISNULL(SUM(CASE WHEN AllocationStatus = 'Unallocated' THEN 1 ELSE 0 END), 0) AS unallocatedCount,
          ISNULL(SUM(CASE WHEN AllocationStatus = 'Suggested Match' THEN 1 ELSE 0 END), 0) AS suggestedCount
        FROM Transactions
        ${where}
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
      .input('receiptNumber', sql.NVarChar, transactionData.receiptNumber || null)
      .input('paymentMethod', sql.NVarChar, transactionData.paymentMethod || null)
      .input('payeeType', sql.NVarChar, transactionData.payeeType || null)
      .input('payeeName', sql.NVarChar, transactionData.payeeName || null)
      .input('payeePhone', sql.NVarChar, transactionData.payeePhone || null)
      .input('payeeEmail', sql.NVarChar, transactionData.payeeEmail || null)
      .input('reference', sql.NVarChar, transactionData.reference || null)
      .input('description', sql.NVarChar, transactionData.description || null)
      .input('transactionType', sql.NVarChar, transactionData.transactionType || 'Credit')
      .input('amount', sql.Decimal(10,2), transactionData.amount)
      .input('transactionDate', sql.DateTime, transactionData.transactionDate || new Date())
      .input('allocationStatus', sql.NVarChar, transactionData.allocationStatus || 'Unallocated')
      .input('allocationType', sql.NVarChar, transactionData.allocationType || null)
      .input('allocatedBy', sql.Int, transactionData.allocatedBy || null)
      .input('bankTransactionKey', sql.NVarChar, transactionData.bankTransactionKey || null)
      .input('bankTransactionId', sql.BigInt, transactionData.bankTransactionId || null)
      .input('familyId', sql.Int, transactionData.familyId || null)
      .input('studentId', sql.Int, transactionData.studentId || null)
      .query(`IF @invoiceId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceID = @invoiceId AND SchoolID = @schoolId)
                THROW 50000, 'Invoice must belong to the selected school', 1;
              IF @bankStatementId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM BankStatements WHERE BankStatementID = @bankStatementId AND SchoolID = @schoolId)
                THROW 50000, 'Bank statement must belong to the selected school', 1;
              IF @familyId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Families WHERE FamilyID = @familyId AND SchoolID = @schoolId)
                THROW 50000, 'Family must belong to the selected school', 1;
              IF @studentId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = @studentId AND SchoolID = @schoolId)
                THROW 50000, 'Student must belong to the selected school', 1;
              INSERT INTO Transactions (
                SchoolID, InvoiceID, BankStatementID, ReceiptNumber, PaymentMethod,
                PayeeType, PayeeName, PayeePhone, PayeeEmail, Reference, Description,
                TransactionType, Amount, TransactionDate, AllocationStatus, AllocationType, AllocatedBy, AllocatedDate,
                BankTransactionKey, BankTransactionId, FamilyID, StudentID
              )
              OUTPUT INSERTED.*
              VALUES (
                @schoolId, @invoiceId, @bankStatementId, @receiptNumber, @paymentMethod,
                @payeeType, @payeeName, @payeePhone, @payeeEmail, @reference, @description,
                @transactionType, @amount, @transactionDate, @allocationStatus, @allocationType, @allocatedBy,
                CASE WHEN @allocatedBy IS NULL THEN NULL ELSE GETDATE() END,
                @bankTransactionKey, @bankTransactionId, @familyId, @studentId
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

  async findByBankTransactionId(schoolId, bankTransactionId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('bankTransactionId', sql.BigInt, bankTransactionId)
      .query(`
        SELECT TOP 1 *
        FROM Transactions
        WHERE SchoolID = @schoolId AND BankTransactionId = @bankTransactionId
      `);
    return result.recordset[0] || null;
  }

  async getTransactionById(transactionId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('transactionId', sql.Int, transactionId)
      .query(`SELECT t.*, b.FileName AS BankStatementFile
              FROM Transactions t
              LEFT JOIN BankStatements b ON t.BankStatementID = b.BankStatementID AND b.SchoolID = t.SchoolID
              WHERE t.TransactionID = @transactionId`);
    return result.recordset[0] || null;
  }

  async getTransactionByIdForSchool(transactionId, schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('transactionId', sql.Int, transactionId)
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT t.*, b.FileName AS BankStatementFile
              FROM Transactions t
              LEFT JOIN BankStatements b ON t.BankStatementID = b.BankStatementID AND b.SchoolID = t.SchoolID
              WHERE t.TransactionID = @transactionId AND t.SchoolID = @schoolId`);
    return result.recordset[0] || null;
  }

  async allocateTransaction(transactionId, schoolId, allocation, userId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, transactionId)
      .input('schoolId', sql.Int, schoolId)
      .input('invoiceId', sql.Int, allocation.invoiceId || null)
      .input('familyId', sql.Int, allocation.familyId || null)
      .input('studentId', sql.Int, allocation.studentId || null)
      .input('allocationType', sql.NVarChar, allocation.allocationType || 'Manual')
      .input('allocationStatus', sql.NVarChar, 'Allocated')
      .input('allocatedBy', sql.Int, userId)
      .input('paymentMethod', sql.NVarChar, allocation.paymentMethod || 'Manual allocation')
      .query(`IF @invoiceId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceID = @invoiceId AND SchoolID = @schoolId)
                THROW 50000, 'Invoice must belong to the selected school', 1;
              IF @familyId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Families WHERE FamilyID = @familyId AND SchoolID = @schoolId)
                THROW 50000, 'Family must belong to the selected school', 1;
              IF @studentId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = @studentId AND SchoolID = @schoolId)
                THROW 50000, 'Student must belong to the selected school', 1;
              UPDATE Transactions SET
                InvoiceID = COALESCE(@invoiceId, InvoiceID),
                FamilyID = COALESCE(@familyId, FamilyID),
                StudentID = COALESCE(@studentId, StudentID),
                TransactionType = CASE WHEN @allocationType = 'Debtor' THEN 'Payment' ELSE TransactionType END,
                AllocationType = @allocationType,
                AllocationStatus = @allocationStatus,
                AllocatedBy = @allocatedBy,
                AllocatedDate = GETDATE(),
                PaymentMethod = @paymentMethod,
                UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE TransactionID = @id AND SchoolID = @schoolId`);
    return result.recordset[0];
  }

  async reallocateTransaction(transactionId, schoolId, allocation, userId) {
    const pool = await getPool();
    const dbTransaction = new sql.Transaction(pool);
    await dbTransaction.begin();

    try {
      const transactionResult = await new sql.Request(dbTransaction)
        .input('transactionId', sql.Int, transactionId)
        .input('schoolId', sql.Int, schoolId)
        .query(`SELECT TOP 1 t.*, i.InvoiceNumber AS PreviousInvoiceNumber,
                  s.FirstName AS PreviousStudentFirstName, s.LastName AS PreviousStudentLastName,
                  f.FamilyName AS PreviousFamilyName
                FROM Transactions t WITH (UPDLOCK, HOLDLOCK)
                LEFT JOIN Invoices i WITH (UPDLOCK, HOLDLOCK) ON t.InvoiceID = i.InvoiceID AND i.SchoolID = t.SchoolID
                LEFT JOIN Students s ON COALESCE(t.StudentID, i.StudentID) = s.StudentID AND s.SchoolID = t.SchoolID
                LEFT JOIN Families f ON COALESCE(t.FamilyID, s.FamilyID) = f.FamilyID AND f.SchoolID = t.SchoolID
                WHERE t.TransactionID = @transactionId AND t.SchoolID = @schoolId`);
      const bankTransaction = transactionResult.recordset[0];

      if (!bankTransaction || !bankTransaction.BankStatementID) {
        throw new Error('Only bank statement transactions can be reallocated');
      }

      if (bankTransaction.AllocationStatus !== 'Allocated') {
        throw new Error('Only allocated bank transactions can be reallocated');
      }

      const previousAllocation = {
        invoiceId: bankTransaction.InvoiceID || null,
        invoiceNumber: bankTransaction.PreviousInvoiceNumber || null,
        studentId: bankTransaction.StudentID || null,
        studentName: `${bankTransaction.PreviousStudentFirstName || ''} ${bankTransaction.PreviousStudentLastName || ''}`.trim() || null,
        familyId: bankTransaction.FamilyID || null,
        familyName: bankTransaction.PreviousFamilyName || null,
        allocationType: bankTransaction.AllocationType || null,
        allocatedBy: bankTransaction.AllocatedBy || null,
        allocatedDate: bankTransaction.AllocatedDate || null
      };

      const allocationType = allocation.allocationType || 'Debtor';
      let invoiceId = allocation.invoiceId || null;
      let studentId = allocation.studentId || null;
      let familyId = allocation.familyId || null;
      let appliedAmount = 0;
      let newInvoice = null;

      if (bankTransaction.InvoiceID) {
        await this.reverseInvoicePayment(dbTransaction, {
          invoiceId: bankTransaction.InvoiceID,
          schoolId,
          amount: Number(bankTransaction.Amount || 0)
        });
      }

      if (allocationType === 'Debtor') {
        if (!invoiceId) {
          throw new Error('A target invoice is required for debtor reallocation');
        }

        if (Number(bankTransaction.InvoiceID || 0) === Number(invoiceId)) {
          throw new Error('Choose a different invoice before reallocating this payment');
        }

        const invoiceResult = await new sql.Request(dbTransaction)
          .input('invoiceId', sql.Int, invoiceId)
          .input('schoolId', sql.Int, schoolId)
          .query(`SELECT TOP 1 i.*, s.FamilyID AS TargetFamilyID, s.StudentID AS TargetStudentID
                  FROM Invoices i WITH (UPDLOCK, HOLDLOCK)
                  INNER JOIN Students s ON i.StudentID = s.StudentID AND s.SchoolID = i.SchoolID
                  WHERE i.InvoiceID = @invoiceId AND i.SchoolID = @schoolId AND i.IsDeleted = 0`);
        newInvoice = invoiceResult.recordset[0];

        if (!newInvoice || newInvoice.Status === 'Cancelled') {
          throw new Error('Target invoice is not available for this school');
        }

        const remaining = Math.max(0, Number(newInvoice.Amount || 0) - Number(newInvoice.AmountPaid || 0));
        appliedAmount = Math.min(Number(bankTransaction.Amount || 0), remaining);

        if (appliedAmount <= 0) {
          throw new Error('Target invoice has no outstanding balance');
        }

        await this.applyInvoicePayment(dbTransaction, {
          invoiceId,
          amount: appliedAmount,
          paymentDate: bankTransaction.TransactionDate || new Date()
        });

        studentId = newInvoice.TargetStudentID || newInvoice.StudentID || studentId || null;
        familyId = newInvoice.TargetFamilyID || familyId || null;
      } else {
        invoiceId = null;
        studentId = null;
        familyId = null;
      }

      const updateResult = await new sql.Request(dbTransaction)
        .input('transactionId', sql.Int, transactionId)
        .input('schoolId', sql.Int, schoolId)
        .input('invoiceId', sql.Int, invoiceId)
        .input('familyId', sql.Int, familyId)
        .input('studentId', sql.Int, studentId)
        .input('allocationType', sql.NVarChar, allocationType)
        .input('allocatedBy', sql.Int, userId || null)
        .input('paymentMethod', sql.NVarChar, allocation.paymentMethod || 'Bank reallocation')
        .query(`UPDATE Transactions SET
                  InvoiceID = @invoiceId,
                  FamilyID = @familyId,
                  StudentID = @studentId,
                  TransactionType = CASE WHEN @allocationType = 'Debtor' THEN 'Payment' ELSE 'Bank' END,
                  AllocationType = @allocationType,
                  AllocationStatus = 'Allocated',
                  AllocatedBy = @allocatedBy,
                  AllocatedDate = GETDATE(),
                  PaymentMethod = @paymentMethod,
                  UpdatedDate = GETDATE()
                OUTPUT INSERTED.*
                WHERE TransactionID = @transactionId AND SchoolID = @schoolId`);

      await new sql.Request(dbTransaction)
        .input('transactionId', sql.Int, transactionId)
        .input('schoolId', sql.Int, schoolId)
        .input('reason', sql.NVarChar, allocation.reason || 'Reallocated')
        .query(`UPDATE ReconciliationMatches SET
                  Status = 'Rejected',
                  MatchReason = LEFT(CONCAT(ISNULL(MatchReason, ''), ' | Reallocated: ', @reason), 500),
                  UpdatedDate = GETDATE()
                WHERE TransactionID = @transactionId AND SchoolID = @schoolId AND Status = 'Approved'`);

      if (invoiceId) {
        const existingMatch = await new sql.Request(dbTransaction)
          .input('transactionId', sql.Int, transactionId)
          .input('invoiceId', sql.Int, invoiceId)
          .query('SELECT ReconciliationMatchID FROM ReconciliationMatches WHERE TransactionID = @transactionId AND InvoiceID = @invoiceId');

        if (existingMatch.recordset[0]) {
          await new sql.Request(dbTransaction)
            .input('matchId', sql.Int, existingMatch.recordset[0].ReconciliationMatchID)
            .input('approvedBy', sql.Int, userId || null)
            .input('reason', sql.NVarChar, allocation.reason || 'Manual reallocation')
            .query(`UPDATE ReconciliationMatches SET
                      Status = 'Approved',
                      MatchReason = LEFT(CONCAT('Manual reallocation: ', @reason), 500),
                      ApprovedBy = @approvedBy,
                      ApprovedDate = GETDATE(),
                      UpdatedDate = GETDATE()
                    WHERE ReconciliationMatchID = @matchId`);
        } else {
          await new sql.Request(dbTransaction)
            .input('schoolId', sql.Int, schoolId)
            .input('transactionId', sql.Int, transactionId)
            .input('invoiceId', sql.Int, invoiceId)
            .input('approvedBy', sql.Int, userId || null)
            .input('reason', sql.NVarChar, allocation.reason || 'Manual reallocation')
            .query(`INSERT INTO ReconciliationMatches (SchoolID, TransactionID, InvoiceID, MatchScore, MatchReason, Status, ApprovedBy, ApprovedDate)
                    VALUES (@schoolId, @transactionId, @invoiceId, 100, LEFT(CONCAT('Manual reallocation: ', @reason), 500), 'Approved', @approvedBy, GETDATE())`);
        }
      }

      await dbTransaction.commit();
      return {
        ...updateResult.recordset[0],
        PreviousAllocation: previousAllocation,
        ReallocationReason: allocation.reason || null,
        AppliedAmount: appliedAmount,
        TargetInvoiceNumber: newInvoice?.InvoiceNumber || null
      };
    } catch (error) {
      await dbTransaction.rollback();
      throw error;
    }
  }

  async reverseInvoicePayment(dbTransaction, payment) {
    await new sql.Request(dbTransaction)
      .input('invoiceId', sql.Int, payment.invoiceId)
      .input('schoolId', sql.Int, payment.schoolId)
      .input('reverseAmount', sql.Decimal(10, 2), payment.amount)
      .query(`DECLARE @nextPaid DECIMAL(10,2);
              DECLARE @actualReverse DECIMAL(10,2);

              SELECT @actualReverse =
                CASE
                  WHEN ISNULL(AmountPaid, 0) < @reverseAmount THEN ISNULL(AmountPaid, 0)
                  ELSE @reverseAmount
                END
              FROM Invoices WITH (UPDLOCK, HOLDLOCK)
              WHERE InvoiceID = @invoiceId AND SchoolID = @schoolId AND IsDeleted = 0;

              IF @actualReverse IS NULL SET @actualReverse = 0;

              SELECT @nextPaid =
                CASE
                  WHEN ISNULL(AmountPaid, 0) - @actualReverse < 0 THEN 0
                  ELSE ISNULL(AmountPaid, 0) - @actualReverse
                END
              FROM Invoices
              WHERE InvoiceID = @invoiceId AND SchoolID = @schoolId AND IsDeleted = 0;

              UPDATE Invoices SET
                AmountPaid = @nextPaid,
                Status = CASE
                  WHEN @nextPaid >= Amount THEN 'Paid'
                  WHEN @nextPaid > 0 THEN 'Partial'
                  WHEN DueDate IS NOT NULL AND DueDate < GETDATE() THEN 'Overdue'
                  ELSE 'Pending'
                END,
                PaidDate = CASE WHEN @nextPaid >= Amount THEN PaidDate ELSE NULL END,
                UpdatedDate = GETDATE()
              WHERE InvoiceID = @invoiceId AND SchoolID = @schoolId AND IsDeleted = 0`);
  }

  async applyInvoicePayment(dbTransaction, payment) {
    await new sql.Request(dbTransaction)
      .input('invoiceId', sql.Int, payment.invoiceId)
      .input('paymentAmount', sql.Decimal(10, 2), payment.amount)
      .input('paymentDate', sql.DateTime, payment.paymentDate || new Date())
      .query(`UPDATE Invoices SET
                AmountPaid = ISNULL(AmountPaid, 0) + @paymentAmount,
                Status = CASE WHEN ISNULL(AmountPaid, 0) + @paymentAmount >= Amount THEN 'Paid' ELSE 'Partial' END,
                PaidDate = CASE WHEN ISNULL(AmountPaid, 0) + @paymentAmount >= Amount THEN @paymentDate ELSE PaidDate END,
                UpdatedDate = GETDATE()
              WHERE InvoiceID = @invoiceId AND IsDeleted = 0`);
  }

  async getTransactionsByBankStatement(statementId, schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('statementId', sql.Int, statementId)
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT t.TransactionID, t.TransactionDate, t.Reference, t.Description,
                t.Amount, t.TransactionType, t.AllocationStatus, t.AllocationType,
                t.PaymentMethod, t.InvoiceID, t.FamilyID, t.StudentID, t.AllocatedBy, t.AllocatedDate,
                i.InvoiceNumber,
                s.FirstName AS AllocatedStudentFirstName, s.LastName AS AllocatedStudentLastName,
                f.FamilyName AS AllocatedFamilyName,
                au.Email AS AllocatedByEmail
              FROM Transactions t
              LEFT JOIN Invoices i ON t.InvoiceID = i.InvoiceID AND i.SchoolID = t.SchoolID
              LEFT JOIN Students s ON COALESCE(t.StudentID, i.StudentID) = s.StudentID AND s.SchoolID = t.SchoolID
              LEFT JOIN Families f ON COALESCE(t.FamilyID, s.FamilyID) = f.FamilyID AND f.SchoolID = t.SchoolID
              LEFT JOIN Users au ON t.AllocatedBy = au.UserID
              WHERE t.BankStatementID = @statementId AND t.SchoolID = @schoolId
              ORDER BY t.TransactionDate ASC, t.CreatedDate ASC`);
    return result.recordset;
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
        t.BankTransactionKey, t.BankStatementID, t.InvoiceID, t.FamilyID, t.StudentID,
        t.AllocatedBy, t.AllocatedDate,
        CASE WHEN t.Amount >= 0 THEN t.Amount ELSE 0 END AS CreditAmount,
        CASE WHEN t.Amount < 0 THEN ABS(t.Amount) ELSE 0 END AS DebitAmount,
        i.InvoiceNumber,
        s.FirstName AS AllocatedStudentFirstName, s.LastName AS AllocatedStudentLastName,
        f.FamilyName AS AllocatedFamilyName,
        b.FileName AS BankStatementFile,
        au.Email AS AllocatedByEmail
      FROM Transactions t
      LEFT JOIN Invoices i ON t.InvoiceID = i.InvoiceID AND i.SchoolID = t.SchoolID
      LEFT JOIN Students s ON COALESCE(t.StudentID, i.StudentID) = s.StudentID AND s.SchoolID = t.SchoolID
      LEFT JOIN Families f ON COALESCE(t.FamilyID, s.FamilyID) = f.FamilyID AND f.SchoolID = t.SchoolID
      LEFT JOIN BankStatements b ON t.BankStatementID = b.BankStatementID AND b.SchoolID = t.SchoolID
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

  async getOutstandingInvoicesForStudent(studentId, schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('studentId', sql.Int, studentId)
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT i.InvoiceID, i.InvoiceNumber, i.Amount, ISNULL(i.AmountPaid, 0) AS AmountPaid,
                i.Amount - ISNULL(i.AmountPaid, 0) AS Remaining, i.Status, i.DueDate, i.IssueDate,
                s.StudentID, s.FirstName, s.LastName, s.ClassName,
                f.FamilyID, f.FamilyName
              FROM Invoices i
              INNER JOIN Students s ON i.StudentID = s.StudentID AND s.SchoolID = i.SchoolID
              LEFT JOIN Families f ON s.FamilyID = f.FamilyID AND f.SchoolID = i.SchoolID
              WHERE i.StudentID = @studentId
                AND i.SchoolID = @schoolId
                AND i.Status <> 'Paid'
                AND i.IsDeleted = 0
              ORDER BY i.DueDate ASC`);
    return result.recordset;
  }

  async getOutstandingInvoicesForFamily(familyId, schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('familyId', sql.Int, familyId)
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT i.InvoiceID, i.InvoiceNumber, i.Amount, ISNULL(i.AmountPaid, 0) AS AmountPaid,
                i.Amount - ISNULL(i.AmountPaid, 0) AS Remaining, i.Status, i.DueDate, i.IssueDate,
                s.StudentID, s.FirstName, s.LastName, s.ClassName,
                f.FamilyID, f.FamilyName
              FROM Invoices i
              INNER JOIN Students s ON i.StudentID = s.StudentID AND s.SchoolID = i.SchoolID
              INNER JOIN Families f ON s.FamilyID = f.FamilyID AND f.SchoolID = i.SchoolID
              WHERE f.FamilyID = @familyId
                AND i.SchoolID = @schoolId
                AND i.Status <> 'Paid'
                AND i.IsDeleted = 0
              ORDER BY i.DueDate ASC, i.IssueDate ASC`);
    return result.recordset;
  }

  async getPreviousAllocationsForReference(schoolId, reference, description, transactionId, transactionDate) {
    const normalizedReference = String(reference || '').trim().toUpperCase();
    const normalizedDescription = String(description || '').trim().toUpperCase();

    if (!normalizedReference && !normalizedDescription) {
      return [];
    }

    const monthStart = transactionDate
      ? new Date(new Date(transactionDate).getFullYear(), new Date(transactionDate).getMonth(), 1)
      : new Date();

    const pool = await getPool();
    const req = pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('transactionId', sql.Int, transactionId)
      .input('monthStart', sql.DateTime, monthStart)
      .input('reference', sql.NVarChar, normalizedReference)
      .input('description', sql.NVarChar, normalizedDescription);

      const result = await req.query(`SELECT TOP 5 t.TransactionID, t.TransactionDate, t.Reference, t.Description,
                t.InvoiceID, COALESCE(t.FamilyID, s.FamilyID) AS FamilyID, COALESCE(t.StudentID, i.StudentID) AS StudentID, t.AllocationType, t.AllocatedDate,
                i.InvoiceNumber,
                s.FirstName, s.LastName, s.ClassName,
                f.FamilyName
              FROM Transactions t
              LEFT JOIN Invoices i ON t.InvoiceID = i.InvoiceID AND i.SchoolID = t.SchoolID
              LEFT JOIN Students s ON COALESCE(t.StudentID, i.StudentID) = s.StudentID AND s.SchoolID = t.SchoolID
              LEFT JOIN Families f ON COALESCE(t.FamilyID, s.FamilyID) = f.FamilyID AND f.SchoolID = t.SchoolID
              WHERE t.SchoolID = @schoolId
                AND t.TransactionID <> @transactionId
                AND t.AllocationStatus = 'Allocated'
                AND t.TransactionDate < @monthStart
                AND (t.InvoiceID IS NOT NULL OR t.FamilyID IS NOT NULL OR t.StudentID IS NOT NULL)
                AND (
                  (@reference <> '' AND UPPER(LTRIM(RTRIM(ISNULL(t.Reference, '')))) = @reference)
                  OR (@description <> '' AND UPPER(LTRIM(RTRIM(ISNULL(t.Description, '')))) = @description)
                )
              ORDER BY t.AllocatedDate DESC, t.TransactionDate DESC`);
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
        .query(`SELECT i.*, s.FamilyID
                FROM Invoices i
                LEFT JOIN Students s ON i.StudentID = s.StudentID AND s.SchoolID = i.SchoolID
                WHERE i.InvoiceID = @invoiceId AND i.IsDeleted = 0`);
      const invoice = invoiceResult.recordset[0];

      if (!invoice || invoice.SchoolID !== bankTransaction.SchoolID || invoice.Status === 'Paid') {
        throw new Error('Invoice is not available for this bank transaction');
      }

      const remaining = Number(invoice.Amount) - Number(invoice.AmountPaid || 0);
      const paymentAmount = Number(bankTransaction.Amount || 0);
      const paymentDate = bankTransaction.TransactionDate || new Date();

      if (paymentAmount <= 0 || paymentAmount > remaining) {
        throw new Error(`Bank amount exceeds remaining invoice balance of ${remaining.toFixed(2)}`);
      }

      await new sql.Request(dbTransaction)
        .input('invoiceId', sql.Int, invoiceId)
        .input('paymentAmount', sql.Decimal(10, 2), paymentAmount)
        .input('paymentDate', sql.DateTime, paymentDate)
        .query(`UPDATE Invoices SET
                  AmountPaid = ISNULL(AmountPaid, 0) + @paymentAmount,
                  Status = CASE WHEN ISNULL(AmountPaid, 0) + @paymentAmount >= Amount THEN 'Paid' ELSE 'Partial' END,
                  PaidDate = CASE WHEN ISNULL(AmountPaid, 0) + @paymentAmount >= Amount THEN @paymentDate ELSE PaidDate END,
                  UpdatedDate = GETDATE()
                WHERE InvoiceID = @invoiceId`);

      const updateTxResult = await new sql.Request(dbTransaction)
        .input('transactionId', sql.Int, transactionId)
        .input('invoiceId', sql.Int, invoiceId)
        .input('studentId', sql.Int, invoice.StudentID || null)
        .input('familyId', sql.Int, invoice.FamilyID || null)
        .input('allocatedBy', sql.Int, approvedBy || null)
        .query(`UPDATE Transactions SET
                  InvoiceID = @invoiceId,
                  StudentID = @studentId,
                  FamilyID = @familyId,
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
