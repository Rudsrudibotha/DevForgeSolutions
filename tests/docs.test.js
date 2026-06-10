'use strict';

// Tests for the docs/API.md and docs/TENANCY.md files. Verifies the docs
// exist and contain the key sections a developer/auditor needs.

const assert = require('node:assert/strict');
const fs = require('node:fs');

async function run() {
  console.log('docs/API.md exists');
  assert.ok(fs.existsSync('docs/API.md'), 'API.md missing');
  const api = fs.readFileSync('docs/API.md', 'utf8');

  console.log('API.md has auth section');
  assert.match(api, /## Authentication/, 'auth section');
  assert.match(api, /JWT/, 'JWT mentioned');
  assert.match(api, /JWT_SECRET|JWT or cookie|Bearer/i, 'JWT auth mentioned');

  console.log('API.md has tenancy model');
  assert.match(api, /## Tenancy model/, 'tenancy section');
  assert.match(api, /admin/, 'admin role');
  assert.match(api, /school/, 'school role');
  assert.match(api, /parent/, 'parent role');
  assert.match(api, /AuditLog/, 'audit log referenced');
  assert.match(api, /ScopedDb/, 'ScopedDb referenced');
  assert.match(api, /SCOPED_TABLES/, 'SCOPED_TABLES referenced');

  console.log('API.md documents portal routes');
  assert.match(api, /### Parent/, 'parent routes');
  assert.match(api, /### School/, 'school routes');
  assert.match(api, /### DevForge/, 'devforge routes');
  assert.match(api, /POST \/parent\/invoices\/:id\/pay/, 'parent pay endpoint');
  assert.match(api, /GET \/sms\/students/, 'sms students endpoint');
  assert.match(api, /GET \/devforge\/audit/, 'devforge audit endpoint');

  console.log('API.md documents JSON API');
  assert.match(api, /## JSON API/, 'JSON API section');
  assert.match(api, /\/api\/auth\/login/, 'login endpoint');
  assert.match(api, /\/api\/invoices/, 'invoices endpoint');
  assert.match(api, /\/api\/transactions/, 'transactions endpoint');
  assert.match(api, /\/api\/bank-statements/, 'bank statements endpoint');
  assert.match(api, /\/api\/messaging/, 'messaging endpoints');
  assert.match(api, /\/api\/audit/, 'audit endpoint');

  console.log('API.md documents errors, idempotency, versioning');
  assert.match(api, /## Errors/, 'errors section');
  assert.match(api, /## Idempotency/, 'idempotency section');
  assert.match(api, /## Versioning/, 'versioning section');

  console.log('docs/TENANCY.md exists');
  assert.ok(fs.existsSync('docs/TENANCY.md'), 'TENANCY.md missing');
  const ten = fs.readFileSync('docs/TENANCY.md', 'utf8');

  console.log('TENANCY.md has the three rules');
  assert.match(ten, /three rules/i, 'three rules heading');
  assert.match(ten, /SchoolID/, 'SchoolID mentioned');
  assert.match(ten, /WHERE SchoolID = @schoolId/, 'WHERE clause mentioned');
  assert.match(ten, /AuditLog/, 'AuditLog mentioned');

  console.log('TENANCY.md documents ScopedDb + guard');
  assert.match(ten, /ScopedDb/, 'ScopedDb mentioned');
  assert.match(ten, /guardTableScope|guard/, 'guard mentioned');
  assert.match(ten, /bypass/, 'bypass mentioned');
  assert.match(ten, /SCOPED_TABLES/, 'SCOPED_TABLES mentioned');
  assert.match(ten, /recordReadAsync|recordWrite/, 'audit methods mentioned');

  console.log('TENANCY.md documents parent tenancy + Admin bypass');
  assert.match(ten, /parent tenancy|ParentLinks/i, 'parent tenancy section');
  assert.match(ten, /cross-school|admin bypass/i, 'admin cross-school');
  assert.match(ten, /recordWrite/, 'write audit method');

  console.log('TENANCY.md documents common mistakes');
  assert.match(ten, /common mistakes|mistakes/i, 'mistakes section');
  assert.match(ten, /global `sql`|SCOPED_TABLES|parameteriz/i, 'specific mistakes covered');

  console.log('TENANCY.md documents testing approach');
  assert.match(ten, /Testing tenancy|tests\/scope|tests\/parentTenancy/i, 'testing section');

  console.log('README.md and CHANGELOG.md exist');
  assert.ok(fs.existsSync('README.md'), 'README.md missing');
  assert.ok(fs.existsSync('CHANGELOG.md'), 'CHANGELOG.md missing');
  assert.ok(fs.existsSync('.env.example'), '.env.example missing');

  console.log('README has the key sections');
  const readme = fs.readFileSync('README.md', 'utf8');
  assert.match(readme, /## Stack/, 'stack section');
  assert.match(readme, /The three portals|three portals/i, 'portals section');
  assert.match(readme, /Multi-tenant security|tenancy/i, 'tenancy section');
  assert.match(readme, /Quick start/i, 'quick start section');
  assert.match(readme, /## Tests/, 'tests section');
  assert.match(readme, /## API/, 'api section');
  assert.match(readme, /## Conventions/i, 'conventions section');

  console.log('CHANGELOG documents the 1.0.0 release');
  const ch = fs.readFileSync('CHANGELOG.md', 'utf8');
  assert.match(ch, /1\.0\.0/, '1.0.0 entry');
  assert.match(ch, /ScopedDb|multi-tenant/i, 'mentions tenancy work');
  assert.match(ch, /portal/i, 'mentions portals');
  assert.match(ch, /DevForge/i, 'mentions DevForge');

  console.log('.env.example has all the env vars we read');
  const env = fs.readFileSync('.env.example', 'utf8');
  assert.match(env, /DATABASE_URL/, 'DATABASE_URL');
  assert.match(env, /JWT_SECRET/, 'JWT_SECRET');
  assert.match(env, /PORT/, 'PORT');
  assert.match(env, /DISABLE_AUTH/, 'DISABLE_AUTH');
  assert.match(env, /MICROSOFT_CLIENT_ID/, 'MS OAuth');
  assert.match(env, /GOOGLE_CLIENT_ID/, 'Google OAuth');
  assert.match(env, /AZURE_AD_TENANT_ID/, 'AAD');
  assert.match(env, /APPINSIGHTS_INSTRUMENTATION_KEY/, 'AppInsights');
  assert.match(env, /DB_POOL_MAX/, 'pool tuning');
  assert.match(env, /ALLOWED_ORIGINS/, 'CORS');

  console.log('OK all 12 docs tests passed');
  if (process.exitCode) console.log('\nFAILED'); else console.log('\nALL DOCS TESTS PASSED');
}

if (require.main === module) {
  run().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
}

module.exports = run;
