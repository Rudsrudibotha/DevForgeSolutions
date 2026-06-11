'use strict';

// Tenancy boundary tests. These run against a live server with the
// DISABLE_AUTH flag set. Each test acts as a different role and asserts
// that the cross-tenant requests are correctly rejected.
//
// Run: node tests/tenancy.test.js
// Requires: the server running on PORT 3001 with DISABLE_AUTH=true,
//           JWT_SECRET set, SKIP_DB=true, and TEST_USER_ROLE/SCHOOL_ID
//           env vars set per test phase.

const http = require('http');

const PORT = process.env.TEST_PORT || 3001;
const HOST = process.env.TEST_HOST || 'localhost';

function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: HOST, port: PORT, path, method: 'GET', headers }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });
}

function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    console.error(`  FAIL: ${msg} (expected ${expected}, got ${actual})`);
    process.exitCode = 1;
  } else {
    console.log(`  PASS: ${msg}`);
  }
}

async function run() {
  console.log('\n[1] Role enforcement on portal landing pages');

  // Parent role
  const parent = { 'X-Test-Role': 'parent' };
  let r = await get('/parent', parent);        assertEq(r.status, 200, 'parent can access /parent');
  r = await get('/sms', parent);               assertEq(r.status, 403, 'parent cannot access /sms');
  r = await get('/devforge', parent);          assertEq(r.status, 403, 'parent cannot access /devforge');
  r = await get('/sms/students', parent);      assertEq(r.status, 403, 'parent cannot access /sms/students');
  r = await get('/devforge/schools', parent);  assertEq(r.status, 403, 'parent cannot access /devforge/schools');

  // School role
  const school = { 'X-Test-Role': 'school', 'X-Test-School-Id': '1' };
  r = await get('/sms', school);               assertEq(r.status, 200, 'school can access /sms');
  r = await get('/sms/students', school);      assertEq(r.status, 200, 'school can access /sms/students');
  r = await get('/devforge', school);          assertEq(r.status, 403, 'school cannot access /devforge');
  r = await get('/parent', school);            assertEq(r.status, 403, 'school cannot access /parent');

  // Admin role
  const admin = { 'X-Test-Role': 'admin' };
  r = await get('/devforge', admin);           assertEq(r.status, 200, 'admin can access /devforge');
  r = await get('/devforge/schools', admin);   assertEq(r.status, 200, 'admin can access /devforge/schools');
  r = await get('/sms', admin);                assertEq(r.status, 200, 'admin can access /sms (override)');
  r = await get('/parent', admin);             assertEq(r.status, 403, 'admin cannot access /parent');

  console.log('\n[2] Public pages render without auth');
  r = await get('/');                          assertEq(r.status, 200, 'home renders');
  r = await get('/login');                     assertEq(r.status, 200, 'login renders');
  r = await get('/login?portal=parent');       assertEq(r.status, 200, 'login renders with portal');

  console.log('\n[3] Security headers');
  r = await get('/');
  const csp = r.headers['content-security-policy'] || '';
  assertEq(csp.includes("frame-ancestors 'none'"), true, 'CSP sets frame-ancestors none');
  assertEq(csp.includes("object-src 'none'"), true, 'CSP sets object-src none');
  assertEq(r.headers['x-content-type-options'], 'nosniff', 'X-Content-Type-Options set');
  assertEq(r.headers['referrer-policy'], 'no-referrer', 'Referrer-Policy no-referrer');
  assertEq(r.headers['x-powered-by'], undefined, 'X-Powered-By is hidden');
  assertEq(String(r.headers['permissions-policy'] || '').includes('camera=()'), true, 'Permissions-Policy locks down camera');
  assertEq(String(r.headers['strict-transport-security'] || '').includes('max-age'), true, 'HSTS is set');

  console.log('\n[4] API health');
  r = await get('/api/config');
  assertEq(r.status, 200, '/api/config returns 200');

  console.log('\nTenancy test summary:');
  console.log(process.exitCode ? '  FAILED' : '  ALL CHECKS PASSED');
}

module.exports = run;

if (require.main === module) {
  run().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
  });
}
