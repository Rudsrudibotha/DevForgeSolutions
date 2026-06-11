const { getPool, sql } = require('./db');

function optionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const cleaned = String(value).trim();
  return cleaned || null;
}

class RegistrationRepository {
  async getPublicSchools() {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT SchoolID, SchoolName
              FROM Schools
              WHERE SubscriptionStatus = 'Active'
              ORDER BY SchoolName`);

    return result.recordset;
  }

  async createSchoolRegistrationRequest(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolName', sql.NVarChar, data.schoolName)
      .input('registrationNumber', sql.NVarChar, optionalString(data.registrationNumber))
      .input('address', sql.NVarChar, optionalString(data.address))
      .input('website', sql.NVarChar, optionalString(data.website))
      .input('contactPerson', sql.NVarChar, data.contactPerson)
      .input('contactEmail', sql.NVarChar, data.contactEmail)
      .input('contactPhone', sql.NVarChar, data.contactPhone)
      .input('billingContactName', sql.NVarChar, optionalString(data.billingContactName))
      .input('billingContactEmail', sql.NVarChar, optionalString(data.billingContactEmail))
      .input('billingContactPhone', sql.NVarChar, optionalString(data.billingContactPhone))
      .input('billingAddress', sql.NVarChar, optionalString(data.billingAddress))
      .input('requestedPlan', sql.NVarChar, optionalString(data.requestedPlan))
      .input('paymentProvider', sql.NVarChar, optionalString(data.paymentProvider))
      .input('paymentCustomerReference', sql.NVarChar, optionalString(data.paymentCustomerReference))
      .input('billingNotes', sql.NVarChar, optionalString(data.billingNotes))
      .query(`INSERT INTO SchoolRegistrationRequests (
                SchoolName, RegistrationNumber, Address, Website, ContactPerson, ContactEmail, ContactPhone,
                BillingContactName, BillingContactEmail, BillingContactPhone, BillingAddress, RequestedPlan,
                PaymentProvider, PaymentCustomerReference, BillingNotes
              )
              OUTPUT INSERTED.*
              VALUES (
                @schoolName, @registrationNumber, @address, @website, @contactPerson, @contactEmail, @contactPhone,
                @billingContactName, @billingContactEmail, @billingContactPhone, @billingAddress, @requestedPlan,
                @paymentProvider, @paymentCustomerReference, @billingNotes
              )`);

    return result.recordset[0];
  }

  async getPendingSchoolRegistrationRequests() {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT RequestID, SchoolName, RegistrationNumber, Address, Website,
                     ContactPerson, ContactEmail, ContactPhone, RequestedPlan, Status, CreatedDate
              FROM SchoolRegistrationRequests
              WHERE Status = 'Pending'
              ORDER BY CreatedDate DESC`);

    return result.recordset;
  }

  async getSchoolRegistrationRequestById(requestId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('requestId', sql.Int, requestId)
      .query(`SELECT *
              FROM SchoolRegistrationRequests
              WHERE RequestID = @requestId`);

    return result.recordset[0];
  }

  async updateSchoolRegistrationRequestStatus(requestId, status) {
    const pool = await getPool();
    const result = await pool.request()
      .input('requestId', sql.Int, requestId)
      .input('status', sql.NVarChar, status)
      .query(`UPDATE SchoolRegistrationRequests
              SET Status = @status, UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE RequestID = @requestId`);

    return result.recordset[0];
  }

  async getActiveSchoolById(schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT SchoolID, SchoolName
              FROM Schools
              WHERE SchoolID = @schoolId AND SubscriptionStatus = 'Active'`);

    return result.recordset[0];
  }

  async findFamiliesByParentEmail(schoolId, email) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('email', sql.NVarChar, email)
      .query(`SELECT FamilyID, SchoolID, FamilyName, PrimaryParentEmail, SecondaryParentEmail
              FROM Families
              WHERE SchoolID = @schoolId
                AND (
                  LOWER(LTRIM(RTRIM(ISNULL(PrimaryParentEmail, '')))) = LOWER(@email)
                  OR LOWER(LTRIM(RTRIM(ISNULL(SecondaryParentEmail, '')))) = LOWER(@email)
                )
              ORDER BY FamilyID`);

    return result.recordset;
  }

  async createParentRegistrationRequest(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId)
      .input('firstName', sql.NVarChar, data.firstName)
      .input('lastName', sql.NVarChar, data.lastName)
      .input('email', sql.NVarChar, data.email)
      .input('phone', sql.NVarChar, optionalString(data.phone))
      .input('relationship', sql.NVarChar, optionalString(data.relationship))
      .input('matchedFamilyId', sql.Int, data.matchedFamilyId || null)
      .input('parentUserId', sql.Int, data.parentUserId || null)
      .input('status', sql.NVarChar, data.status)
      .input('notes', sql.NVarChar, optionalString(data.notes))
      .query(`INSERT INTO ParentRegistrationRequests (
                SchoolID, FirstName, LastName, Email, Phone, Relationship,
                MatchedFamilyID, ParentUserID, Status, Notes
              )
              OUTPUT INSERTED.*
              VALUES (
                @schoolId, @firstName, @lastName, @email, @phone, @relationship,
                @matchedFamilyId, @parentUserId, @status, @notes
              )`);

    return result.recordset[0];
  }
}

module.exports = RegistrationRepository;
