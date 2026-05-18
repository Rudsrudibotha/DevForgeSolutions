const { getPool, sql } = require('./db');

class ReportRepository {
  yearRange(year) {
    return {
      startDate: `${year}-01-01`,
      endDate: `${year + 1}-01-01`
    };
  }

  classFilter(className, alias = 's') {
    return className ? ` AND ${alias}.ClassName = @className` : '';
  }

  async getSchoolReportData(schoolId, filters) {
    const year = filters.year;
    const className = filters.className || null;
    const { startDate, endDate } = this.yearRange(year);

    const [
      school,
      classOptions,
      students,
      invoices,
      transactions,
      attendance,
      admissions,
      consent,
      reEnrolment,
      yearEnd,
      balancesForward
    ] = await Promise.all([
      this.getSchool(schoolId),
      this.getClassOptions(schoolId, year),
      this.getStudents(schoolId, startDate, endDate, className),
      this.getInvoices(schoolId, startDate, endDate, className),
      this.getTransactions(schoolId, startDate, endDate, className),
      this.getAttendance(schoolId, startDate, endDate, className),
      this.getAdmissions(schoolId, startDate, endDate, className),
      this.getConsent(schoolId, startDate, endDate, className),
      this.getReEnrolment(schoolId, year, className),
      this.getYearEnd(schoolId, year),
      this.getBalancesForward(schoolId, year)
    ]);

    return {
      school,
      classOptions,
      students,
      invoices,
      transactions,
      attendance,
      admissions,
      consent,
      reEnrolment,
      yearEnd,
      balancesForward
    };
  }

  async getSchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT SchoolID, SchoolName, Address, ContactPerson, ContactEmail, ContactPhone,
                RegistrationNumber, LogoUrl, CurrencyCode, CurrencySymbol
              FROM Schools
              WHERE SchoolID = @schoolId`);
    return result.recordset[0] || null;
  }

  async getClassOptions(schoolId, year) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('year', sql.Int, year)
      .query(`SELECT DISTINCT ClassName
              FROM (
                SELECT ClassName
                FROM Classes
                WHERE SchoolID = @schoolId
                  AND ISNULL(IsActive, 1) = 1
                  AND (ActiveYear = @year OR @year IS NULL)
                  AND ClassName IS NOT NULL
                UNION
                SELECT ClassName
                FROM Students
                WHERE SchoolID = @schoolId
                  AND ClassName IS NOT NULL
              ) classes
              ORDER BY ClassName`);
    return result.recordset;
  }

  async getStudents(schoolId, startDate, endDate, className) {
    const pool = await getPool();
    const req = pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate);
    if (className) req.input('className', sql.NVarChar, className);

    const result = await req.query(`SELECT s.StudentID, s.FirstName, s.LastName, s.ClassName, s.CurrentAcademicYear,
                s.DateOfBirth, s.Gender, s.Ethnicity, s.EnrolledDate, s.IsActive, s.DepartureDate,
                s.DepartureReason, s.ResponsiblePayerName, f.FamilyName
              FROM Students s
              LEFT JOIN Families f ON f.FamilyID = s.FamilyID AND f.SchoolID = s.SchoolID
              WHERE s.SchoolID = @schoolId
                AND s.EnrolledDate < @endDate
                AND (s.DepartureDate IS NULL OR s.DepartureDate >= @startDate)
                ${this.classFilter(className)}
              ORDER BY s.ClassName, s.LastName, s.FirstName`);
    return result.recordset;
  }

  async getInvoices(schoolId, startDate, endDate, className) {
    const pool = await getPool();
    const req = pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('startDate', sql.DateTime, startDate)
      .input('endDate', sql.DateTime, endDate);
    if (className) req.input('className', sql.NVarChar, className);

    const result = await req.query(`SELECT i.InvoiceID, i.InvoiceNumber, i.StudentID, i.Amount,
                ISNULL(i.AmountPaid, 0) AS AmountPaid, i.Status, i.IssueDate, i.DueDate, i.PaidDate,
                i.Description, s.FirstName, s.LastName, s.ClassName, bc.CategoryName
              FROM Invoices i
              LEFT JOIN Students s ON s.StudentID = i.StudentID AND s.SchoolID = i.SchoolID
              LEFT JOIN BillingCategories bc ON bc.BillingCategoryID = i.BillingCategoryID AND bc.SchoolID = i.SchoolID
              WHERE i.SchoolID = @schoolId
                AND ISNULL(i.IsDeleted, 0) = 0
                AND i.IssueDate >= @startDate
                AND i.IssueDate < @endDate
                ${this.classFilter(className)}
              ORDER BY i.IssueDate, i.InvoiceID`);
    return result.recordset;
  }

  async getTransactions(schoolId, startDate, endDate, className) {
    const pool = await getPool();
    const req = pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('startDate', sql.DateTime, startDate)
      .input('endDate', sql.DateTime, endDate);
    if (className) req.input('className', sql.NVarChar, className);

    const result = await req.query(`SELECT t.TransactionID, t.InvoiceID, t.StudentID, t.FamilyID, t.ReceiptNumber,
                t.PaymentMethod, t.PayeeName, t.Reference, t.Description, t.TransactionType,
                t.Amount, t.TransactionDate, t.AllocationStatus, t.AllocationType,
                s.FirstName, s.LastName, s.ClassName
              FROM Transactions t
              LEFT JOIN Invoices i ON i.InvoiceID = t.InvoiceID AND i.SchoolID = t.SchoolID
              LEFT JOIN Students s ON s.StudentID = COALESCE(t.StudentID, i.StudentID) AND s.SchoolID = t.SchoolID
              WHERE t.SchoolID = @schoolId
                AND t.TransactionDate >= @startDate
                AND t.TransactionDate < @endDate
                ${this.classFilter(className)}
              ORDER BY t.TransactionDate, t.TransactionID`);
    return result.recordset;
  }

  async getAttendance(schoolId, startDate, endDate, className) {
    const pool = await getPool();
    const req = pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate);
    if (className) req.input('className', sql.NVarChar, className);

    const result = await req.query(`SELECT a.AttendanceID, a.StudentID, a.AttendanceDate, a.Status,
                CONVERT(VARCHAR(5), a.ArrivalTime, 108) AS ArrivalTimeDisplay,
                CONVERT(VARCHAR(5), a.DepartureTime, 108) AS DepartureTimeDisplay,
                s.FirstName, s.LastName, s.ClassName
              FROM Attendance a
              INNER JOIN Students s ON s.StudentID = a.StudentID AND s.SchoolID = a.SchoolID
              WHERE a.SchoolID = @schoolId
                AND a.AttendanceDate >= @startDate
                AND a.AttendanceDate < @endDate
                ${this.classFilter(className)}
              ORDER BY a.AttendanceDate, s.ClassName, s.LastName`);
    return result.recordset;
  }

  async getAdmissions(schoolId, startDate, endDate, className) {
    const pool = await getPool();
    const req = pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate);
    const classClause = className ? ' AND a.ClassName = @className' : '';
    if (className) req.input('className', sql.NVarChar, className);

    const result = await req.query(`SELECT a.AdmissionID, a.FirstName, a.LastName, a.ClassName, a.Status,
                a.AppliedDate, a.EnrolledDate, f.FamilyName
              FROM Admissions a
              LEFT JOIN Families f ON f.FamilyID = a.FamilyID AND f.SchoolID = a.SchoolID
              WHERE a.SchoolID = @schoolId
                AND a.AppliedDate >= @startDate
                AND a.AppliedDate < @endDate
                ${classClause}
              ORDER BY a.AppliedDate DESC, a.LastName`);
    return result.recordset;
  }

  async getConsent(schoolId, startDate, endDate, className) {
    const pool = await getPool();
    const req = pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('startDate', sql.DateTime, startDate)
      .input('endDate', sql.DateTime, endDate);
    if (className) req.input('className', sql.NVarChar, className);

    const result = await req.query(`SELECT cr.ConsentID, cr.ConsentRequestID, cr.ConsentType, cr.Response,
                cr.ResponseDate, cr.CreatedDate, cr.SignatureName,
                req.Title AS RequestTitle, req.DueDate, req.ActivityDate, req.TargetScope, req.TargetValue,
                s.StudentID, s.FirstName, s.LastName, s.ClassName
              FROM ConsentRecords cr
              INNER JOIN Students s ON s.StudentID = cr.StudentID AND s.SchoolID = cr.SchoolID
              LEFT JOIN ConsentRequests req ON req.ConsentRequestID = cr.ConsentRequestID AND req.SchoolID = cr.SchoolID
              WHERE cr.SchoolID = @schoolId
                AND COALESCE(req.CreatedDate, cr.CreatedDate) >= @startDate
                AND COALESCE(req.CreatedDate, cr.CreatedDate) < @endDate
                ${this.classFilter(className)}
              ORDER BY COALESCE(req.CreatedDate, cr.CreatedDate) DESC, s.LastName`);
    return result.recordset;
  }

  async getReEnrolment(schoolId, year, className) {
    const pool = await getPool();
    const req = pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('year', sql.Int, year);
    const classClause = className ? ' AND (r.PreviousClassName = @className OR r.NewClassName = @className)' : '';
    if (className) req.input('className', sql.NVarChar, className);

    const result = await req.query(`SELECT r.*, s.FirstName, s.LastName, s.ClassName AS CurrentClassName
              FROM ReEnrolment r
              INNER JOIN Students s ON s.StudentID = r.StudentID AND s.SchoolID = r.SchoolID
              WHERE r.SchoolID = @schoolId
                AND r.AcademicYear = @year
                ${classClause}
              ORDER BY s.LastName, s.FirstName`);
    return result.recordset;
  }

  async getYearEnd(schoolId, year) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('year', sql.Int, year)
      .query(`SELECT *
              FROM YearEndClosing
              WHERE SchoolID = @schoolId AND FinancialYear = @year
              ORDER BY FinancialYear DESC`);
    return result.recordset;
  }

  async getBalancesForward(schoolId, year) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('year', sql.Int, year)
      .query(`SELECT bbf.*, s.FirstName, s.LastName, s.ClassName
              FROM BalanceBroughtForward bbf
              INNER JOIN Students s ON s.StudentID = bbf.StudentID AND s.SchoolID = bbf.SchoolID
              WHERE bbf.SchoolID = @schoolId
                AND (bbf.FromYear = @year OR bbf.ToYear = @year)
              ORDER BY s.LastName, s.FirstName`);
    return result.recordset;
  }
}

module.exports = ReportRepository;
