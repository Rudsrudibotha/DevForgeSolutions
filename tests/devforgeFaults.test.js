'use strict';

// Route-layer tests for the DevForge fault review queue (/devforge/faults)
// plus a schema-collision guard: dbo.FaultReports must be defined once.

const assert = require('assert');
const http = require('http');
const fs = require('fs');

const PORT = process.env.TEST_PORT || 3001;
const HOST = process.env.TEST_HOST || 'localhost';

function request(method, path, headers = {}, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: HOST, port: PORT, path, method, headers }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`  PASS: ${name}`))
    .catch(err => {
      console.error(`  FAIL: ${name}`);
      console.error(`    ${err.message}`);
      process.exitCode = 1;
    });
}

async function getCsrf() {
  const a = await request('GET', '/login', {});
  const cookies = a.headers['set-cookie'] || [];
  const csrfCookie = cookies.map(c => c.split(';')[0]).find(c => c.startsWith('kch_csrf='));
  const csrf = csrfCookie ? csrfCookie.split('=')[1] : '';
  return { csrf, cookieHeader: csrfCookie || '' };
}

async function run() {
  console.log('\n[devforge-faults] schema collision guard');

  await test('dbo.FaultReports is defined exactly once in schema.sql', async () => {
    const schema = fs.readFileSync('db/schema.sql', 'utf8');
    const matches = schema.match(/CREATE TABLE dbo\.FaultReports\b/g) || [];
    assert.strictEqual(matches.length, 1, 'expected one FaultReports table, found ' + matches.length);
  });

  await test('the canonical FaultReports table uses the System A columns', async () => {
    const schema = fs.readFileSync('db/schema.sql', 'utf8');
    const idx = schema.indexOf('CREATE TABLE dbo.FaultReports');
    const block = schema.slice(idx, idx + 800);
    assert.ok(/PagePath/.test(block), 'PagePath column present');
    assert.ok(/Remarks/.test(block), 'Remarks column present');
    assert.ok(!/ReportedByUserId/.test(block), 'old System B column must be gone');
  });

  console.log('\n[devforge-faults] /devforge/faults route layer');

  const admin = { 'X-Test-Role': 'admin' };
  const school = { 'X-Test-Role': 'school', 'X-Test-School-Id': '1' };
  const parent = { 'X-Test-Role': 'parent' };

  await test('GET /devforge/faults is 200 for admin with status filter', async () => {
    const r = await request('GET', '/devforge/faults', admin);
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.includes('name="status"'));
    assert.ok(r.body.includes('Reported faults'));
  });

  await test('GET /devforge/faults/partials/table returns a partial (no doctype)', async () => {
    const r = await request('GET', '/devforge/faults/partials/table', admin);
    assert.strictEqual(r.status, 200);
    assert.ok(!r.body.includes('<!DOCTYPE'));
  });

  await test('school role is 403 on /devforge/faults', async () => {
    const r = await request('GET', '/devforge/faults', school);
    assert.strictEqual(r.status, 403);
  });

  await test('parent role is 403 on /devforge/faults', async () => {
    const r = await request('GET', '/devforge/faults', parent);
    assert.strictEqual(r.status, 403);
  });

  console.log('\n[devforge-faults] status update (CSRF + validation)');

  await test('POST /devforge/faults/1/status without CSRF is 403', async () => {
    const r = await request('POST', '/devforge/faults/1/status', admin, 'status=Resolved');
    assert.strictEqual(r.status, 403);
  });

  await test('POST /devforge/faults/1/status as school role is 403', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/devforge/faults/1/status',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&status=Resolved');
    assert.strictEqual(r.status, 403);
  });

  await test('POST /devforge/faults/1/status with an invalid status is 400', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/devforge/faults/1/status',
      { ...admin, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&status=Bogus');
    assert.strictEqual(r.status, 400, `expected 400, got ${r.status}`);
  });

  await test('POST /devforge/faults/1/status with a valid status is 204/404/500 (DB-dependent)', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/devforge/faults/1/status',
      { ...admin, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&status=Resolved');
    assert.ok([204, 404, 500].includes(r.status), `expected 204/404/500, got ${r.status}`);
  });

  await test('POST /devforge/faults/1/status (htmx) with valid status returns clean 4xx, not 500', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/devforge/faults/1/status',
      { ...admin, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'hx-request': 'true', 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&status=Resolved');
    assert.ok([204, 400, 404].includes(r.status), `expected 204/400/404, got ${r.status}`);
  });

  await test('POST /devforge/faults/0/status is 404 (route regex)', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/devforge/faults/0/status',
      { ...admin, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&status=Resolved');
    assert.strictEqual(r.status, 404);
  });

  console.log(process.exitCode ? '\nFAILED' : '\nALL DEVFORGE FAULTS TESTS PASSED');
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
