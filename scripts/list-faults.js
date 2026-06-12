'use strict';
// Read-only: print fault reports from the database in DATABASE_URL.
// Usage: DATABASE_URL=... node scripts/list-faults.js [status]
// SELECT only — never mutates.

const sql = require('mssql');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  const statusFilter = process.argv[2] || null;
  const { getPool } = require('../src/data/db');
  const pool = await getPool();

  if (!(await tableExists(pool, 'FaultReports'))) {
    console.log('FaultReports table does not exist in this database yet.');
    await pool.close();
    return;
  }

  const request = pool.request();
  let where = 'WHERE 1 = 1';
  if (statusFilter) { request.input('status', sql.NVarChar, statusFilter); where += ' AND fr.Status = @status'; }

  const result = await request.query(`
    SELECT fr.FaultReportID, fr.SchoolID, fr.PagePath, fr.ViewName, fr.Remarks, fr.Status,
           fr.CreatedDate, fr.ResolvedDate,
           s.SchoolName, u.Username, u.Email
    FROM dbo.FaultReports fr
    LEFT JOIN dbo.Schools s ON s.SchoolID = fr.SchoolID
    LEFT JOIN dbo.Users u ON u.UserID = fr.UserID
    ${where}
    ORDER BY fr.CreatedDate DESC`);

  console.log(`\n${result.recordset.length} fault report(s)${statusFilter ? ' with status ' + statusFilter : ''}:\n`);
  for (const f of result.recordset) {
    console.log('—'.repeat(70));
    console.log(`#${f.FaultReportID}  [${f.Status}]  ${f.CreatedDate ? new Date(f.CreatedDate).toISOString().slice(0, 16).replace('T', ' ') : ''}`);
    console.log(`School : ${f.SchoolName || ('#' + f.SchoolID)}`);
    console.log(`By     : ${f.Username || f.Email || 'unknown'}`);
    console.log(`Where  : ${f.ViewName || ''} ${f.PagePath ? '(' + f.PagePath + ')' : ''}`.trim());
    console.log(`Remarks: ${f.Remarks}`);
  }
  console.log('—'.repeat(70));

  await pool.close();
}

async function tableExists(pool, name) {
  const r = await pool.request().input('n', sql.NVarChar, name)
    .query("SELECT OBJECT_ID('dbo.' + @n, 'U') AS id");
  return Boolean(r.recordset[0] && r.recordset[0].id);
}

main().catch(err => { console.error('FAILED:', err.message); process.exit(1); });
