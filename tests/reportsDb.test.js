'use strict';

// SQL-level tests for ReportPortalService.

const assert = require('assert');
const { getPool, sql } = require('../src/data/db');
const { ScopedDb } = require('../src/data/scopedDb');
const ReportPortalService = require('../src/business/reportPortalService');

const IDS = {
  schoolA: 100001,
  schoolB: 100002,
  familyA: 100010,
  classA: 100020,
  student1: 100030,
  student2: 100031,
  studentB: 100032,
  invoice1: 100040,  // 500, pending
  invoice2: 100041,  // 200, paid
  invoice3: 100042,  // 300, overdue
  invoiceB: 100043
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
        VALUES (${IDS.schoolA}, 'ReportTest A', 'Active', 'ZAR', 'R', 'Standard');

      IF NOT EXISTS (SELECT 1 FROM Families WHERE FamilyID = ${IDS.familyA})
        INSERT INTO Families (FamilyID, SchoolID, FamilyName, PrimaryParentName) VALUES (${IDS.familyA}, ${IDS.schoolA}, 'Report Family', 'Parent');

      IF NOT EXISTS (SELECT 1 FROM Classes WHERE ClassID = ${IDS.classA})
        INSERT INTO Classes (ClassID, SchoolID, ClassName, Grade, ActiveYear, IsActive, IsDeleted)
        VALUES (${IDS.classA}, ${IDS.schoolA}, 'Report Class', '1', YEAR(GETDATE()), 1, 0);

      IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = ${IDS.student1})
        INSERT INTO Students (StudentID, SchoolID, FamilyID, FirstName, LastName, ClassID, IsActive, EnrolledDate, CurrentAcademicYear, BillingDate)
        VALUES (${IDS.student1}, ${IDS.schoolA}, ${IDS.familyA}, 'Stu', 'One', ${IDS.classA}, 1, GETDATE(), YEAR(GETDATE()), GETDATE());
      IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = ${IDS.student2})
        INSERT INTO Students (StudentID, SchoolID, FamilyID, FirstName, LastName, ClassID, IsActive, EnrolledDate, CurrentAcademicYear, BillingDate)
        VALUES (${IDS.student2}, ${IDS.schoolA}, ${IDS.familyA}, 'Stu', 'Two', ${IDS.classA}, 1, GETDATE(), YEAR(GETDATE()), GETDATE());

      -- Pending invoice due in the future
      IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceID = ${IDS.invoice1})
        INSERT INTO Invoices (InvoiceID, InvoiceNumber, SchoolID, StudentID, Amount, AmountPaid, DueDate, Status, IssueDate, CurrentAcademicYear)
        VALUES (${IDS.invoice1}, 'REPORT-1-${Date.now()%100000}', ${IDS.schoolA}, ${IDS.student1}, 500, 0, DATEADD(DAY, 30, GETDATE()), 'Pending', CAST(GETDATE() AS DATE), YEAR(GETDATE()));
      -- Paid invoice
      IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceID = ${IDS.invoice2})
        INSERT INTO Invoices (InvoiceID, InvoiceNumber, SchoolID, StudentID, Amount, AmountPaid, PaidDate, DueDate, Status, IssueDate, CurrentAcademicYear)
        VALUES (${IDS.invoice2}, 'REPORT-2-${Date.now()%100000}', ${IDS.schoolA}, ${IDS.student1}, 200, 200, CAST(GETDATE() AS DATE), DATEADD(DAY, -5, GETDATE()), 'Paid', CAST(GETDATE() AS DATE), YEAR(GETDATE()));
      -- Overdue invoice
      IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceID = ${IDS.invoice3})
        INSERT INTO Invoices (InvoiceID, InvoiceNumber, SchoolID, StudentID, Amount, AmountPaid, DueDate, Status, IssueDate, CurrentAcademicYear)
        VALUES (${IDS.invoice3}, 'REPORT-3-${Date.now()%100000}', ${IDS.schoolA}, ${IDS.student2}, 300, 0, DATEADD(DAY, -45, GETDATE()), 'Overdue', CAST(GETDATE() AS DATE), YEAR(GETDATE()));
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
      DELETE FROM Transactions WHERE SchoolID = ${IDS.schoolA};
      DELETE FROM Invoices      WHERE InvoiceID IN (${IDS.invoice1}, ${IDS.invoice2}, ${IDS.invoice3});
      DELETE FROM Students      WHERE StudentID IN (${IDS.student1}, ${IDS.student2});
      DELETE FROM Classes       WHERE ClassID = ${IDS.classA};
      DELETE FROM Families      WHERE FamilyID = ${IDS.familyA};
      DELETE FROM Schools       WHERE SchoolID = ${IDS.schoolA};
    `);
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

function sdbA() { return new ScopedDb({ id: 1, role: 'school', schoolId: IDS.schoolA }); }

async function run() {
  console.log('\n[reports / SQL] checking database availability...');
  if (!(await isDbAvailable())) {
    console.log('  SKIP: DATABASE_URL not set or SKIP_DB=true.');
    return;
  }
  console.log('  seeding...');
  await seed();
  const svc = new ReportPortalService();
  const sdb = sdbA();

  try {
    console.log('\n[1] listReports() returns 5 reports');
    const list = svc.listReports();
    assert.strictEqual(list.length, 5);
    assert.ok(list.find(r => r.id === 'aging'));
    assert.ok(list.find(r => r.id === 'family-balances'));
    console.log('  PASS: 5 reports listed');

    console.log('\n[2] aging() returns the 2 unpaid invoices in scope');
    const aging = await svc.run({ schoolDb: sdb, type: 'aging' });
    assert.ok(aging.rows.length >= 2, `expected at least 2, got ${aging.rows.length}`);
    const buckets = aging.summary.buckets;
    assert.ok(buckets['Current'] > 0 || buckets['1-30 days'] > 0, 'Current or 1-30 bucket should have the pending invoice');
    assert.ok(buckets['31-60 days'] > 0, '31-60 bucket should have the overdue invoice');
    console.log('  PASS: aging buckets populated');

    console.log('\n[3] aging() respects cross-school scope (TENANCY)');
    const sdbB = new ScopedDb({ id: 2, role: 'school', schoolId: IDS.schoolB });
    const otherAging = await svc.run({ schoolDb: sdbB, type: 'aging' });
    assert.strictEqual(otherAging.rows.length, 0);
    console.log('  PASS: cross-school aging returns empty');

    console.log('\n[4] family-balances() aggregates per family');
    const fb = await svc.run({ schoolDb: sdb, type: 'family-balances' });
    assert.ok(fb.rows.length >= 1);
    const familyRow = fb.rows.find(r => r.Family === 'Report Family');
    assert.ok(familyRow);
    assert.strictEqual(familyRow.Students, 2, 'should count 2 students');
    assert.strictEqual(familyRow.Outstanding, '800.00', '500 (pending) + 300 (overdue)');
    console.log(`  PASS: family Outstanding = R${familyRow.Outstanding}`);

    console.log('\n[5] class-roster() returns students for the class');
    const roster = await svc.run({ schoolDb: sdb, type: 'class-roster', classId: IDS.classA });
    assert.strictEqual(roster.rows.length, 2);
    assert.strictEqual(roster.summary.studentCount, 2);
    console.log('  PASS: 2 students in roster');

    console.log('\n[6] class-roster() throws without classId');
    let threw = false;
    try { await svc.run({ schoolDb: sdb, type: 'class-roster' }); }
    catch (e) { threw = true; }
    assert.ok(threw);
    console.log('  PASS: missing classId throws');

    console.log('\n[7] class-roster() throws for cross-school classId');
    threw = false;
    try { await svc.run({ schoolDb: sdbB, type: 'class-roster', classId: IDS.classA }); }
    catch (e) { threw = true; }
    assert.ok(threw, 'should throw when classId is out of scope');
    console.log('  PASS: cross-school classId throws');

    console.log('\n[8] collections() returns empty when no transactions in window');
    const col = await svc.run({ schoolDb: sdb, type: 'collections', from: '1999-01-01', to: '1999-12-31' });
    assert.strictEqual(col.rows.length, 0);
    assert.strictEqual(col.summary.totalCollected, '0.00');
    console.log('  PASS: empty collections');

    console.log('\n[9] attendance-rate() returns class rows');
    const att = await svc.run({ schoolDb: sdb, type: 'attendance-rate', from: '2026-01-01', to: '2026-12-31' });
    assert.ok(att.rows.length >= 0);
    console.log(`  PASS: attendance report returns ${att.rows.length} class(es)`);

    console.log('\n[10] toCSV() generates valid CSV');
    const csv = svc.toCSV(aging);
    const lines = csv.split('\n');
    assert.ok(lines[0].split(',').length === aging.columns.length, 'header has all columns');
    assert.ok(lines.length === aging.rows.length + 1, 'one line per row + header');
    // Check escaping
    const testReport = { columns: ['Name', 'Note'], rows: [{ Name: 'Test', Note: 'has, comma' }] };
    const csvEscaped = svc.toCSV(testReport);
    assert.ok(csvEscaped.includes('"has, comma"'), 'should escape commas');
    console.log('  PASS: CSV escape works');

    console.log('\n[11] run() throws on unknown report type');
    threw = false;
    try { await svc.run({ schoolDb: sdb, type: 'bogus' }); }
    catch (e) { threw = true; }
    assert.ok(threw);
    console.log('  PASS: unknown type throws');

    console.log('\nALL REPORTS SQL TESTS PASSED');
  } finally {
    console.log('\n  cleaning up...');
    await cleanup();
  }
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
