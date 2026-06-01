// Data Layer - School repository

const { getPool, sql } = require('./db');

function optionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
}

function optionalDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : value;
}

class SchoolRepository {
  constructor() {
    this.schoolFinanceColumnsEnsured = false;
  }

  async ensureSchoolFinanceColumns() {
    if (this.schoolFinanceColumnsEnsured) {
      return;
    }

    const pool = await getPool();
    await pool.request().query(`
      IF COL_LENGTH('dbo.Schools', 'BankName') IS NULL
        ALTER TABLE dbo.Schools ADD BankName NVARCHAR(255) NULL;
      IF COL_LENGTH('dbo.Schools', 'BankAccountNumber') IS NULL
        ALTER TABLE dbo.Schools ADD BankAccountNumber NVARCHAR(100) NULL;
      IF COL_LENGTH('dbo.Schools', 'BankBranchCode') IS NULL
        ALTER TABLE dbo.Schools ADD BankBranchCode NVARCHAR(50) NULL;
      IF COL_LENGTH('dbo.Schools', 'BankAccountType') IS NULL
        ALTER TABLE dbo.Schools ADD BankAccountType NVARCHAR(100) NULL;
      IF COL_LENGTH('dbo.Schools', 'FinancialYearStartDate') IS NULL
        ALTER TABLE dbo.Schools ADD FinancialYearStartDate DATE NULL;
      IF COL_LENGTH('dbo.Schools', 'FinancialYearEndDate') IS NULL
        ALTER TABLE dbo.Schools ADD FinancialYearEndDate DATE NULL;
    `);
    this.schoolFinanceColumnsEnsured = true;
  }

  async getAllSchools() {
    await this.ensureSchoolFinanceColumns();
    const pool = await getPool();
    const result = await pool.request().query(`WITH
              UserCounts AS (
                SELECT SchoolID, COUNT(1) AS UserCount
                FROM Users
                WHERE SchoolID IS NOT NULL
                GROUP BY SchoolID
              ),
              EmployeeCounts AS (
                SELECT SchoolID,
                  COUNT(1) AS EmployeeCount,
                  SUM(CASE WHEN ISNULL(IsActive, 1) = 1 THEN 1 ELSE 0 END) AS ActiveEmployeeCount
                FROM Employees
                GROUP BY SchoolID
              ),
              FamilyCounts AS (
                SELECT SchoolID, COUNT(1) AS FamilyCount
                FROM Families
                GROUP BY SchoolID
              ),
              StudentCounts AS (
                SELECT SchoolID,
                  COUNT(1) AS StudentCount,
                  SUM(CASE WHEN ISNULL(IsActive, 1) = 1 THEN 1 ELSE 0 END) AS ActiveStudentCount
                FROM Students
                GROUP BY SchoolID
              ),
              InvoiceCounts AS (
                SELECT SchoolID,
                  COUNT(CASE WHEN ISNULL(IsDeleted, 0) = 0 THEN 1 END) AS InvoiceCount,
                  COUNT(CASE WHEN ISNULL(IsDeleted, 0) = 0 AND Status <> 'Paid' THEN 1 END) AS OpenInvoiceCount,
                  COALESCE(SUM(CASE WHEN Status <> 'Paid' AND ISNULL(IsDeleted, 0) = 0 THEN Amount - ISNULL(AmountPaid, 0) ELSE 0 END), 0) AS OutstandingAmount,
                  COALESCE(SUM(CASE WHEN Status = 'Paid' AND ISNULL(IsDeleted, 0) = 0 THEN ISNULL(AmountPaid, Amount) ELSE 0 END), 0) AS PaidAmount
                FROM Invoices
                GROUP BY SchoolID
              )
            SELECT s.*,
              COALESCE(uc.UserCount, 0) AS UserCount,
              COALESCE(ec.EmployeeCount, 0) AS EmployeeCount,
              COALESCE(ec.ActiveEmployeeCount, 0) AS ActiveEmployeeCount,
              COALESCE(fc.FamilyCount, 0) AS FamilyCount,
              COALESCE(sc.StudentCount, 0) AS StudentCount,
              COALESCE(sc.ActiveStudentCount, 0) AS ActiveStudentCount,
              COALESCE(ic.InvoiceCount, 0) AS InvoiceCount,
              COALESCE(ic.OpenInvoiceCount, 0) AS OpenInvoiceCount,
              COALESCE(ic.OutstandingAmount, 0) AS OutstandingAmount,
              COALESCE(ic.PaidAmount, 0) AS PaidAmount
            FROM Schools s
            LEFT JOIN UserCounts uc ON uc.SchoolID = s.SchoolID
            LEFT JOIN EmployeeCounts ec ON ec.SchoolID = s.SchoolID
            LEFT JOIN FamilyCounts fc ON fc.SchoolID = s.SchoolID
            LEFT JOIN StudentCounts sc ON sc.SchoolID = s.SchoolID
            LEFT JOIN InvoiceCounts ic ON ic.SchoolID = s.SchoolID
            ORDER BY s.SchoolName`);
    return result.recordset;
  }

  async getSchoolById(id) {
    await this.ensureSchoolFinanceColumns();
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Schools WHERE SchoolID = @id');
    return result.recordset[0];
  }

  async getSchoolByName(schoolName) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolName', sql.NVarChar, schoolName)
      .query('SELECT * FROM Schools WHERE SchoolName = @schoolName');
    return result.recordset[0];
  }

  async getSchoolByNormalizedName(schoolName) {
    const pool = await getPool();
    const normalized = String(schoolName || '').trim().toUpperCase();
    const result = await pool.request()
      .input('normalized', sql.NVarChar, normalized)
      .query('SELECT * FROM Schools WHERE UPPER(LTRIM(RTRIM(SchoolName))) = @normalized');
    return result.recordset[0];
  }

  async getSchoolByNormalizedNameExcludingId(schoolName, id) {
    const pool = await getPool();
    const normalized = String(schoolName || '').trim().toUpperCase();
    const result = await pool.request()
      .input('normalized', sql.NVarChar, normalized)
      .input('id', sql.Int, id)
      .query('SELECT * FROM Schools WHERE UPPER(LTRIM(RTRIM(SchoolName))) = @normalized AND SchoolID <> @id');
    return result.recordset[0];
  }

  async getSchoolByNameExcludingId(schoolName, id) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolName', sql.NVarChar, schoolName)
      .input('id', sql.Int, id)
      .query('SELECT * FROM Schools WHERE SchoolName = @schoolName AND SchoolID <> @id');
    return result.recordset[0];
  }

  async createSchool(schoolData) {
    await this.ensureSchoolFinanceColumns();
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolName', sql.NVarChar, schoolData.schoolName)
      .input('address', sql.NVarChar, schoolData.address)
      .input('logoUrl', sql.NVarChar(sql.MAX), optionalString(schoolData.logoUrl))
      .input('contactPerson', sql.NVarChar, optionalString(schoolData.contactPerson))
      .input('contactEmail', sql.NVarChar, schoolData.contactEmail)
      .input('contactPhone', sql.NVarChar, schoolData.contactPhone)
      .input('registrationNumber', sql.NVarChar, optionalString(schoolData.registrationNumber))
      .input('bankName', sql.NVarChar, optionalString(schoolData.bankName))
      .input('bankAccountNumber', sql.NVarChar, optionalString(schoolData.bankAccountNumber))
      .input('bankBranchCode', sql.NVarChar, optionalString(schoolData.bankBranchCode))
      .input('bankAccountType', sql.NVarChar, optionalString(schoolData.bankAccountType))
      .input('financialYearStartDate', sql.Date, optionalDate(schoolData.financialYearStartDate))
      .input('financialYearEndDate', sql.Date, optionalDate(schoolData.financialYearEndDate))
      .input('website', sql.NVarChar, optionalString(schoolData.website))
      .input('currencyCode', sql.NVarChar, schoolData.currencyCode)
      .input('currencySymbol', sql.NVarChar, schoolData.currencySymbol)
      .input('defaultMonthlyFee', sql.Decimal(10,2), schoolData.defaultMonthlyFee)
      .input('paymentInstructions', sql.NVarChar(sql.MAX), optionalString(schoolData.paymentInstructions))
      .input('subscriptionPlan', sql.NVarChar, schoolData.subscriptionPlan || 'Basic')
      .input('subscriptionStatus', sql.NVarChar, schoolData.subscriptionStatus || 'Active')
      .query(`INSERT INTO Schools (SchoolName, Address, LogoUrl, ContactPerson, ContactEmail, ContactPhone, RegistrationNumber,
              BankName, BankAccountNumber, BankBranchCode, BankAccountType, FinancialYearStartDate, FinancialYearEndDate, Website,
              CurrencyCode, CurrencySymbol, DefaultMonthlyFee, PaymentInstructions, SubscriptionPlan, SubscriptionStatus)
              OUTPUT INSERTED.*
              VALUES (@schoolName, @address, @logoUrl, @contactPerson, @contactEmail, @contactPhone, @registrationNumber,
              @bankName, @bankAccountNumber, @bankBranchCode, @bankAccountType, @financialYearStartDate, @financialYearEndDate, @website,
              @currencyCode, @currencySymbol, @defaultMonthlyFee, @paymentInstructions, @subscriptionPlan, @subscriptionStatus)`);
    return result.recordset[0];
  }

  async updateSchool(id, schoolData) {
    await this.ensureSchoolFinanceColumns();
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('schoolName', sql.NVarChar, schoolData.schoolName)
      .input('address', sql.NVarChar, schoolData.address)
      .input('logoUrl', sql.NVarChar(sql.MAX), optionalString(schoolData.logoUrl))
      .input('contactPerson', sql.NVarChar, optionalString(schoolData.contactPerson))
      .input('contactEmail', sql.NVarChar, schoolData.contactEmail)
      .input('contactPhone', sql.NVarChar, schoolData.contactPhone)
      .input('registrationNumber', sql.NVarChar, optionalString(schoolData.registrationNumber))
      .input('bankName', sql.NVarChar, optionalString(schoolData.bankName))
      .input('bankAccountNumber', sql.NVarChar, optionalString(schoolData.bankAccountNumber))
      .input('bankBranchCode', sql.NVarChar, optionalString(schoolData.bankBranchCode))
      .input('bankAccountType', sql.NVarChar, optionalString(schoolData.bankAccountType))
      .input('financialYearStartDate', sql.Date, optionalDate(schoolData.financialYearStartDate))
      .input('financialYearEndDate', sql.Date, optionalDate(schoolData.financialYearEndDate))
      .input('website', sql.NVarChar, optionalString(schoolData.website))
      .input('currencyCode', sql.NVarChar, schoolData.currencyCode)
      .input('currencySymbol', sql.NVarChar, schoolData.currencySymbol)
      .input('defaultMonthlyFee', sql.Decimal(10,2), schoolData.defaultMonthlyFee)
      .input('paymentInstructions', sql.NVarChar(sql.MAX), optionalString(schoolData.paymentInstructions))
      .input('subscriptionPlan', sql.NVarChar, schoolData.subscriptionPlan)
      .input('subscriptionStatus', sql.NVarChar, schoolData.subscriptionStatus)
      .query(`UPDATE Schools SET SchoolName = @schoolName, Address = @address, ContactEmail = @contactEmail,
              LogoUrl = @logoUrl, ContactPerson = @contactPerson, ContactPhone = @contactPhone,
              RegistrationNumber = @registrationNumber, BankName = @bankName, BankAccountNumber = @bankAccountNumber,
              BankBranchCode = @bankBranchCode, BankAccountType = @bankAccountType,
              FinancialYearStartDate = @financialYearStartDate, FinancialYearEndDate = @financialYearEndDate,
              Website = @website, CurrencyCode = @currencyCode, CurrencySymbol = @currencySymbol,
              DefaultMonthlyFee = @defaultMonthlyFee, PaymentInstructions = @paymentInstructions,
              SubscriptionPlan = @subscriptionPlan, SubscriptionStatus = @subscriptionStatus, UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE SchoolID = @id`);
    return result.recordset[0];
  }

  async deleteSchool(id) {
    const pool = await getPool();
    const dependencyCheck = await pool.request()
      .input('id', sql.Int, id)
      .query(`SELECT
                (SELECT COUNT(1) FROM Users WHERE SchoolID = @id) AS UserCount,
                (SELECT COUNT(1) FROM Invoices WHERE SchoolID = @id) AS InvoiceCount`);
    const dependencies = dependencyCheck.recordset[0];

    if (dependencies.UserCount > 0 || dependencies.InvoiceCount > 0) {
      throw new Error('School cannot be deleted while users or invoices exist');
    }

    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Schools WHERE SchoolID = @id');
    return { message: 'School deleted' };
  }

  async suspendSchool(id) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`UPDATE Schools SET SubscriptionStatus = 'Suspended', UpdatedDate = GETDATE() WHERE SchoolID = @id`);
    return result.rowsAffected[0] > 0;
  }

  async activateSchool(id) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`UPDATE Schools SET SubscriptionStatus = 'Active', UpdatedDate = GETDATE() WHERE SchoolID = @id`);
    return result.rowsAffected[0] > 0;
  }

  async updateSubscriptionPlan(id, subscriptionPlan) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('subscriptionPlan', sql.NVarChar, subscriptionPlan)
      .query(`UPDATE Schools
              SET SubscriptionPlan = @subscriptionPlan, UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE SchoolID = @id`);
    return result.recordset[0];
  }
}

module.exports = SchoolRepository;
