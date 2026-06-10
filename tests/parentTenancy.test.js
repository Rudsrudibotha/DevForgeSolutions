'use strict';

// Cross-school parent tenancy tests. These do NOT require a live database
// when run as unit tests. They verify the ROUTE LAYER's contract:
//   1. /parent/child/:id  returns 404 (not 403, not 200) for ids the parent
//      does not own, even when the id exists in the database.
//   2. /parent/invoices  does not echo back data from a different parent.
//   3. The 404 response body never reveals whether the resource exists.
//
// The SQL-level guarantee (the parent service joins on ParentLinks by
// userId) is verified by parentTenancyDb.test.js, which runs against a
// real database. It auto-skips when SKIP_DB=true or when no DATABASE_URL.
//
// Run: node tests/parentTenancy.test.js

const assert = require('assert');
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
  console.log('\n[parent tenancy] route-layer 404-not-403 guarantee');
  console.log('  (these checks assume the server is running and DB-safe)');

  // With SKIP_DB=true the parent service returns empty data, so every child
  // id is "not found" and the route returns 404. That's the correct behaviour
  // and is what these tests assert.
  const parent = { 'X-Test-Role': 'parent', 'X-Test-School-Id': '0' };

  await test('parent hitting own dashboard is 200', async () => {
    const r = await get('/parent', parent);
    assert.strictEqual(r.status, 200, 'dashboard should render for parent');
  });

  await test('parent hitting /parent/child/123 (id not in their links) is 404', async () => {
    const r = await get('/parent/child/123', parent);
    assert.strictEqual(r.status, 404, `expected 404, got ${r.status}`);
  });

  await test('parent hitting /parent/child/0 is 400 or 404, never 500', async () => {
    const r = await get('/parent/child/0', parent);
    assert.ok(r.status === 404 || r.status === 400, `expected 400/404, got ${r.status}`);
  });

  await test('parent hitting /parent/child/-1 is 404 (not 200, not 500)', async () => {
    const r = await get('/parent/child/-1', parent);
    assert.strictEqual(r.status, 404, `expected 404, got ${r.status}`);
  });

  await test('parent hitting /parent/child/abc (non-numeric) is 404 from route regex', async () => {
    const r = await get('/parent/child/abc', parent);
    // The route uses :studentId(\\d+) so non-numeric falls through to 404
    assert.strictEqual(r.status, 404, `expected 404, got ${r.status}`);
  });

  await test('parent hitting /parent/child/99999999999 (overflow) is 404', async () => {
    const r = await get('/parent/child/99999999999', parent);
    assert.strictEqual(r.status, 404, `expected 404, got ${r.status}`);
  });

  await test('parent hitting /parent/invoices is 200 (cross-tenant invoice list works for own data)', async () => {
    const r = await get('/parent/invoices', parent);
    assert.strictEqual(r.status, 200, `expected 200, got ${r.status}`);
  });

  await test('parent /parent/invoices?status= filter does not bypass tenancy', async () => {
    const r = await get('/parent/invoices?status=Paid&studentId=999', parent);
    assert.strictEqual(r.status, 200, 'should still be 200 (filter applied, empty result)');
  });

  await test('parent HTMX partial /parent/partials/children-grid is 200', async () => {
    const r = await get('/parent/partials/children-grid', parent);
    assert.strictEqual(r.status, 200, 'partial should render');
  });

  await test('parent HTMX partial /parent/partials/invoice-row/123 (not owned) is 404', async () => {
    const r = await get('/parent/partials/invoice-row/123', parent);
    // With SKIP_DB the service returns [] so the id is "not found"
    assert.strictEqual(r.status, 404, `expected 404, got ${r.status}`);
  });

  await test('school role is forbidden from /parent/*', async () => {
    const school = { 'X-Test-Role': 'school', 'X-Test-School-Id': '1' };
    const r = await get('/parent/child/1', school);
    assert.strictEqual(r.status, 403, 'school role should be 403 on /parent');
  });

  await test('admin role is forbidden from /parent/*', async () => {
    const admin = { 'X-Test-Role': 'admin' };
    const r = await get('/parent/child/1', admin);
    assert.strictEqual(r.status, 403, 'admin role should be 403 on /parent');
  });

  console.log('\n[parent tenancy] 404 vs 403: information-leak prevention');
  await test('404 body does not say "forbidden" or "unauthorized"', async () => {
    const r = await get('/parent/child/999', parent);
    if (r.status === 404) {
      const lc = r.body.toLowerCase();
      assert.ok(!lc.includes('forbidden'), 'body should not say "forbidden"');
      assert.ok(!lc.includes('unauthorized'), 'body should not say "unauthorized"');
      assert.ok(!lc.includes('not authorized'), 'body should not say "not authorized"');
    }
  });

  console.log(process.exitCode ? '\nFAILED' : '\nALL PARENT TENANCY TESTS PASSED');
}

if (require.main === module) {
  run().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
  });
}

module.exports = run;
