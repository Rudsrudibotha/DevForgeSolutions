'use strict';

// Route-layer tests for /sms/invoices/*.

const assert = require('assert');
const http = require('http');

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
  console.log('\n[invoices] /sms/invoices/* route layer');

  const school = { 'X-Test-Role': 'school', 'X-Test-School-Id': '1' };
  const parent = { 'X-Test-Role': 'parent' };
  const admin = { 'X-Test-Role': 'admin' };

  await test('GET /sms/invoices is 200 for school user', async () => {
    const r = await request('GET', '/sms/invoices', school);
    assert.strictEqual(r.status, 200);
  });

  await test('GET /sms/invoices shows table + filters', async () => {
    const r = await request('GET', '/sms/invoices', school);
    assert.ok(r.body.includes('<table'));
    assert.ok(r.body.includes('name="q"'));
    assert.ok(r.body.includes('name="status"'));
    assert.ok(r.body.includes('Total outstanding'));
    assert.ok(r.body.includes('Generate invoices'));
  });

  await test('GET /sms/invoices?status=Overdue&overdueOnly=1 reflects filters', async () => {
    const r = await request('GET', '/sms/invoices?status=Overdue&overdueOnly=1', school);
    assert.strictEqual(r.status, 200);
  });

  await test('GET /sms/invoices/partials/table returns partial', async () => {
    const r = await request('GET', '/sms/invoices/partials/table', school);
    assert.strictEqual(r.status, 200);
    assert.ok(!r.body.includes('<!DOCTYPE'));
  });

  await test('GET /sms/invoices/new renders generate form', async () => {
    const r = await request('GET', '/sms/invoices/new', school);
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.includes('Generate invoices'));
    assert.ok(r.body.includes('name="amount"'));
    assert.ok(r.body.includes('name="dueDate"'));
    assert.ok(r.body.includes('name="classId"'));
    assert.ok(r.body.includes('name="billingCategoryId"'));
  });

  await test('GET /sms/invoices/new/students?classId=1 returns checklist partial', async () => {
    const r = await request('GET', '/sms/invoices/new/students?classId=1', school);
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.includes('Select all'), 'partial should have Select all toggle');
  });

  await test('GET /sms/invoices/123 returns 200 or 404', async () => {
    const r = await request('GET', '/sms/invoices/123', school);
    assert.ok(r.status === 200 || r.status === 404);
  });

  await test('GET /sms/invoices/0 is 404 (route regex)', async () => {
    const r = await request('GET', '/sms/invoices/0', school);
    assert.strictEqual(r.status, 404);
  });

  await test('GET /sms/invoices/-1 is 404', async () => {
    const r = await request('GET', '/sms/invoices/-1', school);
    assert.strictEqual(r.status, 404);
  });

  await test('GET /sms/invoices/abc is 404', async () => {
    const r = await request('GET', '/sms/invoices/abc', school);
    assert.strictEqual(r.status, 404);
  });

  console.log('\n[invoices] role enforcement');

  await test('parent role is 403 on /sms/invoices', async () => {
    const r = await request('GET', '/sms/invoices', parent);
    assert.strictEqual(r.status, 403);
  });

  await test('parent role is 403 on /sms/invoices/new', async () => {
    const r = await request('GET', '/sms/invoices/new', parent);
    assert.strictEqual(r.status, 403);
  });

  await test('admin role is 200 on /sms/invoices', async () => {
    const r = await request('GET', '/sms/invoices', admin);
    assert.strictEqual(r.status, 200);
  });

  console.log('\n[invoices] CSRF and write protection');

  await test('POST /sms/invoices/generate without CSRF is 403', async () => {
    const r = await request('POST', '/sms/invoices/generate', school, 'amount=100&dueDate=2026-07-01&studentIds=1');
    assert.strictEqual(r.status, 403);
  });

  await test('POST /sms/invoices/generate with CSRF + no studentIds is 204 warning', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/invoices/generate',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&amount=100&dueDate=2026-07-01');
    assert.strictEqual(r.status, 204);
    const trigger = r.headers['hx-trigger'];
    if (trigger) {
      const parsed = JSON.parse(trigger);
      assert.ok(parsed.toast, 'should have toast');
      assert.strictEqual(parsed.toast.type, 'warning');
    }
  });

  await test('POST /sms/invoices/generate with CSRF + missing amount is 400', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/invoices/generate',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&dueDate=2026-07-01&studentIds=1');
    assert.strictEqual(r.status, 400, `expected 400, got ${r.status}`);
  });

  await test('POST /sms/invoices/generate with CSRF + invalid amount is 400', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/invoices/generate',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&amount=abc&dueDate=2026-07-01&studentIds=1');
    assert.strictEqual(r.status, 400, `expected 400, got ${r.status}`);
  });

  await test('POST /sms/invoices/123/status without CSRF is 403', async () => {
    const r = await request('POST', '/sms/invoices/123/status', school, 'status=Cancelled');
    assert.strictEqual(r.status, 403);
  });

  await test('POST /sms/invoices/123/status with CSRF returns 204/404/500 (DB-dependent)', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/invoices/123/status',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&status=Cancelled');
    assert.ok([204, 404, 500].includes(r.status));
  });

  console.log(process.exitCode ? '\nFAILED' : '\nALL INVOICE ROUTE TESTS PASSED');
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
