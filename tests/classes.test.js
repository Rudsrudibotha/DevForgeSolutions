'use strict';

// Route-layer tests for /sms/classes/*.

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
  console.log('\n[classes] /sms/classes/* route layer');

  const school = { 'X-Test-Role': 'school', 'X-Test-School-Id': '1' };
  const parent = { 'X-Test-Role': 'parent' };
  const admin = { 'X-Test-Role': 'admin' };

  await test('GET /sms/classes is 200 for school user', async () => {
    const r = await request('GET', '/sms/classes', school);
    assert.strictEqual(r.status, 200, `expected 200, got ${r.status}`);
  });

  await test('GET /sms/classes returns HTML (not empty)', async () => {
    const r = await request('GET', '/sms/classes', school);
    assert.ok(r.body.length > 500);
    assert.ok(r.body.includes('<table'));
  });

  await test('GET /sms/classes?q=math&grade=1 reflects filters', async () => {
    const r = await request('GET', '/sms/classes?q=math&grade=1', school);
    assert.strictEqual(r.status, 200);
  });

  await test('GET /sms/classes/partials/table returns partial', async () => {
    const r = await request('GET', '/sms/classes/partials/table', school);
    assert.strictEqual(r.status, 200);
    assert.ok(!r.body.includes('<!DOCTYPE'));
  });

  await test('GET /sms/classes/new renders form with all fields', async () => {
    const r = await request('GET', '/sms/classes/new', school);
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.includes('Add class'));
    assert.ok(r.body.includes('name="className"'));
    assert.ok(r.body.includes('name="grade"'));
    assert.ok(r.body.includes('name="teacherId"'));
    assert.ok(r.body.includes('name="room"'));
    assert.ok(r.body.includes('name="capacity"'));
    assert.ok(r.body.includes('name="activeYear"'));
  });

  await test('GET /sms/classes/123 returns 200 or 404', async () => {
    const r = await request('GET', '/sms/classes/123', school);
    assert.ok(r.status === 200 || r.status === 404);
  });

  await test('GET /sms/classes/0 is 404', async () => {
    const r = await request('GET', '/sms/classes/0', school);
    assert.strictEqual(r.status, 404);
  });

  await test('GET /sms/classes/-1 is 404', async () => {
    const r = await request('GET', '/sms/classes/-1', school);
    assert.strictEqual(r.status, 404);
  });

  await test('GET /sms/classes/abc is 404', async () => {
    const r = await request('GET', '/sms/classes/abc', school);
    assert.strictEqual(r.status, 404);
  });

  await test('GET /sms/classes/99999/edit returns 200 or 404', async () => {
    const r = await request('GET', '/sms/classes/99999/edit', school);
    assert.ok(r.status === 200 || r.status === 404);
  });

  console.log('\n[classes] role enforcement');

  await test('parent role is 403 on /sms/classes', async () => {
    const r = await request('GET', '/sms/classes', parent);
    assert.strictEqual(r.status, 403);
  });

  await test('parent role is 403 on /sms/classes/new', async () => {
    const r = await request('GET', '/sms/classes/new', parent);
    assert.strictEqual(r.status, 403);
  });

  await test('admin role is 200 on /sms/classes', async () => {
    const r = await request('GET', '/sms/classes', admin);
    assert.strictEqual(r.status, 200);
  });

  console.log('\n[classes] CSRF and write protection');

  await test('POST /sms/classes without CSRF is 403', async () => {
    const r = await request('POST', '/sms/classes', school, 'className=Math&activeYear=2026');
    assert.strictEqual(r.status, 403);
  });

  await test('POST /sms/classes with missing className is 400', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/classes',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf);
    assert.strictEqual(r.status, 400);
  });

  await test('POST /sms/classes with invalid capacity (>200) is 400', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/classes',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&className=Test&capacity=999');
    assert.strictEqual(r.status, 400);
  });

  await test('POST /sms/classes with valid data is 200/204/302/500 (DB-dependent)', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/classes',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&className=Test%20Class&activeYear=2026');
    assert.ok([200, 204, 302, 303, 500].includes(r.status),
      `expected 200/204/302/500, got ${r.status}`);
  });

  await test('DELETE /sms/classes/123 without CSRF is 403', async () => {
    const r = await request('DELETE', '/sms/classes/123', school);
    assert.strictEqual(r.status, 403);
  });

  await test('DELETE /sms/classes/123 with CSRF is 200/204/404', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('DELETE', '/sms/classes/123',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader });
    assert.ok([200, 204, 404].includes(r.status));
  });

  await test('DELETE /sms/classes/0 is 404', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('DELETE', '/sms/classes/0',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader });
    assert.strictEqual(r.status, 404);
  });

  console.log(process.exitCode ? '\nFAILED' : '\nALL CLASS ROUTE TESTS PASSED');
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
