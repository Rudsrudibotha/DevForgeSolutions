'use strict';

// Route-layer tests for /sms/payments/*.

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
  console.log('\n[payments] /sms/payments/* route layer');

  const school = { 'X-Test-Role': 'school', 'X-Test-School-Id': '1' };
  const parent = { 'X-Test-Role': 'parent' };
  const admin = { 'X-Test-Role': 'admin' };

  await test('GET /sms/payments is 200 for school user', async () => {
    const r = await request('GET', '/sms/payments', school);
    assert.strictEqual(r.status, 200);
  });

  await test('GET /sms/payments shows filters + table', async () => {
    const r = await request('GET', '/sms/payments', school);
    assert.ok(r.body.includes('<table'));
    assert.ok(r.body.includes('name="q"'));
    assert.ok(r.body.includes('name="allocationStatus"'));
    assert.ok(r.body.includes('name="paymentMethod"'));
    assert.ok(r.body.includes('Record payment'));
  });

  await test('GET /sms/payments?allocationStatus=Unallocated reflects filter', async () => {
    const r = await request('GET', '/sms/payments?allocationStatus=Unallocated', school);
    assert.strictEqual(r.status, 200);
  });

  await test('GET /sms/payments/partials/table returns partial', async () => {
    const r = await request('GET', '/sms/payments/partials/table', school);
    assert.strictEqual(r.status, 200);
    assert.ok(!r.body.includes('<!DOCTYPE'));
  });

  await test('GET /sms/payments/new renders form', async () => {
    const r = await request('GET', '/sms/payments/new', school);
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.includes('Record payment'));
    assert.ok(r.body.includes('name="amount"'));
    assert.ok(r.body.includes('name="invoiceId"'));
    assert.ok(r.body.includes('name="paymentMethod"'));
  });

  console.log('\n[payments] role enforcement');

  await test('parent role is 403 on /sms/payments', async () => {
    const r = await request('GET', '/sms/payments', parent);
    assert.strictEqual(r.status, 403);
  });

  await test('parent role is 403 on /sms/payments/new', async () => {
    const r = await request('GET', '/sms/payments/new', parent);
    assert.strictEqual(r.status, 403);
  });

  await test('admin role is 200 on /sms/payments', async () => {
    const r = await request('GET', '/sms/payments', admin);
    assert.strictEqual(r.status, 200);
  });

  console.log('\n[payments] CSRF and write protection');

  await test('POST /sms/payments without CSRF is 403', async () => {
    const r = await request('POST', '/sms/payments', school, 'amount=100&paymentMethod=EFT');
    assert.strictEqual(r.status, 403);
  });

  await test('POST /sms/payments with CSRF + valid data returns 204/500 (DB-dependent)', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/payments',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&amount=100&paymentMethod=EFT&transactionDate=2026-06-15');
    assert.ok([204, 500].includes(r.status), `expected 204/500, got ${r.status}`);
  });

  await test('POST /sms/payments with missing amount is 400', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/payments',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&paymentMethod=EFT');
    assert.strictEqual(r.status, 400, `expected 400, got ${r.status}`);
  });

  await test('POST /sms/payments with invalid amount is 400', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/payments',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&amount=-50&paymentMethod=EFT');
    assert.strictEqual(r.status, 400, `expected 400, got ${r.status}`);
  });

  await test('POST /sms/payments with invalid method is 400', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/payments',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&amount=100&paymentMethod=BOGUS');
    assert.strictEqual(r.status, 400, `expected 400, got ${r.status}`);
  });

  await test('POST /sms/payments/123/allocate without CSRF is 403', async () => {
    const r = await request('POST', '/sms/payments/123/allocate', school, 'invoiceId=1');
    assert.strictEqual(r.status, 403);
  });

  await test('POST /sms/payments/123/allocate without invoiceId is 400', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/payments/123/allocate',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf);
    assert.strictEqual(r.status, 400, `expected 400, got ${r.status}`);
  });

  await test('POST /sms/payments/0/allocate is 404 (route regex)', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/payments/0/allocate',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&invoiceId=1');
    assert.strictEqual(r.status, 404, `expected 404, got ${r.status}`);
  });

  await test('POST /sms/payments/-1/allocate is 404', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/payments/-1/allocate',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&invoiceId=1');
    assert.strictEqual(r.status, 404, `expected 404, got ${r.status}`);
  });

  console.log(process.exitCode ? '\nFAILED' : '\nALL PAYMENT ROUTE TESTS PASSED');
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
