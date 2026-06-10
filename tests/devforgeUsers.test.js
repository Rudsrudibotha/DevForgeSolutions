'use strict';

// Route-layer tests for /devforge/users/*.

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
  console.log('\n[devforge-users] /devforge/users/* route layer');

  const admin = { 'X-Test-Role': 'admin' };
  const school = { 'X-Test-Role': 'school', 'X-Test-School-Id': '1' };
  const parent = { 'X-Test-Role': 'parent' };

  await test('GET /devforge/users is 200 for admin', async () => {
    const r = await request('GET', '/devforge/users', admin);
    assert.strictEqual(r.status, 200);
  });

  await test('GET /devforge/users shows table + filters', async () => {
    const r = await request('GET', '/devforge/users', admin);
    assert.ok(r.body.includes('<table'));
    assert.ok(r.body.includes('name="q"'));
    assert.ok(r.body.includes('name="role"'));
    assert.ok(r.body.includes('name="schoolId"'));
    assert.ok(r.body.includes('name="status"'));
  });

  await test('GET /devforge/users?q=admin refleja filter', async () => {
    const r = await request('GET', '/devforge/users?q=admin', admin);
    assert.strictEqual(r.status, 200);
  });

  await test('GET /devforge/users/partials/table returns partial', async () => {
    const r = await request('GET', '/devforge/users/partials/table', admin);
    assert.strictEqual(r.status, 200);
    assert.ok(!r.body.includes('<!DOCTYPE'));
  });

  await test('GET /devforge/users/123 returns 200 or 404', async () => {
    const r = await request('GET', '/devforge/users/123', admin);
    assert.ok(r.status === 200 || r.status === 404);
  });

  await test('GET /devforge/users/0 is 404 (route regex)', async () => {
    const r = await request('GET', '/devforge/users/0', admin);
    assert.strictEqual(r.status, 404);
  });

  await test('GET /devforge/users/-1 is 404', async () => {
    const r = await request('GET', '/devforge/users/-1', admin);
    assert.strictEqual(r.status, 404);
  });

  await test('GET /devforge/users/abc is 404 (non-numeric)', async () => {
    const r = await request('GET', '/devforge/users/abc', admin);
    assert.strictEqual(r.status, 404);
  });

  console.log('\n[devforge-users] role enforcement');

  await test('school role is 403 on /devforge/users', async () => {
    const r = await request('GET', '/devforge/users', school);
    assert.strictEqual(r.status, 403);
  });

  await test('parent role is 403 on /devforge/users', async () => {
    const r = await request('GET', '/devforge/users', parent);
    assert.strictEqual(r.status, 403);
  });

  await test('school role is 403 on /devforge/users/123', async () => {
    const r = await request('GET', '/devforge/users/123', school);
    assert.strictEqual(r.status, 403);
  });

  console.log('\n[devforge-users] CSRF and write protection');

  await test('POST /devforge/users/123/active without CSRF is 403', async () => {
    const r = await request('POST', '/devforge/users/123/active', admin, 'isActive=false&reason=test');
    assert.strictEqual(r.status, 403);
  });

  await test('POST /devforge/users/123/active with CSRF + missing reason is 400', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/devforge/users/123/active',
      { ...admin, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&isActive=false');
    assert.strictEqual(r.status, 400, `expected 400, got ${r.status}`);
  });

  await test('POST /devforge/users/123/active with CSRF + short reason is 400', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/devforge/users/123/active',
      { ...admin, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&isActive=false&reason=ab');
    assert.strictEqual(r.status, 400);
  });

  await test('POST /devforge/users/123/active with CSRF + valid reason returns 204/404/500 (DB-dependent)', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/devforge/users/123/active',
      { ...admin, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&isActive=false&reason=Test+disable');
    assert.ok([204, 404, 500].includes(r.status), `expected 204/404/500, got ${r.status}`);
  });

  await test('POST /devforge/users/0/active is 404 (route regex)', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/devforge/users/0/active',
      { ...admin, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&isActive=false&reason=valid+reason');
    assert.strictEqual(r.status, 404);
  });

  await test('POST /devforge/users/-1/active is 404', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/devforge/users/-1/active',
      { ...admin, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&isActive=false&reason=valid+reason');
    assert.strictEqual(r.status, 404);
  });

  console.log(process.exitCode ? '\nFAILED' : '\nALL DEVFORGE USERS ROUTE TESTS PASSED');
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
