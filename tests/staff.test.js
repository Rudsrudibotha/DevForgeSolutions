'use strict';

// Route-layer tests for /sms/staff/*.

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
  console.log('\n[staff] /sms/staff/* route layer');

  const school = { 'X-Test-Role': 'school', 'X-Test-School-Id': '1' };
  const parent = { 'X-Test-Role': 'parent' };
  const admin = { 'X-Test-Role': 'admin' };

  await test('GET /sms/staff is 200 for school user', async () => {
    const r = await request('GET', '/sms/staff', school);
    assert.strictEqual(r.status, 200);
  });

  await test('GET /sms/staff shows table + filters', async () => {
    const r = await request('GET', '/sms/staff', school);
    assert.ok(r.body.includes('<table'));
    assert.ok(r.body.includes('name="q"'));
    assert.ok(r.body.includes('name="department"'));
  });

  await test('GET /sms/staff/partials/table returns partial', async () => {
    const r = await request('GET', '/sms/staff/partials/table', school);
    assert.strictEqual(r.status, 200);
    assert.ok(!r.body.includes('<!DOCTYPE'));
  });

  await test('GET /sms/staff/123 returns 200 or 404', async () => {
    const r = await request('GET', '/sms/staff/123', school);
    assert.ok(r.status === 200 || r.status === 404);
  });

  await test('GET /sms/staff/0 is 404 (route regex)', async () => {
    const r = await request('GET', '/sms/staff/0', school);
    assert.strictEqual(r.status, 404);
  });

  await test('GET /sms/staff/-1 is 404', async () => {
    const r = await request('GET', '/sms/staff/-1', school);
    assert.strictEqual(r.status, 404);
  });

  await test('GET /sms/staff/abc is 404', async () => {
    const r = await request('GET', '/sms/staff/abc', school);
    assert.strictEqual(r.status, 404);
  });

  console.log('\n[staff] role enforcement');

  await test('parent role is 403 on /sms/staff', async () => {
    const r = await request('GET', '/sms/staff', parent);
    assert.strictEqual(r.status, 403);
  });

  await test('parent role is 403 on /sms/staff/123', async () => {
    const r = await request('GET', '/sms/staff/123', parent);
    assert.strictEqual(r.status, 403);
  });

  await test('admin role is 200 on /sms/staff', async () => {
    const r = await request('GET', '/sms/staff', admin);
    assert.strictEqual(r.status, 200);
  });

  console.log(process.exitCode ? '\nFAILED' : '\nALL STAFF ROUTE TESTS PASSED');
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
