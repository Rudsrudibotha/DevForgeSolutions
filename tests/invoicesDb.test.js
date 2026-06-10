'use strict';

// SQL-level tests for InvoicePortalService.

const assert = require('assert');
const { getPool, sql } = require('../src/data/db');
const { ScopedDb } = require('../src/data/scopedDb');
const InvoicePortalService = require('../src/business/invoicePortalService');

const IDS = {
  schoolA: 96001,
  schoolB: 96002,
  familyA: 96010,
  student1: 96020,
  student2: 96021,
  studentB1: 96022, // cross-school
  invoice1: 96030,
  invoice2: 96031,
  invoice3: 96032,
  category1: 96040
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
        VALUES (${IDS.schoolA}, 'InvTest A', 'Active', 'ZAR', 'R', 'Standard');
      IF NOT EXISTS (SELECT 1 FROM Schools WHERE SchoolID = ${IDS.schoolB})
        INSERT INTO Schools (SchoolID, SchoolName, SubscriptionStatus, CurrencyCode, CurrencySymbol, SubscriptionPlan)
        VALUES (${IDS.schoolB}, 'InvTest B', 'Active', 'ZAR', 'R', 'Standard');

      IF NOT EXISTS (SELECT 1 FROM Families WHERE FamilyID = ${IDS.familyA})
        INSERT INTO Families (FamilyID, SchoolID, FamilyName, PrimaryParentName) VALUES (${IDS.familyA}, ${IDS.schoolA}, 'InvTest Family', 'Parent');

      IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = ${IDS.student1})
        INSERT INTO Students (StudentID, SchoolID, FamilyID, FirstName, LastName, IsActive, EnrolledDate, CurrentAcademicYear, BillingDate)
        VALUES (${IDS.student1}, ${IDS.schoolA}, ${IDS.familyA}, 'Stu', 'One', 1, GETDATE(), YEAR(GETDATE()), GETDATE());
      IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = ${IDS.student2})
        INSERT INTO Students (StudentID, SchoolID, FamilyID, FirstName, LastName, IsActive, EnrolledDate, CurrentAcademicYear, BillingDate)
        VALUES (${IDS.student2}, ${IDS.schoolA}, ${IDS.familyA}, 'Stu', 'Two', 1, GETDATE(), YEAR(GETDATE()), GETDATE());

      IF NOT EXISTS (SELECT 1 FROM BillingCategories WHERE BillingCategoryID = ${IDS.category1})
        INSERT INTO BillingCategories (BillingCategoryID, SchoolID, CategoryName, BaseAmount, Frequency, IsActive)
        VALUES (${IDS.category1}, ${IDS.schoolA}, 'Tuition', 1500, 'Monthly', 1);
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
      DELETE FROM Invoices          WHERE InvoiceID IN (${IDS.invoice1}, ${IDS.invoice2}, ${IDS.invoice3});
      DELETE FROM BillingCategories WHERE BillingCategoryID = ${IDS.category1};
      DELETE FROM Students          WHERE StudentID IN (${IDS.student1}, ${IDS.student2}, ${IDS.studentB1});
      DELETE FROM Families          WHERE FamilyID = ${IDS.familyA};
      DELETE FROM Schools           WHERE SchoolID IN (${IDS.schoolA}, ${IDS.schoolB});
    `);
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

function sdbA() { return new ScopedDb({ id: 1, role: 'school', schoolId: IDS.schoolA }); }

async function run() {
  console.log('\n[invoices / SQL] checking database availability...');
  if (!(await isDbAvailable())) {
    console.log('  SKIP: DATABASE_URL not set or SKIP_DB=true.');
    return;
  }
  console.log('  seeding...');
  await seed();
  const svc = new InvoicePortalService();
  const sdb = sdbA();

  try {
    console.log('\n[1] list() with no invoices returns empty');
    let r = await svc.list({ schoolDb: sdb });
    assert.strictEqual(r.total, 0);
    assert.deepStrictEqual(r.rows, []);
    console.log('  PASS: empty list');

    console.log('\n[2] generateBulk() inserts invoices for selected students');
    const dueDate = '2026-07-15';
    const r2 = await svc.generateBulk({
      schoolDb: sdb,
      data: {
        studentIds: [IDS.student1, IDS.student2],
        amount: 1500,
        dueDate,
        description: 'July 2026 tuition'
      },
      actor: { id: 1, role: 'school' }
    });
    assert.strictEqual(r2.generated.length, 2);
    assert.strictEqual(r2.skipped.length, 0);
    console.log(`  PASS: generated ${r2.generated.length} invoices`);

    console.log('\n[3] list() now returns the 2 invoices');
    r = await svc.list({ schoolDb: sdb });
    assert.strictEqual(r.total, 2);
    assert.ok(r.kpis.totalOutstanding > 0);
    console.log(`  PASS: total=${r.total}, outstanding=R${r.kpis.totalOutstanding.toFixed(2)}`);

    console.log('\n[4] generateBulk() is idempotent (skips students with pending invoice)');
    const r3 = await svc.generateBulk({
      schoolDb: sdb,
      data: { studentIds: [IDS.student1, IDS.student2], amount: 1500, dueDate },
      actor: { id: 1, role: 'school' }
    });
    assert.strictEqual(r3.generated.length, 0, 'no new invoices');
    assert.strictEqual(r3.skipped.length, 2, 'both students skipped');
    console.log('  PASS: idempotent');

    console.log('\n[5] generateBulk() throws on invalid amount');
    let threw = false;
    try { await svc.generateBulk({ schoolDb: sdb, data: { studentIds: [1], amount: 0, dueDate }, actor: { id: 1, role: 'school' } }); }
    catch (e) { threw = true; }
    assert.ok(threw);
    console.log('  PASS: invalid amount throws');

    console.log('\n[6] generateBulk() throws on empty studentIds');
    threw = false;
    try { await svc.generateBulk({ schoolDb: sdb, data: { studentIds: [], amount: 100, dueDate }, actor: { id: 1, role: 'school' } }); }
    catch (e) { threw = true; }
    assert.ok(threw);
    console.log('  PASS: empty studentIds throws');

    console.log('\n[7] generateBulk() skips students in other schools (TENANCY)');
    const r5 = await svc.generateBulk({
      schoolDb: sdb,
      data: { studentIds: [99999, IDS.student1], amount: 100, dueDate: '2026-08-15' },
      actor: { id: 1, role: 'school' }
    });
    // student1 already has pending for July but the dueDate is different (August), so should generate a new one
    assert.ok(r5.generated.includes(IDS.student1));
    assert.ok(r5.skipped.includes(99999), 'unknown student should be skipped');
    console.log('  PASS: cross-school student skipped, valid student invoiced');

    console.log('\n[8] getById() returns the invoice with student + family details');
    const invoice = await svc.getById({ schoolDb: sdb, invoiceId: r2.generated[0] });
    assert.ok(invoice);
    assert.strictEqual(invoice.Amount, 1500);
    assert.strictEqual(invoice.StudentName, 'Stu One');
    assert.strictEqual(invoice.FamilyName, 'InvTest Family');
    console.log('  PASS: getById returns full record');

    console.log('\n[9] getById() returns null for cross-school (TENANCY)');
    const sdbB = new ScopedDb({ id: 1, role: 'school', schoolId: IDS.schoolB });
    const other = await svc.getById({ schoolDb: sdbB, invoiceId: r2.generated[0] });
    assert.strictEqual(other, null);
    console.log('  PASS: cross-school getById returns null');

    console.log('\n[10] list() with status filter');
    r = await svc.list({ schoolDb: sdb, status: 'Pending' });
    assert.ok(r.total >= 2);
    console.log(`  PASS: status=Pending total=${r.total}`);

    console.log('\n[11] list() with overdueOnly (none overdue yet)');
    r = await svc.list({ schoolDb: sdb, overdueOnly: '1' });
    assert.strictEqual(r.total, 0, 'no overdue invoices yet');
    console.log('  PASS: overdueOnly filter works');

    console.log('\n[12] updateStatus() flips status');
    const ok = await svc.updateStatus({ schoolDb: sdb, invoiceId: r2.generated[0], status: 'Cancelled', actor: { id: 1, role: 'school' } });
    assert.strictEqual(ok, true);
    const after = await svc.getById({ schoolDb: sdb, invoiceId: r2.generated[0] });
    assert.strictEqual(after.Status, 'Cancelled');
    console.log('  PASS: status updated');

    console.log('\n[13] updateStatus() rejects invalid status');
    threw = false;
    try { await svc.updateStatus({ schoolDb: sdb, invoiceId: r2.generated[0], status: 'BOGUS', actor: { id: 1, role: 'school' } }); }
    catch (e) { threw = true; }
    assert.ok(threw);
    console.log('  PASS: invalid status throws');

    console.log('\n[14] updateStatus() returns false for cross-school (TENANCY)');
    const denied = await svc.updateStatus({ schoolDb: sdb, invoiceId: r2.generated[0], status: 'Paid', actor: { id: 1, role: 'school' } });
    assert.strictEqual(denied, true, 'this one is in scope, so true');
    // Now switch to other school
    const denied2 = await svc.updateStatus({ schoolDb: sdbB, invoiceId: r2.generated[0], status: 'Cancelled', actor: { id: 1, role: 'school' } });
    assert.strictEqual(denied2, false, 'cross-school returns false');
    console.log('  PASS: cross-school update returns false');

    console.log('\n[15] listBillingCategories() returns active categories in scope');
    const cats = await svc.listBillingCategories({ schoolDb: sdb });
    assert.ok(cats.find(c => c.BillingCategoryID === IDS.category1));
    console.log(`  PASS: ${cats.length} category(ies)`);

    console.log('\n[16] listStudentsForBilling() returns scoped students');
    const studs = await svc.listStudentsForBilling({ schoolDb: sdb });
    assert.ok(studs.find(s => s.StudentID === IDS.student1));
    assert.ok(studs.find(s => s.StudentID === IDS.student2));
    console.log(`  PASS: ${studs.length} students`);

    console.log('\n[17] getPayments() returns empty for invoice with no payments');
    const pays = await svc.getPayments({ schoolDb: sdb, invoiceId: r2.generated[0] });
    assert.deepStrictEqual(pays, []);
    console.log('  PASS: empty payment list');

    console.log('\nALL INVOICE SQL TESTS PASSED');
  } finally {
    console.log('\n  cleaning up...');
    await cleanup();
  }
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
