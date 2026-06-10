'use strict';

// SQL-level tests for PaymentPortalService.

const assert = require('assert');
const { getPool, sql } = require('../src/data/db');
const { ScopedDb } = require('../src/data/scopedDb');
const PaymentPortalService = require('../src/business/paymentPortalService');

const IDS = {
  schoolA: 97001,
  schoolB: 97002,
  familyA: 97010,
  student1: 97020,
  invoice1: 97030,  // 500
  invoice2: 97031,  // 200 (already partially paid)
  tx1: 97040
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
        VALUES (${IDS.schoolA}, 'PaySvcTest A', 'Active', 'ZAR', 'R', 'Standard');
      IF NOT EXISTS (SELECT 1 FROM Schools WHERE SchoolID = ${IDS.schoolB})
        INSERT INTO Schools (SchoolID, SchoolName, SubscriptionStatus, CurrencyCode, CurrencySymbol, SubscriptionPlan)
        VALUES (${IDS.schoolB}, 'PaySvcTest B', 'Active', 'ZAR', 'R', 'Standard');

      IF NOT EXISTS (SELECT 1 FROM Families WHERE FamilyID = ${IDS.familyA})
        INSERT INTO Families (FamilyID, SchoolID, FamilyName, PrimaryParentName) VALUES (${IDS.familyA}, ${IDS.schoolA}, 'PaySvc Family', 'Parent');

      IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = ${IDS.student1})
        INSERT INTO Students (StudentID, SchoolID, FamilyID, FirstName, LastName, IsActive, EnrolledDate, CurrentAcademicYear, BillingDate)
        VALUES (${IDS.student1}, ${IDS.schoolA}, ${IDS.familyA}, 'Stu', 'Pay', 1, GETDATE(), YEAR(GETDATE()), GETDATE());

      IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceID = ${IDS.invoice1})
        INSERT INTO Invoices (InvoiceID, InvoiceNumber, SchoolID, StudentID, Amount, AmountPaid, DueDate, Status, IssueDate, CurrentAcademicYear)
        VALUES (${IDS.invoice1}, 'PAYSVC-1-${Date.now()%100000}', ${IDS.schoolA}, ${IDS.student1}, 500, 0, DATEADD(DAY, 30, GETDATE()), 'Pending', CAST(GETDATE() AS DATE), YEAR(GETDATE()));
      IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceID = ${IDS.invoice2})
        INSERT INTO Invoices (InvoiceID, InvoiceNumber, SchoolID, StudentID, Amount, AmountPaid, DueDate, Status, IssueDate, CurrentAcademicYear)
        VALUES (${IDS.invoice2}, 'PAYSVC-2-${Date.now()%100000}', ${IDS.schoolA}, ${IDS.student1}, 200, 50, DATEADD(DAY, 30, GETDATE()), 'Partial', CAST(GETDATE() AS DATE), YEAR(GETDATE()));
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
      DELETE FROM Transactions WHERE SchoolID IN (${IDS.schoolA}, ${IDS.schoolB});
      DELETE FROM Invoices      WHERE InvoiceID IN (${IDS.invoice1}, ${IDS.invoice2});
      DELETE FROM Students      WHERE StudentID = ${IDS.student1};
      DELETE FROM Families      WHERE FamilyID = ${IDS.familyA};
      DELETE FROM Schools       WHERE SchoolID IN (${IDS.schoolA}, ${IDS.schoolB});
    `);
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

function sdbA() { return new ScopedDb({ id: 1, role: 'school', schoolId: IDS.schoolA }); }

async function run() {
  console.log('\n[payments / SQL] checking database availability...');
  if (!(await isDbAvailable())) {
    console.log('  SKIP: DATABASE_URL not set or SKIP_DB=true.');
    return;
  }
  console.log('  seeding...');
  await seed();
  const svc = new PaymentPortalService();
  const sdb = sdbA();

  try {
    console.log('\n[1] record() unallocated payment');
    const r1 = await svc.record({
      schoolDb: sdb,
      data: { amount: 100, paymentMethod: 'EFT', payeeName: 'Test Payee', transactionDate: '2026-06-15' },
      actor: { id: 1, role: 'school' }
    });
    assert.ok(r1.transactionId);
    assert.strictEqual(r1.allocationStatus, 'Unallocated');
    assert.ok(r1.receiptNumber.startsWith('RCT-'));
    console.log(`  PASS: created transaction ${r1.transactionId} (${r1.receiptNumber})`);

    console.log('\n[2] record() allocated payment updates invoice AmountPaid + Status');
    const r2 = await svc.record({
      schoolDb: sdb,
      data: { amount: 500, paymentMethod: 'EFT', payeeName: 'Full Pay', transactionDate: '2026-06-15', invoiceId: IDS.invoice1 },
      actor: { id: 1, role: 'school' }
    });
    assert.strictEqual(r2.allocationStatus, 'Allocated');
    // Verify invoice is now Paid
    const pool = await getPool();
    const inv = await pool.request().input('id', sql.Int, IDS.invoice1)
      .query('SELECT Status, AmountPaid FROM Invoices WHERE InvoiceID = @id');
    assert.strictEqual(inv.recordset[0].Status, 'Paid', 'invoice should be Paid');
    assert.strictEqual(Number(inv.recordset[0].AmountPaid), 500);
    console.log('  PASS: invoice marked Paid, AmountPaid=500');

    console.log('\n[3] record() with partial amount flips invoice to Partial');
    const r3 = await svc.record({
      schoolDb: sdb,
      data: { amount: 50, paymentMethod: 'Cash', invoiceId: IDS.invoice2, transactionDate: '2026-06-15' },
      actor: { id: 1, role: 'school' }
    });
    assert.strictEqual(r3.allocationStatus, 'Allocated');
    const inv2 = await pool.request().input('id', sql.Int, IDS.invoice2)
      .query('SELECT Status, AmountPaid FROM Invoices WHERE InvoiceID = @id');
    assert.strictEqual(inv2.recordset[0].Status, 'Partial', 'invoice should be Partial');
    assert.strictEqual(Number(inv2.recordset[0].AmountPaid), 100, 'previous 50 + new 50');
    console.log('  PASS: partial payment applied, invoice Partial, AmountPaid=100');

    console.log('\n[4] record() throws on invalid amount');
    let threw = false;
    try { await svc.record({ schoolDb: sdb, data: { amount: -10, paymentMethod: 'EFT' }, actor: { id: 1, role: 'school' } }); }
    catch (e) { threw = true; }
    assert.ok(threw);
    console.log('  PASS: invalid amount throws');

    console.log('\n[5] record() throws on invalid method');
    threw = false;
    try { await svc.record({ schoolDb: sdb, data: { amount: 100, paymentMethod: 'BOGUS' }, actor: { id: 1, role: 'school' } }); }
    catch (e) { threw = true; }
    assert.ok(threw);
    console.log('  PASS: invalid method throws');

    console.log('\n[6] list() returns 3 transactions');
    let l = await svc.list({ schoolDb: sdb });
    assert.strictEqual(l.total, 3, `expected 3, got ${l.total}`);
    assert.strictEqual(l.kpis.totalAllocated, 550);
    assert.strictEqual(l.kpis.totalUnallocated, 100);
    console.log(`  PASS: list returns ${l.total} transactions, allocated=R${l.kpis.totalAllocated}, unallocated=R${l.kpis.totalUnallocated}`);

    console.log('\n[7] list() filter by allocationStatus');
    l = await svc.list({ schoolDb: sdb, allocationStatus: 'Unallocated' });
    assert.strictEqual(l.total, 1);
    console.log('  PASS: allocationStatus filter works');

    console.log('\n[8] allocate() assigns unallocated payment to an invoice');
    const allocResult = await svc.allocate({
      schoolDb: sdb,
      transactionId: r1.transactionId,
      invoiceId: IDS.invoice2,
      actor: { id: 1, role: 'school' }
    });
    assert.strictEqual(allocResult, true);
    // Verify the transaction is now allocated
    const txAfter = await pool.request().input('id', sql.Int, r1.transactionId)
      .query('SELECT AllocationStatus, InvoiceID FROM Transactions WHERE TransactionID = @id');
    assert.strictEqual(txAfter.recordset[0].AllocationStatus, 'Allocated');
    assert.strictEqual(txAfter.recordset[0].InvoiceID, IDS.invoice2);
    // Verify the invoice got the amount
    const inv3 = await pool.request().input('id', sql.Int, IDS.invoice2)
      .query('SELECT Status, AmountPaid FROM Invoices WHERE InvoiceID = @id');
    assert.strictEqual(Number(inv3.recordset[0].AmountPaid), 200, '50 (prev) + 50 (prev2) + 100 (this) = 200');
    assert.strictEqual(inv3.recordset[0].Status, 'Paid', 'invoice should now be Paid');
    console.log('  PASS: allocate moved payment and updated invoice');

    console.log('\n[9] allocate() returns false for already-allocated transaction');
    const reAlloc = await svc.allocate({
      schoolDb: sdb, transactionId: r1.transactionId, invoiceId: IDS.invoice1, actor: { id: 1, role: 'school' }
    });
    assert.strictEqual(reAlloc, false, 'cannot re-allocate an allocated transaction');
    console.log('  PASS: re-allocate returns false');

    console.log('\n[10] allocate() returns false for cross-school transaction (TENANCY)');
    const txCross = await svc.record({
      schoolDb: sdb,
      data: { amount: 75, paymentMethod: 'EFT', transactionDate: '2026-06-15' },
      actor: { id: 1, role: 'school' }
    });
    const sdbB = new ScopedDb({ id: 2, role: 'school', schoolId: IDS.schoolB });
    const denied = await svc.allocate({
      schoolDb: sdbB, transactionId: txCross.transactionId, invoiceId: 1, actor: { id: 1, role: 'school' }
    });
    assert.strictEqual(denied, false, 'cross-school allocate must return false');
    console.log('  PASS: cross-school allocate returns false');

    console.log('\n[11] list() respects cross-school scope (TENANCY)');
    l = await svc.list({ schoolDb: sdbB });
    assert.strictEqual(l.total, 0, 'cross-school list must be empty');
    console.log('  PASS: cross-school list returns empty');

    console.log('\n[12] getById() respects tenancy');
    const got = await svc.getById({ schoolDb: sdb, transactionId: r1.transactionId });
    assert.ok(got);
    assert.strictEqual(got.AllocationStatus, 'Allocated');
    const deniedById = await svc.getById({ schoolDb: sdbB, transactionId: r1.transactionId });
    assert.strictEqual(deniedById, null);
    console.log('  PASS: getById respects tenancy');

    console.log('\nALL PAYMENT SQL TESTS PASSED');
  } finally {
    console.log('\n  cleaning up...');
    await cleanup();
  }
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
