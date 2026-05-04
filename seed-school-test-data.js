// Seed one year of school-management test data for a demo school.

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { connectDB, sql } = require('./src/data/db');

const SCHOOL_ID = Number(process.env.TEST_DATA_SCHOOL_ID || 7);
const YEAR_START = { year: 2025, month: 5 };
const MONTH_COUNT = 12;
const PARENT_PASSWORD = process.env.TEST_DATA_PARENT_PASSWORD || 'parent123';

const staffSeed = [
  ['Thandi', 'Nkosi', 'thandi.nkosi@devforge.local', 'Teacher', 'Academics', 28500],
  ['Sipho', 'Dlamini', 'sipho.dlamini@devforge.local', 'Teacher', 'Academics', 27800],
  ['Aisha', 'Patel', 'aisha.patel@devforge.local', 'Finance Officer', 'Finance', 31500],
  ['Pieter', 'van Wyk', 'pieter.vanwyk@devforge.local', 'HR Officer', 'HR', 33000],
  ['Maria', 'Jacobs', 'maria.jacobs@devforge.local', 'Principal', 'Leadership', 48500]
];

const classSeed = [
  ['Grade 1 Blue', 0, 30],
  ['Grade 2 Blue', 1, 30],
  ['Grade 3 Blue', 0, 30],
  ['Grade 4 Blue', 1, 30]
];

const billingSeed = [
  ['Grade 1 Monthly', 1900],
  ['Grade 2 Monthly', 2100],
  ['Grade 3 Monthly', 2300],
  ['Grade 4 Monthly', 2500]
];

const studentSeed = [
  ['Liam', 'Botha', 'Botha', 0],
  ['Emma', 'Naidoo', 'Naidoo', 1],
  ['Noah', 'Mokoena', 'Mokoena', 2],
  ['Olivia', 'Khumalo', 'Khumalo', 3],
  ['Ethan', 'Smith', 'Smith', 0],
  ['Ava', 'Mthembu', 'Mthembu', 1],
  ['Mason', 'Pillay', 'Pillay', 2],
  ['Mia', 'Jacobs', 'Jacobs', 3],
  ['Lucas', 'Williams', 'Williams', 0],
  ['Isabella', 'Ndlovu', 'Ndlovu', 1],
  ['Aiden', 'Pretorius', 'Pretorius', 2],
  ['Sophia', 'Dube', 'Dube', 3],
  ['Logan', 'Meyer', 'Meyer', 0],
  ['Amelia', 'Maseko', 'Maseko', 1],
  ['James', 'Govender', 'Govender', 2],
  ['Harper', 'Coetzee', 'Coetzee', 3],
  ['Benjamin', 'Zulu', 'Zulu', 0],
  ['Charlotte', 'Kriel', 'Kriel', 1],
  ['Daniel', 'Sithole', 'Sithole', 2],
  ['Ella', 'Davids', 'Davids', 3]
];

function pad(value) {
  return String(value).padStart(2, '0');
}

function dateString(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function monthSequence(start, count) {
  return Array.from({ length: count }, (_, index) => {
    const zeroBased = start.month - 1 + index;
    return {
      year: start.year + Math.floor(zeroBased / 12),
      month: (zeroBased % 12) + 1
    };
  });
}

async function firstRow(query, inputs = {}) {
  const request = new sql.Request();
  Object.entries(inputs).forEach(([name, { type, value }]) => request.input(name, type, value));
  const result = await request.query(query);
  return result.recordset?.[0] || null;
}

async function execute(query, inputs = {}) {
  const request = new sql.Request();
  Object.entries(inputs).forEach(([name, { type, value }]) => request.input(name, type, value));
  const result = await request.query(query);
  return result.recordset?.[0] || null;
}

async function ensureSchoolUserHrAccess(schoolId) {
  await execute(
    `UPDATE Users
     SET HasHrPermission = 1, UpdatedDate = GETDATE()
     WHERE SchoolID = @schoolId AND Role = 'school' AND Email = 'schooltest@devforge.local'`,
    { schoolId: { type: sql.Int, value: schoolId } }
  );
}

async function ensureEmployee(schoolId, seed) {
  const [firstName, lastName, email, jobTitle, department, salary] = seed;
  const existing = await firstRow(
    'SELECT * FROM Employees WHERE SchoolID = @schoolId AND Email = @email',
    {
      schoolId: { type: sql.Int, value: schoolId },
      email: { type: sql.NVarChar, value: email }
    }
  );

  const values = {
    schoolId: { type: sql.Int, value: schoolId },
    firstName: { type: sql.NVarChar, value: firstName },
    lastName: { type: sql.NVarChar, value: lastName },
    email: { type: sql.NVarChar, value: email },
    phone: { type: sql.NVarChar, value: `082555${String(staffSeed.findIndex((s) => s[2] === email) + 1).padStart(4, '0')}` },
    jobTitle: { type: sql.NVarChar, value: jobTitle },
    department: { type: sql.NVarChar, value: department },
    startDate: { type: sql.Date, value: '2024-01-15' },
    salary: { type: sql.Decimal(10, 2), value: salary }
  };

  if (existing) {
    return await execute(
      `UPDATE Employees
       SET FirstName = @firstName, LastName = @lastName, Phone = @phone, JobTitle = @jobTitle,
           Department = @department, StartDate = @startDate, Salary = @salary, IsActive = 1, UpdatedDate = GETDATE()
       OUTPUT INSERTED.*
       WHERE EmployeeID = ${existing.EmployeeID}`,
      values
    );
  }

  return await execute(
    `INSERT INTO Employees (SchoolID, FirstName, LastName, Email, Phone, JobTitle, Department, StartDate, Salary, LeaveBalance, IsActive)
     OUTPUT INSERTED.*
     VALUES (@schoolId, @firstName, @lastName, @email, @phone, @jobTitle, @department, @startDate, @salary, 21, 1)`,
    values
  );
}

async function ensureClass(schoolId, className, teacherId, capacity) {
  const existing = await firstRow(
    'SELECT * FROM Classes WHERE SchoolID = @schoolId AND ClassName = @className',
    {
      schoolId: { type: sql.Int, value: schoolId },
      className: { type: sql.NVarChar, value: className }
    }
  );

  const values = {
    schoolId: { type: sql.Int, value: schoolId },
    className: { type: sql.NVarChar, value: className },
    teacherId: { type: sql.Int, value: teacherId },
    capacity: { type: sql.Int, value: capacity }
  };

  if (existing) {
    return await execute(
      `UPDATE Classes
       SET TeacherID = @teacherId, Capacity = @capacity, IsActive = 1, UpdatedDate = GETDATE()
       OUTPUT INSERTED.*
       WHERE ClassID = ${existing.ClassID}`,
      values
    );
  }

  return await execute(
    `INSERT INTO Classes (SchoolID, ClassName, TeacherID, Capacity, IsActive)
     OUTPUT INSERTED.*
     VALUES (@schoolId, @className, @teacherId, @capacity, 1)`,
    values
  );
}

async function ensureBillingCategory(schoolId, categoryName, amount) {
  const existing = await firstRow(
    'SELECT * FROM BillingCategories WHERE SchoolID = @schoolId AND CategoryName = @categoryName',
    {
      schoolId: { type: sql.Int, value: schoolId },
      categoryName: { type: sql.NVarChar, value: categoryName }
    }
  );

  const values = {
    schoolId: { type: sql.Int, value: schoolId },
    categoryName: { type: sql.NVarChar, value: categoryName },
    description: { type: sql.NVarChar, value: 'Demo monthly tuition category' },
    amount: { type: sql.Decimal(10, 2), value: amount }
  };

  if (existing) {
    return await execute(
      `UPDATE BillingCategories
       SET Description = @description, BaseAmount = @amount, Frequency = 'Monthly', IsActive = 1, UpdatedDate = GETDATE()
       OUTPUT INSERTED.*
       WHERE BillingCategoryID = ${existing.BillingCategoryID}`,
      values
    );
  }

  return await execute(
    `INSERT INTO BillingCategories (SchoolID, CategoryName, Description, BaseAmount, Frequency, IsActive)
     OUTPUT INSERTED.*
     VALUES (@schoolId, @categoryName, @description, @amount, 'Monthly', 1)`,
    values
  );
}

async function ensureFamilyAndParent(schoolId, index, surname) {
  const parentNumber = pad(index + 1);
  const email = `demo.parent${parentNumber}@devforge.local`;
  const existingFamily = await firstRow(
    'SELECT * FROM Families WHERE SchoolID = @schoolId AND PrimaryParentEmail = @email',
    {
      schoolId: { type: sql.Int, value: schoolId },
      email: { type: sql.NVarChar, value: email }
    }
  );

  const familyValues = {
    schoolId: { type: sql.Int, value: schoolId },
    familyName: { type: sql.NVarChar, value: `${surname} Family` },
    primaryParentName: { type: sql.NVarChar, value: `${surname} Parent 1` },
    primaryParentIdNumber: { type: sql.NVarChar, value: `8001015${String(index + 1).padStart(6, '0')}` },
    primaryParentPhone: { type: sql.NVarChar, value: `082100${String(index + 1).padStart(4, '0')}` },
    primaryParentEmail: { type: sql.NVarChar, value: email },
    secondaryParentName: { type: sql.NVarChar, value: `${surname} Parent 2` },
    secondaryParentPhone: { type: sql.NVarChar, value: `083200${String(index + 1).padStart(4, '0')}` },
    secondaryParentEmail: { type: sql.NVarChar, value: `demo.parent${parentNumber}.alt@devforge.local` },
    homeAddress: { type: sql.NVarChar, value: `${index + 10} Demo Street, Testville` },
    emergencyContactName: { type: sql.NVarChar, value: `${surname} Emergency Contact` },
    emergencyContactPhone: { type: sql.NVarChar, value: `084300${String(index + 1).padStart(4, '0')}` }
  };

  const family = existingFamily || await execute(
    `INSERT INTO Families (
       SchoolID, FamilyName, PrimaryParentName, PrimaryParentIdNumber, PrimaryParentPhone, PrimaryParentEmail,
       SecondaryParentName, SecondaryParentPhone, SecondaryParentEmail, HomeAddress, EmergencyContactName, EmergencyContactPhone
     )
     OUTPUT INSERTED.*
     VALUES (
       @schoolId, @familyName, @primaryParentName, @primaryParentIdNumber, @primaryParentPhone, @primaryParentEmail,
       @secondaryParentName, @secondaryParentPhone, @secondaryParentEmail, @homeAddress, @emergencyContactName, @emergencyContactPhone
     )`,
    familyValues
  );

  const parentPasswordHash = await bcrypt.hash(PARENT_PASSWORD, 10);
  let parentUser = await firstRow(
    'SELECT * FROM Users WHERE Email = @email',
    { email: { type: sql.NVarChar, value: email } }
  );

  if (!parentUser) {
    parentUser = await execute(
      `INSERT INTO Users (Username, Email, PasswordHash, Role, SchoolID, IsActive)
       OUTPUT INSERTED.*
       VALUES (@username, @email, @passwordHash, 'parent', NULL, 1)`,
      {
        username: { type: sql.NVarChar, value: `demoparent${parentNumber}` },
        email: { type: sql.NVarChar, value: email },
        passwordHash: { type: sql.NVarChar, value: parentPasswordHash }
      }
    );
  }

  const existingLink = await firstRow(
    'SELECT * FROM ParentLinks WHERE UserID = @userId AND FamilyID = @familyId',
    {
      userId: { type: sql.Int, value: parentUser.UserID },
      familyId: { type: sql.Int, value: family.FamilyID }
    }
  );

  if (!existingLink) {
    await execute(
      `INSERT INTO ParentLinks (UserID, FamilyID, SchoolID)
       VALUES (@userId, @familyId, @schoolId)`,
      {
        userId: { type: sql.Int, value: parentUser.UserID },
        familyId: { type: sql.Int, value: family.FamilyID },
        schoolId: { type: sql.Int, value: schoolId }
      }
    );
  }

  return family;
}

async function ensureStudent(schoolId, family, student, classRecord, billingCategory, index) {
  const [firstName, lastName] = student;
  const existing = await firstRow(
    `SELECT * FROM Students
     WHERE SchoolID = @schoolId AND FamilyID = @familyId AND FirstName = @firstName AND LastName = @lastName`,
    {
      schoolId: { type: sql.Int, value: schoolId },
      familyId: { type: sql.Int, value: family.FamilyID },
      firstName: { type: sql.NVarChar, value: firstName },
      lastName: { type: sql.NVarChar, value: lastName }
    }
  );

  const values = {
    schoolId: { type: sql.Int, value: schoolId },
    familyId: { type: sql.Int, value: family.FamilyID },
    firstName: { type: sql.NVarChar, value: firstName },
    lastName: { type: sql.NVarChar, value: lastName },
    dateOfBirth: { type: sql.Date, value: dateString(2014 + (index % 4), ((index % 12) + 1), ((index % 20) + 1)) },
    homePhone: { type: sql.NVarChar, value: family.PrimaryParentPhone },
    homeAddress: { type: sql.NVarChar, value: family.HomeAddress },
    className: { type: sql.NVarChar, value: classRecord.ClassName },
    billingDate: { type: sql.Date, value: dateString(YEAR_START.year, YEAR_START.month, 1) },
    enrolledDate: { type: sql.Date, value: '2024-01-15' },
    medicalNotes: { type: sql.NVarChar, value: index % 6 === 0 ? 'Mild seasonal allergies' : null },
    billingCategoryId: { type: sql.Int, value: billingCategory.BillingCategoryID }
  };

  if (existing) {
    return await execute(
      `UPDATE Students
       SET ClassName = @className, BillingCategoryID = @billingCategoryId, IsActive = 1,
           MedicalNotes = @medicalNotes, UpdatedDate = GETDATE()
       OUTPUT INSERTED.*
       WHERE StudentID = ${existing.StudentID}`,
      values
    );
  }

  return await execute(
    `INSERT INTO Students (
       SchoolID, FamilyID, FirstName, LastName, DateOfBirth, HomePhone, HomeAddress, ClassName,
       BillingDate, EnrolledDate, MedicalNotes, BillingCategoryID, IsActive
     )
     OUTPUT INSERTED.*
     VALUES (
       @schoolId, @familyId, @firstName, @lastName, @dateOfBirth, @homePhone, @homeAddress, @className,
       @billingDate, @enrolledDate, @medicalNotes, @billingCategoryId, 1
     )`,
    values
  );
}

function invoicePaymentPattern(studentIndex, monthIndex, amount) {
  const isRecent = monthIndex >= MONTH_COUNT - 3;

  if (isRecent && studentIndex % 5 === 0) {
    return { status: 'Overdue', amountPaid: 0 };
  }

  if (isRecent && studentIndex % 4 === 0) {
    return { status: 'Partial', amountPaid: Math.max(0, amount - 450) };
  }

  if (monthIndex % 6 === 0 && studentIndex % 7 === 0) {
    return { status: 'Partial', amountPaid: Math.max(0, amount - 250) };
  }

  return { status: 'Paid', amountPaid: amount };
}

async function ensureInvoiceAndPayment(schoolId, student, billingCategory, studentIndex, monthInfo, monthIndex) {
  const amount = Number(billingCategory.BaseAmount);
  const invoiceNumber = `TD${schoolId}-${student.StudentID}-${monthInfo.year}${pad(monthInfo.month)}`;
  const issueDate = dateString(monthInfo.year, monthInfo.month, 1);
  const dueDate = dateString(monthInfo.year, monthInfo.month, 7);
  const payment = invoicePaymentPattern(studentIndex, monthIndex, amount);
  const paidDate = payment.amountPaid > 0 ? dateString(monthInfo.year, monthInfo.month, 10) : null;

  const existing = await firstRow(
    'SELECT * FROM Invoices WHERE InvoiceNumber = @invoiceNumber',
    { invoiceNumber: { type: sql.NVarChar, value: invoiceNumber } }
  );

  const values = {
    schoolId: { type: sql.Int, value: schoolId },
    studentId: { type: sql.Int, value: student.StudentID },
    billingCategoryId: { type: sql.Int, value: billingCategory.BillingCategoryID },
    invoiceNumber: { type: sql.NVarChar, value: invoiceNumber },
    amount: { type: sql.Decimal(10, 2), value: amount },
    amountPaid: { type: sql.Decimal(10, 2), value: payment.amountPaid },
    description: { type: sql.NVarChar, value: `${billingCategory.CategoryName} tuition - ${monthInfo.year}-${pad(monthInfo.month)}` },
    status: { type: sql.NVarChar, value: payment.status },
    issueDate: { type: sql.DateTime, value: issueDate },
    dueDate: { type: sql.DateTime, value: dueDate },
    paidDate: { type: sql.DateTime, value: paidDate }
  };

  const invoice = existing
    ? await execute(
      `UPDATE Invoices
       SET SchoolID = @schoolId, StudentID = @studentId, BillingCategoryID = @billingCategoryId,
           Amount = @amount, AmountPaid = @amountPaid, Description = @description, Status = @status,
           IssueDate = @issueDate, DueDate = @dueDate, PaidDate = @paidDate, IsDeleted = 0, UpdatedDate = GETDATE()
       OUTPUT INSERTED.*
       WHERE InvoiceID = ${existing.InvoiceID}`,
      values
    )
    : await execute(
      `INSERT INTO Invoices (
         SchoolID, StudentID, BillingCategoryID, InvoiceNumber, Amount, AmountPaid, Description, Status, IssueDate, DueDate, PaidDate
       )
       OUTPUT INSERTED.*
       VALUES (
         @schoolId, @studentId, @billingCategoryId, @invoiceNumber, @amount, @amountPaid, @description, @status, @issueDate, @dueDate, @paidDate
       )`,
      values
    );

  if (payment.amountPaid > 0) {
    const reference = `TESTPAY-${invoiceNumber}`;
    const existingTransaction = await firstRow(
      'SELECT * FROM Transactions WHERE Reference = @reference',
      { reference: { type: sql.NVarChar, value: reference } }
    );

    const txValues = {
      schoolId: { type: sql.Int, value: schoolId },
      invoiceId: { type: sql.Int, value: invoice.InvoiceID },
      paymentMethod: { type: sql.NVarChar, value: 'Demo EFT' },
      reference: { type: sql.NVarChar, value: reference },
      description: { type: sql.NVarChar, value: `Demo payment for ${invoiceNumber}` },
      amount: { type: sql.Decimal(10, 2), value: payment.amountPaid },
      transactionDate: { type: sql.DateTime, value: paidDate }
    };

    if (existingTransaction) {
      await execute(
        `UPDATE Transactions
         SET InvoiceID = @invoiceId, PaymentMethod = @paymentMethod, Description = @description,
             TransactionType = 'Payment', Amount = @amount, TransactionDate = @transactionDate, UpdatedDate = GETDATE()
         WHERE TransactionID = ${existingTransaction.TransactionID}`,
        txValues
      );
    } else {
      await execute(
        `INSERT INTO Transactions (SchoolID, InvoiceID, PaymentMethod, Reference, Description, TransactionType, Amount, TransactionDate)
         VALUES (@schoolId, @invoiceId, @paymentMethod, @reference, @description, 'Payment', @amount, @transactionDate)`,
        txValues
      );
    }
  }
}

async function ensureAttendance(schoolId, student, classRecord, date, studentIndex) {
  const day = Number(date.slice(-2));
  let status = 'Present';
  if ((day + studentIndex) % 41 === 0) status = 'Excused';
  else if ((day + studentIndex) % 37 === 0) status = 'Absent';
  else if ((day + studentIndex) % 23 === 0) status = 'Late';

  await execute(
    `MERGE Attendance AS target
     USING (SELECT @schoolId AS SchoolID, @studentId AS StudentID, @attendanceDate AS AttendanceDate) AS source
     ON target.SchoolID = source.SchoolID AND target.StudentID = source.StudentID AND target.AttendanceDate = source.AttendanceDate
     WHEN MATCHED THEN
       UPDATE SET ClassID = @classId, Status = @status, Notes = @notes, UpdatedDate = GETDATE()
     WHEN NOT MATCHED THEN
       INSERT (SchoolID, StudentID, ClassID, AttendanceDate, Status, Notes)
       VALUES (@schoolId, @studentId, @classId, @attendanceDate, @status, @notes);`,
    {
      schoolId: { type: sql.Int, value: schoolId },
      studentId: { type: sql.Int, value: student.StudentID },
      classId: { type: sql.Int, value: classRecord.ClassID },
      attendanceDate: { type: sql.Date, value: date },
      status: { type: sql.NVarChar, value: status },
      notes: { type: sql.NVarChar, value: status === 'Present' ? null : 'Demo attendance variation' }
    }
  );
}

async function ensurePayslip(employee, monthInfo) {
  const period = `${monthInfo.year}-${pad(monthInfo.month)}`;
  const gross = Number(employee.Salary);
  const deductions = Number((gross * 0.18).toFixed(2));
  const net = Number((gross - deductions).toFixed(2));

  const existing = await firstRow(
    'SELECT * FROM Payslips WHERE EmployeeID = @employeeId AND PayPeriod = @period',
    {
      employeeId: { type: sql.Int, value: employee.EmployeeID },
      period: { type: sql.NVarChar, value: period }
    }
  );

  const values = {
    employeeId: { type: sql.Int, value: employee.EmployeeID },
    period: { type: sql.NVarChar, value: period },
    gross: { type: sql.Decimal(10, 2), value: gross },
    deductions: { type: sql.Decimal(10, 2), value: deductions },
    net: { type: sql.Decimal(10, 2), value: net },
    notes: { type: sql.NVarChar, value: 'Demo monthly payslip' }
  };

  if (existing) {
    await execute(
      `UPDATE Payslips
       SET GrossAmount = @gross, Deductions = @deductions, NetAmount = @net, Notes = @notes,
           IsFinalized = 1, FinalizedDate = ISNULL(FinalizedDate, GETDATE()), UpdatedDate = GETDATE()
       WHERE PayslipID = ${existing.PayslipID}`,
      values
    );
    return;
  }

  await execute(
    `INSERT INTO Payslips (EmployeeID, PayPeriod, GrossAmount, Deductions, NetAmount, Notes, IsFinalized, FinalizedDate)
     VALUES (@employeeId, @period, @gross, @deductions, @net, @notes, 1, GETDATE())`,
    values
  );
}

async function ensureLeave(employee, index) {
  const startMonth = 6 + index;
  const startDate = dateString(2025, startMonth, 12);
  const endDate = dateString(2025, startMonth, 13);
  const existing = await firstRow(
    'SELECT * FROM LeaveRequests WHERE EmployeeID = @employeeId AND StartDate = @startDate',
    {
      employeeId: { type: sql.Int, value: employee.EmployeeID },
      startDate: { type: sql.Date, value: startDate }
    }
  );

  if (existing) {
    return;
  }

  await execute(
    `INSERT INTO LeaveRequests (EmployeeID, LeaveType, StartDate, EndDate, Days, Reason, Status, ReviewedDate)
     VALUES (@employeeId, @leaveType, @startDate, @endDate, 2, @reason, @status, GETDATE())`,
    {
      employeeId: { type: sql.Int, value: employee.EmployeeID },
      leaveType: { type: sql.NVarChar, value: index % 2 === 0 ? 'Annual' : 'Sick' },
      startDate: { type: sql.Date, value: startDate },
      endDate: { type: sql.Date, value: endDate },
      reason: { type: sql.NVarChar, value: 'Demo leave record' },
      status: { type: sql.NVarChar, value: index === 4 ? 'Pending' : 'Approved' }
    }
  );
}

function schoolDays() {
  const days = [];
  const current = new Date(Date.UTC(YEAR_START.year, YEAR_START.month - 1, 1));
  const end = new Date(Date.UTC(2026, 3, 30));

  while (current <= end) {
    const weekday = current.getUTCDay();
    if (weekday >= 1 && weekday <= 5) {
      days.push(current.toISOString().slice(0, 10));
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
}

async function main() {
  await connectDB();

  const school = await firstRow(
    'SELECT * FROM Schools WHERE SchoolID = @schoolId',
    { schoolId: { type: sql.Int, value: SCHOOL_ID } }
  );

  if (!school) {
    throw new Error(`School ID ${SCHOOL_ID} was not found. Set TEST_DATA_SCHOOL_ID to an existing school.`);
  }

  await ensureSchoolUserHrAccess(SCHOOL_ID);

  const employees = [];
  for (const seed of staffSeed) {
    employees.push(await ensureEmployee(SCHOOL_ID, seed));
  }

  const classes = [];
  for (const [className, teacherIndex, capacity] of classSeed) {
    classes.push(await ensureClass(SCHOOL_ID, className, employees[teacherIndex].EmployeeID, capacity));
  }

  const billingCategories = [];
  for (const [categoryName, amount] of billingSeed) {
    billingCategories.push(await ensureBillingCategory(SCHOOL_ID, categoryName, amount));
  }

  const months = monthSequence(YEAR_START, MONTH_COUNT);
  const students = [];

  for (let index = 0; index < studentSeed.length; index += 1) {
    const seed = studentSeed[index];
    const classIndex = seed[3];
    const family = await ensureFamilyAndParent(SCHOOL_ID, index, seed[2]);
    const student = await ensureStudent(SCHOOL_ID, family, seed, classes[classIndex], billingCategories[classIndex], index);
    students.push({ student, classRecord: classes[classIndex], billingCategory: billingCategories[classIndex], index });
  }

  for (const item of students) {
    for (let monthIndex = 0; monthIndex < months.length; monthIndex += 1) {
      await ensureInvoiceAndPayment(SCHOOL_ID, item.student, item.billingCategory, item.index, months[monthIndex], monthIndex);
    }
  }

  const dates = schoolDays();
  for (const date of dates) {
    for (const item of students) {
      await ensureAttendance(SCHOOL_ID, item.student, item.classRecord, date, item.index);
    }
  }

  for (let index = 0; index < employees.length; index += 1) {
    await ensureLeave(employees[index], index);
    for (const month of months) {
      await ensurePayslip(employees[index], month);
    }
  }

  console.log(JSON.stringify({
    schoolId: SCHOOL_ID,
    schoolName: school.SchoolName,
    students: students.length,
    staff: employees.length,
    invoiceMonths: months.length,
    invoices: students.length * months.length,
    attendanceRows: students.length * dates.length,
    payslips: employees.length * months.length,
    parentPassword: PARENT_PASSWORD
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.close();
  });
