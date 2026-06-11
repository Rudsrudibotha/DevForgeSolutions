'use strict';

// Dual-role identity (staff who are also parents) + session/cookie
// security. The account role no longer locks a person out of the other
// portal: parent access is granted by ParentLinks, staff access by the
// active Employees link, and the login shell picks the session role.

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

const UserService = require('../src/business/userService');
const RegistrationService = require('../src/business/registrationService');

async function run() {
  console.log('\n[dual-role] one email, staff AND parent');

  await test('asParentDashboardUser overlays a parent session without touching the account', async () => {
    const svc = new UserService();
    const staff = { UserID: 7, Email: 'teacher@school.co.za', Role: 'school', SchoolID: 3 };
    const session = svc.asParentDashboardUser(staff);
    assert.strictEqual(session.Role, 'parent');
    assert.strictEqual(session.OriginalRole, 'school');
    assert.strictEqual(session.SchoolID, null);
    assert.strictEqual(staff.Role, 'school'); // original untouched
  });

  await test('parent registration ACCEPTS an existing school-staff email', async () => {
    const svc = new RegistrationService({
      userRepository: {
        getUserByEmail: async () => ({ UserID: 7, Email: 'teacher@school.co.za', Role: 'school', IsActive: true })
      }
    });
    const user = await svc.findOrCreateParentUser('teacher@school.co.za');
    assert.strictEqual(user.UserID, 7);
    assert.strictEqual(user.Role, 'school'); // account role unchanged; ParentLinks grant access
  });

  await test('parent registration REJECTS an admin email with guidance', async () => {
    const svc = new RegistrationService({
      userRepository: {
        getUserByEmail: async () => ({ UserID: 1, Email: 'ops@devforge.co.za', Role: 'admin', IsActive: true })
      }
    });
    await assert.rejects(
      () => svc.findOrCreateParentUser('ops@devforge.co.za'),
      /personal email address/
    );
  });

  await test('parent registration still rejects inactive accounts', async () => {
    const svc = new RegistrationService({
      userRepository: {
        getUserByEmail: async () => ({ UserID: 7, Role: 'school', IsActive: false })
      }
    });
    await assert.rejects(() => svc.findOrCreateParentUser('x@y.co.za'), /inactive/);
  });

  await test('findOrCreateParentUserByEmail allows staff emails and rejects admin emails', async () => {
    const svc = new UserService();
    svc.userRepository = {
      getUserByEmail: async (email) => email.startsWith('admin')
        ? { UserID: 1, Role: 'admin', IsActive: true }
        : { UserID: 7, Role: 'school', IsActive: true }
    };
    const staff = await svc.findOrCreateParentUserByEmail('teacher@school.co.za');
    assert.strictEqual(staff.UserID, 7);
    await assert.rejects(() => svc.findOrCreateParentUserByEmail('admin@devforge.co.za'), /personal email address/);
  });

  console.log('\n[dual-role] session security (logout + cookies)');

  await test('POST /auth/logout without CSRF is rejected', async () => {
    const r = await request('POST', '/auth/logout', { 'X-Test-Role': 'school' });
    assert.strictEqual(r.status, 403);
  });

  await test('POST /auth/logout clears the auth cookie and redirects to /login', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/auth/logout',
      { 'X-Test-Role': 'school', 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf);
    assert.strictEqual(r.status, 302, `expected 302, got ${r.status}`);
    assert.strictEqual(r.headers.location, '/login');
    const cleared = (r.headers['set-cookie'] || []).find(c => c.startsWith('kch_token='));
    assert.ok(cleared, 'kch_token Set-Cookie present');
    assert.match(cleared, /Expires=Thu, 01 Jan 1970/i, 'kch_token expired');
  });

  await test('CSRF cookie is SameSite=Lax', async () => {
    const r = await request('GET', '/login', {});
    const csrfCookie = (r.headers['set-cookie'] || []).find(c => c.startsWith('kch_csrf='));
    assert.ok(csrfCookie, 'csrf cookie issued');
    assert.match(csrfCookie, /SameSite=Lax/i);
  });

  console.log(process.exitCode ? '\nFAILED' : '\nALL DUAL-ROLE TESTS PASSED');
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
