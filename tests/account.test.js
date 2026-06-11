'use strict';

// Route-layer tests for /account (self-service account settings).
//   1. Page renders for all three roles (it is linked from every header)
//   2. Profile and password forms are present
//   3. CSRF enforced on both POST endpoints
//   4. Validation errors are user-facing, not 500s
//
// Run: node tests/account.test.js

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
  console.log('\n[account] /account route layer');

  const school = { 'X-Test-Role': 'school', 'X-Test-School-Id': '1' };
  const parent = { 'X-Test-Role': 'parent' };
  const admin = { 'X-Test-Role': 'admin' };

  for (const [label, headers] of [['school', school], ['parent', parent], ['admin', admin]]) {
    await test(`GET /account is 200 for ${label} user`, async () => {
      const r = await request('GET', '/account', headers);
      assert.strictEqual(r.status, 200, `expected 200, got ${r.status}`);
      assert.ok(r.body.includes('Account settings'), 'should have the page title');
      assert.ok(r.body.includes('action="/account/profile"'), 'should have the profile form');
      assert.ok(r.body.includes('action="/account/password"'), 'should have the password form');
    });
  }

  console.log('\n[account] CSRF and write protection');

  async function getCsrf() {
    const a = await request('GET', '/login', {});
    const cookies = a.headers['set-cookie'] || [];
    const csrfCookie = cookies.map(c => c.split(';')[0]).find(c => c.startsWith('kch_csrf='));
    const csrf = csrfCookie ? csrfCookie.split('=')[1] : '';
    return { csrf, cookieHeader: csrfCookie || '' };
  }

  await test('POST /account/profile without CSRF token is 403', async () => {
    const r = await request('POST', '/account/profile', school, 'firstName=Test');
    assert.strictEqual(r.status, 403, `expected 403, got ${r.status}`);
  });

  await test('POST /account/password without CSRF token is 403', async () => {
    const r = await request('POST', '/account/password', school,
      'currentPassword=a&newPassword=12345678&confirmPassword=12345678');
    assert.strictEqual(r.status, 403, `expected 403, got ${r.status}`);
  });

  await test('POST /account/profile with empty first name is rejected (not 500)', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/account/profile',
      { ...school, 'X-CSRF-Token': csrf, 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookieHeader },
      'firstName=&lastName=User&_csrf=' + csrf);
    assert.ok([302, 400].includes(r.status), `expected 302/400, got ${r.status}`);
  });

  await test('POST /account/password with mismatched confirmation is rejected (not 500)', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/account/password',
      { ...school, 'X-CSRF-Token': csrf, 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookieHeader },
      'currentPassword=a&newPassword=12345678&confirmPassword=87654321&_csrf=' + csrf);
    assert.ok([302, 400].includes(r.status), `expected 302/400, got ${r.status}`);
  });

  await test('POST /account/password with short new password is rejected (not 500)', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/account/password',
      { ...school, 'X-CSRF-Token': csrf, 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookieHeader },
      'currentPassword=a&newPassword=short&confirmPassword=short&_csrf=' + csrf);
    assert.ok([302, 400].includes(r.status), `expected 302/400, got ${r.status}`);
  });

  if (process.exitCode) {
    console.error('\n[account] FAILURES');
  } else {
    console.log('\nOK all account tests passed');
    console.log('ALL ACCOUNT TESTS PASSED');
  }
}

if (require.main === module) {
  run();
}

module.exports = run;
