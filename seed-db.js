// Seed test data into the database.
// Usage: npm run seed-db

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sql = require('mssql');

async function seedDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required.');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const pool = await sql.connect(process.env.DATABASE_URL);

  const script = fs.readFileSync(path.join(__dirname, 'db', 'seed-test-data.sql'), 'utf8');

  console.log('Seeding test data...');
  try {
    await pool.request().query(script);
    console.log('Test data seeded successfully.');
  } catch (err) {
    console.error('Seed error:', err.message);
    if (err.precedingErrors) {
      err.precedingErrors.forEach(e => console.error('  -', e.message));
    }
  }

  // Verify counts
  const counts = await pool.request().query(`
    SELECT
      (SELECT COUNT(1) FROM Schools) AS Schools,
      (SELECT COUNT(1) FROM Users) AS Users,
      (SELECT COUNT(1) FROM Families) AS Families,
      (SELECT COUNT(1) FROM Students) AS Students,
      (SELECT COUNT(1) FROM Employees) AS Employees,
      (SELECT COUNT(1) FROM Invoices) AS Invoices,
      (SELECT COUNT(1) FROM Transactions) AS Transactions,
      (SELECT COUNT(1) FROM Attendance) AS Attendance,
      (SELECT COUNT(1) FROM LeaveRequests) AS LeaveRequests,
      (SELECT COUNT(1) FROM Payslips) AS Payslips,
      (SELECT COUNT(1) FROM Classes) AS Classes
  `);
  console.log('\nData counts:');
  const c = counts.recordset[0];
  Object.keys(c).forEach(k => console.log(' ', k + ':', c[k]));

  console.log('\nLogin credentials:');
  console.log('  DevForge:  /devforge-login  admin@devforge.co.za / admin123');
  console.log('  School:    /school-login     School ID 7, schooltest@devforge.local / school123');
  console.log('  Parent:    /parent-login     parenttest@devforge.local / parent123');

  await pool.close();
  process.exit(0);
}

seedDatabase().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
