// Seed test data: 1 school, 5 staff, 20 students, 12 months of data
// Logins:
//   DevForge: admin@devforge.co.za / admin123
//   School:   schooltest@devforge.local / school123 (School ID will be set to match)
//   Parent:   parenttest@devforge.local / parent123

require('dotenv').config();
const sql = require('mssql');

const SCHOOL_HASH = '$2a$10$G6aYaVxK9UD40jzHlI96IOVstRSRKj9QeoISoBi2Ejfv7M4afy.Wu';
const PARENT_HASH = '$2a$10$stvtggb.NeMfrOA/PkuqBebFw9L.fbE72Qztn5mvwjEHh/cXvh7p6';

async function seed() {
  const pool = await sql.connect(process.env.DATABASE_URL);
  const r = (q) => pool.request().query(q);

  console.log('Seeding test data...');

  // --- SCHOOL ---
  await r(`SET IDENTITY_INSERT dbo.Schools ON;
    INSERT INTO Schools (SchoolID, SchoolName, Address, ContactPerson, ContactEmail, ContactPhone, CurrencyCode, CurrencySymbol, DefaultMonthlyFee, SubscriptionStatus)
    VALUES (7, 'Sunshine Academy', '123 Main Road, Cape Town', 'Sarah Johnson', 'info@sunshineacademy.co.za', '021-555-0100', 'ZAR', 'R', 2500.00, 'Active');
    SET IDENTITY_INSERT dbo.Schools OFF;`);
  console.log('  School created (ID 7)');

  // --- USERS ---
  // School admin user
  await r(`INSERT INTO Users (Username, Email, PasswordHash, Role, SchoolID, IsActive, HasHrPermission)
    VALUES ('schooltest', 'schooltest@devforge.local', '${SCHOOL_HASH}', 'school', 7, 1, 1)`);
  const schoolUser = (await r(`SELECT UserID FROM Users WHERE Email='schooltest@devforge.local'`)).recordset[0];

  // Parent user
  await r(`INSERT INTO Users (Username, Email, PasswordHash, Role, SchoolID, IsActive)
    VALUES ('parenttest', 'parenttest@devforge.local', '${PARENT_HASH}', 'parent', NULL, 1)`);
  const parentUser = (await r(`SELECT UserID FROM Users WHERE Email='parenttest@devforge.local'`)).recordset[0];
  console.log('  Users created');

  // --- BILLING CATEGORIES ---
  await r(`INSERT INTO BillingCategories (SchoolID, CategoryName, Description, BaseAmount, Frequency) VALUES
    (7, 'Standard Tuition', 'Monthly tuition fee', 2500.00, 'Monthly'),
    (7, 'After Care', 'After school care', 800.00, 'Monthly'),
    (7, 'Annual Registration', 'Once-off registration fee', 1500.00, 'One-time')`);
  const cats = (await r(`SELECT BillingCategoryID, CategoryName FROM BillingCategories WHERE SchoolID=7`)).recordset;
  const stdCat = cats.find(c => c.CategoryName === 'Standard Tuition').BillingCategoryID;
  console.log('  Billing categories created');

  // --- CLASSES ---
  await r(`INSERT INTO Classes (SchoolID, ClassName, Capacity, IsActive) VALUES
    (7, 'Grade 1A', 25, 1), (7, 'Grade 1B', 25, 1),
    (7, 'Grade 2A', 25, 1), (7, 'Grade 3A', 25, 1)`);
  console.log('  Classes created');

  // --- EMPLOYEES (5 staff) ---
  const staff = [
    ['Sarah','Johnson','sarah@sunshineacademy.co.za','021-555-0101','Principal','Management','2020-01-15',35000,21],
    ['David','Williams','david@sunshineacademy.co.za','021-555-0102','Teacher','Teaching','2021-02-01',22000,21],
    ['Lisa','Brown','lisa@sunshineacademy.co.za','021-555-0103','Teacher','Teaching','2021-03-01',22000,21],
    ['James','Taylor','james@sunshineacademy.co.za','021-555-0104','Finance Officer','Finance','2022-01-10',28000,21],
    ['Emma','Davis','emma@sunshineacademy.co.za','021-555-0105','Admin Assistant','Administration','2023-06-01',18000,21]
  ];
  for (const s of staff) {
    await r(`INSERT INTO Employees (SchoolID, FirstName, LastName, Email, Phone, JobTitle, Department, StartDate, Salary, LeaveBalance)
      VALUES (7, '${s[0]}', '${s[1]}', '${s[2]}', '${s[3]}', '${s[4]}', '${s[5]}', '${s[6]}', ${s[7]}, ${s[8]})`);
  }
  console.log('  5 staff members created');

  // --- FAMILIES (10 families) ---
  const families = [
    ['Van der Merwe','Anna van der Merwe','8501015001082','082-555-0001','anna@email.co.za','Pieter van der Merwe','8401015001083','082-555-0002','pieter@email.co.za','10 Oak Street, Cape Town'],
    ['Naidoo','Priya Naidoo','8601015001084','083-555-0003','priya@email.co.za','Raj Naidoo','8501015001085','083-555-0004','raj@email.co.za','22 Palm Ave, Cape Town'],
    ['Smith','Karen Smith','8701015001086','084-555-0005','karen@email.co.za','John Smith','8601015001087','084-555-0006','john@email.co.za','5 Rose Lane, Cape Town'],
    ['Mokoena','Thandi Mokoena','8801015001088','085-555-0007','thandi@email.co.za','Sipho Mokoena','8701015001089','085-555-0008','sipho@email.co.za','18 Lily Road, Cape Town'],
    ['Botha','Marie Botha','8901015001090','086-555-0009','marie@email.co.za','Jan Botha','8801015001091','086-555-0010','jan@email.co.za','33 Daisy Crescent, Cape Town'],
    ['Pillay','Anita Pillay','9001015001092','087-555-0011','anita@email.co.za','Kumar Pillay','8901015001093','087-555-0012','kumar@email.co.za','7 Jasmine Way, Cape Town'],
    ['De Villiers','Elsa de Villiers','9101015001094','088-555-0013','elsa@email.co.za','Henk de Villiers','9001015001095','088-555-0014','henk@email.co.za','44 Tulip Street, Cape Town'],
    ['Dlamini','Nomsa Dlamini','9201015001096','089-555-0015','nomsa@email.co.za','Bongani Dlamini','9101015001097','089-555-0016','bongani@email.co.za','12 Sunflower Ave, Cape Town'],
    ['Jacobs','Michelle Jacobs','9301015001098','071-555-0017','michelle@email.co.za','Ryan Jacobs','9201015001099','071-555-0018','ryan@email.co.za','28 Orchid Lane, Cape Town'],
    ['Mthembu','Zanele Mthembu','9401015001100','072-555-0019','zanele@email.co.za','Thabo Mthembu','9301015001101','072-555-0020','thabo@email.co.za','55 Iris Road, Cape Town']
  ];
  for (const f of families) {
    await r(`INSERT INTO Families (SchoolID, FamilyName, PrimaryParentName, PrimaryParentIdNumber, PrimaryParentPhone, PrimaryParentEmail,
      SecondaryParentName, SecondaryParentIdNumber, SecondaryParentPhone, SecondaryParentEmail, HomeAddress)
      VALUES (7, '${f[0]}', '${f[1]}', '${f[2]}', '${f[3]}', '${f[4]}', '${f[5]}', '${f[6]}', '${f[7]}', '${f[8]}', '${f[9]}')`);
  }
  const famRows = (await r(`SELECT FamilyID, FamilyName FROM Families WHERE SchoolID=7 ORDER BY FamilyID`)).recordset;
  console.log('  10 families created');

  // Link parent user to first family
  await r(`INSERT INTO ParentLinks (UserID, FamilyID, SchoolID) VALUES (${parentUser.UserID}, ${famRows[0].FamilyID}, 7)`);
  console.log('  Parent linked to family:', famRows[0].FamilyName);

  // --- STUDENTS (20 students, 2 per family) ---
  const studentNames = [
    ['Liam','Van der Merwe','2017-03-15','Grade 1A'],['Sophie','Van der Merwe','2018-07-22','Grade 1B'],
    ['Arjun','Naidoo','2017-05-10','Grade 1A'],['Meera','Naidoo','2019-01-08','Grade 1B'],
    ['Oliver','Smith','2017-08-20','Grade 1A'],['Emily','Smith','2018-11-30','Grade 1B'],
    ['Lebo','Mokoena','2017-02-14','Grade 2A'],['Kgosi','Mokoena','2019-04-25','Grade 1B'],
    ['Anja','Botha','2016-12-01','Grade 2A'],['Pieter Jr','Botha','2018-06-18','Grade 1A'],
    ['Kavitha','Pillay','2017-09-05','Grade 2A'],['Rohan','Pillay','2019-03-12','Grade 1B'],
    ['Mia','De Villiers','2016-10-28','Grade 3A'],['Christiaan','De Villiers','2018-02-07','Grade 1A'],
    ['Siyanda','Dlamini','2016-08-16','Grade 3A'],['Noluthando','Dlamini','2018-09-23','Grade 2A'],
    ['Chloe','Jacobs','2017-01-19','Grade 2A'],['Ethan','Jacobs','2019-05-30','Grade 1B'],
    ['Amahle','Mthembu','2016-06-11','Grade 3A'],['Lungelo','Mthembu','2018-04-04','Grade 1A']
  ];

  for (let i = 0; i < 20; i++) {
    const s = studentNames[i];
    const famIdx = Math.floor(i / 2);
    const famId = famRows[famIdx].FamilyID;
    await r(`INSERT INTO Students (SchoolID, FamilyID, FirstName, LastName, DateOfBirth, ClassName, BillingDate, EnrolledDate, BillingCategoryID, IsActive)
      VALUES (7, ${famId}, '${s[0]}', '${s[1]}', '${s[2]}', '${s[3]}', '2025-01-01', '2025-01-15', ${stdCat}, 1)`);
  }
  const students = (await r(`SELECT StudentID, FirstName, LastName FROM Students WHERE SchoolID=7 ORDER BY StudentID`)).recordset;
  console.log('  20 students created');

  // --- INVOICES (12 months x 20 students = 240 invoices) ---
  let invCount = 0;
  for (let month = 1; month <= 12; month++) {
    const mm = String(month).padStart(2, '0');
    const issueDate = `2025-${mm}-01`;
    const dueDate = `2025-${mm}-07`;
    for (const st of students) {
      const invNum = `INV-2025${mm}-${st.StudentID}`;
      const isPaid = month <= 9; // Jan-Sep paid, Oct-Dec pending/partial
      const status = month <= 8 ? 'Paid' : month === 9 ? 'Paid' : month === 10 ? 'Partial' : month === 11 ? 'Overdue' : 'Pending';
      const amountPaid = status === 'Paid' ? 2500 : status === 'Partial' ? 1500 : 0;
      const paidDate = isPaid ? `2025-${mm}-05` : null;
      await r(`INSERT INTO Invoices (SchoolID, StudentID, BillingCategoryID, InvoiceNumber, Amount, AmountPaid, Description, Status, IssueDate, DueDate, PaidDate)
        VALUES (7, ${st.StudentID}, ${stdCat}, '${invNum}', 2500.00, ${amountPaid}, '${st.FirstName} ${st.LastName} tuition ${issueDate.substring(0,7)}', '${status}', '${issueDate}', '${dueDate}', ${paidDate ? `'${paidDate}'` : 'NULL'})`);
      invCount++;
    }
  }
  console.log(`  ${invCount} invoices created (12 months x 20 students)`);

  // --- TRANSACTIONS (payments for paid invoices) ---
  const paidInvoices = (await r(`SELECT InvoiceID, SchoolID, InvoiceNumber, AmountPaid, IssueDate FROM Invoices WHERE SchoolID=7 AND AmountPaid > 0`)).recordset;
  let txCount = 0;
  for (const inv of paidInvoices) {
    await r(`INSERT INTO Transactions (SchoolID, InvoiceID, PaymentMethod, Reference, TransactionType, Amount, TransactionDate)
      VALUES (7, ${inv.InvoiceID}, 'Bank Transfer', '${inv.InvoiceNumber}', 'Credit', ${inv.AmountPaid}, '${inv.IssueDate.toISOString().slice(0,10)}')`);
    txCount++;
  }
  console.log(`  ${txCount} payment transactions created`);

  // --- ATTENDANCE (last 30 school days for all students) ---
  let attCount = 0;
  const statuses = ['Present','Present','Present','Present','Present','Present','Present','Present','Late','Absent'];
  for (let d = 0; d < 30; d++) {
    const date = new Date(2025, 9, 1 + d); // October 2025
    if (date.getDay() === 0 || date.getDay() === 6) continue; // skip weekends
    const dateStr = date.toISOString().slice(0, 10);
    for (const st of students) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      await r(`INSERT INTO Attendance (SchoolID, StudentID, AttendanceDate, Status, RecordedBy)
        VALUES (7, ${st.StudentID}, '${dateStr}', '${status}', ${schoolUser.UserID})`);
      attCount++;
    }
  }
  console.log(`  ${attCount} attendance records created`);

  // --- LEAVE REQUESTS (for staff) ---
  const emps = (await r(`SELECT EmployeeID, FirstName FROM Employees WHERE SchoolID=7`)).recordset;
  const leaveData = [
    [0, 'Annual', '2025-03-10', '2025-03-14', 5, 'Family holiday', 'Approved'],
    [1, 'Sick', '2025-05-05', '2025-05-06', 2, 'Flu', 'Approved'],
    [2, 'Annual', '2025-06-23', '2025-06-27', 5, 'Personal leave', 'Approved'],
    [3, 'Family', '2025-04-15', '2025-04-15', 1, 'Family responsibility', 'Approved'],
    [4, 'Sick', '2025-08-11', '2025-08-12', 2, 'Medical appointment', 'Approved'],
    [0, 'Annual', '2025-09-22', '2025-09-26', 5, 'Spring break', 'Approved'],
    [1, 'Annual', '2025-11-17', '2025-11-21', 5, 'Year-end leave', 'Pending'],
    [2, 'Sick', '2025-10-08', '2025-10-08', 1, 'Headache', 'Approved'],
  ];
  for (const l of leaveData) {
    await r(`INSERT INTO LeaveRequests (EmployeeID, LeaveType, StartDate, EndDate, Days, Reason, Status)
      VALUES (${emps[l[0]].EmployeeID}, '${l[1]}', '${l[2]}', '${l[3]}', ${l[4]}, '${l[5]}', '${l[6]}')`);
  }
  console.log(`  ${leaveData.length} leave requests created`);

  // --- PAYSLIPS (12 months x 5 staff = 60 payslips) ---
  let payCount = 0;
  for (let month = 1; month <= 12; month++) {
    const period = `2025-${String(month).padStart(2, '0')}`;
    for (const emp of emps) {
      const salary = emp.EmployeeID === emps[0].EmployeeID ? 35000 : emp.EmployeeID === emps[3].EmployeeID ? 28000 : emp.EmployeeID === emps[4].EmployeeID ? 18000 : 22000;
      const deductions = Math.round(salary * 0.2);
      const net = salary - deductions;
      const finalized = month <= 10 ? 1 : 0;
      await r(`INSERT INTO Payslips (EmployeeID, PayPeriod, GrossAmount, Deductions, NetAmount, IsFinalized, FinalizedDate)
        VALUES (${emp.EmployeeID}, '${period}', ${salary}, ${deductions}, ${net}, ${finalized}, ${finalized ? `'2025-${String(month).padStart(2,'0')}-25'` : 'NULL'})`);
      payCount++;
    }
  }
  console.log(`  ${payCount} payslips created`);

  // --- AUDIT LOG entries ---
  await r(`INSERT INTO AuditLogs (UserID, SchoolID, EntityName, EntityID, Action, IpAddress, CreatedDate) VALUES
    (${schoolUser.UserID}, 7, 'School', '7', 'Login', '127.0.0.1', '2025-01-15 08:00:00'),
    (${schoolUser.UserID}, 7, 'Student', '1', 'StudentAdded', '127.0.0.1', '2025-01-15 09:00:00'),
    (${schoolUser.UserID}, 7, 'Invoice', '1', 'InvoiceGenerated', '127.0.0.1', '2025-01-15 10:00:00'),
    (${schoolUser.UserID}, 7, 'Invoice', '1', 'PaymentAllocated', '127.0.0.1', '2025-02-05 11:00:00')`);
  console.log('  Audit log entries created');

  console.log('\n=== SEED COMPLETE ===');
  console.log('School: Sunshine Academy (ID 7)');
  console.log('Students: 20 | Staff: 5 | Families: 10');
  console.log('Invoices: 240 (12 months) | Payslips: 60 (12 months)');
  console.log('\nLogin credentials:');
  console.log('  DevForge: admin@devforge.co.za / admin123');
  console.log('  School:   schooltest@devforge.local / school123 (School ID 7)');
  console.log('  Parent:   parenttest@devforge.local / parent123');

  await pool.close();
  process.exit(0);
}

seed().catch(err => { console.error('Seed failed:', err.message); process.exit(1); });
