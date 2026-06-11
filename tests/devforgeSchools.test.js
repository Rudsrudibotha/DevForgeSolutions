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

  console.log('\n[devforge-schools] register-school onboarding');

  await test('GET /devforge/schools/new is 200 for admin with form fields', async () => {
    const r = await request('GET', '/devforge/schools/new', admin);
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.includes('name="schoolName"'));
    assert.ok(r.body.includes('name="ownerFirstName"'));
    assert.ok(r.body.includes('name="ownerEmail"'));
    assert.ok(r.body.includes('name="_csrf"'));
  });

  await test('school role is 403 on /devforge/schools/new', async () => {
    const r = await request('GET', '/devforge/schools/new', school);
    assert.strictEqual(r.status, 403);
  });

  await test('parent role is 403 on /devforge/schools/new', async () => {
    const r = await request('GET', '/devforge/schools/new', parent);
    assert.strictEqual(r.status, 403);
  });

  await test('POST /devforge/schools without CSRF is 403', async () => {
    const r = await request('POST', '/devforge/schools', admin,
      'schoolName=Test&ownerFirstName=Jo&ownerEmail=jo@example.com');
    assert.strictEqual(r.status, 403);
  });

  await test('POST /devforge/schools as school role is 403', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/devforge/schools',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&schoolName=Test&ownerFirstName=Jo&ownerEmail=jo@example.com');
    assert.strictEqual(r.status, 403);
  });

  await test('POST /devforge/schools with CSRF + missing school name is 400', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/devforge/schools',
      { ...admin, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&ownerFirstName=Jo&ownerEmail=jo@example.com');
    assert.strictEqual(r.status, 400, `expected 400, got ${r.status}`);
    assert.ok(r.body.includes('School name is required'));
  });

  await test('POST /devforge/schools with CSRF + invalid owner email is 400', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/devforge/schools',
      { ...admin, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&schoolName=Test+School&ownerFirstName=Jo&ownerEmail=not-an-email');
    assert.strictEqual(r.status, 400, `expected 400, got ${r.status}`);
    assert.ok(r.body.includes('valid email address'));
  });

  await test('POST /devforge/schools with CSRF + valid payload is 200 or 400 (DB-dependent)', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/devforge/schools',
      { ...admin, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&schoolName=Sunshine+Daycare&ownerFirstName=Thandi&ownerLastName=Mokoena&ownerEmail=thandi@example.com');
    assert.ok([200, 400].includes(r.status), `expected 200/400, got ${r.status}`);
  });

  console.log('\n[devforge-schools] onboarding service validation (no DB)');

  const SchoolOnboardingService = require('../src/business/schoolOnboardingService');
  const onboarding = new SchoolOnboardingService();

  await test('registerSchool rejects a non-admin actor', async () => {
    await assert.rejects(
      () => onboarding.registerSchool({ actor: { role: 'school', schoolId: 1 }, school: { schoolName: 'X' }, owner: { firstName: 'A', email: 'a@b.co' } }),
      /admin role required/
    );
  });

  await test('listPendingRequests rejects a non-admin actor', async () => {
    await assert.rejects(
      () => onboarding.listPendingRequests({ actor: { role: 'parent' } }),
      /admin role required/
    );
  });

  await test('registerSchool rejects a missing school name', async () => {
    await assert.rejects(
      () => onboarding.registerSchool({ actor: { role: 'admin' }, school: {}, owner: { firstName: 'A', email: 'a@b.co' } }),
      /School name is required/
    );
  });

  await test('registerSchool rejects a missing owner first name', async () => {
    await assert.rejects(
      () => onboarding.registerSchool({ actor: { role: 'admin' }, school: { schoolName: 'X' }, owner: { email: 'a@b.co' } }),
      /Owner first name is required/
    );
  });

  await test('registerSchool rejects an invalid owner email', async () => {
    await assert.rejects(
      () => onboarding.registerSchool({ actor: { role: 'admin' }, school: { schoolName: 'X' }, owner: { firstName: 'A', email: 'nope' } }),
      /valid email address/
    );
  });

  await test('generateTempPassword satisfies the password policy', async () => {
    for (let i = 0; i < 20; i++) {
      const pwd = onboarding.generateTempPassword();
      assert.ok(pwd.length >= 8, 'too short: ' + pwd);
      assert.ok(/[A-Za-z]/.test(pwd), 'no letter: ' + pwd);
      assert.ok(/[0-9]/.test(pwd), 'no digit: ' + pwd);
    }
  });

  console.log(process.exitCode ? '\nFAILED' : '\nALL DEVFORGE SCHOOLS ROUTE TESTS PASSED');
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
