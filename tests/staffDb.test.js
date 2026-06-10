'use strict';

// SQL-level tests for StaffPortalService.

const assert = require('assert');
const { getPool, sql } = require('../src/data/db');
const { ScopedDb } = require('../src/data/scopedDb');
const StaffPortalService = require('../src/business/staffPortalService');

const IDS = {
  schoolA: 99001,
  schoolB: 99002,
  emp1: 99010,  // schoolA, active, Teaching dept
  emp2: 99011,  // schoolA, active, Admin dept
  emp3: 99012,  // schoolA, INACTIVE
  empB:  99013, // schoolB
  user1: 99020
};

async function isDbAvailable() {
  if (process.env.SKIP_DB === 'true') return false;
  if (!process.env.DATABASE_URL) return false;
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS ok');
    return true;
  } catch (_) { return false; }
}

async function seed() {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    await new sql.Request(tx).query(`
      IF NOT EXISTS (SELECT 1 FROM Schools WHERE SchoolID = ${IDS.schoolA})
        INSERT INTO Schools (SchoolID, SchoolName, SubscriptionStatus, CurrencyCode, CurrencySymbol, SubscriptionPlan)
        VALUES (${IDS.schoolA}, 'StaffTest A', 'Active', 'ZAR', 'R', 'Standard');
      IF NOT EXISTS (SELECT 1 FROM Schools WHERE SchoolID = ${IDS.schoolB})
        INSERT INTO Schools (SchoolID, SchoolName, SubscriptionStatus, CurrencyCode, CurrencySymbol, SubscriptionPlan)
        VALUES (${IDS.schoolB}, 'StaffTest B', 'Active', 'ZAR', 'R', 'Standard');

      IF NOT EXISTS (SELECT 1 FROM Users WHERE UserID = ${IDS.user1})
        INSERT INTO Users (UserID, Username, Email, PasswordHash, Role, IsActive) VALUES (${IDS.user1}, 'staff1', 's1@staff.test', 'x', 'school', 1);

      IF NOT EXISTS (SELECT 1 FROM Employees WHERE EmployeeID = ${IDS.emp1})
        INSERT INTO Employees (EmployeeID, SchoolID, UserID, FirstName, LastName, JobTitle, Department, StartDate, Salary, IsActive)
        VALUES (${IDS.emp1}, ${IDS.schoolA}, ${IDS.user1}, 'Alice', 'Teacher', 'Senior Teacher', 'Teaching', '2020-01-15', 35000, 1);
      IF NOT EXISTS (SELECT 1 FROM Employees WHERE EmployeeID = ${IDS.emp2})
        INSERT INTO Employees (EmployeeID, SchoolID, FirstName, LastName, JobTitle, Department, StartDate, Salary, IsActive)
        VALUES (${IDS.emp2}, ${IDS.schoolA}, 'Bob', 'Admin', 'School Administrator', 'Admin', '2019-08-01', 28000, 1);
      IF NOT EXISTS (SELECT 1 FROM Employees WHERE EmployeeID = ${IDS.emp3})
        INSERT INTO Employees (EmployeeID, SchoolID, FirstName, LastName, JobTitle, Department, StartDate, Salary, IsActive)
        VALUES (${IDS.emp3}, ${IDS.schoolA}, 'Carol', 'Retired', 'Principal', 'Admin', '2010-01-01', 0, 0);
      IF NOT EXISTS (SELECT 1 FROM Employees WHERE EmployeeID = ${IDS.empB})
        INSERT INTO Employees (EmployeeID, SchoolID, FirstName, LastName, JobTitle, Department, StartDate, Salary, IsActive)
        VALUES (${IDS.empB}, ${IDS.schoolB}, 'Dave', 'Other', 'Teacher', 'Teaching', '2022-01-01', 25000, 1);
    `);
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

async function cleanup() {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    await new sql.Request(tx).query(`
      DELETE FROM LeaveRequests WHERE SchoolID IN (${IDS.schoolA}, ${IDS.schoolB});
      DELETE FROM Payslips     WHERE SchoolID IN (${IDS.schoolA}, ${IDS.schoolB});
      DELETE FROM Employees    WHERE EmployeeID IN (${IDS.emp1}, ${IDS.emp2}, ${IDS.emp3}, ${IDS.empB});
      DELETE FROM Users        WHERE UserID = ${IDS.user1};
      DELETE FROM Schools     WHERE SchoolID IN (${IDS.schoolA}, ${IDS.schoolB});
    `);
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

function sdbA() { return new ScopedDb({ id: 1, role: 'school', schoolId: IDS.schoolA }); }

async function run() {
  console.log('\n[staff / SQL] checking database availability...');
  if (!(await isDbAvailable())) {
    console.log('  SKIP: DATABASE_URL not set or SKIP_DB=true.');
    return;
  }
  console.log('  seeding...');
  await seed();
  const svc = new StaffPortalService();
  const sdb = sdbA();

  try {
    console.log('\n[1] list() defaults to active only in scope');
    let l = await svc.list({ schoolDb: sdb });
    const ids = l.rows.map(e => e.EmployeeID);
    assert.ok(ids.includes(IDS.emp1));
    assert.ok(ids.includes(IDS.emp2));
    assert.ok(!ids.includes(IDS.emp3), 'inactive must be hidden by default');
    assert.ok(!ids.includes(IDS.empB), 'cross-school must be hidden');
    assert.strictEqual(l.total, 2);
    console.log(`  PASS: ${l.rows.length} staff, total=${l.total}`);

    console.log('\n[2] list() with status=inactive');
    l = await svc.list({ schoolDb: sdb, status: 'inactive' });
    assert.ok(l.rows.map(e => e.EmployeeID).includes(IDS.emp3));
    assert.strictEqual(l.total, 1);
    console.log('  PASS: inactive filter works');

    console.log('\n[3] list() with status=all includes both');
    l = await svc.list({ schoolDb: sdb, status: 'all' });
    assert.strictEqual(l.total, 3);
    console.log(`  PASS: all status total=${l.total}`);

    console.log('\n[4] list() with department="Admin" filter');
    l = await svc.list({ schoolDb: sdb, department: 'Admin' });
    const deptIds = l.rows.map(e => e.EmployeeID);
    assert.ok(deptIds.includes(IDS.emp2));
    assert.ok(!deptIds.includes(IDS.emp1), 'emp1 is in Teaching, not Admin');
    assert.strictEqual(l.total, 1);
    console.log('  PASS: department filter works');

    console.log('\n[5] list() with search="Alice"');
    l = await svc.list({ schoolDb: sdb, search: 'Alice' });
    assert.strictEqual(l.total, 1);
    assert.strictEqual(l.rows[0].EmployeeID, IDS.emp1);
    console.log('  PASS: search filter works');

    console.log('\n[6] getById() returns the employee in scope');
    const e = await svc.getById({ schoolDb: sdb, employeeId: IDS.emp1 });
    assert.ok(e);
    assert.strictEqual(e.FirstName, 'Alice');
    assert.strictEqual(e.Username, 'staff1');
    console.log('  PASS: getById returns full record with username');

    console.log('\n[7] getById() returns null for cross-school (TENANCY)');
    const other = await svc.getById({ schoolDb: sdb, employeeId: IDS.empB });
    assert.strictEqual(other, null);
    console.log('  PASS: cross-school getById returns null');

    console.log('\n[8] listDepartments() returns distinct departments');
    const depts = await svc.listDepartments({ schoolDb: sdb });
    assert.ok(depts.includes('Teaching'));
    assert.ok(depts.includes('Admin'));
    console.log(`  PASS: departments = ${JSON.stringify(depts)}`);

    console.log('\n[9] getLeaveRequests() returns empty for no requests');
    const leave = await svc.getLeaveRequests({ schoolDb: sdb, employeeId: IDS.emp1 });
    assert.deepStrictEqual(leave, []);
    console.log('  PASS: empty leave list');

    console.log('\n[10] getPayslips() returns empty for no payslips');
    const payslips = await svc.getPayslips({ schoolDb: sdb, employeeId: IDS.emp1 });
    assert.deepStrictEqual(payslips, []);
    console.log('  PASS: empty payslip list');

    console.log('\n[11] list() respects cross-school scope (TENANCY)');
    const sdbB = new ScopedDb({ id: 2, role: 'school', schoolId: IDS.schoolB });
    l = await svc.list({ schoolDb: sdbB });
    assert.strictEqual(l.total, 1, 'schoolB only has empB');
    assert.strictEqual(l.rows[0].EmployeeID, IDS.empB);
    console.log('  PASS: cross-school list returns only schoolB employees');

    console.log('\nALL STAFF SQL TESTS PASSED');
  } finally {
    console.log('\n  cleaning up...');
    await cleanup();
  }
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
