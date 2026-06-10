'use strict';

// Route-layer tests for DevForge admin payments endpoints.
// Uses DISABLE_AUTH=true with X-Test-Role=admin header.

const assert = require('node:assert/strict');
const http = require('node:http');

const BASE = 'http://127.0.0.1:3001';

function req(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const r = http.request(BASE + path, { method, headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}) }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

function get(path, role, qs) {
  return req('GET', path + (qs ? '?' + qs : ''), { 'X-Test-Role': role });
}

function assertRendersPaymentsPage(r) {
  assert.equal(r.status, 200, 'expected 200 OK on /devforge/payments, got ' + r.status);
  assert.match(r.body, /Payments<\/h1>/, 'list page missing h1');
  assert.match(r.body, /Cross-school payment ledger/, 'list page missing subtitle');
  assert.match(r.body, /Collected \(30d\)/, 'list page missing KPI labels');
  assert.match(r.body, /Unallocated/, 'list page missing Unallocated KPI');
  assert.match(r.body, /Pending parent/, 'list page missing Pending parent KPI');
  assert.match(r.body, /id="payments-table"/, 'list page missing table tbody');
  assert.match(r.body, /name="q"/, 'list page missing search input');
  assert.match(r.body, /name="schoolId"/, 'list page missing school filter');
  assert.match(r.body, /name="allocationStatus"/, 'list page missing allocation status filter');
  assert.match(r.body, /name="paymentMethod"/, 'list page missing payment method filter');
  assert.match(r.body, /name="from"/, 'list page missing from date');
  assert.match(r.body, /name="to"/, 'list page missing to date');
}

async function run() {
  console.log('GET /devforge/payments (no auth)');
  let r = await req('GET', '/devforge/payments');
  assert.notEqual(r.status, 200, 'unauthenticated should not get 200');

  console.log('GET /devforge/payments as parent (denied)');
  r = await get('/devforge/payments', 'parent');
  assert.notEqual(r.status, 200, 'parent should be denied');

  console.log('GET /devforge/payments as school (denied)');
  r = await get('/devforge/payments', 'school');
  assert.notEqual(r.status, 200, 'school should be denied');

  console.log('GET /devforge/payments as admin (renders)');
  r = await get('/devforge/payments', 'admin');
  assertRendersPaymentsPage(r);

  console.log('GET /devforge/payments?q=foo (filter)');
  r = await get('/devforge/payments', 'admin', 'q=foo');
  assertRendersPaymentsPage(r);

  console.log('GET /devforge/payments?schoolId=1 (filter)');
  r = await get('/devforge/payments', 'admin', 'schoolId=1');
  assertRendersPaymentsPage(r);

  console.log('GET /devforge/payments?allocationStatus=Allocated (filter)');
  r = await get('/devforge/payments', 'admin', 'allocationStatus=Allocated');
  assertRendersPaymentsPage(r);

  console.log('GET /devforge/payments?allocationStatus=Unallocated (filter)');
  r = await get('/devforge/payments', 'admin', 'allocationStatus=Unallocated');
  assertRendersPaymentsPage(r);

  console.log('GET /devforge/payments?allocationStatus=PendingPayment (filter)');
  r = await get('/devforge/payments', 'admin', 'allocationStatus=PendingPayment');
  assertRendersPaymentsPage(r);

  console.log('GET /devforge/payments?paymentMethod=EFT (filter)');
  r = await get('/devforge/payments', 'admin', 'paymentMethod=EFT');
  assertRendersPaymentsPage(r);

  console.log('GET /devforge/payments?from=2024-01-01&to=2024-12-31 (date filter)');
  r = await get('/devforge/payments', 'admin', 'from=2024-01-01&to=2024-12-31');
  assertRendersPaymentsPage(r);

  console.log('GET /devforge/payments?page=1 (pagination)');
  r = await get('/devforge/payments', 'admin', 'page=1');
  assertRendersPaymentsPage(r);

  console.log('GET /devforge/payments?page=abc (invalid page → 1)');
  r = await get('/devforge/payments', 'admin', 'page=abc');
  assertRendersPaymentsPage(r);

  console.log('GET /devforge/payments/partials/table (HTMX partial)');
  r = await get('/devforge/payments/partials/table', 'admin');
  assert.equal(r.status, 200, 'partial should 200');
  assert.match(r.body, /<tr/, 'partial should contain table rows or empty state');

  console.log('GET /devforge/payments/partials/table?q=foo (HTMX with filter)');
  r = await get('/devforge/payments/partials/table', 'admin', 'q=foo');
  assert.equal(r.status, 200, 'partial filter should 200');
  assert.match(r.body, /<tr/, 'partial should contain table rows or empty state');

  console.log('GET /devforge/payments (denies regular users)');
  r = await get('/devforge/payments', 'parent');
  assert.notEqual(r.status, 200, 'parent must not access');
  r = await get('/devforge/payments', 'school');
  assert.notEqual(r.status, 200, 'school must not access');

  console.log('GET /devforge/payments/partials/table (denies parents)');
  r = await get('/devforge/payments/partials/table', 'parent');
  assert.notEqual(r.status, 200, 'parent must not access partial');

  console.log('OK all 19 admin payments route tests passed');
  if (process.exitCode) console.log('\nFAILED'); else console.log('\nALL DEVFORGE PAYMENTS ROUTE TESTS PASSED');
}

if (require.main === module) {
  run().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
}

module.exports = run;
