'use strict';
// Read-only: explains why the Outstanding fees page is (or isn't) empty.
// Usage: DATABASE_URL=... node scripts/diagnose-outstanding.js
// SELECT only — never mutates.

const sql = require('mssql');

async function main() {
  if (!process.env.DATABASE_URL) { console.error('DATABASE_URL is required'); process.exit(1); }
  const { getPool } = require('../src/data/db');
  const pool = await getPool();

  const schools = (await pool.request().query(
    `SELECT SchoolID, SchoolName FROM dbo.Schools ORDER BY SchoolName`
  )).recordset;

  for (const s of schools) {
    const r = await pool.request().input('sid', sql.Int, s.SchoolID).query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.Invoices WHERE SchoolID=@sid AND IsDeleted=0) AS TotalInvoices,
        (SELECT COUNT(*) FROM dbo.Invoices WHERE SchoolID=@sid AND IsDeleted=0 AND ISNULL(Status,'') NOT IN ('Paid','Cancelled') AND (Amount - ISNULL(AmountPaid,0)) > 0.005) AS UnpaidInvoices,
        (SELECT ISNULL(SUM(Amount - ISNULL(AmountPaid,0)),0) FROM dbo.Invoices WHERE SchoolID=@sid AND IsDeleted=0 AND ISNULL(Status,'') NOT IN ('Paid','Cancelled')) AS Outstanding,
        (SELECT COUNT(*) FROM dbo.Invoices WHERE SchoolID=@sid AND IsDeleted=0 AND StudentID IS NULL) AS InvoicesWithNoStudent
    `);
    const d = r.recordset[0];
    console.log(`\n#${s.SchoolID} ${s.SchoolName}`);
    console.log(`  invoices total      : ${d.TotalInvoices}`);
    console.log(`  unpaid (should show): ${d.UnpaidInvoices}`);
    console.log(`  outstanding total   : ${Number(d.Outstanding).toFixed(2)}`);
    console.log(`  invoices w/o student: ${d.InvoicesWithNoStudent}  (these can't appear in the per-student pivot)`);
  }

  console.log('\nReading: if "unpaid" is 0 the empty page is correct (no fees owed).');
  console.log('If "unpaid" > 0 but the page is still empty, the fix is not deployed yet.');
  await pool.close();
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
