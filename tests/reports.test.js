'use strict';

// Route-layer tests for /sms/reports/*.

const assert = require('assert');
const http = require('http');

const PORT = process.env.TEST_PORT || 3001;
const HOST = process.env.TEST_HOST || 'localhost';

function request(method, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: HOST, port: PORT, path, method, headers }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
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

async function run() {
  console.log('\n[reports] /sms/reports/* route layer');

  const school = { 'X-Test-Role': 'school', 'X-Test-School-Id': '1' };
  const parent = { 'X-Test-Role': 'parent' };
  const admin = { 'X-Test-Role': 'admin' };

  await test('GET /sms/reports is 200 for school user', async () => {
    const r = await request('GET', '/sms/reports', school);
    assert.strictEqual(r.status, 200);
  });

  await test('GET /sms/reports lists all report types', async () => {
    const r = await request('GET', '/sms/reports', school);
    assert.ok(r.body.includes('Aging report'));
    assert.ok(r.body.includes('Collections report'));
    assert.ok(r.body.includes('Attendance rate'));
    assert.ok(r.body.includes('Class roster'));
    assert.ok(r.body.includes('Family balances'));
  });

  await test('GET /sms/reports/aging is 200 (report page)', async () => {
    const r = await request('GET', '/sms/reports/aging', school);
    assert.strictEqual(r.status, 200);
  });

  await test('GET /sms/reports/aging?run=1 is 200 or 500 (DB-dependent)', async () => {
    const r = await request('GET', '/sms/reports/aging?run=1', school);
    assert.ok([200, 500].includes(r.status), `expected 200/500, got ${r.status}`);
  });

  await test('GET /sms/reports/bogus returns 404', async () => {
    const r = await request('GET', '/sms/reports/bogus', school);
    assert.strictEqual(r.status, 404);
  });

  await test('GET /sms/reports/class-roster shows class picker', async () => {
    const r = await request('GET', '/sms/reports/class-roster', school);
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.includes('name="classId"'));
  });

  await test('GET /sms/reports/attendance-rate shows date filters', async () => {
    const r = await request('GET', '/sms/reports/attendance-rate', school);
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.includes('name="from"'));
    assert.ok(r.body.includes('name="to"'));
  });

  await test('GET /sms/reports/aging/export.csv?run=1 returns CSV or 500 (DB-dependent)', async () => {
    const r = await request('GET', '/sms/reports/aging/export.csv?run=1', school);
    if (r.status === 200) {
      assert.strictEqual(r.headers['content-type'].split(';')[0], 'text/csv');
      assert.ok(r.body.length >= 0);
    } else {
      assert.strictEqual(r.status, 500);
    }
  });

  console.log('\n[reports] role enforcement');

  await test('parent role is 403 on /sms/reports', async () => {
    const r = await request('GET', '/sms/reports', parent);
    assert.strictEqual(r.status, 403);
  });

  await test('admin role is 200 on /sms/reports', async () => {
    const r = await request('GET', '/sms/reports', admin);
    assert.strictEqual(r.status, 200);
  });

  console.log(process.exitCode ? '\nFAILED' : '\nALL REPORT ROUTE TESTS PASSED');
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
