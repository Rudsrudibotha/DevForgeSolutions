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
  studentSelectColumns() {
    return `s.*, f.FamilyName, f.PrimaryParentName, f.PrimaryParentPhone, f.PrimaryParentEmail,
                  f.PrimaryParentIdNumber, f.SecondaryParentName, f.SecondaryParentPhone,
                  f.SecondaryParentEmail, f.SecondaryParentIdNumber, f.HomeAddress AS FamilyHomeAddress,
                  f.EmergencyContactName, f.EmergencyContactPhone, f.FamilyDoctor,
                  f.MedicalAidName, f.MedicalAidNumber,
                  bc.CategoryName, bc.BaseAmount AS CategoryAmount,
                  bc.Frequency AS CategoryFrequency, bc.IsActive AS CategoryIsActive,
                  (
                    SELECT sbc.BillingCategoryID, bc2.CategoryName, bc2.BaseAmount, bc2.Frequency, bc2.IsActive, sbc.IsPrimary, sbc.CreatedDate
                    FROM StudentBillingCategories sbc
                    INNER JOIN BillingCategories bc2 ON sbc.BillingCategoryID = bc2.BillingCategoryID
                    WHERE sbc.StudentID = s.StudentID
                    ORDER BY sbc.IsPrimary DESC, bc2.CategoryName
                    FOR JSON PATH
                  ) AS BillingCategoriesJson`;
  }

  async getStudentsBySchool(schoolId, status = 'active', teacherUserId = null) {
    const pool = await getPool();
    const statusClause = this.statusClause(status);
    const req = pool.request().input('schoolId', sql.Int, schoolId);
    let teacherClause = '';

    if (teacherUserId) {
      req.input('teacherUserId', sql.Int, teacherUserId);
      teacherClause = ` AND EXISTS (
        SELECT 1
        FROM Classes c
        INNER JOIN Employees e ON e.EmployeeID = c.TeacherID
        WHERE c.SchoolID = s.SchoolID AND c.ClassName = s.ClassName AND e.UserID = @teacherUserId
      )`;
    }

    const result = await req.query(`SELECT ${this.studentSelectColumns()}
              FROM Students s
              INNER JOIN Families f ON s.FamilyID = f.FamilyID
              LEFT JOIN BillingCategories bc ON s.BillingCategoryID = bc.BillingCategoryID
              WHERE s.SchoolID = @schoolId ${statusClause}${teacherClause}
              ORDER BY s.LastName, s.FirstName`);
    return result.recordset;
  }

  async getAllStudents(status = 'active') {
    const pool = await getPool();
    const statusClause = this.statusClause(status);

    const result = await pool.request()
      .query(`SELECT ${this.studentSelectColumns()}
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
      .query(`SELECT ${this.studentSelectColumns()}
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
      .input('currentAcademicYear', sql.Int, studentData.currentAcademicYear || new Date().getFullYear())
      .input('billingDate', sql.Date, studentData.billingDate)
      .input('enrolledDate', sql.Date, studentData.enrolledDate)
      .input('medicalNotes', sql.NVarChar, optionalString(studentData.medicalNotes))
      .input('billingCategoryId', sql.Int, studentData.billingCategoryId || null)
      .input('responsiblePayerType', sql.NVarChar, optionalString(studentData.responsiblePayerType))
      .input('responsiblePayerName', sql.NVarChar, optionalString(studentData.responsiblePayerName))
      .input('responsiblePayerPhone', sql.NVarChar, optionalString(studentData.responsiblePayerPhone))
      .input('responsiblePayerEmail', sql.NVarChar, optionalString(studentData.responsiblePayerEmail))
      .query(`INSERT INTO Students (
                SchoolID, FamilyID, FirstName, LastName, DateOfBirth, HomePhone, HomeAddress,
                ClassName, CurrentAcademicYear, BillingDate, EnrolledDate, MedicalNotes, BillingCategoryID,
                ResponsiblePayerType, ResponsiblePayerName, ResponsiblePayerPhone, ResponsiblePayerEmail
              )
              OUTPUT INSERTED.*
              VALUES (
                @schoolId, @familyId, @firstName, @lastName, @dateOfBirth, @homePhone, @homeAddress,
                @className, @currentAcademicYear, @billingDate, @enrolledDate, @medicalNotes, @billingCategoryId,
                @responsiblePayerType, @responsiblePayerName, @responsiblePayerPhone, @responsiblePayerEmail
              )`);
    const student = result.recordset[0];
    if (student) {
      await this.syncBillingCategories(student.StudentID, studentData.billingCategoryIds || [studentData.billingCategoryId]);
    }
    return student;
  }

  async syncBillingCategories(studentId, billingCategoryIds = []) {
    const ids = [...new Set((Array.isArray(billingCategoryIds) ? billingCategoryIds : [billingCategoryIds])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0))];

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();
    try {
      const deleteRequest = new sql.Request(transaction).input('studentId', sql.Int, studentId);
      const placeholders = ids.map((id, index) => {
        deleteRequest.input(`billingCategoryId${index}`, sql.Int, id);
        return `@billingCategoryId${index}`;
      });

      await deleteRequest.query(`DELETE FROM StudentBillingCategories
              WHERE StudentID = @studentId
              ${placeholders.length ? `AND BillingCategoryID NOT IN (${placeholders.join(', ')})` : ''}`);

      for (let index = 0; index < ids.length; index += 1) {
        await new sql.Request(transaction)
          .input('studentId', sql.Int, studentId)
          .input('billingCategoryId', sql.Int, ids[index])
          .input('isPrimary', sql.Bit, index === 0)
          .query(`IF EXISTS (
                    SELECT 1 FROM StudentBillingCategories
                    WHERE StudentID = @studentId AND BillingCategoryID = @billingCategoryId
                  )
                  BEGIN
                    UPDATE StudentBillingCategories
                    SET IsPrimary = @isPrimary
                    WHERE StudentID = @studentId AND BillingCategoryID = @billingCategoryId;
                  END
                  ELSE
                  BEGIN
                    INSERT INTO StudentBillingCategories (StudentID, BillingCategoryID, IsPrimary)
                    VALUES (@studentId, @billingCategoryId, @isPrimary);
                  END`);
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
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
      .input('currentAcademicYear', sql.Int, studentData.currentAcademicYear || new Date().getFullYear())
      .input('billingDate', sql.Date, studentData.billingDate)
      .input('enrolledDate', sql.Date, studentData.enrolledDate)
      .input('medicalNotes', sql.NVarChar, optionalString(studentData.medicalNotes))
      .input('billingCategoryId', sql.Int, studentData.billingCategoryId || null)
      .input('responsiblePayerType', sql.NVarChar, optionalString(studentData.responsiblePayerType))
      .input('responsiblePayerName', sql.NVarChar, optionalString(studentData.responsiblePayerName))
      .input('responsiblePayerPhone', sql.NVarChar, optionalString(studentData.responsiblePayerPhone))
      .input('responsiblePayerEmail', sql.NVarChar, optionalString(studentData.responsiblePayerEmail))
      .query(`UPDATE Students SET
                FamilyID = @familyId,
                FirstName = @firstName,
                LastName = @lastName,
                DateOfBirth = @dateOfBirth,
                HomePhone = @homePhone,
                HomeAddress = @homeAddress,
                ClassName = @className,
                CurrentAcademicYear = @currentAcademicYear,
                BillingDate = @billingDate,
                EnrolledDate = @enrolledDate,
                MedicalNotes = @medicalNotes,
                BillingCategoryID = @billingCategoryId,
                ResponsiblePayerType = @responsiblePayerType,
                ResponsiblePayerName = @responsiblePayerName,
                ResponsiblePayerPhone = @responsiblePayerPhone,
                ResponsiblePayerEmail = @responsiblePayerEmail,
                UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE StudentID = @id`);
    const student = result.recordset[0];
    if (student) {
      await this.syncBillingCategories(id, studentData.billingCategoryIds || [studentData.billingCategoryId]);
    }
    return student;
  }

  async updateAcademicPlacement(studentId, data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('studentId', sql.Int, studentId)
      .input('schoolId', sql.Int, data.schoolId)
      .input('className', sql.NVarChar, optionalString(data.className))
      .input('currentAcademicYear', sql.Int, data.currentAcademicYear)
      .query(`UPDATE Students SET
                ClassName = @className,
                CurrentAcademicYear = @currentAcademicYear,
                UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE StudentID = @studentId AND SchoolID = @schoolId AND IsActive = 1`);
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
