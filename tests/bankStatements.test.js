'use strict';

// Route-layer tests for /sms/bank-statements/*.

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
  console.log('\n[bank-statements] /sms/bank-statements/* route layer');

  const school = { 'X-Test-Role': 'school', 'X-Test-School-Id': '1' };
  const parent = { 'X-Test-Role': 'parent' };
  const admin = { 'X-Test-Role': 'admin' };

  await test('GET /sms/bank-statements is 200 for school user', async () => {
    const r = await request('GET', '/sms/bank-statements', school);
    assert.strictEqual(r.status, 200);
  });

  await test('GET /sms/bank-statements shows empty state', async () => {
    const r = await request('GET', '/sms/bank-statements', school);
    assert.ok(r.body.includes('<table'));
    assert.ok(r.body.includes('Upload statement'));
  });

  await test('GET /sms/bank-statements/new renders upload form', async () => {
    const r = await request('GET', '/sms/bank-statements/new', school);
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.includes('Upload statement'));
    assert.ok(r.body.includes('name="csv"'));
    assert.ok(r.body.includes('name="fileName"'));
  });

  console.log('\n[bank-statements] role enforcement');

  await test('parent role is 403 on /sms/bank-statements', async () => {
    const r = await request('GET', '/sms/bank-statements', parent);
    assert.strictEqual(r.status, 403);
  });

  await test('parent role is 403 on /sms/bank-statements/new', async () => {
    const r = await request('GET', '/sms/bank-statements/new', parent);
    assert.strictEqual(r.status, 403);
  });

  await test('admin role is 200 on /sms/bank-statements', async () => {
    const r = await request('GET', '/sms/bank-statements', admin);
    assert.strictEqual(r.status, 200);
  });

  console.log('\n[bank-statements] CSRF and write protection');

  await test('POST /sms/bank-statements without CSRF is 403', async () => {
    const r = await request('POST', '/sms/bank-statements', school, 'csv=foo');
    assert.strictEqual(r.status, 403);
  });

  await test('POST /sms/bank-statements with empty CSV is 400', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/bank-statements',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&csv=');
    assert.strictEqual(r.status, 400, `expected 400, got ${r.status}`);
  });

  await test('POST /sms/bank-statements with valid CSV returns 204/302/500 (DB-dependent)', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const csv = 'Date,Description,Amount,Reference\n2026-06-15,Test Payment,100.00,REF1\n';
    const r = await request('POST', '/sms/bank-statements',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&csv=' + encodeURIComponent(csv) + '&fileName=test.csv');
    assert.ok([204, 302, 500].includes(r.status), `expected 204/302/500, got ${r.status}`);
  });

  await test('GET /sms/bank-statements/123 returns 200 or 404', async () => {
    const r = await request('GET', '/sms/bank-statements/123', school);
    assert.ok(r.status === 200 || r.status === 404);
  });

  await test('GET /sms/bank-statements/0 is 404', async () => {
    const r = await request('GET', '/sms/bank-statements/0', school);
    assert.strictEqual(r.status, 404);
  });

  await test('GET /sms/bank-statements/-1 is 404', async () => {
    const r = await request('GET', '/sms/bank-statements/-1', school);
    assert.strictEqual(r.status, 404);
  });

  await test('DELETE /sms/bank-statements/123 without CSRF is 403', async () => {
    const r = await request('DELETE', '/sms/bank-statements/123', school);
    assert.strictEqual(r.status, 403);
  });

  await test('DELETE /sms/bank-statements/0 is 404 (route regex)', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('DELETE', '/sms/bank-statements/0',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader });
    assert.strictEqual(r.status, 404);
  });

  await test('DELETE /sms/bank-statements/-1 is 404', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('DELETE', '/sms/bank-statements/-1',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader });
    assert.strictEqual(r.status, 404);
  });

  await test('GET /sms/bank-statements/lines/123/suggest returns 200/404 (DB-dependent)', async () => {
    const r = await request('GET', '/sms/bank-statements/lines/123/suggest', school);
    assert.ok([200, 404].includes(r.status));
  });

  await test('GET /sms/bank-statements/lines/0/suggest is 404', async () => {
    const r = await request('GET', '/sms/bank-statements/lines/0/suggest', school);
    assert.strictEqual(r.status, 404);
  });

  console.log(process.exitCode ? '\nFAILED' : '\nALL BANK STATEMENT ROUTE TESTS PASSED');
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
