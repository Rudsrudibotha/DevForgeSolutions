'use strict';

// SQL-level tests for BankStatementPortalService.
// Tests CSV parsing logic via a unit-style test (no DB needed for parsing),
// plus DB-backed tests for ingest, suggest, allocate flow, and delete.

const assert = require('assert');
const { getPool, sql } = require('../src/data/db');
const { ScopedDb } = require('../src/data/scopedDb');
const BankStatementPortalService = require('../src/business/bankStatementPortalService');

const IDS = {
  schoolA: 98001,
  schoolB: 98002,
  familyA: 98010,
  student1: 98020,
  invoice1: 98030
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
        VALUES (${IDS.schoolA}, 'BankTest A', 'Active', 'ZAR', 'R', 'Standard');

      IF NOT EXISTS (SELECT 1 FROM Families WHERE FamilyID = ${IDS.familyA})
        INSERT INTO Families (FamilyID, SchoolID, FamilyName, PrimaryParentName) VALUES (${IDS.familyA}, ${IDS.schoolA}, 'BankTest Family', 'Parent');

      IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = ${IDS.student1})
        INSERT INTO Students (StudentID, SchoolID, FamilyID, FirstName, LastName, IsActive, EnrolledDate, CurrentAcademicYear, BillingDate)
        VALUES (${IDS.student1}, ${IDS.schoolA}, ${IDS.familyA}, 'Stu', 'Bank', 1, GETDATE(), YEAR(GETDATE()), GETDATE());

      IF NOT EXISTS (SELECT 1 FROM Invoices WHERE InvoiceID = ${IDS.invoice1})
        INSERT INTO Invoices (InvoiceID, InvoiceNumber, SchoolID, StudentID, Amount, AmountPaid, DueDate, Status, IssueDate, CurrentAcademicYear)
        VALUES (${IDS.invoice1}, 'BANK-1-${Date.now()%100000}', ${IDS.schoolA}, ${IDS.student1}, 1500, 0, DATEADD(DAY, 30, GETDATE()), 'Pending', CAST(GETDATE() AS DATE), YEAR(GETDATE()));
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
      DELETE FROM Transactions    WHERE SchoolID = ${IDS.schoolA};
      DELETE FROM BankStatements  WHERE SchoolID = ${IDS.schoolA};
      DELETE FROM Invoices        WHERE InvoiceID = ${IDS.invoice1};
      DELETE FROM Students        WHERE StudentID = ${IDS.student1};
      DELETE FROM Families        WHERE FamilyID = ${IDS.familyA};
      DELETE FROM Schools         WHERE SchoolID = ${IDS.schoolA};
    `);
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

function sdbA() { return new ScopedDb({ id: 1, role: 'school', schoolId: IDS.schoolA }); }

async function run() {
  console.log('\n[bank-statements / SQL] checking database availability...');
  if (!(await isDbAvailable())) {
    console.log('  SKIP: DATABASE_URL not set or SKIP_DB=true.');
    return;
  }
  console.log('  seeding...');
  await seed();
  const svc = new BankStatementPortalService();
  const sdb = sdbA();

  try {
    console.log('\n[1] listStatements() with no uploads returns empty');
    let l = await svc.listStatements({ schoolDb: sdb });
    assert.strictEqual(l.total, 0);
    console.log('  PASS: empty');

    console.log('\n[2] ingestCSV() imports a valid statement');
    const csv = [
      'Date,Description,Amount,Reference',
      '2026-06-15,Payment for Smith,1500.00,REF-A',
      '2026-06-16,Card deposit,500.00,',
      '2026-06-17,Bank fee,25.00,FEE-001'
    ].join('\n');
    const r2 = await svc.ingestCSV({ schoolDb: sdb, fileName: 'june.csv', csvText: csv, actor: { id: 1, role: 'school' } });
    assert.ok(r2.statementId);
    assert.strictEqual(r2.linesImported, 3);
    assert.strictEqual(r2.linesSkipped, 0);
    console.log(`  PASS: imported ${r2.linesImported} lines`);

    console.log('\n[3] getLines() returns the 3 lines as Unallocated');
    const lines = await svc.getLines({ schoolDb: sdb, statementId: r2.statementId });
    assert.strictEqual(lines.length, 3);
    assert.strictEqual(lines.filter(l => l.AllocationStatus === 'Unallocated').length, 3);
    console.log('  PASS: 3 unallocated lines');

    console.log('\n[4] ingestCSV() with dd/mm/yyyy dates works');
    const csv2 = [
      'Date,Description,Amount',
      '15/06/2026,Alt format,100.00',
      '16/06/2026,Second line,200.00'
    ].join('\n');
    const r3 = await svc.ingestCSV({ schoolDb: sdb, fileName: 'june2.csv', csvText: csv2, actor: { id: 1, role: 'school' } });
    assert.strictEqual(r3.linesImported, 2);
    console.log('  PASS: dd/mm/yyyy dates parsed');

    console.log('\n[5] ingestCSV() throws on empty CSV');
    let threw = false;
    try { await svc.ingestCSV({ schoolDb: sdb, fileName: 'empty.csv', csvText: '', actor: { id: 1, role: 'school' } }); }
    catch (e) { threw = true; }
    assert.ok(threw);
    console.log('  PASS: empty CSV throws');

    console.log('\n[6] ingestCSV() throws on missing required column');
    threw = false;
    try { await svc.ingestCSV({ schoolDb: sdb, fileName: 'bad.csv', csvText: 'Foo,Bar\n1,2\n', actor: { id: 1, role: 'school' } }); }
    catch (e) { threw = true; }
    assert.ok(threw);
    console.log('  PASS: missing columns throws');

    console.log('\n[7] suggestMatches() returns the matching invoice');
    // Find a bank line that matches the invoice amount
    const matchLine = lines.find(l => Number(l.Amount) === 1500);
    const suggestions = await svc.suggestMatches({ schoolDb: sdb, transactionId: matchLine.TransactionID, limit: 5 });
    assert.ok(suggestions.length > 0, 'expected at least one match');
    assert.ok(suggestions.find(s => s.InvoiceID === IDS.invoice1), 'should match the seeded invoice');
    console.log(`  PASS: ${suggestions.length} match suggestions, includes invoice 1`);

    console.log('\n[8] suggestMatches() returns empty for non-Unallocated tx');
    // Mark the line as Allocated first
    const pool = await getPool();
    await pool.request().input('id', sql.Int, matchLine.TransactionID)
      .query(`UPDATE Transactions SET AllocationStatus = 'Allocated', InvoiceID = @id WHERE TransactionID = @id`);
    const noSugg = await svc.suggestMatches({ schoolDb: sdb, transactionId: matchLine.TransactionID, limit: 5 });
    assert.deepStrictEqual(noSugg, []);
    console.log('  PASS: no suggestions for allocated tx');

    console.log('\n[9] deleteStatement() removes the statement and unallocated lines');
    const beforeDel = await pool.request().input('id', sql.Int, r2.statementId)
      .query('SELECT COUNT(*) AS n FROM Transactions WHERE BankStatementID = @id');
    const beforeCount = beforeDel.recordset[0].n;
    const ok = await svc.deleteStatement({ schoolDb: sdb, statementId: r2.statementId, actor: { id: 1, role: 'school' } });
    assert.strictEqual(ok, true);
    // The allocated line we just updated should NOT be deleted; the 2 unallocated should be
    const afterDel = await pool.request().input('id', sql.Int, r2.statementId)
      .query('SELECT COUNT(*) AS n FROM Transactions WHERE BankStatementID = @id');
    const afterCount = afterDel.recordset[0].n;
    assert.strictEqual(afterCount, beforeCount - 2, `expected ${beforeCount - 2} remaining, got ${afterCount}`);
    console.log(`  PASS: deleted statement, kept ${afterCount} allocated lines, removed 2 unallocated`);

    console.log('\n[10] deleteStatement() returns false for cross-school (TENANCY)');
    const sdbB = new ScopedDb({ id: 2, role: 'school', schoolId: IDS.schoolB });
    const denied = await svc.deleteStatement({ schoolDb: sdbB, statementId: r3.statementId, actor: { id: 1, role: 'school' } });
    assert.strictEqual(denied, false);
    console.log('  PASS: cross-school delete returns false');

    console.log('\n[11] listStatements() respects cross-school scope');
    l = await svc.listStatements({ schoolDb: sdbB });
    assert.strictEqual(l.total, 0);
    console.log('  PASS: cross-school list empty');

    console.log('\n[12] getStatement() respects tenancy');
    const got = await svc.getStatement({ schoolDb: sdb, statementId: r3.statementId });
    assert.ok(got);
    const deniedById = await svc.getStatement({ schoolDb: sdbB, statementId: r3.statementId });
    assert.strictEqual(deniedById, null);
    console.log('  PASS: getStatement respects tenancy');

    console.log('\nALL BANK STATEMENT SQL TESTS PASSED');
  } finally {
    console.log('\n  cleaning up...');
    await cleanup();
  }
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
