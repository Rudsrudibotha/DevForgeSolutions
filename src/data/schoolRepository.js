// Data Layer - School repository

const { getPool, sql } = require('./db');

function optionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
}

class SchoolRepository {
  async getAllSchools() {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM Schools');
    return result.recordset;
  }

  async getSchoolById(id) {
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
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolName', sql.NVarChar, schoolData.schoolName)
      .input('address', sql.NVarChar, schoolData.address)
      .input('logoUrl', sql.NVarChar(sql.MAX), optionalString(schoolData.logoUrl))
      .input('contactPerson', sql.NVarChar, optionalString(schoolData.contactPerson))
      .input('contactEmail', sql.NVarChar, schoolData.contactEmail)
      .input('contactPhone', sql.NVarChar, schoolData.contactPhone)
      .input('website', sql.NVarChar, optionalString(schoolData.website))
      .input('currencyCode', sql.NVarChar, schoolData.currencyCode)
      .input('currencySymbol', sql.NVarChar, schoolData.currencySymbol)
      .input('defaultMonthlyFee', sql.Decimal(10,2), schoolData.defaultMonthlyFee)
      .input('paymentInstructions', sql.NVarChar(sql.MAX), optionalString(schoolData.paymentInstructions))
      .input('subscriptionStatus', sql.NVarChar, schoolData.subscriptionStatus || 'Active')
      .query(`INSERT INTO Schools (SchoolName, Address, LogoUrl, ContactPerson, ContactEmail, ContactPhone, Website,
              CurrencyCode, CurrencySymbol, DefaultMonthlyFee, PaymentInstructions, SubscriptionStatus)
              OUTPUT INSERTED.*
              VALUES (@schoolName, @address, @logoUrl, @contactPerson, @contactEmail, @contactPhone, @website,
              @currencyCode, @currencySymbol, @defaultMonthlyFee, @paymentInstructions, @subscriptionStatus)`);
    return result.recordset[0];
  }

  async updateSchool(id, schoolData) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('schoolName', sql.NVarChar, schoolData.schoolName)
      .input('address', sql.NVarChar, schoolData.address)
      .input('logoUrl', sql.NVarChar(sql.MAX), optionalString(schoolData.logoUrl))
      .input('contactPerson', sql.NVarChar, optionalString(schoolData.contactPerson))
      .input('contactEmail', sql.NVarChar, schoolData.contactEmail)
      .input('contactPhone', sql.NVarChar, schoolData.contactPhone)
      .input('website', sql.NVarChar, optionalString(schoolData.website))
      .input('currencyCode', sql.NVarChar, schoolData.currencyCode)
      .input('currencySymbol', sql.NVarChar, schoolData.currencySymbol)
      .input('defaultMonthlyFee', sql.Decimal(10,2), schoolData.defaultMonthlyFee)
      .input('paymentInstructions', sql.NVarChar(sql.MAX), optionalString(schoolData.paymentInstructions))
      .input('subscriptionStatus', sql.NVarChar, schoolData.subscriptionStatus)
      .query(`UPDATE Schools SET SchoolName = @schoolName, Address = @address, ContactEmail = @contactEmail,
              LogoUrl = @logoUrl, ContactPerson = @contactPerson, ContactPhone = @contactPhone,
              Website = @website, CurrencyCode = @currencyCode, CurrencySymbol = @currencySymbol,
              DefaultMonthlyFee = @defaultMonthlyFee, PaymentInstructions = @paymentInstructions,
              SubscriptionStatus = @subscriptionStatus, UpdatedDate = GETDATE()
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
}

module.exports = SchoolRepository;
