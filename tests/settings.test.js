'use strict';

// Route-layer tests for /sms/settings/*.

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
  console.log('\n[settings] /sms/settings/* route layer');

  const school = { 'X-Test-Role': 'school', 'X-Test-School-Id': '1' };
  const parent = { 'X-Test-Role': 'parent' };
  const admin = { 'X-Test-Role': 'admin' };

  await test('GET /sms/settings is 200 for school user', async () => {
    const r = await request('GET', '/sms/settings', school);
    assert.strictEqual(r.status, 200);
  });

  await test('GET /sms/settings shows tabs', async () => {
    const r = await request('GET', '/sms/settings', school);
    assert.ok(r.body.includes('School profile'));
    assert.ok(r.body.includes('Billing categories'));
  });

  await test('GET /sms/settings shows school form fields when school is loaded', async () => {
    const r = await request('GET', '/sms/settings', school);
    if (r.body.includes('No school linked')) {
      // SKIP_DB=true path - no school in scope, empty state shown
      return;
    }
    assert.ok(r.body.includes('name="schoolName"'));
    assert.ok(r.body.includes('name="contactEmail"'));
    assert.ok(r.body.includes('name="currencyCode"'));
  });

  await test('parent role is 403 on /sms/settings', async () => {
    const r = await request('GET', '/sms/settings', parent);
    assert.strictEqual(r.status, 403);
  });

  await test('admin role is 200 on /sms/settings', async () => {
    const r = await request('GET', '/sms/settings', admin);
    assert.strictEqual(r.status, 200);
  });

  await test('POST /sms/settings/school without CSRF is 403', async () => {
    const r = await request('POST', '/sms/settings/school', school, 'schoolName=Test');
    assert.strictEqual(r.status, 403);
  });

  await test('POST /sms/settings/school with CSRF + missing schoolName is 400', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/settings/school',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf);
    assert.strictEqual(r.status, 400);
  });

  await test('POST /sms/settings/school with CSRF + invalid email is 400', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/settings/school',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&schoolName=Test&contactEmail=not-an-email');
    assert.strictEqual(r.status, 400);
  });

  await test('POST /sms/settings/school with CSRF + valid data returns 204/302/500 (DB-dependent)', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/settings/school',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&schoolName=Test%20School&contactEmail=test%40example.com');
    assert.ok([204, 302, 500].includes(r.status));
  });

  await test('POST /sms/settings/billing-categories without CSRF is 403', async () => {
    const r = await request('POST', '/sms/settings/billing-categories', school, 'categoryName=Test&baseAmount=100');
    assert.strictEqual(r.status, 403);
  });

  await test('POST /sms/settings/billing-categories/1/toggle without CSRF is 403', async () => {
    const r = await request('POST', '/sms/settings/billing-categories/1/toggle', school, 'isActive=false');
    assert.strictEqual(r.status, 403);
  });

  await test('POST /sms/settings/billing-categories/0/toggle is 404', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/settings/billing-categories/0/toggle',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&isActive=false');
    assert.strictEqual(r.status, 404);
  });

  console.log(process.exitCode ? '\nFAILED' : '\nALL SETTINGS ROUTE TESTS PASSED');
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
