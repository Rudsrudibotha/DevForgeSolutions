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
  constructor() {
    this.billingColumnsEnsured = false;
  }

  async ensureBillingColumns() {
    if (this.billingColumnsEnsured) {
      return;
    }

    const pool = await getPool();
    await pool.request().query(`
      IF COL_LENGTH('dbo.BillingCategories', 'BillingYear') IS NULL
        ALTER TABLE dbo.BillingCategories ADD BillingYear INT NOT NULL CONSTRAINT DF_BillingCategories_BillingYear DEFAULT (YEAR(GETDATE())) WITH VALUES;

      IF OBJECT_ID('dbo.StudentMonthlyDiscounts', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.StudentMonthlyDiscounts (
          StudentMonthlyDiscountID INT IDENTITY(1,1) PRIMARY KEY,
          SchoolID INT NOT NULL,
          StudentID INT NOT NULL,
          DiscountYear INT NOT NULL,
          DiscountMonth INT NOT NULL,
          Amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
          UpdatedDate DATETIME NOT NULL DEFAULT GETDATE(),
          CONSTRAINT CK_StudentMonthlyDiscounts_Year CHECK (DiscountYear BETWEEN 2000 AND 2100),
          CONSTRAINT CK_StudentMonthlyDiscounts_Month CHECK (DiscountMonth BETWEEN 1 AND 12),
          CONSTRAINT CK_StudentMonthlyDiscounts_Amount CHECK (Amount >= 0),
          CONSTRAINT UQ_StudentMonthlyDiscounts_Student_Year_Month UNIQUE (StudentID, DiscountYear, DiscountMonth),
          CONSTRAINT FK_StudentMonthlyDiscounts_Schools FOREIGN KEY (SchoolID) REFERENCES dbo.Schools(SchoolID),
          CONSTRAINT FK_StudentMonthlyDiscounts_Students FOREIGN KEY (StudentID) REFERENCES dbo.Students(StudentID)
        );
      END;

      IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_StudentMonthlyDiscounts_School_Student_Year' AND object_id = OBJECT_ID('dbo.StudentMonthlyDiscounts'))
        CREATE INDEX IX_StudentMonthlyDiscounts_School_Student_Year
          ON dbo.StudentMonthlyDiscounts(SchoolID, StudentID, DiscountYear);
    `);
    this.billingColumnsEnsured = true;
  }

  studentSelectColumns() {
    return `s.*, f.FamilyName, f.PrimaryParentName, f.PrimaryParentPhone, f.PrimaryParentEmail,
                  f.PrimaryParentIdNumber, f.SecondaryParentName, f.SecondaryParentPhone,
                  f.SecondaryParentEmail, f.SecondaryParentIdNumber, f.HomeAddress AS FamilyHomeAddress,
                  f.EmergencyContactName, f.EmergencyContactPhone, f.FamilyDoctor,
                  f.MedicalAidName, f.MedicalAidNumber,
                  bc.CategoryName, bc.BaseAmount AS CategoryAmount, bc.BillingYear AS CategoryBillingYear,
                  bc.Frequency AS CategoryFrequency, bc.IsActive AS CategoryIsActive,
                  (
                    SELECT sbc.BillingCategoryID, bc2.CategoryName, bc2.BaseAmount, bc2.Frequency, bc2.BillingYear, bc2.IsActive, sbc.IsPrimary, sbc.CreatedDate
                    FROM StudentBillingCategories sbc
                    INNER JOIN BillingCategories bc2 ON sbc.BillingCategoryID = bc2.BillingCategoryID
                    WHERE sbc.StudentID = s.StudentID
                    ORDER BY sbc.IsPrimary DESC, bc2.CategoryName
                    FOR JSON PATH
                  ) AS BillingCategoriesJson,
                  (
                    SELECT smd.DiscountYear, smd.DiscountMonth, smd.Amount
                    FROM StudentMonthlyDiscounts smd
                    WHERE smd.StudentID = s.StudentID
                      AND smd.SchoolID = s.SchoolID
                    ORDER BY smd.DiscountYear, smd.DiscountMonth
                    FOR JSON PATH
                  ) AS MonthlyDiscountsJson`;
  }

  async getStudentsBySchool(schoolId, status = 'active', teacherUserId = null) {
    await this.ensureBillingColumns();
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
    await this.ensureBillingColumns();
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
    await this.ensureBillingColumns();
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
    await this.ensureBillingColumns();
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
      if (Array.isArray(studentData.monthlyDiscounts)) {
        await this.syncMonthlyDiscounts(student.StudentID, student.SchoolID, studentData.monthlyDiscounts);
      }
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

  async syncMonthlyDiscounts(studentId, schoolId, discounts = []) {
    const normalized = (Array.isArray(discounts) ? discounts : [])
      .map((item) => ({
        year: Number(item.year ?? item.DiscountYear),
        month: Number(item.month ?? item.DiscountMonth),
        amount: Math.max(0, Math.round(Number(item.amount ?? item.Amount ?? 0) * 100) / 100)
      }))
      .filter((item) => Number.isInteger(item.year)
        && item.year >= 2000
        && item.year <= 2100
        && Number.isInteger(item.month)
        && item.month >= 1
        && item.month <= 12);
    const years = [...new Set(normalized.map((item) => item.year))];

    if (!years.length) {
      return;
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();
    try {
      const deleteRequest = new sql.Request(transaction)
        .input('studentId', sql.Int, studentId)
        .input('schoolId', sql.Int, schoolId);
      const yearPlaceholders = years.map((year, index) => {
        deleteRequest.input(`discountYear${index}`, sql.Int, year);
        return `@discountYear${index}`;
      });

      await deleteRequest.query(`DELETE FROM StudentMonthlyDiscounts
              WHERE StudentID = @studentId
                AND SchoolID = @schoolId
                AND DiscountYear IN (${yearPlaceholders.join(', ')})`);

      for (const discount of normalized.filter((item) => item.amount > 0)) {
        await new sql.Request(transaction)
          .input('schoolId', sql.Int, schoolId)
          .input('studentId', sql.Int, studentId)
          .input('discountYear', sql.Int, discount.year)
          .input('discountMonth', sql.Int, discount.month)
          .input('amount', sql.Decimal(10, 2), discount.amount)
          .query(`INSERT INTO StudentMonthlyDiscounts (SchoolID, StudentID, DiscountYear, DiscountMonth, Amount)
                  VALUES (@schoolId, @studentId, @discountYear, @discountMonth, @amount)`);
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async updateStudent(id, studentData) {
    await this.ensureBillingColumns();
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
      if (Array.isArray(studentData.monthlyDiscounts)) {
        await this.syncMonthlyDiscounts(id, student.SchoolID, studentData.monthlyDiscounts);
      }
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
