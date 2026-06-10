'use strict';

// SQL-level test for ParentPaymentService. Seeds a parent, a family, a
// student, an invoice, and a second invoice owned by a different parent.
// Then asserts:
//   1. Parent A can pay their own invoice; Status moves to PendingPayment.
//   2. A transaction row is written with AllocationStatus='PendingPayment'.
//   3. AmountPaid is set to the full outstanding amount.
//   4. Parent A CANNOT pay Parent B's invoice (returns ok=false, no row).
//   5. Idempotent: second pay call on the same invoice returns ok=true
//      with alreadyPending=true and does NOT create a second transaction.
//   6. Cancelled invoice is rejected.
//   7. Already-Paid invoice is rejected.
//
// Auto-skips when DATABASE_URL is not set or SKIP_DB=true.
//
// Run: node tests/parentPaymentDb.test.js

const assert = require('assert');
const { getPool, sql } = require('../src/data/db');
const ParentPaymentService = require('../src/business/parentPaymentService');

const IDS = {
  schoolId: 91001,
  familyA: 91010,
  familyB: 91011,
  studentA: 91020,
  studentB: 91021,
  userA: 91030,   // parent A
  userB: 91031,   // parent B
  invoiceA1: 91040,  // parent A's, pay-able
  invoiceA2: 91041,  // parent A's, already cancelled
  invoiceA3: 91042,  // parent A's, already paid
  invoiceB1: 91043   // parent B's
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
      IF NOT EXISTS (SELECT 1 FROM Schools WHERE SchoolID = ${IDS.schoolId})
        INSERT INTO Schools (SchoolID, SchoolName, SubscriptionStatus, CurrencyCode, CurrencySymbol, SubscriptionPlan)
        VALUES (${IDS.schoolId}, 'PayTest School', 'Active', 'ZAR', 'R', 'Standard');

      IF NOT EXISTS (SELECT 1 FROM Families WHERE FamilyID = ${IDS.familyA})
        INSERT INTO Families (FamilyID, SchoolID, FamilyName, PrimaryParentName) VALUES (${IDS.familyA}, ${IDS.schoolId}, 'Pay Family A', 'Parent A');
      IF NOT EXISTS (SELECT 1 FROM Families WHERE FamilyID = ${IDS.familyB})
        INSERT INTO Families (FamilyID, SchoolID, FamilyName, PrimaryParentName) VALUES (${IDS.familyB}, ${IDS.schoolId}, 'Pay Family B', 'Parent B');

      IF NOT EXISTS (SELECT 1 FROM Users WHERE UserID = ${IDS.userA})
        INSERT INTO Users (UserID, Username, Email, PasswordHash, Role, IsActive) VALUES (${IDS.userA}, 'payparentA', 'pa@pay.test', 'x', 'parent', 1);
      IF NOT EXISTS (SELECT 1 FROM Users WHERE UserID = ${IDS.userB})
        INSERT INTO Users (UserID, Username, Email, PasswordHash, Role, IsActive) VALUES (${IDS.userB}, 'payparentB', 'pb@pay.test', 'x', 'parent', 1);

      IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = ${IDS.studentA})
        INSERT INTO Students (StudentID, FamilyID, FirstName, LastName, IsActive) VALUES (${IDS.studentA}, ${IDS.familyA}, 'Kid', 'A', 1);
      IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = ${IDS.studentB})
        INSERT INTO Students (StudentID, FamilyID, FirstName, LastName, IsActive) VALUES (${IDS.studentB}, ${IDS.familyB}, 'Kid', 'B', 1);

      IF NOT EXISTS (SELECT 1 FROM ParentLinks WHERE UserID = ${IDS.userA} AND FamilyID = ${IDS.familyA} AND SchoolID = ${IDS.schoolId})
        INSERT INTO ParentLinks (UserID, FamilyID, SchoolID) VALUES (${IDS.userA}, ${IDS.familyA}, ${IDS.schoolId});
      IF NOT EXISTS (SELECT 1 FROM ParentLinks WHERE UserID = ${IDS.userB} AND FamilyID = ${IDS.familyB} AND SchoolID = ${IDS.schoolId})
        INSERT INTO ParentLinks (UserID, FamilyID, SchoolID) VALUES (${IDS.userB}, ${IDS.familyB}, ${IDS.schoolId});

      IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceID = ${IDS.invoiceA1})
        INSERT INTO Invoices (InvoiceID, InvoiceNumber, SchoolID, StudentID, Amount, AmountPaid, DueDate, Status, CreatedAt)
        VALUES (${IDS.invoiceA1}, 'PAY-A1-${Date.now()%100000}', ${IDS.schoolId}, ${IDS.studentA}, 500, 0, DATEADD(DAY, 30, GETDATE()), 'Pending', GETDATE());
      IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceID = ${IDS.invoiceA2})
        INSERT INTO Invoices (InvoiceID, InvoiceNumber, SchoolID, StudentID, Amount, AmountPaid, DueDate, Status, CreatedAt)
        VALUES (${IDS.invoiceA2}, 'PAY-A2-${Date.now()%100000}', ${IDS.schoolId}, ${IDS.studentA}, 200, 0, DATEADD(DAY, 30, GETDATE()), 'Cancelled', GETDATE());
      IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceID = ${IDS.invoiceA3})
        INSERT INTO Invoices (InvoiceID, InvoiceNumber, SchoolID, StudentID, Amount, AmountPaid, PaidDate, DueDate, Status, CreatedAt)
        VALUES (${IDS.invoiceA3}, 'PAY-A3-${Date.now()%100000}', ${IDS.schoolId}, ${IDS.studentA}, 300, 300, GETDATE(), DATEADD(DAY, -1, GETDATE()), 'Paid', GETDATE());
      IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceID = ${IDS.invoiceB1})
        INSERT INTO Invoices (InvoiceID, InvoiceNumber, SchoolID, StudentID, Amount, AmountPaid, DueDate, Status, CreatedAt)
        VALUES (${IDS.invoiceB1}, 'PAY-B1-${Date.now()%100000}', ${IDS.schoolId}, ${IDS.studentB}, 400, 0, DATEADD(DAY, 30, GETDATE()), 'Pending', GETDATE());
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
      DELETE FROM Transactions WHERE InvoiceID IN (${IDS.invoiceA1}, ${IDS.invoiceA2}, ${IDS.invoiceA3}, ${IDS.invoiceB1});
      DELETE FROM Invoices     WHERE InvoiceID IN (${IDS.invoiceA1}, ${IDS.invoiceA2}, ${IDS.invoiceA3}, ${IDS.invoiceB1});
      DELETE FROM ParentLinks  WHERE UserID IN (${IDS.userA}, ${IDS.userB});
      DELETE FROM Students     WHERE StudentID IN (${IDS.studentA}, ${IDS.studentB});
      DELETE FROM Families     WHERE FamilyID IN (${IDS.familyA}, ${IDS.familyB});
      DELETE FROM Users        WHERE UserID IN (${IDS.userA}, ${IDS.userB});
      DELETE FROM Schools      WHERE SchoolID = ${IDS.schoolId};
    `);
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

async function run() {
  console.log('\n[parent pay / SQL] checking database availability...');
  if (!(await isDbAvailable())) {
    console.log('  SKIP: DATABASE_URL not set or SKIP_DB=true.');
    return;
  }

  console.log('  seeding...');
  await seed();
  const svc = new ParentPaymentService();

  try {
    console.log('\n[1] Parent A pays their own Pending invoice');
    const r1 = await svc.payInvoice(IDS.userA, IDS.invoiceA1);
    assert.strictEqual(r1.ok, true, `expected ok=true, got reason=${r1.reason}`);
    assert.strictEqual(r1.invoice.Status, 'PendingPayment', `invoice status should be PendingPayment, got ${r1.invoice.Status}`);
    assert.strictEqual(Number(r1.invoice.AmountPaid), 500, `AmountPaid should be 500, got ${r1.invoice.AmountPaid}`);
    assert.ok(r1.transaction, 'should return the created transaction');
    assert.strictEqual(r1.transaction.AllocationStatus, 'PendingPayment');
    console.log(`  PASS: invoiceA1 is now ${r1.invoice.Status}, AmountPaid=R${r1.invoice.AmountPaid}, transaction ${r1.transaction.TransactionID} is ${r1.transaction.AllocationStatus}`);

    console.log('\n[2] Transaction row exists with PendingPayment allocation');
    const pool = await getPool();
    const txs = await pool.request().input('id', sql.Int, IDS.invoiceA1)
      .query('SELECT * FROM Transactions WHERE InvoiceID = @id');
    assert.ok(txs.recordset.length === 1, `expected 1 transaction, got ${txs.recordset.length}`);
    assert.strictEqual(txs.recordset[0].AllocationStatus, 'PendingPayment');
    assert.ok(txs.recordset[0].ReceiptNumber.startsWith('PARENT-PENDING-'), `receipt number should be PARENT-PENDING-..., got ${txs.recordset[0].ReceiptNumber}`);
    console.log('  PASS: 1 transaction, AllocationStatus=PendingPayment, ReceiptNumber set');

    console.log('\n[3] Re-pay is idempotent: no second transaction, ok=true with alreadyPending');
    const r2 = await svc.payInvoice(IDS.userA, IDS.invoiceA1);
    assert.strictEqual(r2.ok, true, 'repay should be ok');
    assert.strictEqual(r2.alreadyPending, true, 'repay should set alreadyPending');
    const txs2 = await pool.request().input('id', sql.Int, IDS.invoiceA1)
      .query('SELECT COUNT(*) AS n FROM Transactions WHERE InvoiceID = @id');
    assert.strictEqual(txs2.recordset[0].n, 1, `repay should NOT create a second transaction, found ${txs2.recordset[0].n}`);
    console.log('  PASS: idempotent, no duplicate transaction');

    console.log('\n[4] Parent A CANNOT pay Parent B invoice');
    const r3 = await svc.payInvoice(IDS.userA, IDS.invoiceB1);
    assert.strictEqual(r3.ok, false, 'cross-parent pay must be rejected');
    assert.ok(/not found|forbidden|invalid/i.test(r3.reason), `reason should explain rejection, got ${r3.reason}`);
    const bTxs = await pool.request().input('id', sql.Int, IDS.invoiceB1)
      .query('SELECT COUNT(*) AS n FROM Transactions WHERE InvoiceID = @id');
    assert.strictEqual(bTxs.recordset[0].n, 0, 'no transaction should be written for invoiceB1');
    console.log('  PASS: cross-parent pay rejected, no transaction written');

    console.log('\n[5] Cancelled invoice is rejected');
    const r4 = await svc.payInvoice(IDS.userA, IDS.invoiceA2);
    assert.strictEqual(r4.ok, false, 'cancelled invoice must be rejected');
    assert.ok(/cancel/i.test(r4.reason), `reason should mention cancelled, got ${r4.reason}`);
    console.log('  PASS: cancelled rejected with reason=' + r4.reason);

    console.log('\n[6] Already-Paid invoice is rejected');
    const r5 = await svc.payInvoice(IDS.userA, IDS.invoiceA3);
    assert.strictEqual(r5.ok, false, 'already-paid invoice must be rejected');
    assert.ok(/paid/i.test(r5.reason), `reason should mention paid, got ${r5.reason}`);
    console.log('  PASS: already-paid rejected with reason=' + r5.reason);

    console.log('\n[7] Non-existent invoice is rejected (404-equivalent)');
    const r6 = await svc.payInvoice(IDS.userA, 99999999);
    assert.strictEqual(r6.ok, false);
    assert.ok(/not found/i.test(r6.reason), `reason should be 'not found', got ${r6.reason}`);
    console.log('  PASS: non-existent rejected');

    console.log('\n[8] Negative id is rejected at the service boundary');
    const r7 = await svc.payInvoice(IDS.userA, -1);
    assert.strictEqual(r7.ok, false);
    console.log('  PASS: negative id rejected');

    console.log('\n[9] Zero id is rejected');
    const r8 = await svc.payInvoice(IDS.userA, 0);
    assert.strictEqual(r8.ok, false);
    console.log('  PASS: zero id rejected');

    console.log('\n[10] Non-positive userId is rejected');
    const r9 = await svc.payInvoice(0, IDS.invoiceA1);
    assert.strictEqual(r9.ok, false);
    console.log('  PASS: bad userId rejected');

    console.log('\nALL PARENT PAY SQL TESTS PASSED');
  } finally {
    console.log('\n  cleaning up...');
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
