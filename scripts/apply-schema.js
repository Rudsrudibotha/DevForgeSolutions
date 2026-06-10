'use strict';
// Apply db/schema.sql (idempotent DDL) to the database in DATABASE_URL.
// Splits on GO batch separators the way sqlcmd would.
// Usage: DATABASE_URL=... node scripts/apply-schema.js

const fs = require('fs');
const path = require('path');
const sql = require('mssql');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  const schemaPath = path.resolve(__dirname, '..', 'db', 'schema.sql');
  const text = fs.readFileSync(schemaPath, 'utf8');
  const batches = text
    .split(/^\s*GO\s*$/gim)
    .map(b => b.trim())
    .filter(Boolean);

  const { getPool } = require('../src/data/db');
  const pool = await getPool();
  console.log(`Applying ${batches.length} batches from db/schema.sql ...`);
  let ok = 0, failed = 0;
  for (let i = 0; i < batches.length; i++) {
    try {
      await pool.request().batch(batches[i]);
      ok++;
    } catch (err) {
      failed++;
      console.error(`Batch ${i + 1}/${batches.length} FAILED: ${err.message.split('\n')[0]}`);
      console.error('  starts: ' + batches[i].slice(0, 120).replace(/\s+/g, ' '));
    }
  }
  console.log(`Done. ${ok} ok, ${failed} failed.`);
  await pool.close();
  process.exit(failed ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
