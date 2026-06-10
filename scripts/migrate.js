// Database migration runner.
//
// Applies db/migrations/*.sql in numeric order against Azure SQL,
// recording each version in dbo.SchemaMigrations. Idempotent: each
// migration uses IF OBJECT_ID / IF COL_LENGTH guards.
//
// Usage:
//   DATABASE_URL='...' node scripts/migrate.js
//
// Env:
//   DATABASE_URL                 mssql connection string
//   MIGRATIONS_DIR               defaults to db/migrations
//   MIGRATIONS_BOOTSTRAP_FROM    path to db/schema.sql if SchemaMigrations
//                                table does not yet exist (legacy deploys)

'use strict';

const fs = require('fs');
const path = require('path');
const sql = require('mssql');

function listMigrations(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort()
    .map(f => ({
      version: f.split('_')[0],
      filename: f,
      fullPath: path.join(dir, f)
    }));
}

async function ensureSchemaMigrationsTable(pool) {
  const r = await pool.request().query(`
    IF OBJECT_ID('dbo.SchemaMigrations', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.SchemaMigrations (
        Version    NVARCHAR(20) NOT NULL PRIMARY KEY,
        AppliedAt  DATETIME2    NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END;
  `);
  return r;
}

async function getAppliedVersions(pool) {
  const r = await pool.request().query(`
    SELECT Version FROM dbo.SchemaMigrations
  `);
  return new Set(r.recordset.map(row => row.Version));
}

async function runMigration(pool, m) {
  const sqlText = fs.readFileSync(m.fullPath, 'utf8');
  console.log(`  -> applying ${m.filename}`);
  await pool.request().batch(sqlText);
  await pool.request()
    .input('Version', m.version)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE Version = @Version)
        INSERT INTO dbo.SchemaMigrations (Version) VALUES (@Version);
    `);
}

async function main() {
  const connStr = process.env.DATABASE_URL;
  if (!connStr) {
    console.error('migrate: DATABASE_URL is required');
    process.exit(2);
  }
  const dir = process.env.MIGRATIONS_DIR || path.resolve(__dirname, '..', 'db', 'migrations');
  const migrations = listMigrations(dir);
  if (!migrations.length) {
    console.error(`migrate: no migrations found in ${dir}`);
    process.exit(3);
  }

  const pool = await sql.connect(connStr);
  try {
    await ensureSchemaMigrationsTable(pool);
    const applied = await getAppliedVersions(pool);
    let count = 0;
    for (const m of migrations) {
      if (applied.has(m.version)) {
        console.log(`  skip  ${m.filename} (already applied)`);
        continue;
      }
      try {
        await runMigration(pool, m);
        count++;
      } catch (err) {
        console.error(`migrate: FAILED at ${m.filename}`);
        console.error(err.message);
        process.exit(4);
      }
    }
    console.log(`migrate: ${count} applied, ${migrations.length - count} already current`);
  } finally {
    await pool.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
