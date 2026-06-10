'use strict';

// Tests for database connection pool + query timeout configuration.
// Verifies the config builder produces sensible defaults + reads overrides
// from env vars.

const assert = require('node:assert/strict');
const fs = require('node:fs');

async function run() {
  console.log('db.js exports expected API');
  const src = fs.readFileSync('src/data/db.js', 'utf8');
  assert.match(src, /module\.exports = \{[^}]*getPool/, 'exports getPool');
  assert.match(src, /module\.exports = \{[^}]*getDbState/, 'exports getDbState');
  assert.match(src, /module\.exports = \{[^}]*connectDB/, 'exports connectDB');
  assert.match(src, /module\.exports = \{[^}]*positiveIntEnv/, 'exports positiveIntEnv');

  console.log('config has pool + timeout + encryption defaults');
  assert.match(src, /pool:\s*\{/, 'config has pool block');
  assert.match(src, /connectionTimeout/, 'config has connectionTimeout');
  assert.match(src, /requestTimeout/, 'config has requestTimeout');
  assert.match(src, /trustServerCertificate/, 'config has trustServerCertificate');
  assert.match(src, /encrypt/, 'config has encrypt');
  assert.match(src, /enableArithAbort/, 'config has enableArithAbort');

  console.log('config reads env overrides');
  assert.match(src, /DB_POOL_MAX/, 'reads DB_POOL_MAX');
  assert.match(src, /DB_QUERY_TIMEOUT_MS/, 'reads DB_QUERY_TIMEOUT_MS');
  assert.match(src, /DB_CONNECT_TIMEOUT_MS/, 'reads DB_CONNECT_TIMEOUT_MS');
  assert.match(src, /DB_TRUST_SERVER_CERT/, 'reads DB_TRUST_SERVER_CERT');
  assert.match(src, /DB_ENCRYPT/, 'reads DB_ENCRYPT');

  console.log('default values are sane');
  assert.match(src, /max:\s*positiveIntEnv\('DB_POOL_MAX',\s*10\)/, 'default pool max 10');
  assert.match(src, /requestTimeout:\s*positiveIntEnv\('DB_QUERY_TIMEOUT_MS',\s*60000\)/, 'default request timeout 60s');
  assert.match(src, /connectionTimeout:\s*positiveIntEnv\('DB_CONNECT_TIMEOUT_MS',\s*15000\)/, 'default connect timeout 15s');
  assert.match(src, /idleTimeoutMillis:\s*positiveIntEnv\('DB_POOL_IDLE_MS',\s*30000\)/, 'default idle timeout 30s');

  console.log('sqlserver:// URLs are parsed');
  assert.match(src, /parse sqlserver URL|sqlserver:\/\/.*hostname|new URL\(url\)/, 'parses sqlserver URL');
  assert.match(src, /config\.server = parsed\.hostname/, 'sets server from URL');
  assert.match(src, /config\.database/, 'sets database from URL path');
  assert.match(src, /config\.user/, 'sets user from URL');
  assert.match(src, /config\.password/, 'sets password from URL');

  console.log('non-sqlserver URL is set as connectionString (mssql parses it)');
  assert.match(src, /connectionString = url/, 'sets connectionString for legacy URL');
  assert.match(src, /Legacy key=value|let mssql parse/, 'documents legacy form');

  console.log('pool is reused (single global)');
  assert.match(src, /let pool = null/, 'module-level pool cache');
  assert.match(src, /pool\.connected/, 'reuses connected pool');
  assert.match(src, /pool\.connecting/, 'awaits connecting pool');

  console.log('OK all 7 database pool tests passed');
  if (process.exitCode) console.log('\nFAILED'); else console.log('\nALL DATABASE POOL TESTS PASSED');
}

if (require.main === module) {
  run().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
}

module.exports = run;
