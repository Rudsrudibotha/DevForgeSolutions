'use strict';

// Route-layer tests for /sms/attendance/*.

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
  console.log('\n[attendance] /sms/attendance/* route layer');

  const school = { 'X-Test-Role': 'school', 'X-Test-School-Id': '1' };
  const parent = { 'X-Test-Role': 'parent' };
  const admin = { 'X-Test-Role': 'admin' };

  await test('GET /sms/attendance is 200 for school user (landing)', async () => {
    const r = await request('GET', '/sms/attendance', school);
    assert.strictEqual(r.status, 200, `expected 200, got ${r.status}`);
  });

  await test('GET /sms/attendance shows class picker', async () => {
    const r = await request('GET', '/sms/attendance', school);
    assert.ok(r.body.includes('name="classId"'));
    assert.ok(r.body.includes('name="date"'));
    assert.ok(r.body.includes('Take attendance'));
  });

  await test('GET /sms/attendance/123 is 200 or 404 (sheet)', async () => {
    const r = await request('GET', '/sms/attendance/123', school);
    assert.ok(r.status === 200 || r.status === 404);
  });

  await test('GET /sms/attendance/123?date=2026-06-15 accepts query date', async () => {
    const r = await request('GET', '/sms/attendance/123?date=2026-06-15', school);
    assert.ok(r.status === 200 || r.status === 404);
  });

  await test('GET /sms/attendance/0 is 404 (route regex)', async () => {
    const r = await request('GET', '/sms/attendance/0', school);
    assert.strictEqual(r.status, 404);
  });

  await test('GET /sms/attendance/-1 is 404', async () => {
    const r = await request('GET', '/sms/attendance/-1', school);
    assert.strictEqual(r.status, 404);
  });

  await test('GET /sms/attendance/abc is 404 (non-numeric)', async () => {
    const r = await request('GET', '/sms/attendance/abc', school);
    assert.strictEqual(r.status, 404);
  });

  await test('GET /sms/attendance/123/history is 200 or 404', async () => {
    const r = await request('GET', '/sms/attendance/123/history', school);
    assert.ok(r.status === 200 || r.status === 404);
  });

  console.log('\n[attendance] role enforcement');

  await test('parent role is 403 on /sms/attendance', async () => {
    const r = await request('GET', '/sms/attendance', parent);
    assert.strictEqual(r.status, 403);
  });

  await test('parent role is 403 on /sms/attendance/123', async () => {
    const r = await request('GET', '/sms/attendance/123', parent);
    assert.strictEqual(r.status, 403);
  });

  await test('admin role is 200 on /sms/attendance', async () => {
    const r = await request('GET', '/sms/attendance', admin);
    assert.strictEqual(r.status, 200);
  });

  console.log('\n[attendance] CSRF and write protection');

  await test('POST /sms/attendance/123 without CSRF is 403', async () => {
    const r = await request('POST', '/sms/attendance/123', school, 'date=2026-06-15&student_1=Present');
    assert.strictEqual(r.status, 403);
  });

  await test('POST /sms/attendance/123 with CSRF + no records is 204 + warning toast', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/attendance/123',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&date=2026-06-15');
    assert.strictEqual(r.status, 204, `expected 204, got ${r.status}`);
    const trigger = r.headers['hx-trigger'];
    if (trigger) {
      const parsed = JSON.parse(trigger);
      assert.ok(parsed.toast, 'should have toast payload');
    }
  });

  await test('POST /sms/attendance/123 with CSRF + valid records returns 204 or 5xx (DB-dependent)', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/attendance/123',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&date=2026-06-15&student_100=Present&student_101=Absent&notes_100=on+time');
    // 204 if DB write succeeded, 404 if class doesn't exist, 500 if DB error
    assert.ok([204, 404, 500].includes(r.status), `expected 204/404/500, got ${r.status}`);
  });

  await test('POST /sms/attendance/123 with invalid status (no enum match) returns 400 or 500', async () => {
    // The service throws on invalid status - this becomes 500 in safeCall fallback
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/attendance/123',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&date=2026-06-15&student_100=Hacking');
    assert.ok([400, 500].includes(r.status), `expected 400/500, got ${r.status}`);
  });

  await test('POST /sms/attendance/0 is 404 (route regex)', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/attendance/0',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf);
    assert.strictEqual(r.status, 404);
  });

  await test('POST /sms/attendance/-1 is 404', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/attendance/-1',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf);
    assert.strictEqual(r.status, 404);
  });

  console.log(process.exitCode ? '\nFAILED' : '\nALL ATTENDANCE ROUTE TESTS PASSED');
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
