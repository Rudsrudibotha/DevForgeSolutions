// Data Layer - Student repository

const { getPool, sql } = require('./db');

function optionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
}

class StudentRepository {
  async getStudentsBySchool(schoolId, status = 'active') {
    const pool = await getPool();
    const statusClause = this.statusClause(status);

    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT s.*, f.FamilyName, bc.CategoryName, bc.BaseAmount AS CategoryAmount,
                  bc.Frequency AS CategoryFrequency, bc.IsActive AS CategoryIsActive
              FROM Students s
              INNER JOIN Families f ON s.FamilyID = f.FamilyID
              LEFT JOIN BillingCategories bc ON s.BillingCategoryID = bc.BillingCategoryID
              WHERE s.SchoolID = @schoolId ${statusClause}
              ORDER BY s.LastName, s.FirstName`);
    return result.recordset;
  }

  async getAllStudents(status = 'active') {
    const pool = await getPool();
    const statusClause = this.statusClause(status);

    const result = await pool.request()
      .query(`SELECT s.*, f.FamilyName, bc.CategoryName, bc.BaseAmount AS CategoryAmount,
                  bc.Frequency AS CategoryFrequency, bc.IsActive AS CategoryIsActive
              FROM Students s
              INNER JOIN Families f ON s.FamilyID = f.FamilyID
              LEFT JOIN BillingCategories bc ON s.BillingCategoryID = bc.BillingCategoryID
              WHERE 1 = 1 ${statusClause}
              ORDER BY s.LastName, s.FirstName`);
    return result.recordset;
  }

  async getStudentById(id) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`SELECT s.*, f.FamilyName, bc.CategoryName, bc.BaseAmount AS CategoryAmount,
                  bc.Frequency AS CategoryFrequency, bc.IsActive AS CategoryIsActive
              FROM Students s
              INNER JOIN Families f ON s.FamilyID = f.FamilyID
              LEFT JOIN BillingCategories bc ON s.BillingCategoryID = bc.BillingCategoryID
              WHERE s.StudentID = @id`);
    return result.recordset[0];
  }

  async createStudent(studentData) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, studentData.schoolId)
      .input('familyId', sql.Int, studentData.familyId)
      .input('firstName', sql.NVarChar, studentData.firstName)
      .input('lastName', sql.NVarChar, studentData.lastName)
      .input('dateOfBirth', sql.Date, studentData.dateOfBirth)
      .input('homePhone', sql.NVarChar, optionalString(studentData.homePhone))
      .input('homeAddress', sql.NVarChar, optionalString(studentData.homeAddress))
      .input('className', sql.NVarChar, optionalString(studentData.className))
      .input('billingDate', sql.Date, studentData.billingDate)
      .input('enrolledDate', sql.Date, studentData.enrolledDate)
      .input('medicalNotes', sql.NVarChar, optionalString(studentData.medicalNotes))
      .input('billingCategoryId', sql.Int, studentData.billingCategoryId || null)
      .query(`INSERT INTO Students (
                SchoolID, FamilyID, FirstName, LastName, DateOfBirth, HomePhone, HomeAddress,
                ClassName, BillingDate, EnrolledDate, MedicalNotes, BillingCategoryID
              )
              OUTPUT INSERTED.*
              VALUES (
                @schoolId, @familyId, @firstName, @lastName, @dateOfBirth, @homePhone, @homeAddress,
                @className, @billingDate, @enrolledDate, @medicalNotes, @billingCategoryId
              )`);
    return result.recordset[0];
  }

  async updateStudent(id, studentData) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('familyId', sql.Int, studentData.familyId)
      .input('firstName', sql.NVarChar, studentData.firstName)
      .input('lastName', sql.NVarChar, studentData.lastName)
      .input('dateOfBirth', sql.Date, studentData.dateOfBirth)
      .input('homePhone', sql.NVarChar, optionalString(studentData.homePhone))
      .input('homeAddress', sql.NVarChar, optionalString(studentData.homeAddress))
      .input('className', sql.NVarChar, optionalString(studentData.className))
      .input('billingDate', sql.Date, studentData.billingDate)
      .input('enrolledDate', sql.Date, studentData.enrolledDate)
      .input('medicalNotes', sql.NVarChar, optionalString(studentData.medicalNotes))
      .input('billingCategoryId', sql.Int, studentData.billingCategoryId || null)
      .query(`UPDATE Students SET
                FamilyID = @familyId,
                FirstName = @firstName,
                LastName = @lastName,
                DateOfBirth = @dateOfBirth,
                HomePhone = @homePhone,
                HomeAddress = @homeAddress,
                ClassName = @className,
                BillingDate = @billingDate,
                EnrolledDate = @enrolledDate,
                MedicalNotes = @medicalNotes,
                BillingCategoryID = @billingCategoryId,
                UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE StudentID = @id`);
    return result.recordset[0];
  }

  async makeInactive(id, departureData) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('departureDate', sql.Date, departureData.departureDate)
      .input('departureReason', sql.NVarChar, departureData.departureReason)
      .input('departureNote', sql.NVarChar, optionalString(departureData.departureNote))
      .query(`UPDATE Students SET
                IsActive = 0,
                DepartureDate = @departureDate,
                DepartureReason = @departureReason,
                DepartureNote = @departureNote,
                UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE StudentID = @id`);
    return result.recordset[0];
  }

  statusClause(status) {
    if (status === 'inactive') {
      return 'AND s.IsActive = 0';
    }

    if (status === 'all') {
      return '';
    }

    return 'AND s.IsActive = 1';
  }
}

module.exports = StudentRepository;
