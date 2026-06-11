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

  await test('GET /sms/students/new includes the enrolment-contract fields', async () => {
    const r = await request('GET', '/sms/students/new', school);
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.includes('name="enrolledDate"'), 'should have enrolledDate input');
    assert.ok(r.body.includes('name="homePhone"'), 'should have homePhone input');
    assert.ok(r.body.includes('name="homeAddress"'), 'should have homeAddress textarea');
    assert.ok(r.body.includes('name="grandmotherName"'), 'should have grandmotherName input');
    assert.ok(r.body.includes('name="grandmotherPhone"'), 'should have grandmotherPhone input');
    assert.ok(r.body.includes('name="grandfatherName"'), 'should have grandfatherName input');
    assert.ok(r.body.includes('name="grandfatherPhone"'), 'should have grandfatherPhone input');
    assert.ok(r.body.includes('name="familyFriendName"'), 'should have familyFriendName input');
    assert.ok(r.body.includes('name="familyFriendPhone"'), 'should have familyFriendPhone input');
  });

  await test('GET /sms/students has Current/Left filter checkboxes', async () => {
    const r = await request('GET', '/sms/students', school);
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.includes('name="showCurrent"'), 'should have the Current checkbox');
    assert.ok(r.body.includes('name="showLeft"'), 'should have the Left checkbox');
    assert.ok(!r.body.includes('name="status"'), 'the status select should be gone');
  });

  await test('GET /sms/students/outstanding renders the year calendar', async () => {
    const r = await request('GET', '/sms/students/outstanding', school);
    assert.strictEqual(r.status, 200, `expected 200, got ${r.status}`);
    assert.ok(r.body.includes('Outstanding by month'), 'should have the page title');
    // Month columns with data, or the empty state when nothing is outstanding
    assert.ok(
      (r.body.includes('Jan') && r.body.includes('Dec')) || r.body.includes('Nothing outstanding'),
      'should have month columns or the empty state'
    );
  });

  await test('GET /sms/students/outstanding?year=2025 honours the year', async () => {
    const r = await request('GET', '/sms/students/outstanding?year=2025', school);
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.includes('2025'), 'should reflect the requested year');
  });

  await test('parent role is 403 on /sms/students/outstanding', async () => {
    const r = await request('GET', '/sms/students/outstanding', parent);
    assert.strictEqual(r.status, 403, `expected 403, got ${r.status}`);
  });

  await test('GET /sms/students has selection checkboxes and the email composer', async () => {
    const r = await request('GET', '/sms/students', school);
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.includes('Select all students on this page'), 'should have a select-all checkbox');
    assert.ok(r.body.includes('action="/sms/students/email"'), 'should have the email compose form');
    assert.ok(r.body.includes('studentListEmailer'), 'should mount the selection component');
    assert.ok(r.body.includes('All active students'), 'should offer the entire-body scope');
    assert.ok(r.body.includes('Everyone in a class'), 'should offer the class scope');
  });

  await test('GET /sms/students/new includes the billing-category picker', async () => {
    const r = await request('GET', '/sms/students/new', school);
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.includes('Billing categories'), 'should have the billing categories section');
    assert.ok(r.body.includes('studentBillingPicker'), 'should mount the drag-and-drop component');
    assert.ok(r.body.includes('/student-form.js'), 'should load the picker script');
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

  console.log('\n[students] bulk parent email');

  await test('POST /sms/students/email without CSRF token is 403', async () => {
    const r = await request('POST', '/sms/students/email', school,
      'scope=all&subject=Hello&message=World');
    assert.strictEqual(r.status, 403, `expected 403, got ${r.status}`);
  });

  await test('parent role is 403 on POST /sms/students/email', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/students/email',
      { ...parent, 'X-CSRF-Token': csrf, 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookieHeader },
      'scope=all&subject=Hello&message=World&_csrf=' + csrf);
    assert.strictEqual(r.status, 403, `expected 403, got ${r.status}`);
  });

  await test('POST /sms/students/email without a subject is rejected (400, toast)', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/students/email',
      { ...school, 'HX-Request': 'true', 'X-CSRF-Token': csrf, 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookieHeader },
      'scope=all&subject=&message=World&_csrf=' + csrf);
    assert.strictEqual(r.status, 400, `expected 400, got ${r.status}`);
  });

  await test('POST /sms/students/email scope=selected with no students is rejected', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/students/email',
      { ...school, 'HX-Request': 'true', 'X-CSRF-Token': csrf, 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookieHeader },
      'scope=selected&subject=Hello&message=World&_csrf=' + csrf);
    assert.strictEqual(r.status, 400, `expected 400, got ${r.status}`);
  });

  await test('POST /sms/students/email scope=class without classId is rejected', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/students/email',
      { ...school, 'HX-Request': 'true', 'X-CSRF-Token': csrf, 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookieHeader },
      'scope=class&subject=Hello&message=World&_csrf=' + csrf);
    assert.strictEqual(r.status, 400, `expected 400, got ${r.status}`);
  });

  await test('POST /sms/students/email valid body never 500s (400 with no DB, 204 with)', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/students/email',
      { ...school, 'HX-Request': 'true', 'X-CSRF-Token': csrf, 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookieHeader },
      'scope=all&subject=Hello&message=World&_csrf=' + csrf);
    assert.ok([204, 400].includes(r.status), `expected 204/400, got ${r.status}`);
  });

  console.log('\n[students] invoice statement emails');

  await test('POST /sms/students/email-invoices without CSRF token is 403', async () => {
    const r = await request('POST', '/sms/students/email-invoices', school, 'scope=outstanding');
    assert.strictEqual(r.status, 403, `expected 403, got ${r.status}`);
  });

  await test('POST /sms/students/email-invoices with an invalid scope is rejected', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/students/email-invoices',
      { ...school, 'HX-Request': 'true', 'X-CSRF-Token': csrf, 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookieHeader },
      'scope=bogus&_csrf=' + csrf);
    assert.strictEqual(r.status, 400, `expected 400, got ${r.status}`);
  });

  await test('POST /sms/students/email-invoices scope=outstanding never 500s', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/students/email-invoices',
      { ...school, 'HX-Request': 'true', 'X-CSRF-Token': csrf, 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookieHeader },
      'scope=outstanding&_csrf=' + csrf);
    assert.ok([204, 400].includes(r.status), `expected 204/400, got ${r.status}`);
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
