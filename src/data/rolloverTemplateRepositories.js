// Data Layer - Re-enrolment, School Templates, Platform Usage repositories

const { getPool, sql } = require('./db');

class ReEnrolmentRepository {
  async getBySchoolAndYear(schoolId, academicYear) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('academicYear', sql.Int, academicYear)
      .query(`SELECT r.*, s.FirstName, s.LastName, s.ClassName AS CurrentClassName
              FROM ReEnrolment r
              INNER JOIN Students s ON r.StudentID = s.StudentID
              WHERE r.SchoolID = @schoolId AND r.AcademicYear = @academicYear
              ORDER BY s.LastName, s.FirstName`);
    return result.recordset;
  }

  async getPendingStudents(schoolId, academicYear) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('academicYear', sql.Int, academicYear)
      .query(`SELECT s.StudentID, s.FirstName, s.LastName, s.ClassName, s.BillingCategoryID,
                ISNULL(SUM(CASE WHEN i.Status IN ('Pending','Overdue','Partial') THEN i.Amount - ISNULL(i.AmountPaid, 0) ELSE 0 END), 0) AS OutstandingBalance,
                ISNULL(SUM(CASE WHEN i.Status = 'Paid' AND i.AmountPaid > i.Amount THEN i.AmountPaid - i.Amount ELSE 0 END), 0) AS AdvanceCredit
              FROM Students s
              LEFT JOIN Invoices i ON i.StudentID = s.StudentID AND i.IsDeleted = 0
              WHERE s.SchoolID = @schoolId AND s.IsActive = 1
                AND s.StudentID NOT IN (SELECT StudentID FROM ReEnrolment WHERE SchoolID = @schoolId AND AcademicYear = @academicYear)
              GROUP BY s.StudentID, s.FirstName, s.LastName, s.ClassName, s.BillingCategoryID
              ORDER BY s.LastName, s.FirstName`);
    return result.recordset;
  }

  async processStudent(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId)
      .input('academicYear', sql.Int, data.academicYear)
      .input('studentId', sql.Int, data.studentId)
      .input('previousClassName', sql.NVarChar, data.previousClassName || null)
      .input('newClassName', sql.NVarChar, data.newClassName || null)
      .input('action', sql.NVarChar, data.action)
      .input('balanceCarriedForward', sql.Decimal(10,2), data.balanceCarriedForward || 0)
      .input('advanceCreditCarriedForward', sql.Decimal(10,2), data.advanceCreditCarriedForward || 0)
      .input('processedBy', sql.Int, data.processedBy || null)
      .query(`INSERT INTO ReEnrolment (SchoolID, AcademicYear, StudentID, PreviousClassName, NewClassName,
                Action, BalanceCarriedForward, AdvanceCreditCarriedForward, ProcessedBy)
              OUTPUT INSERTED.*
              VALUES (@schoolId, @academicYear, @studentId, @previousClassName, @newClassName,
                @action, @balanceCarriedForward, @advanceCreditCarriedForward, @processedBy)`);
    return result.recordset[0];
  }
}

class SchoolTemplateRepository {
  async getAll() {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT * FROM SchoolTemplates WHERE IsActive = 1 ORDER BY TemplateName');
    return result.recordset;
  }

  async getById(id) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM SchoolTemplates WHERE TemplateID = @id');
    return result.recordset[0];
  }

  async create(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('templateName', sql.NVarChar, data.templateName)
      .input('description', sql.NVarChar, data.description || null)
      .input('defaultBillingTerms', sql.NVarChar(sql.MAX), data.defaultBillingTerms ? JSON.stringify(data.defaultBillingTerms) : null)
      .input('defaultRoles', sql.NVarChar(sql.MAX), data.defaultRoles ? JSON.stringify(data.defaultRoles) : null)
      .input('defaultDashboardSettings', sql.NVarChar(sql.MAX), data.defaultDashboardSettings ? JSON.stringify(data.defaultDashboardSettings) : null)
      .input('defaultNotificationSettings', sql.NVarChar(sql.MAX), data.defaultNotificationSettings ? JSON.stringify(data.defaultNotificationSettings) : null)
      .input('defaultReportSettings', sql.NVarChar(sql.MAX), data.defaultReportSettings ? JSON.stringify(data.defaultReportSettings) : null)
      .query(`INSERT INTO SchoolTemplates (TemplateName, Description, DefaultBillingTerms, DefaultRoles,
                DefaultDashboardSettings, DefaultNotificationSettings, DefaultReportSettings)
              OUTPUT INSERTED.*
              VALUES (@templateName, @description, @defaultBillingTerms, @defaultRoles,
                @defaultDashboardSettings, @defaultNotificationSettings, @defaultReportSettings)`);
    return result.recordset[0];
  }

  async update(id, data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('templateName', sql.NVarChar, data.templateName)
      .input('description', sql.NVarChar, data.description || null)
      .input('defaultBillingTerms', sql.NVarChar(sql.MAX), data.defaultBillingTerms ? JSON.stringify(data.defaultBillingTerms) : null)
      .input('defaultRoles', sql.NVarChar(sql.MAX), data.defaultRoles ? JSON.stringify(data.defaultRoles) : null)
      .input('defaultDashboardSettings', sql.NVarChar(sql.MAX), data.defaultDashboardSettings ? JSON.stringify(data.defaultDashboardSettings) : null)
      .input('defaultNotificationSettings', sql.NVarChar(sql.MAX), data.defaultNotificationSettings ? JSON.stringify(data.defaultNotificationSettings) : null)
      .input('defaultReportSettings', sql.NVarChar(sql.MAX), data.defaultReportSettings ? JSON.stringify(data.defaultReportSettings) : null)
      .input('isActive', sql.Bit, data.isActive !== false)
      .query(`UPDATE SchoolTemplates SET TemplateName=@templateName, Description=@description,
                DefaultBillingTerms=@defaultBillingTerms, DefaultRoles=@defaultRoles,
                DefaultDashboardSettings=@defaultDashboardSettings, DefaultNotificationSettings=@defaultNotificationSettings,
                DefaultReportSettings=@defaultReportSettings, IsActive=@isActive, UpdatedDate=GETDATE()
              OUTPUT INSERTED.* WHERE TemplateID=@id`);
    return result.recordset[0];
  }

  async markSchoolTemplate(schoolId, templateId) {
    const pool = await getPool();
    await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('templateId', sql.Int, templateId)
      .query('UPDATE Schools SET AppliedTemplateID = @templateId, UpdatedDate = GETDATE() WHERE SchoolID = @schoolId');
  }
}

class PlatformUsageRepository {
  async getUsageReport() {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT
                (SELECT COUNT(1) FROM Schools WHERE SubscriptionStatus = 'Active') AS activeSchools,
                (SELECT COUNT(1) FROM Schools WHERE SubscriptionStatus = 'Suspended') AS suspendedSchools,
                (SELECT COUNT(1) FROM Users WHERE ISNULL(IsActive, 1) = 1) AS activeUsers,
                (SELECT COUNT(1) FROM Students WHERE IsActive = 1) AS totalStudents,
                (SELECT COUNT(1) FROM Invoices WHERE IsDeleted = 0) AS totalInvoices,
                (SELECT ISNULL(SUM(Amount), 0) FROM Invoices WHERE IsDeleted = 0) AS totalInvoicedAmount,
                (SELECT ISNULL(SUM(AmountPaid), 0) FROM Invoices WHERE IsDeleted = 0) AS totalPaidAmount,
                (SELECT COUNT(1) FROM Employees WHERE IsActive = 1) AS totalEmployees,
                (SELECT COUNT(1) FROM Families) AS totalFamilies,
                (SELECT COUNT(1) FROM Schools) AS totalSchools`);
    return result.recordset[0];
  }

  async getUsageTrends() {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT
                FORMAT(CreatedDate, 'yyyy-MM') AS Month,
                COUNT(1) AS NewSchools
              FROM Schools
              WHERE CreatedDate >= DATEADD(MONTH, -12, GETDATE())
              GROUP BY FORMAT(CreatedDate, 'yyyy-MM')
              ORDER BY Month`);
    const schoolTrends = result.recordset;

    const invoiceTrends = await pool.request()
      .query(`SELECT
                FORMAT(IssueDate, 'yyyy-MM') AS Month,
                COUNT(1) AS InvoiceCount,
                ISNULL(SUM(Amount), 0) AS TotalAmount
              FROM Invoices
              WHERE IsDeleted = 0 AND IssueDate >= DATEADD(MONTH, -12, GETDATE())
              GROUP BY FORMAT(IssueDate, 'yyyy-MM')
              ORDER BY Month`);

    return { schoolTrends, invoiceTrends: invoiceTrends.recordset };
  }
}

module.exports = { ReEnrolmentRepository, SchoolTemplateRepository, PlatformUsageRepository };
