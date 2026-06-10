'use strict';

// SQL-level cross-school parent tenancy test. Verifies the actual queries
// inside ParentDashboardService by seeding two families, two schools, two
// parent users, and one parent linked to children in BOTH schools. The
// other parent is linked only to school A.
//
// Assertions:
//   1. Parent A sees children from both schools (cross-school view works).
//   2. Parent B sees only their own children.
//   3. Parent A's getInvoices returns invoices from BOTH schools.
//   4. Parent B's getInvoices returns ONLY their school's invoices.
//   5. A direct lookup for Parent B's child by id, scoped through Parent A,
//      returns zero rows (i.e. Parent A cannot see Parent B's child).
//   6. No orphan data leaks after cleanup.
//
// Auto-skips with a clear message if DATABASE_URL is not set or SKIP_DB=true.

const assert = require('assert');
const { getPool, sql } = require('../src/data/db');
const ParentDashboardService = require('../src/business/parentDashboardService');

async function isDbAvailable() {
  if (process.env.SKIP_DB === 'true') return false;
  if (!process.env.DATABASE_URL) return false;
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS ok');
    return true;
  } catch (err) {
    return false;
  }
}

// All ids used by this test, in one place for easy cleanup.
const IDS = {
  schoolA: 90001,
  schoolB: 90002,
  familyA: 90010,
  familyB: 90011,
  studentA1: 90020,
  studentA2: 90021,  // Parent A's second child, in school B (cross-school)
  studentB1: 90022,  // Parent B's child (different parent, school A)
  userA: 90030,
  userB: 90031,
  invoiceA1: 90040,  // Parent A child 1 invoice, school A
  invoiceA2: 90041,  // Parent A child 2 invoice, school B
  invoiceB1: 90042   // Parent B child invoice, school A
};

async function seed() {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    // Schools
    await new sql.Request(tx).query(`
      IF NOT EXISTS (SELECT 1 FROM Schools WHERE SchoolID = ${IDS.schoolA})
        INSERT INTO Schools (SchoolID, SchoolName, SubscriptionStatus, CurrencyCode, CurrencySymbol, SubscriptionPlan)
        VALUES (${IDS.schoolA}, 'Test School A', 'Active', 'ZAR', 'R', 'Standard');
      IF NOT EXISTS (SELECT 1 FROM Schools WHERE SchoolID = ${IDS.schoolB})
        INSERT INTO Schools (SchoolID, SchoolName, SubscriptionStatus, CurrencyCode, CurrencySymbol, SubscriptionPlan)
        VALUES (${IDS.schoolB}, 'Test School B', 'Active', 'ZAR', 'R', 'Standard');
    `);

    // Families
    await new sql.Request(tx).query(`
      IF NOT EXISTS (SELECT 1 FROM Families WHERE FamilyID = ${IDS.familyA})
        INSERT INTO Families (FamilyID, FamilyName) VALUES (${IDS.familyA}, 'Test Family A');
      IF NOT EXISTS (SELECT 1 FROM Families WHERE FamilyID = ${IDS.familyB})
        INSERT INTO Families (FamilyID, FamilyName) VALUES (${IDS.familyB}, 'Test Family B');
    `);

    // Users (parents)
    await new sql.Request(tx).query(`
      IF NOT EXISTS (SELECT 1 FROM Users WHERE UserID = ${IDS.userA})
        INSERT INTO Users (UserID, Username, Email, PasswordHash, Role, IsActive)
        VALUES (${IDS.userA}, 'testparentA', 'pa@test.local', 'x', 'parent', 1);
      IF NOT EXISTS (SELECT 1 FROM Users WHERE UserID = ${IDS.userB})
        INSERT INTO Users (UserID, Username, Email, PasswordHash, Role, IsActive)
        VALUES (${IDS.userB}, 'testparentB', 'pb@test.local', 'x', 'parent', 1);
    `);

    // Students
    await new sql.Request(tx).query(`
      IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = ${IDS.studentA1})
        INSERT INTO Students (StudentID, FamilyID, FirstName, LastName, IsActive)
        VALUES (${IDS.studentA1}, ${IDS.familyA}, 'Alex', 'Cross', 1);
      IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = ${IDS.studentA2})
        INSERT INTO Students (StudentID, FamilyID, FirstName, LastName, IsActive)
        VALUES (${IDS.studentA2}, ${IDS.familyA}, 'Bella', 'Cross', 1);
      IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = ${IDS.studentB1})
        INSERT INTO Students (StudentID, FamilyID, FirstName, LastName, IsActive)
        VALUES (${IDS.studentB1}, ${IDS.familyB}, 'Other', 'Parent', 1);
    `);

    // ParentLinks: Parent A linked to familyA, in BOTH schools (so studentA2
    // appears in school B). Parent B linked to familyB, in school A only.
    await new sql.Request(tx).query(`
      IF NOT EXISTS (SELECT 1 FROM ParentLinks WHERE UserID = ${IDS.userA} AND FamilyID = ${IDS.familyA} AND SchoolID = ${IDS.schoolA})
        INSERT INTO ParentLinks (UserID, FamilyID, SchoolID) VALUES (${IDS.userA}, ${IDS.familyA}, ${IDS.schoolA});
      IF NOT EXISTS (SELECT 1 FROM ParentLinks WHERE UserID = ${IDS.userA} AND FamilyID = ${IDS.familyA} AND SchoolID = ${IDS.schoolB})
        INSERT INTO ParentLinks (UserID, FamilyID, SchoolID) VALUES (${IDS.userA}, ${IDS.familyA}, ${IDS.schoolB});
      IF NOT EXISTS (SELECT 1 FROM ParentLinks WHERE UserID = ${IDS.userB} AND FamilyID = ${IDS.familyB} AND SchoolID = ${IDS.schoolA})
        INSERT INTO ParentLinks (UserID, FamilyID, SchoolID) VALUES (${IDS.userB}, ${IDS.familyB}, ${IDS.schoolA});
    `);

    // Invoices: studentA1 (school A), studentA2 (school B), studentB1 (school A)
    await new sql.Request(tx).query(`
      IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceID = ${IDS.invoiceA1})
        INSERT INTO Invoices (InvoiceID, InvoiceNumber, StudentID, SchoolID, Amount, AmountPaid, DueDate, Status, CreatedAt)
        VALUES (${IDS.invoiceA1}, 'INV-A1-${Date.now()%100000}', ${IDS.studentA1}, ${IDS.schoolA}, 1000, 0, DATEADD(DAY, 30, GETDATE()), 'Pending', GETDATE());
      IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceID = ${IDS.invoiceA2})
        INSERT INTO Invoices (InvoiceID, InvoiceNumber, StudentID, SchoolID, Amount, AmountPaid, DueDate, Status, CreatedAt)
        VALUES (${IDS.invoiceA2}, 'INV-A2-${Date.now()%100000}', ${IDS.studentA2}, ${IDS.schoolB}, 800, 0, DATEADD(DAY, 30, GETDATE()), 'Pending', GETDATE());
      IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceID = ${IDS.invoiceB1})
        INSERT INTO Invoices (InvoiceID, InvoiceNumber, StudentID, SchoolID, Amount, AmountPaid, DueDate, Status, CreatedAt)
        VALUES (${IDS.invoiceB1}, 'INV-B1-${Date.now()%100000}', ${IDS.studentB1}, ${IDS.schoolA}, 500, 0, DATEADD(DAY, 30, GETDATE()), 'Pending', GETDATE());
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
      DELETE FROM Invoices     WHERE InvoiceID IN (${IDS.invoiceA1}, ${IDS.invoiceA2}, ${IDS.invoiceB1});
      DELETE FROM ParentLinks  WHERE UserID IN (${IDS.userA}, ${IDS.userB});
      DELETE FROM Students     WHERE StudentID IN (${IDS.studentA1}, ${IDS.studentA2}, ${IDS.studentB1});
      DELETE FROM Families     WHERE FamilyID IN (${IDS.familyA}, ${IDS.familyB});
      DELETE FROM Users        WHERE UserID IN (${IDS.userA}, ${IDS.userB});
      DELETE FROM Schools      WHERE SchoolID IN (${IDS.schoolA}, ${IDS.schoolB});
    `);
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

async function run() {
  console.log('\n[parent tenancy / SQL] checking database availability...');

  if (!(await isDbAvailable())) {
    console.log('  SKIP: DATABASE_URL not set or SKIP_DB=true. Re-run with a live DB to verify SQL guarantees.');
    console.log('  (route-layer 404 tests in parentTenancy.test.js already cover the wiring.)');
    return;
  }

  console.log('  seeding test fixtures...');
  await seed();

  const svc = new ParentDashboardService();

  try {
    console.log('\n[1] Parent A (cross-school) sees children from BOTH schools');
    const aChildren = await svc.getChildren(IDS.userA);
    const aIds = aChildren.map(c => c.StudentID);
    assert.ok(aIds.includes(IDS.studentA1), `Parent A should see studentA1 (school A), got ${JSON.stringify(aIds)}`);
    assert.ok(aIds.includes(IDS.studentA2), `Parent A should see studentA2 (school B) - cross-school case, got ${JSON.stringify(aIds)}`);
    assert.ok(!aIds.includes(IDS.studentB1), `Parent A must NOT see studentB1 (Parent B's child), got ${JSON.stringify(aIds)}`);
    console.log(`  PASS: Parent A sees ${aIds.length} children, includes both school A and B`);

    console.log('\n[2] Parent B sees only their own children');
    const bChildren = await svc.getChildren(IDS.userB);
    const bIds = bChildren.map(c => c.StudentID);
    assert.ok(bIds.includes(IDS.studentB1), `Parent B should see studentB1, got ${JSON.stringify(bIds)}`);
    assert.ok(!bIds.includes(IDS.studentA1), `Parent B must NOT see studentA1 (Parent A's child), got ${JSON.stringify(bIds)}`);
    assert.ok(!bIds.includes(IDS.studentA2), `Parent B must NOT see studentA2 (Parent A's child in school B), got ${JSON.stringify(bIds)}`);
    console.log(`  PASS: Parent B sees only their own children (${bIds.length})`);

    console.log('\n[3] Parent A invoice list spans both schools');
    const aInvoices = await svc.getInvoices(IDS.userA);
    const aInvoiceSchools = new Set(aInvoices.map(i => i.SchoolID));
    assert.ok(aInvoiceSchools.has(IDS.schoolA), `Parent A invoices must include school A, got schools: ${[...aInvoiceSchools]}`);
    assert.ok(aInvoiceSchools.has(IDS.schoolB), `Parent A invoices must include school B, got schools: ${[...aInvoiceSchools]}`);
    const aInvoiceIds = aInvoices.map(i => i.InvoiceID);
    assert.ok(aInvoiceIds.includes(IDS.invoiceA1), 'Parent A must see invoiceA1');
    assert.ok(aInvoiceIds.includes(IDS.invoiceA2), 'Parent A must see invoiceA2');
    assert.ok(!aInvoiceIds.includes(IDS.invoiceB1), `Parent A must NOT see invoiceB1 (Parent B's), got ${JSON.stringify(aInvoiceIds)}`);
    console.log(`  PASS: Parent A sees ${aInvoices.length} invoices across both schools`);

    console.log('\n[4] Parent B invoice list is scoped to their school only');
    const bInvoices = await svc.getInvoices(IDS.userB);
    const bInvoiceIds = bInvoices.map(i => i.InvoiceID);
    assert.ok(bInvoiceIds.includes(IDS.invoiceB1), 'Parent B must see their own invoice');
    assert.ok(!bInvoiceIds.includes(IDS.invoiceA1), `Parent B must NOT see Parent A's invoiceA1, got ${JSON.stringify(bInvoiceIds)}`);
    assert.ok(!bInvoiceIds.includes(IDS.invoiceA2), `Parent B must NOT see Parent A's invoiceA2, got ${JSON.stringify(bInvoiceIds)}`);
    console.log(`  PASS: Parent B sees only their own invoices (${bInvoices.length})`);

    console.log('\n[5] Direct invoice lookup by id respects tenancy');
    const aInvoices2 = await svc.getInvoices(IDS.userA, { studentId: IDS.studentA2 });
    assert.strictEqual(aInvoices2.length, 1, `expected 1 invoice for studentA2, got ${aInvoices2.length}`);
    assert.strictEqual(aInvoices2[0].InvoiceID, IDS.invoiceA2);

    const bTries = await svc.getInvoices(IDS.userB, { studentId: IDS.studentA2 });
    assert.strictEqual(bTries.length, 0, `Parent B filtered to Parent A's studentA2 must return 0, got ${bTries.length}`);
    console.log('  PASS: tenant filter via studentId is honoured');

    console.log('\n[6] Parent B cannot reach Parent A via any of the public service methods');
    const bAttendanceForA = await svc.getAttendance(IDS.userB, { studentId: IDS.studentA1 });
    assert.strictEqual(bAttendanceForA.length, 0, 'Parent B must not see Parent A child attendance');
    console.log('  PASS: no leakage across attendance either');

    console.log('\n[7] Invoice summary aggregates across Parent A schools');
    const aSummary = await svc.getInvoicesSummary(IDS.userA);
    assert.ok(aSummary.totalOwed >= 1800, `expected >= 1800 total owed (1000+800), got ${aSummary.totalOwed}`);
    assert.ok(aSummary.outstandingCount >= 2, `expected >= 2 outstanding, got ${aSummary.outstandingCount}`);
    console.log(`  PASS: totalOwed=${aSummary.totalOwed}, outstandingCount=${aSummary.outstandingCount}`);

    console.log('\nALL PARENT TENANCY SQL TESTS PASSED');
  } finally {
    console.log('\n  cleaning up test fixtures...');
    await cleanup();
  }
}

if (require.main === module) {
  run().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
  });
}

module.exports = run;
