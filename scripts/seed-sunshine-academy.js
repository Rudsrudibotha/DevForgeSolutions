'use strict';

require('dotenv').config();

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../src/data/db');

const SCHOOL_ID = 1;
const YEAR = 2026;

async function one(tx, query, inputs = {}) {
  const req = new sql.Request(tx);
  for (const [name, spec] of Object.entries(inputs)) {
    req.input(name, spec.type, spec.value);
  }
  const result = await req.query(query);
  return (result.recordset && result.recordset[0]) || null;
}

async function many(tx, query, inputs = {}) {
  const req = new sql.Request(tx);
  for (const [name, spec] of Object.entries(inputs)) {
    req.input(name, spec.type, spec.value);
  }
  const result = await req.query(query);
  return result.recordset;
}

const input = {
  int: (value) => ({ type: sql.Int, value }),
  bigInt: (value) => ({ type: sql.BigInt, value }),
  bit: (value) => ({ type: sql.Bit, value }),
  money: (value) => ({ type: sql.Decimal(18, 2), value }),
  date: (value) => ({ type: sql.Date, value }),
  dt: (value) => ({ type: sql.DateTime, value }),
  text: (value, max = 255) => ({ type: sql.NVarChar(max), value }),
  max: (value) => ({ type: sql.NVarChar(sql.MAX), value })
};

async function ensureUser(tx, user) {
  const existing = await one(tx, `
    SELECT UserID FROM dbo.Users WHERE Email = @email
  `, { email: input.text(user.email) });
  if (existing) {
    await one(tx, `
      UPDATE dbo.Users
      SET Username = @username, Role = @role, SchoolID = @schoolId, FirstName = @firstName,
          LastName = @lastName, IsActive = 1, IsVerified = 1, VerifiedAt = COALESCE(VerifiedAt, SYSUTCDATETIME()),
          UpdatedDate = GETDATE()
      WHERE UserID = @userId
    `, {
      userId: input.int(existing.UserID),
      username: input.text(user.username),
      role: input.text(user.role),
      schoolId: input.int(user.schoolId || null),
      firstName: input.text(user.firstName || null),
      lastName: input.text(user.lastName || null)
    });
    return existing.UserID;
  }

  const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  const created = await one(tx, `
    INSERT INTO dbo.Users (Username, Email, PasswordHash, Role, SchoolID, FirstName, LastName, IsActive, IsVerified, VerifiedAt)
    OUTPUT INSERTED.UserID
    VALUES (@username, @email, @hash, @role, @schoolId, @firstName, @lastName, 1, 1, SYSUTCDATETIME())
  `, {
    username: input.text(user.username),
    email: input.text(user.email),
    hash: input.text(hash, 255),
    role: input.text(user.role),
    schoolId: input.int(user.schoolId || null),
    firstName: input.text(user.firstName || null),
    lastName: input.text(user.lastName || null)
  });
  return created.UserID;
}

async function ensureEmployee(tx, employee) {
  const row = await one(tx, `
    IF EXISTS (SELECT 1 FROM dbo.Employees WHERE SchoolID = @schoolId AND Email = @email)
    BEGIN
      UPDATE dbo.Employees
      SET UserID = @userId, FirstName = @firstName, LastName = @lastName, Phone = @phone,
          JobTitle = @jobTitle, Department = @department, Salary = @salary, IsActive = 1,
          EmployeeNumber = @employeeNumber, PayrollNumber = @payrollNumber,
          BankName = @bankName, BankAccountNumber = @bankAccountNumber, BranchCode = @branchCode,
          AccountType = @accountType, UpdatedDate = GETDATE()
      OUTPUT INSERTED.EmployeeID
      WHERE SchoolID = @schoolId AND Email = @email
    END
    ELSE
    BEGIN
      INSERT INTO dbo.Employees (
        SchoolID, UserID, FirstName, LastName, Email, Phone, JobTitle, Department, StartDate,
        Salary, LeaveBalance, IsActive, EmployeeNumber, PayrollNumber, BankName,
        BankAccountNumber, BranchCode, AccountType
      )
      OUTPUT INSERTED.EmployeeID
      VALUES (
        @schoolId, @userId, @firstName, @lastName, @email, @phone, @jobTitle, @department,
        @startDate, @salary, 18, 1, @employeeNumber, @payrollNumber, @bankName,
        @bankAccountNumber, @branchCode, @accountType
      )
    END
  `, {
    schoolId: input.int(SCHOOL_ID),
    userId: input.int(employee.userId || null),
    firstName: input.text(employee.firstName),
    lastName: input.text(employee.lastName),
    email: input.text(employee.email),
    phone: input.text(employee.phone),
    jobTitle: input.text(employee.jobTitle),
    department: input.text(employee.department),
    startDate: input.date(employee.startDate),
    salary: input.money(employee.salary),
    employeeNumber: input.text(employee.employeeNumber),
    payrollNumber: input.text(employee.payrollNumber),
    bankName: input.text(employee.bankName),
    bankAccountNumber: input.text(employee.bankAccountNumber),
    branchCode: input.text(employee.branchCode),
    accountType: input.text(employee.accountType)
  });
  return row.EmployeeID;
}

async function ensureFamily(tx, family) {
  const row = await one(tx, `
    IF EXISTS (SELECT 1 FROM dbo.Families WHERE SchoolID = @schoolId AND FamilyName = @familyName)
    BEGIN
      UPDATE dbo.Families
      SET PrimaryParentName = @primaryParentName, PrimaryParentPhone = @primaryParentPhone,
          PrimaryParentEmail = @primaryParentEmail, SecondaryParentName = @secondaryParentName,
          SecondaryParentPhone = @secondaryParentPhone, SecondaryParentEmail = @secondaryParentEmail,
          HomeAddress = @homeAddress, EmergencyContactName = @emergencyContactName,
          EmergencyContactPhone = @emergencyContactPhone, IsDeleted = 0, UpdatedDate = GETDATE()
      OUTPUT INSERTED.FamilyID
      WHERE SchoolID = @schoolId AND FamilyName = @familyName
    END
    ELSE
    BEGIN
      INSERT INTO dbo.Families (
        SchoolID, FamilyName, PrimaryParentName, PrimaryParentPhone, PrimaryParentEmail,
        SecondaryParentName, SecondaryParentPhone, SecondaryParentEmail, HomeAddress,
        EmergencyContactName, EmergencyContactPhone
      )
      OUTPUT INSERTED.FamilyID
      VALUES (
        @schoolId, @familyName, @primaryParentName, @primaryParentPhone, @primaryParentEmail,
        @secondaryParentName, @secondaryParentPhone, @secondaryParentEmail, @homeAddress,
        @emergencyContactName, @emergencyContactPhone
      )
    END
  `, {
    schoolId: input.int(SCHOOL_ID),
    familyName: input.text(family.familyName),
    primaryParentName: input.text(family.primaryParentName),
    primaryParentPhone: input.text(family.primaryParentPhone),
    primaryParentEmail: input.text(family.primaryParentEmail),
    secondaryParentName: input.text(family.secondaryParentName || null),
    secondaryParentPhone: input.text(family.secondaryParentPhone || null),
    secondaryParentEmail: input.text(family.secondaryParentEmail || null),
    homeAddress: input.text(family.homeAddress, 500),
    emergencyContactName: input.text(family.emergencyContactName),
    emergencyContactPhone: input.text(family.emergencyContactPhone)
  });
  return row.FamilyID;
}

async function ensureClass(tx, klass) {
  const row = await one(tx, `
    IF EXISTS (SELECT 1 FROM dbo.Classes WHERE SchoolID = @schoolId AND ClassName = @className AND ActiveYear = @year)
    BEGIN
      UPDATE dbo.Classes
      SET TeacherID = @teacherId, Capacity = @capacity, Grade = @grade, Room = @room,
          IsActive = 1, IsDeleted = 0, UpdatedDate = GETDATE()
      OUTPUT INSERTED.ClassID
      WHERE SchoolID = @schoolId AND ClassName = @className AND ActiveYear = @year
    END
    ELSE
    BEGIN
      INSERT INTO dbo.Classes (SchoolID, ClassName, TeacherID, Capacity, ActiveYear, Grade, Room, IsActive)
      OUTPUT INSERTED.ClassID
      VALUES (@schoolId, @className, @teacherId, @capacity, @year, @grade, @room, 1)
    END
  `, {
    schoolId: input.int(SCHOOL_ID),
    className: input.text(klass.className),
    teacherId: input.int(klass.teacherId),
    capacity: input.int(klass.capacity),
    year: input.int(YEAR),
    grade: input.text(klass.grade),
    room: input.text(klass.room)
  });
  return row.ClassID;
}

async function ensureStudent(tx, student) {
  const row = await one(tx, `
    IF EXISTS (SELECT 1 FROM dbo.Students WHERE SchoolID = @schoolId AND FamilyID = @familyId AND FirstName = @firstName AND LastName = @lastName)
    BEGIN
      UPDATE dbo.Students
      SET DateOfBirth = @dateOfBirth, ClassName = @className, ClassID = @classId,
          BillingCategoryID = @billingCategoryId, BillingDate = @billingDate,
          EnrolledDate = @enrolledDate, CurrentAcademicYear = @year, MedicalNotes = @medicalNotes,
          ResponsiblePayerType = 'Parent', ResponsiblePayerName = @payerName,
          ResponsiblePayerPhone = @payerPhone, ResponsiblePayerEmail = @payerEmail,
          IsActive = 1, IsDeleted = 0, UpdatedDate = GETDATE()
      OUTPUT INSERTED.StudentID
      WHERE SchoolID = @schoolId AND FamilyID = @familyId AND FirstName = @firstName AND LastName = @lastName
    END
    ELSE
    BEGIN
      INSERT INTO dbo.Students (
        SchoolID, FamilyID, FirstName, LastName, DateOfBirth, ClassName, ClassID,
        CurrentAcademicYear, BillingDate, EnrolledDate, IsActive, MedicalNotes,
        BillingCategoryID, ResponsiblePayerType, ResponsiblePayerName, ResponsiblePayerPhone,
        ResponsiblePayerEmail, Gender
      )
      OUTPUT INSERTED.StudentID
      VALUES (
        @schoolId, @familyId, @firstName, @lastName, @dateOfBirth, @className, @classId,
        @year, @billingDate, @enrolledDate, 1, @medicalNotes, @billingCategoryId, 'Parent',
        @payerName, @payerPhone, @payerEmail, @gender
      )
    END
  `, {
    schoolId: input.int(SCHOOL_ID),
    familyId: input.int(student.familyId),
    firstName: input.text(student.firstName),
    lastName: input.text(student.lastName),
    dateOfBirth: input.date(student.dateOfBirth),
    className: input.text(student.className),
    classId: input.int(student.classId),
    year: input.int(YEAR),
    billingDate: input.date('2026-01-05'),
    enrolledDate: input.date(student.enrolledDate),
    medicalNotes: input.text(student.medicalNotes || null, 500),
    billingCategoryId: input.int(student.billingCategoryId),
    payerName: input.text(student.payerName),
    payerPhone: input.text(student.payerPhone),
    payerEmail: input.text(student.payerEmail),
    gender: input.text(student.gender)
  });
  return row.StudentID;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required. Do not commit secrets; pass it through the environment.');
  }

  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    const school = await one(tx, 'SELECT SchoolID, SchoolName, TenantId FROM dbo.Schools WHERE SchoolID = @schoolId', {
      schoolId: input.int(SCHOOL_ID)
    });
    if (!school || school.SchoolName !== 'Sunshine Academy') {
      throw new Error('SchoolID 1 is not Sunshine Academy; aborting seed.');
    }

    const plan = await one(tx, `
      SELECT TOP 1 SubscriptionPlanId FROM dbo.SubscriptionPlans
      WHERE IsActive = 1
      ORDER BY IsDefault DESC, SubscriptionPlanId
    `);

    let tenantId = school.TenantId;
    if (!tenantId) {
      const tenant = await one(tx, `
        INSERT INTO dbo.Tenants (TenantName, TenantType, Status, IsActive)
        OUTPUT INSERTED.TenantId
        VALUES ('Sunshine Academy', 'School', 'Active', 1)
      `);
      tenantId = tenant.TenantId;
      await one(tx, 'UPDATE dbo.Schools SET TenantId = @tenantId WHERE SchoolID = @schoolId', {
        tenantId: input.int(tenantId),
        schoolId: input.int(SCHOOL_ID)
      });
    }

    await one(tx, `
      UPDATE dbo.Schools
      SET Address = '14 Protea Road, Durbanville, Cape Town, 7550',
          ContactPerson = 'Rudi Botha',
          ContactEmail = 'admin@devforgesolutions.com',
          ContactPhone = '+27 21 555 0140',
          Website = 'https://sunshine-academy.example',
          CurrencyCode = 'ZAR',
          CurrencySymbol = 'R',
          DefaultMonthlyFee = 2850.00,
          PaymentInstructions = 'Use the learner name and invoice number as payment reference.',
          SubscriptionPlan = 'Pro',
          SubscriptionStatus = 'Active',
          RegistrationNumber = '2026/014782/08',
          BankName = 'FNB',
          BankAccountNumber = '62845129301',
          BankBranchCode = '250655',
          BankAccountType = 'Business Cheque',
          FinancialYearStartDate = '2026-01-01',
          FinancialYearEndDate = '2026-12-31',
          EnableProRataBilling = 1,
          AllowStaffPayslipView = 1,
          UpdatedDate = GETDATE()
      WHERE SchoolID = @schoolId
    `, { schoolId: input.int(SCHOOL_ID) });

    if (plan && tenantId) {
      await one(tx, `
        IF NOT EXISTS (SELECT 1 FROM dbo.TenantSubscriptions WHERE TenantId = @tenantId AND IsActive = 1)
          INSERT INTO dbo.TenantSubscriptions (TenantId, SubscriptionPlanId, Status, StartDate, IsActive)
          VALUES (@tenantId, @planId, 'Active', '2026-01-01', 1)
      `, { tenantId: input.int(tenantId), planId: input.int(plan.SubscriptionPlanId) });
    }

    const allPermissions = JSON.stringify(['*']);
    const ownerRole = await one(tx, `
      IF EXISTS (SELECT 1 FROM dbo.StaffRoles WHERE SchoolID = @schoolId AND RoleName = 'School Owner')
      BEGIN
        UPDATE dbo.StaffRoles
        SET Description = 'Full school dashboard access', Permissions = @permissions, IsActive = 1, UpdatedDate = GETDATE()
        OUTPUT INSERTED.StaffRoleID
        WHERE SchoolID = @schoolId AND RoleName = 'School Owner'
      END
      ELSE
      BEGIN
        INSERT INTO dbo.StaffRoles (SchoolID, RoleName, Description, Permissions, IsActive)
        OUTPUT INSERTED.StaffRoleID
        VALUES (@schoolId, 'School Owner', 'Full school dashboard access', @permissions, 1)
      END
    `, { schoolId: input.int(SCHOOL_ID), permissions: input.max(allPermissions) });

    const existingSchoolUsers = await many(tx, `
      SELECT UserID FROM dbo.Users
      WHERE SchoolID = @schoolId AND Role IN ('school','admin') AND IsActive = 1
    `, { schoolId: input.int(SCHOOL_ID) });

    for (const row of existingSchoolUsers) {
      await one(tx, `
        IF NOT EXISTS (SELECT 1 FROM dbo.UserRoleAssignments WHERE UserID = @userId AND StaffRoleID = @staffRoleId)
          INSERT INTO dbo.UserRoleAssignments (UserID, StaffRoleID, AssignedBy)
          VALUES (@userId, @staffRoleId, @userId)
      `, { userId: input.int(row.UserID), staffRoleId: input.int(ownerRole.StaffRoleID) });
    }

    const staffUsers = [
      { email: 'principal.sunshine@devforgesolutions.com', username: 'principal.sunshine', firstName: 'Naledi', lastName: 'Mokoena', role: 'school', schoolId: SCHOOL_ID },
      { email: 'finance.sunshine@devforgesolutions.com', username: 'finance.sunshine', firstName: 'Aisha', lastName: 'Khan', role: 'school', schoolId: SCHOOL_ID },
      { email: 'teacher.sunshine@devforgesolutions.com', username: 'teacher.sunshine', firstName: 'Thabo', lastName: 'Dlamini', role: 'school', schoolId: SCHOOL_ID }
    ];
    const staffUserIds = {};
    for (const user of staffUsers) {
      staffUserIds[user.username] = await ensureUser(tx, user);
      await one(tx, `
        IF NOT EXISTS (SELECT 1 FROM dbo.UserRoleAssignments WHERE UserID = @userId AND StaffRoleID = @staffRoleId)
          INSERT INTO dbo.UserRoleAssignments (UserID, StaffRoleID, AssignedBy)
          VALUES (@userId, @staffRoleId, @userId)
      `, { userId: input.int(staffUserIds[user.username]), staffRoleId: input.int(ownerRole.StaffRoleID) });
    }

    const principalEmployeeId = await ensureEmployee(tx, {
      userId: staffUserIds['principal.sunshine'], firstName: 'Naledi', lastName: 'Mokoena',
      email: 'principal.sunshine@devforgesolutions.com', phone: '+27 82 555 0101',
      jobTitle: 'Principal', department: 'Leadership', startDate: '2024-01-08',
      salary: 36500, employeeNumber: 'SUN-EMP-001', payrollNumber: 'SUN-PAY-001',
      bankName: 'FNB', bankAccountNumber: '62001001001', branchCode: '250655', accountType: 'Cheque'
    });
    const teacherEmployeeId = await ensureEmployee(tx, {
      userId: staffUserIds['teacher.sunshine'], firstName: 'Thabo', lastName: 'Dlamini',
      email: 'teacher.sunshine@devforgesolutions.com', phone: '+27 82 555 0102',
      jobTitle: 'Grade R Teacher', department: 'Teaching', startDate: '2025-01-13',
      salary: 23800, employeeNumber: 'SUN-EMP-002', payrollNumber: 'SUN-PAY-002',
      bankName: 'Capitec', bankAccountNumber: '1654892037', branchCode: '470010', accountType: 'Savings'
    });
    await ensureEmployee(tx, {
      userId: staffUserIds['finance.sunshine'], firstName: 'Aisha', lastName: 'Khan',
      email: 'finance.sunshine@devforgesolutions.com', phone: '+27 82 555 0103',
      jobTitle: 'Finance Administrator', department: 'Finance', startDate: '2025-03-01',
      salary: 21200, employeeNumber: 'SUN-EMP-003', payrollNumber: 'SUN-PAY-003',
      bankName: 'Standard Bank', bankAccountNumber: '071234567', branchCode: '051001', accountType: 'Current'
    });

    const toddlerClassId = await ensureClass(tx, { className: 'Little Stars', teacherId: principalEmployeeId, capacity: 16, grade: 'Toddler', room: 'Room 1' });
    const gradeRClassId = await ensureClass(tx, { className: 'Bright Bees', teacherId: teacherEmployeeId, capacity: 22, grade: 'Grade R', room: 'Room 3' });

    const fullDay = await one(tx, `
      IF EXISTS (SELECT 1 FROM dbo.BillingCategories WHERE SchoolID = @schoolId AND CategoryName = 'Full Day Care 2026')
      BEGIN
        UPDATE dbo.BillingCategories SET BaseAmount = 2850, Frequency = 'Monthly', IsActive = 1, BillingYear = @year, UpdatedDate = GETDATE()
        OUTPUT INSERTED.BillingCategoryID
        WHERE SchoolID = @schoolId AND CategoryName = 'Full Day Care 2026'
      END
      ELSE
      BEGIN
        INSERT INTO dbo.BillingCategories (SchoolID, CategoryName, Description, BaseAmount, Frequency, IsActive, BillingYear, ApplicableMonths)
        OUTPUT INSERTED.BillingCategoryID
        VALUES (@schoolId, 'Full Day Care 2026', 'Monthly full day care with meals', 2850, 'Monthly', 1, @year, '1,2,3,4,5,6,7,8,9,10,11,12')
      END
    `, { schoolId: input.int(SCHOOL_ID), year: input.int(YEAR) });
    const aftercare = await one(tx, `
      IF EXISTS (SELECT 1 FROM dbo.BillingCategories WHERE SchoolID = @schoolId AND CategoryName = 'Aftercare 2026')
      BEGIN
        UPDATE dbo.BillingCategories SET BaseAmount = 950, Frequency = 'Monthly', IsActive = 1, BillingYear = @year, UpdatedDate = GETDATE()
        OUTPUT INSERTED.BillingCategoryID
        WHERE SchoolID = @schoolId AND CategoryName = 'Aftercare 2026'
      END
      ELSE
      BEGIN
        INSERT INTO dbo.BillingCategories (SchoolID, CategoryName, Description, BaseAmount, Frequency, IsActive, BillingYear, ApplicableMonths)
        OUTPUT INSERTED.BillingCategoryID
        VALUES (@schoolId, 'Aftercare 2026', 'Afternoon care add-on', 950, 'Monthly', 1, @year, '1,2,3,4,5,6,7,8,9,10,11,12')
      END
    `, { schoolId: input.int(SCHOOL_ID), year: input.int(YEAR) });

    const familyFixtures = [
      {
        familyName: 'Naidoo Family', primaryParentName: 'Priya Naidoo', primaryParentEmail: 'sunshine.parent.naidoo@devforgesolutions.com',
        primaryParentPhone: '+27 82 555 0201', secondaryParentName: 'Arjun Naidoo', secondaryParentEmail: 'sunshine.parent.naidoo2@devforgesolutions.com',
        secondaryParentPhone: '+27 82 555 0202', homeAddress: '8 Milkwood Crescent, Durbanville, Cape Town', emergencyContactName: 'Meera Naidoo',
        emergencyContactPhone: '+27 82 555 0299',
        students: [
          { firstName: 'Mila', lastName: 'Naidoo', dateOfBirth: '2021-04-12', className: 'Little Stars', classId: toddlerClassId, categoryId: fullDay.BillingCategoryID, enrolledDate: '2025-01-15', gender: 'Female', medicalNotes: 'Mild peanut allergy' }
        ]
      },
      {
        familyName: 'Van der Merwe Family', primaryParentName: 'Johan van der Merwe', primaryParentEmail: 'sunshine.parent.vdm@devforgesolutions.com',
        primaryParentPhone: '+27 82 555 0211', secondaryParentName: 'Anika van der Merwe', secondaryParentEmail: 'sunshine.parent.vdm2@devforgesolutions.com',
        secondaryParentPhone: '+27 82 555 0212', homeAddress: '22 Protea Avenue, Bellville, Cape Town', emergencyContactName: 'Marietjie Botha',
        emergencyContactPhone: '+27 82 555 0219',
        students: [
          { firstName: 'Liam', lastName: 'van der Merwe', dateOfBirth: '2020-08-09', className: 'Bright Bees', classId: gradeRClassId, categoryId: fullDay.BillingCategoryID, enrolledDate: '2024-02-01', gender: 'Male', medicalNotes: 'Asthma inhaler in office' },
          { firstName: 'Emma', lastName: 'van der Merwe', dateOfBirth: '2022-03-17', className: 'Little Stars', classId: toddlerClassId, categoryId: aftercare.BillingCategoryID, enrolledDate: '2026-01-12', gender: 'Female', medicalNotes: null }
        ]
      },
      {
        familyName: 'Mkhize Family', primaryParentName: 'Nomsa Mkhize', primaryParentEmail: 'sunshine.parent.mkhize@devforgesolutions.com',
        primaryParentPhone: '+27 82 555 0221', secondaryParentName: null, secondaryParentEmail: null,
        secondaryParentPhone: null, homeAddress: '5 Aloe Street, Kraaifontein, Cape Town', emergencyContactName: 'Sipho Mkhize',
        emergencyContactPhone: '+27 82 555 0229',
        students: [
          { firstName: 'Anele', lastName: 'Mkhize', dateOfBirth: '2020-11-25', className: 'Bright Bees', classId: gradeRClassId, categoryId: fullDay.BillingCategoryID, enrolledDate: '2025-07-01', gender: 'Male', medicalNotes: null }
        ]
      }
    ];

    const familyIds = {};
    const parentUserIds = {};
    const studentIds = [];
    for (const family of familyFixtures) {
      const familyId = await ensureFamily(tx, family);
      familyIds[family.familyName] = familyId;
      const parentUserId = await ensureUser(tx, {
        email: family.primaryParentEmail,
        username: family.primaryParentEmail.split('@')[0],
        firstName: family.primaryParentName.split(' ')[0],
        lastName: family.primaryParentName.split(' ').slice(1).join(' '),
        role: 'parent',
        schoolId: null
      });
      parentUserIds[family.familyName] = parentUserId;
      await one(tx, `
        IF NOT EXISTS (SELECT 1 FROM dbo.ParentLinks WHERE UserID = @userId AND FamilyID = @familyId)
          INSERT INTO dbo.ParentLinks (UserID, FamilyID, SchoolID) VALUES (@userId, @familyId, @schoolId)
      `, { userId: input.int(parentUserId), familyId: input.int(familyId), schoolId: input.int(SCHOOL_ID) });

      for (const student of family.students) {
        const studentId = await ensureStudent(tx, {
          ...student,
          familyId,
          billingCategoryId: student.categoryId,
          payerName: family.primaryParentName,
          payerPhone: family.primaryParentPhone,
          payerEmail: family.primaryParentEmail
        });
        studentIds.push({ ...student, studentId, familyId, parentUserId });
      }
    }

    for (const s of studentIds) {
      const febStatus = s.firstName === 'Anele' ? 'Overdue' : 'Paid';
      const febPaid = s.firstName === 'Anele' ? 0 : 2850;
      const marStatus = s.firstName === 'Emma' ? 'Partial' : 'Pending';
      const marPaid = s.firstName === 'Emma' ? 400 : 0;
      const invoices = [
        { suffix: 'FEB', amount: 2850, paid: febPaid, status: febStatus, issue: '2026-02-01', due: '2026-02-07', desc: 'February 2026 tuition' },
        { suffix: 'MAR', amount: s.categoryId === aftercare.BillingCategoryID ? 950 : 2850, paid: marPaid, status: marStatus, issue: '2026-03-01', due: '2026-03-07', desc: 'March 2026 fees' }
      ];
      for (const inv of invoices) {
        const invoiceNumber = `SUN-${YEAR}-${String(s.studentId).padStart(4, '0')}-${inv.suffix}`;
        const invoice = await one(tx, `
          IF EXISTS (SELECT 1 FROM dbo.Invoices WHERE SchoolID = @schoolId AND InvoiceNumber = @invoiceNumber)
          BEGIN
            UPDATE dbo.Invoices
            SET StudentID = @studentId, BillingCategoryID = @billingCategoryId, Amount = @amount,
                AmountPaid = @paid, Status = @status, Description = @description,
                IssueDate = @issueDate, DueDate = @dueDate, PaidDate = CASE WHEN @status = 'Paid' THEN @dueDate ELSE NULL END,
                IsDeleted = 0, UpdatedDate = GETDATE()
            OUTPUT INSERTED.InvoiceID
            WHERE SchoolID = @schoolId AND InvoiceNumber = @invoiceNumber
          END
          ELSE
          BEGIN
            INSERT INTO dbo.Invoices (SchoolID, StudentID, BillingCategoryID, InvoiceNumber, Amount, AmountPaid, Status, Description, IssueDate, DueDate, PaidDate)
            OUTPUT INSERTED.InvoiceID
            VALUES (@schoolId, @studentId, @billingCategoryId, @invoiceNumber, @amount, @paid, @status, @description, @issueDate, @dueDate, CASE WHEN @status = 'Paid' THEN @dueDate ELSE NULL END)
          END
        `, {
          schoolId: input.int(SCHOOL_ID), studentId: input.int(s.studentId), billingCategoryId: input.int(s.categoryId),
          invoiceNumber: input.text(invoiceNumber), amount: input.money(inv.amount), paid: input.money(inv.paid),
          status: input.text(inv.status), description: input.text(inv.desc), issueDate: input.dt(inv.issue), dueDate: input.dt(inv.due)
        });

        if (inv.paid > 0) {
          await one(tx, `
            IF NOT EXISTS (SELECT 1 FROM dbo.Transactions WHERE SchoolID = @schoolId AND Reference = @reference)
              INSERT INTO dbo.Transactions (
                SchoolID, InvoiceID, ReceiptNumber, PaymentMethod, PayeeType, PayeeName, PayeeEmail,
                Reference, Description, TransactionType, Amount, TransactionDate, AllocationStatus,
                AllocationType, FamilyID, StudentID, AllocatedBy, AllocatedDate
              )
              VALUES (
                @schoolId, @invoiceId, @receiptNumber, 'EFT', 'Parent', @payeeName, @payeeEmail,
                @reference, @description, 'Credit', @amount, @transactionDate, 'Allocated',
                'Invoice', @familyId, @studentId, @allocatedBy, GETDATE()
              )
          `, {
            schoolId: input.int(SCHOOL_ID), invoiceId: input.int(invoice.InvoiceID),
            receiptNumber: input.text(`RCPT-${invoiceNumber}`), payeeName: input.text(s.payerName || 'Parent'),
            payeeEmail: input.text(s.payerEmail || null), reference: input.text(`PAY-${invoiceNumber}`),
            description: input.text(`Payment for ${invoiceNumber}`), amount: input.money(inv.paid),
            transactionDate: input.dt(inv.due), familyId: input.int(s.familyId), studentId: input.int(s.studentId),
            allocatedBy: input.int(staffUserIds['finance.sunshine'])
          });
        }
      }

      for (const attendance of [
        { date: '2026-06-08', status: 'Present' },
        { date: '2026-06-09', status: s.firstName === 'Mila' ? 'Absent' : 'Present' },
        { date: '2026-06-10', status: 'Present' },
        { date: '2026-06-11', status: s.firstName === 'Liam' ? 'Late' : 'Present' }
      ]) {
        await one(tx, `
          IF EXISTS (SELECT 1 FROM dbo.Attendance WHERE SchoolID = @schoolId AND StudentID = @studentId AND AttendanceDate = @attendanceDate)
            UPDATE dbo.Attendance SET Status = @status, ClassID = @classId, RecordedBy = @recordedBy, UpdatedDate = GETDATE()
            WHERE SchoolID = @schoolId AND StudentID = @studentId AND AttendanceDate = @attendanceDate
          ELSE
            INSERT INTO dbo.Attendance (SchoolID, StudentID, ClassID, AttendanceDate, Status, ArrivalTime, RecordedBy)
            VALUES (@schoolId, @studentId, @classId, @attendanceDate, @status, '08:05', @recordedBy)
        `, {
          schoolId: input.int(SCHOOL_ID), studentId: input.int(s.studentId), classId: input.int(s.classId),
          attendanceDate: input.date(attendance.date), status: input.text(attendance.status), recordedBy: input.int(staffUserIds['teacher.sunshine'])
        });
      }
    }

    const consentRequest = await one(tx, `
      IF EXISTS (SELECT 1 FROM dbo.ConsentRequests WHERE SchoolID = @schoolId AND Title = '2026 Aquarium Excursion')
      BEGIN
        UPDATE dbo.ConsentRequests SET Status = 'Open', DueDate = '2026-07-05', UpdatedDate = GETDATE()
        OUTPUT INSERTED.ConsentRequestID
        WHERE SchoolID = @schoolId AND Title = '2026 Aquarium Excursion'
      END
      ELSE
      BEGIN
        INSERT INTO dbo.ConsentRequests (SchoolID, ConsentType, Title, ActivityDate, DueDate, Location, TargetScope, TargetValue, DocumentBody, RiskNotes, MedicalInstructions, CreatedBy)
        OUTPUT INSERTED.ConsentRequestID
        VALUES (@schoolId, 'Excursion', '2026 Aquarium Excursion', '2026-07-12', '2026-07-05', 'Two Oceans Aquarium', 'School', 'Entire student body', @body, @risk, @medical, @createdBy)
      END
    `, {
      schoolId: input.int(SCHOOL_ID),
      body: input.max('Learners will travel by school transport to the Two Oceans Aquarium for a supervised educational visit.'),
      risk: input.max('Transport, public venue supervision, and meal allergy checks.'),
      medical: input.max('Please ensure medication and emergency instructions are up to date.'),
      createdBy: input.int(staffUserIds['principal.sunshine'])
    });
    for (const s of studentIds) {
      await one(tx, `
        IF NOT EXISTS (SELECT 1 FROM dbo.ConsentRecords WHERE SchoolID = @schoolId AND StudentID = @studentId AND ConsentRequestID = @requestId)
          INSERT INTO dbo.ConsentRecords (SchoolID, StudentID, ConsentRequestID, ConsentType, Response, Notes)
          VALUES (@schoolId, @studentId, @requestId, 'Excursion', 'Pending', 'Awaiting parent response')
      `, { schoolId: input.int(SCHOOL_ID), studentId: input.int(s.studentId), requestId: input.int(consentRequest.ConsentRequestID) });
    }

    const naidooFamilyId = familyIds['Naidoo Family'];
    const naidooStudent = studentIds.find((s) => s.lastName === 'Naidoo');
    await one(tx, `
      IF NOT EXISTS (SELECT 1 FROM dbo.RegistrationFees WHERE SchoolID = @schoolId AND FamilyID = @familyId AND FeeType = '2026 Registration Deposit')
        INSERT INTO dbo.RegistrationFees (SchoolID, StudentID, FamilyID, FeeType, Amount, IsRefundable, IsPaid, PaidDate, Notes)
        VALUES (@schoolId, @studentId, @familyId, '2026 Registration Deposit', 750, 1, 1, '2026-01-10', 'Paid on enrolment')
    `, { schoolId: input.int(SCHOOL_ID), studentId: input.int(naidooStudent.studentId), familyId: input.int(naidooFamilyId) });

    const mkhizeFamilyId = familyIds['Mkhize Family'];
    const mkhizeStudent = studentIds.find((s) => s.lastName === 'Mkhize');
    await one(tx, `
      IF NOT EXISTS (SELECT 1 FROM dbo.FinancialAdjustments WHERE SchoolID = @schoolId AND FamilyID = @familyId AND Reason = 'Sibling/loyalty goodwill adjustment')
        INSERT INTO dbo.FinancialAdjustments (SchoolID, StudentID, FamilyID, AdjustmentType, Amount, Reason, CreatedBy)
        VALUES (@schoolId, @studentId, @familyId, 'Credit Correction', 250, 'Sibling/loyalty goodwill adjustment', @createdBy)
    `, { schoolId: input.int(SCHOOL_ID), studentId: input.int(mkhizeStudent.studentId), familyId: input.int(mkhizeFamilyId), createdBy: input.int(staffUserIds['finance.sunshine']) });

    await one(tx, `
      IF NOT EXISTS (SELECT 1 FROM dbo.Refunds WHERE SchoolID = @schoolId AND FamilyID = @familyId AND Reason = 'Duplicate EFT payment review')
        INSERT INTO dbo.Refunds (SchoolID, FamilyID, StudentID, Amount, Reason, Status, CreatedBy)
        VALUES (@schoolId, @familyId, @studentId, 400, 'Duplicate EFT payment review', 'Pending', @createdBy)
    `, { schoolId: input.int(SCHOOL_ID), familyId: input.int(familyIds['Van der Merwe Family']), studentId: input.int(studentIds.find((s) => s.firstName === 'Emma').studentId), createdBy: input.int(staffUserIds['finance.sunshine']) });

    const bankAccount = await one(tx, `
      IF EXISTS (SELECT 1 FROM dbo.BankAccounts WHERE SchoolID = @schoolId AND AccountNumber = '62845129301')
      BEGIN
        UPDATE dbo.BankAccounts SET AccountName = 'Sunshine Academy Main Account', BankName = 'FNB', IsActive = 1
        OUTPUT INSERTED.BankAccountID
        WHERE SchoolID = @schoolId AND AccountNumber = '62845129301'
      END
      ELSE
      BEGIN
        INSERT INTO dbo.BankAccounts (TenantId, SchoolID, AccountName, AccountNumber, BankName, IsActive)
        OUTPUT INSERTED.BankAccountID
        VALUES (@tenantId, @schoolId, 'Sunshine Academy Main Account', '62845129301', 'FNB', 1)
      END
    `, { tenantId: input.int(tenantId), schoolId: input.int(SCHOOL_ID) });

    const statement = await one(tx, `
      IF EXISTS (SELECT 1 FROM dbo.BankReconciliationStatements WHERE SchoolId = @schoolId AND StatementYear = 2026 AND StatementMonth = 3)
        SELECT TOP 1 BankReconciliationStatementId FROM dbo.BankReconciliationStatements WHERE SchoolId = @schoolId AND StatementYear = 2026 AND StatementMonth = 3
      ELSE
        INSERT INTO dbo.BankReconciliationStatements (TenantId, SchoolId, BankAccountId, StatementNumber, StatementYear, StatementMonth, StatementMonthName, Status, ImportedByUserId)
        OUTPUT INSERTED.BankReconciliationStatementId
        VALUES (@tenantId, @schoolId, @bankAccountId, 3, 2026, 3, 'March', 'Open', @userId)
    `, { tenantId: input.int(tenantId), schoolId: input.int(SCHOOL_ID), bankAccountId: input.int(bankAccount.BankAccountID), userId: input.int(staffUserIds['finance.sunshine']) });

    const importRow = await one(tx, `
      IF EXISTS (SELECT 1 FROM dbo.BankStatementImports WHERE SchoolId = @schoolId AND FileHash = 'sunshine-march-2026-seed')
        SELECT TOP 1 BankStatementImportId FROM dbo.BankStatementImports WHERE SchoolId = @schoolId AND FileHash = 'sunshine-march-2026-seed'
      ELSE
        INSERT INTO dbo.BankStatementImports (
          TenantId, SchoolId, BankAccountId, BankReconciliationStatementId, ImportYear, ImportMonth,
          OriginalFileName, FileHash, ImportedByUserId, Status, TotalTransactionsInFile, TotalTransactionsImported, TotalPaymentsCreated
        )
        OUTPUT INSERTED.BankStatementImportId
        VALUES (@tenantId, @schoolId, @bankAccountId, @statementId, 2026, 3, 'sunshine-fnb-march-2026.csv', 'sunshine-march-2026-seed', @userId, 'Completed', 4, 4, 2)
    `, {
      tenantId: input.int(tenantId), schoolId: input.int(SCHOOL_ID), bankAccountId: input.int(bankAccount.BankAccountID),
      statementId: input.bigInt(statement.BankReconciliationStatementId), userId: input.int(staffUserIds['finance.sunshine'])
    });

    for (const txRow of [
      ['001', '2026-03-07', 2850, 'Credit', 'SUN FEES LIAM VDM', 'Matched parent EFT'],
      ['002', '2026-03-08', 400, 'Credit', 'SUN EMMA PART PAY', 'Partial parent payment'],
      ['003', '2026-03-11', 950, 'Debit', 'GROCERY WHOLESALER', 'School meal supplies'],
      ['004', '2026-03-15', 750, 'Credit', 'REG DEPOSIT NAIDOO', 'Registration deposit']
    ]) {
      const [idx, transactionDate, amount, direction, reference, description] = txRow;
      await one(tx, `
        IF NOT EXISTS (SELECT 1 FROM dbo.BankTransactions WHERE TransactionHash = @hash)
          INSERT INTO dbo.BankTransactions (
            TenantId, SchoolId, BankAccountId, BankReconciliationStatementId, BankStatementImportId,
            TransactionDate, PostedDate, BankEffectiveDate, Amount, Direction, Reference, Description, FITID,
            TransactionHash, Status
          )
          VALUES (
            @tenantId, @schoolId, @bankAccountId, @statementId, @importId,
            @transactionDate, @transactionDate, @transactionDate, @amount, @direction, @reference, @description, @fitid,
            @hash, 'Imported'
          )
      `, {
        tenantId: input.int(tenantId), schoolId: input.int(SCHOOL_ID), bankAccountId: input.int(bankAccount.BankAccountID),
        statementId: input.bigInt(statement.BankReconciliationStatementId), importId: input.bigInt(importRow.BankStatementImportId),
        transactionDate: input.date(transactionDate), amount: input.money(amount), direction: input.text(direction),
        reference: input.text(reference), description: input.text(description), fitid: input.text(`SUN-${idx}`),
        hash: input.text(`sunshine-bank-${idx}`)
      });
    }

    const legacyStatement = await one(tx, `
      IF EXISTS (SELECT 1 FROM dbo.BankStatements WHERE SchoolID = @schoolId AND FileName = 'sunshine-fnb-march-2026.csv')
      BEGIN
        UPDATE dbo.BankStatements SET StatementDate = '2026-03-31', StatementEndDate = '2026-03-31', TotalRows = 4, RowsImported = 4, UploadedBy = @userId, UpdatedDate = GETDATE()
        OUTPUT INSERTED.BankStatementID
        WHERE SchoolID = @schoolId AND FileName = 'sunshine-fnb-march-2026.csv'
      END
      ELSE
      BEGIN
        INSERT INTO dbo.BankStatements (SchoolID, FileName, StatementDate, StatementEndDate, RawData, UploadedBy, TotalRows, RowsImported)
        OUTPUT INSERTED.BankStatementID
        VALUES (@schoolId, 'sunshine-fnb-march-2026.csv', '2026-03-31', '2026-03-31', @rawData, @userId, 4, 4)
      END
    `, { schoolId: input.int(SCHOOL_ID), rawData: input.max('date,description,amount\n2026-03-07,SUN FEES LIAM VDM,2850'), userId: input.int(staffUserIds['finance.sunshine']) });

    await one(tx, `
      IF NOT EXISTS (SELECT 1 FROM dbo.Transactions WHERE SchoolID = @schoolId AND Reference = 'UNALLOC-SUN-MARCH-001')
        INSERT INTO dbo.Transactions (
          SchoolID, BankStatementID, PaymentMethod, PayeeType, PayeeName, Reference, Description,
          TransactionType, Amount, TransactionDate, AllocationStatus, BankTransactionKey
        )
        VALUES (@schoolId, @bankStatementId, 'EFT', 'Unknown', 'Unknown payer', 'UNALLOC-SUN-MARCH-001', 'Unallocated EFT awaiting match', 'Credit', 1250, '2026-03-20', 'Unallocated', 'sunshine-unallocated-001')
    `, { schoolId: input.int(SCHOOL_ID), bankStatementId: input.int(legacyStatement.BankStatementID) });

    for (const employee of [
      { id: principalEmployeeId, period: '2026-03', gross: 36500, deductions: 7100, net: 29400 },
      { id: teacherEmployeeId, period: '2026-03', gross: 23800, deductions: 3980, net: 19820 }
    ]) {
      await one(tx, `
        IF NOT EXISTS (SELECT 1 FROM dbo.Payslips WHERE EmployeeID = @employeeId AND PayPeriod = @period)
          INSERT INTO dbo.Payslips (
            EmployeeID, PayPeriod, GrossAmount, Deductions, NetAmount, Notes, BasicSalary,
            TaxPaye, UifDeduction, PaymentDate, Status, CreatedBy
          )
          VALUES (@employeeId, @period, @gross, @deductions, @net, 'Seeded realistic payroll test data', @gross, @tax, @uif, '2026-03-25', 'Draft', @createdBy)
      `, {
        employeeId: input.int(employee.id), period: input.text(employee.period), gross: input.money(employee.gross),
        deductions: input.money(employee.deductions), net: input.money(employee.net), tax: input.money(employee.deductions - 177.12),
        uif: input.money(177.12), createdBy: input.int(staffUserIds['finance.sunshine'])
      });
    }

    await one(tx, `
      IF NOT EXISTS (SELECT 1 FROM dbo.LeaveRequests WHERE EmployeeID = @employeeId AND StartDate = '2026-06-22')
        INSERT INTO dbo.LeaveRequests (EmployeeID, LeaveType, StartDate, EndDate, Days, Reason, Status)
        VALUES (@employeeId, 'Annual', '2026-06-22', '2026-06-24', 3, 'Family travel', 'Pending')
    `, { employeeId: input.int(teacherEmployeeId) });

    const conversation = await one(tx, `
      IF EXISTS (SELECT 1 FROM dbo.MessagingConversations WHERE SchoolID = @schoolId AND ChannelKey = 'seed:sunshine:naidoo')
        SELECT TOP 1 ConversationID FROM dbo.MessagingConversations WHERE SchoolID = @schoolId AND ChannelKey = 'seed:sunshine:naidoo'
      ELSE
        INSERT INTO dbo.MessagingConversations (SchoolID, FamilyID, Subject, TargetType, ConversationType, ChannelKey, CreatedByUserID)
        OUTPUT INSERTED.ConversationID
        VALUES (@schoolId, @familyId, 'Welcome to Term 2', 'ParentSchool', 'ParentSchool', 'seed:sunshine:naidoo', @createdBy)
    `, { schoolId: input.int(SCHOOL_ID), familyId: input.int(naidooFamilyId), createdBy: input.int(staffUserIds['principal.sunshine']) });

    await one(tx, `
      IF NOT EXISTS (SELECT 1 FROM dbo.MessagingMessages WHERE ConversationID = @conversationId AND Body = @body)
        INSERT INTO dbo.MessagingMessages (ConversationID, SchoolID, FamilyID, SenderUserID, SenderRole, Body)
        VALUES (@conversationId, @schoolId, @familyId, @senderUserId, 'school', @body)
    `, {
      conversationId: input.int(conversation.ConversationID), schoolId: input.int(SCHOOL_ID), familyId: input.int(naidooFamilyId),
      senderUserId: input.int(staffUserIds['principal.sunshine']), body: input.max('Welcome back for Term 2. Please remember sun hats and labelled water bottles this week.')
    });

    await one(tx, `
      IF NOT EXISTS (SELECT 1 FROM dbo.FaultReports WHERE SchoolID = @schoolId AND PagePath = '/sms/bank-statements/import' AND Remarks = @remarks)
        INSERT INTO dbo.FaultReports (SchoolID, UserID, PagePath, ViewName, Remarks, UserAgent, Status)
        VALUES (@schoolId, @userId, '/sms/bank-statements/import', 'Import bank statement', @remarks, 'Sunshine demo seed', 'Open')
    `, {
      schoolId: input.int(SCHOOL_ID),
      userId: input.int(staffUserIds['finance.sunshine']),
      remarks: input.max('Demo fault: finance user could not select the imported FNB statement row for matching.')
    });

    await tx.commit();

    const summary = await pool.request().input('schoolId', sql.Int, SCHOOL_ID).query(`
      SELECT COUNT(1) AS families FROM dbo.Families WHERE SchoolID = @schoolId AND IsDeleted = 0;
      SELECT COUNT(1) AS students FROM dbo.Students WHERE SchoolID = @schoolId AND IsDeleted = 0;
      SELECT COUNT(1) AS classes FROM dbo.Classes WHERE SchoolID = @schoolId AND IsDeleted = 0;
      SELECT COUNT(1) AS invoices FROM dbo.Invoices WHERE SchoolID = @schoolId AND IsDeleted = 0;
      SELECT COUNT(1) AS payments FROM dbo.Transactions WHERE SchoolID = @schoolId;
      SELECT COUNT(1) AS attendance FROM dbo.Attendance WHERE SchoolID = @schoolId;
      SELECT COUNT(1) AS consents FROM dbo.ConsentRecords WHERE SchoolID = @schoolId;
      SELECT COUNT(1) AS bankAccounts FROM dbo.BankAccounts WHERE SchoolID = @schoolId;
      SELECT COUNT(1) AS messages FROM dbo.MessagingConversations WHERE SchoolID = @schoolId;
    `);
    console.log(JSON.stringify({
      schoolId: SCHOOL_ID,
      tenantId,
      ownerRoleId: ownerRole.StaffRoleID,
      families: summary.recordsets[0][0].families,
      students: summary.recordsets[1][0].students,
      classes: summary.recordsets[2][0].classes,
      invoices: summary.recordsets[3][0].invoices,
      payments: summary.recordsets[4][0].payments,
      attendance: summary.recordsets[5][0].attendance,
      consents: summary.recordsets[6][0].consents,
      bankAccounts: summary.recordsets[7][0].bankAccounts,
      conversations: summary.recordsets[8][0].messages
    }, null, 2));
  } catch (error) {
    try { await tx.rollback(); } catch (_) {}
    throw error;
  } finally {
    await pool.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
