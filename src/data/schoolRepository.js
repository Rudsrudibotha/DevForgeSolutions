// Data Layer - School repository

// This module handles database operations for schools in the School Finance and Management System

const { sql } = require('./db');

function optionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
}

class SchoolRepository {

  // Get all schools

  async getAllSchools() {

    const pool = await sql.connect();

    const result = await pool.request().query('SELECT * FROM Schools');

    return result.recordset;

  }

  // Get school by ID

  async getSchoolById(id) {

    const pool = await sql.connect();

    const result = await pool.request()

      .input('id', sql.Int, id)

      .query('SELECT * FROM Schools WHERE SchoolID = @id');

    return result.recordset[0];

  }

  async getSchoolByName(schoolName) {

    const pool = await sql.connect();

    const result = await pool.request()

      .input('schoolName', sql.NVarChar, schoolName)

      .query('SELECT * FROM Schools WHERE SchoolName = @schoolName');

    return result.recordset[0];

  }

  async getSchoolByNameExcludingId(schoolName, id) {

    const pool = await sql.connect();

    const result = await pool.request()

      .input('schoolName', sql.NVarChar, schoolName)

      .input('id', sql.Int, id)

      .query('SELECT * FROM Schools WHERE SchoolName = @schoolName AND SchoolID <> @id');

    return result.recordset[0];

  }

  // Create new school

  async createSchool(schoolData) {

    const pool = await sql.connect();

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

      .input('subscriptionStatus', sql.NVarChar, schoolData.subscriptionStatus || 'Active')

      .query(`INSERT INTO Schools (SchoolName, Address, LogoUrl, ContactPerson, ContactEmail, ContactPhone, Website,

              CurrencyCode, CurrencySymbol, SubscriptionStatus)

              OUTPUT INSERTED.*

              VALUES (@schoolName, @address, @logoUrl, @contactPerson, @contactEmail, @contactPhone, @website,

              @currencyCode, @currencySymbol, @subscriptionStatus)`);

    return result.recordset[0];

  }

  // Update school

  async updateSchool(id, schoolData) {

    const pool = await sql.connect();

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

      .input('subscriptionStatus', sql.NVarChar, schoolData.subscriptionStatus)

      .query(`UPDATE Schools SET SchoolName = @schoolName, Address = @address, ContactEmail = @contactEmail,

              LogoUrl = @logoUrl, ContactPerson = @contactPerson, ContactPhone = @contactPhone,

              Website = @website, CurrencyCode = @currencyCode, CurrencySymbol = @currencySymbol,

              SubscriptionStatus = @subscriptionStatus, UpdatedDate = GETDATE()

              OUTPUT INSERTED.*

              WHERE SchoolID = @id`);

    return result.recordset[0];

  }

  // Delete school

  async deleteSchool(id) {

    const pool = await sql.connect();

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

  // Suspend school

  async suspendSchool(id) {

    const pool = await sql.connect();

    const result = await pool.request()

      .input('id', sql.Int, id)

      .query(`UPDATE Schools SET SubscriptionStatus = 'Suspended', UpdatedDate = GETDATE() WHERE SchoolID = @id`);

    return result.rowsAffected[0] > 0;

  }

  // Activate school

  async activateSchool(id) {

    const pool = await sql.connect();

    const result = await pool.request()

      .input('id', sql.Int, id)

      .query(`UPDATE Schools SET SubscriptionStatus = 'Active', UpdatedDate = GETDATE() WHERE SchoolID = @id`);

    return result.rowsAffected[0] > 0;

  }

}

module.exports = SchoolRepository;
