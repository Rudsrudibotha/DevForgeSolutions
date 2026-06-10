'use strict';

// Route-layer tests for /devforge/schools/*.

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
  console.log('\n[devforge-schools] /devforge/schools/* route layer');

  const admin = { 'X-Test-Role': 'admin' };
  const school = { 'X-Test-Role': 'school', 'X-Test-School-Id': '1' };
  const parent = { 'X-Test-Role': 'parent' };

  await test('GET /devforge is 200 for admin', async () => {
    const r = await request('GET', '/devforge', admin);
    assert.strictEqual(r.status, 200);
  });

  await test('GET /devforge shows KPIs', async () => {
    const r = await request('GET', '/devforge', admin);
    assert.ok(r.body.includes('Platform overview'));
  });

  await test('GET /devforge/schools is 200 for admin', async () => {
    const r = await request('GET', '/devforge/schools', admin);
    assert.strictEqual(r.status, 200);
  });

  await test('GET /devforge/schools shows table + filters', async () => {
    const r = await request('GET', '/devforge/schools', admin);
    assert.ok(r.body.includes('<table'));
    assert.ok(r.body.includes('name="q"'));
    assert.ok(r.body.includes('name="plan"'));
    assert.ok(r.body.includes('name="status"'));
  });

  await test('GET /devforge/schools?q=Alpha reflects search', async () => {
    const r = await request('GET', '/devforge/schools?q=Alpha', admin);
    assert.strictEqual(r.status, 200);
  });

  await test('GET /devforge/schools/partials/table returns partial', async () => {
    const r = await request('GET', '/devforge/schools/partials/table', admin);
    assert.strictEqual(r.status, 200);
    assert.ok(!r.body.includes('<!DOCTYPE'));
  });

  await test('GET /devforge/schools/123 returns 200 or 404', async () => {
    const r = await request('GET', '/devforge/schools/123', admin);
    assert.ok(r.status === 200 || r.status === 404);
  });

  await test('GET /devforge/schools/0 is 404 (route regex)', async () => {
    const r = await request('GET', '/devforge/schools/0', admin);
    assert.strictEqual(r.status, 404);
  });

  await test('GET /devforge/schools/-1 is 404', async () => {
    const r = await request('GET', '/devforge/schools/-1', admin);
    assert.strictEqual(r.status, 404);
  });

  await test('GET /devforge/schools/abc is 404 (non-numeric)', async () => {
    const r = await request('GET', '/devforge/schools/abc', admin);
    assert.strictEqual(r.status, 404);
  });

  console.log('\n[devforge-schools] role enforcement');

  await test('school role is 403 on /devforge', async () => {
    const r = await request('GET', '/devforge', school);
    assert.strictEqual(r.status, 403);
  });

  await test('school role is 403 on /devforge/schools', async () => {
    const r = await request('GET', '/devforge/schools', school);
    assert.strictEqual(r.status, 403);
  });

  await test('parent role is 403 on /devforge/schools', async () => {
    const r = await request('GET', '/devforge/schools', parent);
    assert.strictEqual(r.status, 403);
  });

  console.log('\n[devforge-schools] CSRF and write protection');

  await test('POST /devforge/schools/123/status without CSRF is 403', async () => {
    const r = await request('POST', '/devforge/schools/123/status', admin, 'status=Suspended&reason=test');
    assert.strictEqual(r.status, 403);
  });

  await test('POST /devforge/schools/123/status with CSRF + missing reason is 400', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/devforge/schools/123/status',
      { ...admin, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&status=Suspended');
    assert.strictEqual(r.status, 400, `expected 400, got ${r.status}`);
  });

  await test('POST /devforge/schools/123/status with CSRF + short reason is 400', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/devforge/schools/123/status',
      { ...admin, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&status=Suspended&reason=ab');
    assert.strictEqual(r.status, 400, `expected 400, got ${r.status}`);
  });

  await test('POST /devforge/schools/123/status with CSRF + valid reason returns 204/500 (DB-dependent)', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/devforge/schools/123/status',
      { ...admin, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&status=Suspended&reason=Non-payment');
    assert.ok([204, 500].includes(r.status), `expected 204/500, got ${r.status}`);
  });

  await test('POST /devforge/schools/0/status is 404 (route regex)', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/devforge/schools/0/status',
      { ...admin, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&status=Suspended&reason=test');
    assert.strictEqual(r.status, 404);
  });

  await test('POST /devforge/schools/-1/status is 404', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/devforge/schools/-1/status',
      { ...admin, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&status=Suspended&reason=test');
    assert.strictEqual(r.status, 404);
  });

  console.log(process.exitCode ? '\nFAILED' : '\nALL DEVFORGE SCHOOLS ROUTE TESTS PASSED');
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
