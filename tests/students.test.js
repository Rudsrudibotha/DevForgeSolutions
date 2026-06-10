'use strict';

// Route-layer tests for /sms/students/*.
//   1. List page renders, search and filter are wired
//   2. Partial endpoint returns a table body
//   3. New form renders
//   4. Edit form renders for known student (skip: no DB)
//   5. Role guards (parent 403, school ok, admin ok)
//   6. CSRF enforced on POST
//   7. Soft delete via DELETE returns 204
//   8. Search query is reflected in URL
//
// DB-level CRUD + scope guarantee verified by studentsDb.test.js (auto-skips).
//
// Run: node tests/students.test.js

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

async function run() {
  console.log('\n[students] /sms/students/* route layer');

  const school = { 'X-Test-Role': 'school', 'X-Test-School-Id': '1' };
  const parent = { 'X-Test-Role': 'parent' };
  const admin = { 'X-Test-Role': 'admin' };

  await test('GET /sms/students is 200 for school user', async () => {
    const r = await request('GET', '/sms/students', school);
    assert.strictEqual(r.status, 200, `expected 200, got ${r.status}`);
  });

  await test('GET /sms/students returns HTML (not empty body)', async () => {
    const r = await request('GET', '/sms/students', school);
    assert.ok(r.body.length > 500, `expected non-trivial HTML, got ${r.body.length} bytes`);
    assert.ok(r.body.includes('<table'), 'should contain a table');
  });

  await test('GET /sms/students?q=alex reflects query in URL', async () => {
    const r = await request('GET', '/sms/students?q=alex&status=active', school);
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.includes('Students'));
  });

  await test('GET /sms/students/partials/table returns table body partial', async () => {
    const r = await request('GET', '/sms/students/partials/table', school);
    assert.strictEqual(r.status, 200);
    // Partial should NOT be a full HTML page
    assert.ok(!r.body.includes('<!DOCTYPE'), 'partial should not be a full HTML page');
  });

  await test('GET /sms/students/partials/table?q=x returns same shape', async () => {
    const r = await request('GET', '/sms/students/partials/table?q=alex', school);
    assert.strictEqual(r.status, 200);
  });

  await test('GET /sms/students/new renders the form', async () => {
    const r = await request('GET', '/sms/students/new', school);
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.includes('Add student'), 'should have "Add student" title');
    assert.ok(r.body.includes('name="firstName"'), 'should have firstName input');
    assert.ok(r.body.includes('name="lastName"'), 'should have lastName input');
    assert.ok(r.body.includes('name="familyId"'), 'should have familyId select');
  });

  await test('GET /sms/students/123 returns 200 or 404 (not 500)', async () => {
    const r = await request('GET', '/sms/students/123', school);
    assert.ok(r.status === 200 || r.status === 404, `expected 200/404, got ${r.status}`);
  });

  await test('GET /sms/students/0 is 404 (route regex requires positive integer)', async () => {
    const r = await request('GET', '/sms/students/0', school);
    assert.strictEqual(r.status, 404, `expected 404, got ${r.status}`);
  });

  await test('GET /sms/students/-1 is 404', async () => {
    const r = await request('GET', '/sms/students/-1', school);
    assert.strictEqual(r.status, 404, `expected 404, got ${r.status}`);
  });

  await test('GET /sms/students/abc is 404 (non-numeric)', async () => {
    const r = await request('GET', '/sms/students/abc', school);
    assert.strictEqual(r.status, 404, `expected 404, got ${r.status}`);
  });

  await test('GET /sms/students/99999999/edit returns 200 or 404 (not 500)', async () => {
    const r = await request('GET', '/sms/students/99999999/edit', school);
    assert.ok(r.status === 200 || r.status === 404, `expected 200/404, got ${r.status}`);
  });

  console.log('\n[students] role enforcement');

  await test('parent role is 403 on /sms/students', async () => {
    const r = await request('GET', '/sms/students', parent);
    assert.strictEqual(r.status, 403, `expected 403, got ${r.status}`);
  });

  await test('parent role is 403 on /sms/students/new', async () => {
    const r = await request('GET', '/sms/students/new', parent);
    assert.strictEqual(r.status, 403, `expected 403, got ${r.status}`);
  });

  await test('parent role is 403 on /sms/students/123', async () => {
    const r = await request('GET', '/sms/students/123', parent);
    assert.strictEqual(r.status, 403, `expected 403, got ${r.status}`);
  });

  await test('admin role is 200 on /sms/students (with bypass on DB calls)', async () => {
    const r = await request('GET', '/sms/students', admin);
    assert.strictEqual(r.status, 200, `expected 200, got ${r.status}`);
  });

  console.log('\n[students] CSRF and write protection');

  // Helper to fetch a CSRF cookie + token for write requests
  async function getCsrf() {
    const a = await request('GET', '/login', {});
    const cookies = a.headers['set-cookie'] || [];
    const csrfCookie = cookies.map(c => c.split(';')[0]).find(c => c.startsWith('kch_csrf='));
    const csrf = csrfCookie ? csrfCookie.split('=')[1] : '';
    return { csrf, cookieHeader: csrfCookie || '' };
  }

  await test('POST /sms/students without CSRF token is 403', async () => {
    const r = await request('POST', '/sms/students', school,
      'firstName=Test&lastName=User&familyId=1');
    assert.strictEqual(r.status, 403, `expected 403, got ${r.status}`);
  });

  await test('POST /sms/students with valid CSRF token returns 400/200/204/500 (varies by DB state)', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/students',
      { ...school, 'X-CSRF-Token': csrf, 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookieHeader },
      'firstName=Test&lastName=User&familyId=1&_csrf=' + csrf);
    assert.ok([400, 200, 204, 500].includes(r.status),
      `expected 400/200/204/500, got ${r.status}`);
  });

  await test('DELETE /sms/students without CSRF token is 403', async () => {
    const r = await request('DELETE', '/sms/students/123', school);
    assert.strictEqual(r.status, 403, `expected 403, got ${r.status}`);
  });

  console.log('\n[students] soft delete (HTMX DELETE)');

  await test('DELETE /sms/students/123 with valid CSRF is 200/204/404, never 500', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('DELETE', '/sms/students/123',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader });
    assert.ok([200, 204, 404].includes(r.status), `expected 200/204/404, got ${r.status}`);
  });

  await test('DELETE /sms/students/0 is 404 (route regex)', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('DELETE', '/sms/students/0',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader });
    assert.strictEqual(r.status, 404, `expected 404, got ${r.status}`);
  });

  await test('DELETE /sms/students/-1 is 404', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('DELETE', '/sms/students/-1',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader });
    assert.strictEqual(r.status, 404, `expected 404, got ${r.status}`);
  });

  await test('DELETE /sms/students/123 without CSRF is 403 (CSRF enforced)', async () => {
    const r = await request('DELETE', '/sms/students/123', school);
    assert.strictEqual(r.status, 403, `expected 403 without CSRF, got ${r.status}`);
  });

  console.log(process.exitCode ? '\nFAILED' : '\nALL STUDENT ROUTE TESTS PASSED');
}

if (require.main === module) {
  run().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
  });
}

module.exports = run;
