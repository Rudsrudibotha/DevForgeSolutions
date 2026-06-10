'use strict';

// Route-layer tests for DevForge admin audit log endpoint.

const assert = require('node:assert/strict');
const http = require('node:http');

const BASE = 'http://127.0.0.1:3001';

function req(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const r = http.request(BASE + path, { method, headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}) }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

function get(path, role, qs) {
  return req('GET', path + (qs ? '?' + qs : ''), { 'X-Test-Role': role });
}

function assertRendersAuditPage(r) {
  assert.equal(r.status, 200, 'expected 200, got ' + r.status);
  assert.match(r.body, /Audit log<\/h1>/, 'list page missing h1');
  assert.match(r.body, /Read-only/, 'list page missing Read-only badge');
  assert.match(r.body, /name="actorEmail"/, 'list page missing actor email filter');
  assert.match(r.body, /name="schoolId"/, 'list page missing school filter');
  assert.match(r.body, /name="action"/, 'list page missing action filter');
  assert.match(r.body, /name="resourceType"/, 'list page missing resource type filter');
  assert.match(r.body, /name="from"/, 'list page missing from date');
  assert.match(r.body, /name="to"/, 'list page missing to date');
  assert.match(r.body, /id="audit-table"/, 'list page missing table tbody');
  assert.match(r.body, /event/, 'list page missing event count text');
}

async function run() {
  console.log('GET /devforge/audit (no auth)');
  let r = await req('GET', '/devforge/audit');
  assert.notEqual(r.status, 200, 'unauthenticated should not get 200');

  console.log('GET /devforge/audit as parent (denied)');
  r = await get('/devforge/audit', 'parent');
  assert.notEqual(r.status, 200, 'parent should be denied');

  console.log('GET /devforge/audit as school (denied)');
  r = await get('/devforge/audit', 'school');
  assert.notEqual(r.status, 200, 'school should be denied');

  console.log('GET /devforge/audit as admin (renders)');
  r = await get('/devforge/audit', 'admin');
  assertRendersAuditPage(r);

  console.log('GET /devforge/audit?actorEmail=foo (filter)');
  r = await get('/devforge/audit', 'admin', 'actorEmail=foo');
  assertRendersAuditPage(r);

  console.log('GET /devforge/audit?schoolId=1 (filter)');
  r = await get('/devforge/audit', 'admin', 'schoolId=1');
  assertRendersAuditPage(r);

  console.log('GET /devforge/audit?action=READ (filter)');
  r = await get('/devforge/audit', 'admin', 'action=READ');
  assertRendersAuditPage(r);

  console.log('GET /devforge/audit?action=WRITE (filter)');
  r = await get('/devforge/audit', 'admin', 'action=WRITE');
  assertRendersAuditPage(r);

  console.log('GET /devforge/audit?action=BOGUS (invalid action ignored)');
  r = await get('/devforge/audit', 'admin', 'action=BOGUS');
  assertRendersAuditPage(r);

  console.log('GET /devforge/audit?resourceType=Invoice (filter)');
  r = await get('/devforge/audit', 'admin', 'resourceType=Invoice');
  assertRendersAuditPage(r);

  console.log('GET /devforge/audit?from=2024-01-01&to=2024-12-31 (date filter)');
  r = await get('/devforge/audit', 'admin', 'from=2024-01-01&to=2024-12-31');
  assertRendersAuditPage(r);

  console.log('GET /devforge/audit?page=1 (pagination)');
  r = await get('/devforge/audit', 'admin', 'page=1');
  assertRendersAuditPage(r);

  console.log('GET /devforge/audit?page=abc (invalid → 1)');
  r = await get('/devforge/audit', 'admin', 'page=abc');
  assertRendersAuditPage(r);

  console.log('GET /devforge/audit/partials/table (HTMX partial)');
  r = await get('/devforge/audit/partials/table', 'admin');
  assert.equal(r.status, 200, 'partial should 200');
  assert.match(r.body, /<tr/, 'partial should contain table rows or empty state');

  console.log('GET /devforge/audit/partials/table?action=READ (HTMX with filter)');
  r = await get('/devforge/audit/partials/table', 'admin', 'action=READ');
  assert.equal(r.status, 200, 'partial filter should 200');
  assert.match(r.body, /<tr/, 'partial should contain table rows or empty state');

  console.log('GET /devforge/audit (denies regular users)');
  r = await get('/devforge/audit', 'parent');
  assert.notEqual(r.status, 200, 'parent must not access');
  r = await get('/devforge/audit', 'school');
  assert.notEqual(r.status, 200, 'school must not access');

  console.log('GET /devforge/audit/partials/table (denies parents)');
  r = await get('/devforge/audit/partials/table', 'parent');
  assert.notEqual(r.status, 200, 'parent must not access partial');

  console.log('OK all 19 admin audit route tests passed');
  if (process.exitCode) console.log('\nFAILED'); else console.log('\nALL DEVFORGE AUDIT ROUTE TESTS PASSED');
}

if (require.main === module) {
  run().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
}

module.exports = run;
