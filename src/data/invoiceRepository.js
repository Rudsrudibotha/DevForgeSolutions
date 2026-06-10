// Data Layer - Invoice repository

const { getPool, sql } = require('./db');

class InvoiceRepository {
  async getAllInvoices(options = {}) {
    const pool = await getPool();
    const req = pool.request();
    let where = 'WHERE i.IsDeleted = 0';

    if (options.status) {
      req.input('status', sql.NVarChar, options.status);
      where += ' AND i.Status = @status';
    }
    if (options.studentId) {
      req.input('studentId', sql.Int, options.studentId);
      where += ' AND i.StudentID = @studentId';
    }
    if (options.className) {
      req.input('className', sql.NVarChar, options.className);
      where += ' AND s.ClassName = @className';
    }
    if (options.month) {
      req.input('month', sql.Int, options.month);
      where += ' AND MONTH(i.IssueDate) = @month';
    }
    if (options.year) {
      req.input('year', sql.Int, options.year);
      where += ' AND YEAR(i.IssueDate) = @year';
    }
    if (options.search) {
      req.input('search', sql.NVarChar, `%${options.search}%`);
      where += ' AND (i.InvoiceNumber LIKE @search OR i.Description LIKE @search OR s.FirstName LIKE @search OR s.LastName LIKE @search)';
    }
    if (options.fromDate) {
      req.input('fromDate', sql.DateTime, options.fromDate);
      where += ' AND i.IssueDate >= @fromDate';
    }
    if (options.toDate) {
      req.input('toDate', sql.DateTime, options.toDate);
      where += ' AND i.IssueDate < @toDate';
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(200, Math.max(1, options.limit || 50));
    const offset = (page - 1) * limit;
    req.input('limit', sql.Int, limit);
    req.input('offset', sql.Int, offset);

    const result = await req.query(`
      SELECT i.*, s.FirstName, s.LastName, s.ClassName, s.FamilyID, f.FamilyName, bc.CategoryName
      FROM Invoices i
      LEFT JOIN Students s ON i.StudentID = s.StudentID
      LEFT JOIN Families f ON s.FamilyID = f.FamilyID AND f.SchoolID = i.SchoolID
      LEFT JOIN BillingCategories bc ON i.BillingCategoryID = bc.BillingCategoryID
      ${where}
      ORDER BY i.IssueDate DESC, i.InvoiceID DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    return result.recordset;
  }

  async getInvoiceById(id) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT i.*, s.FirstName, s.LastName, s.ClassName, s.FamilyID, f.FamilyName, bc.CategoryName
        FROM Invoices i
        LEFT JOIN Students s ON i.StudentID = s.StudentID
        LEFT JOIN Families f ON s.FamilyID = f.FamilyID AND f.SchoolID = i.SchoolID
        LEFT JOIN BillingCategories bc ON i.BillingCategoryID = bc.BillingCategoryID
        WHERE i.InvoiceID = @id AND i.IsDeleted = 0
      `);
    return result.recordset[0];
  }

  async getInvoicesBySchool(schoolId, options = {}) {
    const pool = await getPool();
    const req = pool.request().input('schoolId', sql.Int, schoolId);
    let where = 'WHERE i.SchoolID = @schoolId AND i.IsDeleted = 0';

    if (options.status) {
      req.input('status', sql.NVarChar, options.status);
      where += ' AND i.Status = @status';
    }
    if (options.studentId) {
      req.input('studentId', sql.Int, options.studentId);
      where += ' AND i.StudentID = @studentId';
    }
    if (options.className) {
      req.input('className', sql.NVarChar, options.className);
      where += ' AND s.ClassName = @className';
    }
    if (options.month) {
      req.input('month', sql.Int, options.month);
      where += ' AND MONTH(i.IssueDate) = @month';
    }
    if (options.year) {
      req.input('year', sql.Int, options.year);
      where += ' AND YEAR(i.IssueDate) = @year';
    }
    if (options.search) {
      req.input('search', sql.NVarChar, `%${options.search}%`);
      where += ' AND (i.InvoiceNumber LIKE @search OR i.Description LIKE @search OR s.FirstName LIKE @search OR s.LastName LIKE @search)';
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(200, Math.max(1, options.limit || 50));
    const offset = (page - 1) * limit;
    req.input('limit', sql.Int, limit);
    req.input('offset', sql.Int, offset);

    const result = await req.query(`
      SELECT i.*, s.FirstName, s.LastName, s.ClassName, s.FamilyID, f.FamilyName, bc.CategoryName
      FROM Invoices i
      LEFT JOIN Students s ON i.StudentID = s.StudentID
      LEFT JOIN Families f ON s.FamilyID = f.FamilyID AND f.SchoolID = i.SchoolID
      LEFT JOIN BillingCategories bc ON i.BillingCategoryID = bc.BillingCategoryID
      ${where}
      ORDER BY i.IssueDate DESC, i.InvoiceID DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    return result.recordset;
  }

  // Invoices for a specific student (parent portal)
  async getInvoicesByStudent(studentId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('studentId', sql.Int, studentId)
      .query(`SELECT * FROM Invoices WHERE StudentID = @studentId AND IsDeleted = 0
              ORDER BY IssueDate DESC`);
    return result.recordset;
  }

  async getInvoicesByParentUserId(userId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`SELECT i.*
              FROM Invoices i
              INNER JOIN Students s ON i.StudentID = s.StudentID
              INNER JOIN ParentLinks pl ON pl.FamilyID = s.FamilyID AND pl.SchoolID = i.SchoolID
              INNER JOIN Schools sch ON sch.SchoolID = pl.SchoolID
              WHERE pl.UserID = @userId
                AND i.IsDeleted = 0
                AND sch.SubscriptionStatus = 'Active'
              ORDER BY i.IssueDate DESC`);
    return result.recordset;
  }

  async getInvoicesByStudentForSchool(studentId, schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('studentId', sql.Int, studentId)
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT i.*, s.FirstName, s.LastName, s.ClassName, s.FamilyID, f.FamilyName, bc.CategoryName
              FROM Invoices i
              INNER JOIN Students s ON i.StudentID = s.StudentID AND s.SchoolID = i.SchoolID
              LEFT JOIN Families f ON s.FamilyID = f.FamilyID AND f.SchoolID = i.SchoolID
              LEFT JOIN BillingCategories bc ON i.BillingCategoryID = bc.BillingCategoryID AND bc.SchoolID = i.SchoolID
              WHERE i.StudentID = @studentId
                AND i.SchoolID = @schoolId
                AND i.IsDeleted = 0
              ORDER BY i.IssueDate DESC, i.InvoiceID DESC`);
    return result.recordset;
  }

  async getStudentWallet(studentId, schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('studentId', sql.Int, studentId)
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT TOP 1 *
              FROM StudentWallets
              WHERE StudentID = @studentId AND SchoolID = @schoolId`);
    return result.recordset[0] || null;
  }

  async getStudentWalletLedger(studentId, schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('studentId', sql.Int, studentId)
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT wl.*, i.InvoiceNumber, t.ReceiptNumber
              FROM StudentWalletLedger wl
              LEFT JOIN Invoices i ON wl.InvoiceID = i.InvoiceID AND i.SchoolID = wl.SchoolID
              LEFT JOIN Transactions t ON wl.TransactionID = t.TransactionID AND t.SchoolID = wl.SchoolID
              WHERE wl.StudentID = @studentId AND wl.SchoolID = @schoolId
              ORDER BY wl.EntryDate DESC, wl.WalletLedgerID DESC`);
    return result.recordset;
  }

  async getStudentTransactionsForSchool(studentId, schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('studentId', sql.Int, studentId)
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT t.*, i.InvoiceNumber
              FROM Transactions t
              LEFT JOIN Invoices i ON t.InvoiceID = i.InvoiceID AND i.SchoolID = t.SchoolID
              WHERE t.SchoolID = @schoolId
                AND (
                  t.StudentID = @studentId
                  OR i.StudentID = @studentId
                )
                AND t.TransactionType IN ('Payment','Credit')
              ORDER BY t.TransactionDate ASC, t.TransactionID ASC`);
    return result.recordset;
  }

  async getBalanceBroughtForwardForStudent(studentId, schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('studentId', sql.Int, studentId)
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT *
              FROM BalanceBroughtForward
              WHERE StudentID = @studentId AND SchoolID = @schoolId
              ORDER BY FromYear DESC, ToYear DESC`);
    return result.recordset;
  }

  async invoiceExistsForStudentMonth(studentId, yearMonth) {
    const pool = await getPool();
    const [year, month] = yearMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const result = await pool.request()
      .input('studentId', sql.Int, studentId)
      .input('startDate', sql.DateTime, startDate)
      .input('endDate', sql.DateTime, endDate)
      .query(`SELECT 1 FROM Invoices
              WHERE StudentID = @studentId AND IssueDate >= @startDate AND IssueDate < @endDate AND IsDeleted = 0`);
    return result.recordset.length > 0;
  }

  async getStudentsWithInvoiceForMonth(schoolId, yearMonth) {
    const pool = await getPool();
    const [year, month] = yearMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('startDate', sql.DateTime, startDate)
      .input('endDate', sql.DateTime, endDate)
      .query(`SELECT DISTINCT StudentID, BillingCategoryID FROM Invoices
              WHERE SchoolID = @schoolId AND IssueDate >= @startDate AND IssueDate < @endDate AND IsDeleted = 0`);
    return new Set(result.recordset.map((row) => `${row.StudentID}:${row.BillingCategoryID || 'none'}`));
  }

  async createInvoice(invoiceData) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, invoiceData.schoolId)
      .input('studentId', sql.Int, invoiceData.studentId || null)
      .input('billingCategoryId', sql.Int, invoiceData.billingCategoryId || null)
      .input('invoiceNumber', sql.NVarChar, invoiceData.invoiceNumber)
      .input('amount', sql.Decimal(10,2), invoiceData.amount)
      .input('amountPaid', sql.Decimal(10,2), invoiceData.amountPaid || 0)
      .input('description', sql.NVarChar, invoiceData.description)
      .input('status', sql.NVarChar, invoiceData.status || 'Pending')
      .input('dueDate', sql.DateTime, invoiceData.dueDate)
      .query(`INSERT INTO Invoices (SchoolID, StudentID, BillingCategoryID, InvoiceNumber, Amount, AmountPaid, Description, Status, DueDate)
              OUTPUT INSERTED.*
              VALUES (@schoolId, @studentId, @billingCategoryId, @invoiceNumber, @amount, @amountPaid, @description, @status, @dueDate)`);
    return result.recordset[0];
  }

  async updateInvoice(id, invoiceData) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('schoolId', sql.Int, invoiceData.schoolId)
      .input('studentId', sql.Int, invoiceData.studentId || null)
      .input('billingCategoryId', sql.Int, invoiceData.billingCategoryId || null)
      .input('invoiceNumber', sql.NVarChar, invoiceData.invoiceNumber)
      .input('amount', sql.Decimal(10,2), invoiceData.amount)
      .input('description', sql.NVarChar, invoiceData.description)
      .input('status', sql.NVarChar, invoiceData.status)
      .input('dueDate', sql.DateTime, invoiceData.dueDate)
      .input('paidDate', sql.DateTime, invoiceData.paidDate)
      .query(`UPDATE Invoices SET SchoolID = @schoolId, StudentID = @studentId, BillingCategoryID = @billingCategoryId, InvoiceNumber = @invoiceNumber, Amount = @amount,
              Description = @description, Status = @status, DueDate = @dueDate, PaidDate = @paidDate,
              UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE InvoiceID = @id AND IsDeleted = 0`);
    return result.recordset[0];
  }

  // Soft delete
  async deleteInvoice(id) {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .query(`UPDATE Invoices SET IsDeleted = 1, UpdatedDate = GETDATE() WHERE InvoiceID = @id`);
    return { message: 'Invoice deleted' };
  }

  async cancelUnpaidInvoicesAfterStudentDeparture(studentId, schoolId, departureDate) {
    const pool = await getPool();
    const result = await pool.request()
      .input('studentId', sql.Int, studentId)
      .input('schoolId', sql.Int, schoolId)
      .input('departureDate', sql.Date, departureDate)
      .query(`UPDATE Invoices
              SET Status = 'Cancelled',
                  IsDeleted = 1,
                  UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE StudentID = @studentId
                AND SchoolID = @schoolId
                AND IsDeleted = 0
                AND ISNULL(AmountPaid, 0) = 0
                AND CAST(IssueDate AS date) > @departureDate
                AND Status IN ('Pending', 'Overdue')`);
    return result.recordset;
  }

  // Partial payment
  async recordPartialPayment(id, paymentAmount, paymentDate = null) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('paymentAmount', sql.Decimal(10,2), paymentAmount)
      .input('paymentDate', sql.DateTime, paymentDate || new Date())
      .query(`UPDATE Invoices SET
                AmountPaid = ISNULL(AmountPaid, 0) + @paymentAmount,
                Status = CASE WHEN ISNULL(AmountPaid, 0) + @paymentAmount >= Amount THEN 'Paid' ELSE 'Partial' END,
                PaidDate = CASE WHEN ISNULL(AmountPaid, 0) + @paymentAmount >= Amount THEN @paymentDate ELSE PaidDate END,
                UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE InvoiceID = @id AND IsDeleted = 0`);
    return result.recordset[0];
  }

  async getOutstandingFeesExport(schoolId, year) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('year', sql.Int, year || new Date().getFullYear())
      .query(`
        SELECT s.StudentID, s.FirstName, s.LastName, s.ClassName,
          f.FamilyName AS FamilyCode,
          f.PrimaryParentPhone, f.SecondaryParentPhone,
          COALESCE(s.ResponsiblePayerName, f.PrimaryParentName) AS ResponsiblePayer,
          COALESCE(s.ResponsiblePayerPhone, f.PrimaryParentPhone) AS ResponsiblePayerPhone,
          COALESCE(s.ResponsiblePayerEmail, f.PrimaryParentEmail) AS ResponsiblePayerEmail,
          ISNULL(SUM(CASE WHEN MONTH(i.IssueDate) = 1 THEN i.Amount - ISNULL(i.AmountPaid,0) ELSE 0 END), 0) AS Month1,
          ISNULL(SUM(CASE WHEN MONTH(i.IssueDate) = 2 THEN i.Amount - ISNULL(i.AmountPaid,0) ELSE 0 END), 0) AS Month2,
          ISNULL(SUM(CASE WHEN MONTH(i.IssueDate) = 3 THEN i.Amount - ISNULL(i.AmountPaid,0) ELSE 0 END), 0) AS Month3,
          ISNULL(SUM(CASE WHEN MONTH(i.IssueDate) = 4 THEN i.Amount - ISNULL(i.AmountPaid,0) ELSE 0 END), 0) AS Month4,
          ISNULL(SUM(CASE WHEN MONTH(i.IssueDate) = 5 THEN i.Amount - ISNULL(i.AmountPaid,0) ELSE 0 END), 0) AS Month5,
          ISNULL(SUM(CASE WHEN MONTH(i.IssueDate) = 6 THEN i.Amount - ISNULL(i.AmountPaid,0) ELSE 0 END), 0) AS Month6,
          ISNULL(SUM(CASE WHEN MONTH(i.IssueDate) = 7 THEN i.Amount - ISNULL(i.AmountPaid,0) ELSE 0 END), 0) AS Month7,
          ISNULL(SUM(CASE WHEN MONTH(i.IssueDate) = 8 THEN i.Amount - ISNULL(i.AmountPaid,0) ELSE 0 END), 0) AS Month8,
          ISNULL(SUM(CASE WHEN MONTH(i.IssueDate) = 9 THEN i.Amount - ISNULL(i.AmountPaid,0) ELSE 0 END), 0) AS Month9,
          ISNULL(SUM(CASE WHEN MONTH(i.IssueDate) = 10 THEN i.Amount - ISNULL(i.AmountPaid,0) ELSE 0 END), 0) AS Month10,
          ISNULL(SUM(CASE WHEN MONTH(i.IssueDate) = 11 THEN i.Amount - ISNULL(i.AmountPaid,0) ELSE 0 END), 0) AS Month11,
          ISNULL(SUM(CASE WHEN MONTH(i.IssueDate) = 12 THEN i.Amount - ISNULL(i.AmountPaid,0) ELSE 0 END), 0) AS Month12,
          ISNULL(SUM(i.Amount - ISNULL(i.AmountPaid,0)), 0) AS TotalOutstanding,
          sc.SchoolName,
          ptp.Status AS PromiseToPayStatus,
          ptp.PromisedDate AS PromisedPaymentDate
        FROM Invoices i
        INNER JOIN Students s ON i.StudentID = s.StudentID
        INNER JOIN Families f ON s.FamilyID = f.FamilyID
        INNER JOIN Schools sc ON i.SchoolID = sc.SchoolID
        LEFT JOIN (
          SELECT FamilyID, Status, PromisedDate,
            ROW_NUMBER() OVER (PARTITION BY FamilyID ORDER BY CreatedDate DESC) AS rn
          FROM PromiseToPay
        ) ptp ON f.FamilyID = ptp.FamilyID AND ptp.rn = 1
        WHERE i.SchoolID = @schoolId AND i.IsDeleted = 0 AND i.Status <> 'Paid'
          AND YEAR(i.IssueDate) = @year
        GROUP BY s.StudentID, s.FirstName, s.LastName, s.ClassName,
          f.FamilyName, f.PrimaryParentPhone, f.SecondaryParentPhone, f.PrimaryParentName, f.PrimaryParentEmail,
          s.ResponsiblePayerName, s.ResponsiblePayerPhone, s.ResponsiblePayerEmail,
          sc.SchoolName, ptp.Status, ptp.PromisedDate
        HAVING SUM(i.Amount - ISNULL(i.AmountPaid,0)) > 0
        ORDER BY s.LastName, s.FirstName
      `);
    return result.recordset;
  }

  // Flag overdue invoices
  async flagOverdueInvoices() {
    const pool = await getPool();
    const result = await pool.request()
      .query(`UPDATE Invoices SET Status = 'Overdue', UpdatedDate = GETDATE()
              WHERE Status = 'Pending' AND DueDate < GETDATE() AND IsDeleted = 0`);
    return result.rowsAffected[0];
  }
}

module.exports = InvoiceRepository;
