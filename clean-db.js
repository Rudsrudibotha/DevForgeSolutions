// Clean all data from the database.
// Usage: npm run clean-db
// WARNING: This removes ALL data from ALL tables. Use only in development.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sql = require('mssql');

async function cleanDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required. Set it in .env');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const pool = await sql.connect(process.env.DATABASE_URL);

  const scriptPath = path.join(__dirname, 'db', 'clean-data.sql');
  const script = fs.readFileSync(scriptPath, 'utf8');

  // Split by GO or run as batches separated by semicolons
  const batches = script
    .split(/\bGO\b/i)
    .map(b => b.trim())
    .filter(b => b.length > 0);

  console.log('Cleaning all data...');

  for (const batch of batches) {
    try {
      await pool.request().query(batch);
    } catch (err) {
      console.error('Batch error:', err.message);
      console.error('Batch:', batch.substring(0, 100) + '...');
    }
  }

  console.log('Database cleaned successfully.');
  console.log('Default admin user: admin@devforge.co.za / admin123');
  await pool.close();
  process.exit(0);
}

cleanDatabase().catch(err => {
  console.error('Clean failed:', err.message);
  process.exit(1);
});
