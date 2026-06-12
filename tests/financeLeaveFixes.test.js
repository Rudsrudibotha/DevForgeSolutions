'use strict';

// Regression tests for the production-fault fixes:
//   - finance facade no longer references columns that don't exist on
//     Refunds / FinancialAdjustments (TenantId, CreatedAt)
//   - adjustment type is coerced to a CHECK-constraint-valid value
//   - leave review accepts "Declined" (normalised to the stored "Rejected")
//   - portal auth redirects land on the per-dashboard login page
//
// SQL execution itself needs a live DB; these tests cover everything
// reachable without one (source guards, pure logic, route validation).

const assert = require('assert');
const http = require('http');
const fs = require('fs');

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
  return Promise.resolve().then(fn)
    .then(() => console.log(`  PASS: ${name}`))
    .catch(err => { console.error(`  FAIL: ${name}`); console.error(`    ${err.message}`); process.exitCode = 1; });
}

async function getCsrf() {
  const a = await request('GET', '/login', {});
  const cookies = a.headers['set-cookie'] || [];
  const csrfCookie = cookies.map(c => c.split(';')[0]).find(c => c.startsWith('kch_csrf='));
  const csrf = csrfCookie ? csrfCookie.split('=')[1] : '';
  return { csrf, cookieHeader: csrfCookie || '' };
}

async function run() {
  console.log('\n[finance-leave-fixes] finance facade column guards');

  const facadeSrc = fs.readFileSync('src/business/smsPortalFacades.js', 'utf8');
  // Isolate the refund + adjustment query bodies (between createRefund and getFinancePeriodLocks).
  const financeSection = facadeSrc.slice(
    facadeSrc.indexOf('class AdmissionsFinanceService'),
    facadeSrc.indexOf('class PermissionLeaveYearEndService')
  );

  // Grab just an INSERT's column list (between the table name and OUTPUT)
  // so we don't catch legitimate TenantId use in other tables/methods.
  function insertColumns(table) {
    const start = financeSection.indexOf('INSERT INTO dbo.' + table);
    assert.ok(start >= 0, table + ' INSERT not found');
    const out = financeSection.indexOf('OUTPUT', start);
    return financeSection.slice(start, out);
  }

  await test('Refunds/Adjustments queries do not reference a TenantId column', async () => {
    // These tables are SchoolID-scoped; r.TenantId / a.TenantId / INSERT TenantId were the bug.
    assert.ok(!/\br\.TenantId\b/.test(financeSection), 'r.TenantId still present');
    assert.ok(!/\ba\.TenantId\b/.test(financeSection), 'a.TenantId still present');
    assert.ok(!/TenantId/.test(insertColumns('Refunds')), 'Refunds INSERT still lists TenantId');
    assert.ok(!/TenantId/.test(insertColumns('FinancialAdjustments')), 'Adjustments INSERT still lists TenantId');
  });

  await test('Refunds/Adjustments queries use CreatedDate, not the nonexistent CreatedAt', async () => {
    assert.ok(!/\br\.CreatedAt\b/.test(financeSection), 'r.CreatedAt still present');
    assert.ok(!/\ba\.CreatedAt\b/.test(financeSection), 'a.CreatedAt still present');
    assert.ok(/r\.CreatedDate/.test(financeSection), 'refund query should select CreatedDate');
    assert.ok(/a\.CreatedDate/.test(financeSection), 'adjustment query should select CreatedDate');
  });

  await test('createAdjustment no longer hard-rejects on a missing tenant', async () => {
    assert.ok(!/tenant-required/.test(financeSection), 'tenant-required guard still present');
  });

  console.log('\n[finance-leave-fixes] outstanding pivot uses real columns');

  const outstandingSrc = fs.readFileSync('src/data/outstandingRepository.js', 'utf8');
  await test('outstanding query does not reference nonexistent columns', async () => {
    assert.ok(!/InvoiceDate/.test(outstandingSrc), 'InvoiceDate (should be IssueDate) still present');
    assert.ok(!/PaymentDate/.test(outstandingSrc), 'PaymentDate (should be TransactionDate) still present');
    assert.ok(!/t\.IsDeleted/.test(outstandingSrc), 't.IsDeleted (no such column on Transactions) still present');
    assert.ok(/i\.IssueDate/.test(outstandingSrc), 'invoice query should use IssueDate');
    assert.ok(/AmountPaid/.test(outstandingSrc), 'outstanding should be computed from Amount - AmountPaid');
  });

  console.log('\n[finance-leave-fixes] adjustment type normalisation (unit)');

  const { normalizeAdjustmentType, ADJUSTMENT_TYPES } = require('../src/business/smsPortalFacades');

  await test('valid adjustment types pass through unchanged', async () => {
    for (const t of ADJUSTMENT_TYPES) assert.strictEqual(normalizeAdjustmentType(t), t);
  });

  await test('unknown / empty adjustment types fall back to Fee Correction', async () => {
    assert.strictEqual(normalizeAdjustmentType('Charge'), 'Fee Correction');
    assert.strictEqual(normalizeAdjustmentType(''), 'Fee Correction');
    assert.strictEqual(normalizeAdjustmentType(undefined), 'Fee Correction');
    assert.strictEqual(normalizeAdjustmentType('Credit'), 'Fee Correction');
  });

  await test('every allowed type matches the DB CHECK constraint set', async () => {
    const schema = fs.readFileSync('db/schema.sql', 'utf8');
    const m = schema.match(/CK_Adjustments_Type CHECK \(AdjustmentType IN \(([^)]+)\)\)/);
    assert.ok(m, 'CK_Adjustments_Type constraint found');
    const dbTypes = m[1].split(',').map(s => s.trim().replace(/^'|'$/g, ''));
    assert.deepStrictEqual([...ADJUSTMENT_TYPES].sort(), [...dbTypes].sort());
  });

  console.log('\n[finance-leave-fixes] leave review accepts Declined and Rejected');

  const school = { 'X-Test-Role': 'school', 'X-Test-School-Id': '1' };

  await test('POST /sms/leave/1/review without CSRF is 403', async () => {
    const r = await request('POST', '/sms/leave/1/review', school, 'status=Rejected');
    assert.strictEqual(r.status, 403);
  });

  await test('an invalid status is rejected as invalid-status', async () => {
    const { csrf, cookieHeader } = await getCsrf();
    const r = await request('POST', '/sms/leave/1/review',
      { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      '_csrf=' + csrf + '&status=Bogus');
    assert.strictEqual(r.status, 400);
    assert.ok(/invalid-status/.test(r.body), 'expected invalid-status body, got: ' + r.body);
  });

  // "Declined" (UI word) and "Rejected" (stored value) must both clear
  // validation — i.e. NOT produce the invalid-status response. With no DB
  // they then fail in the service (400 .end(), empty body) — that's fine;
  // the point is they got past the status check.
  for (const status of ['Declined', 'Rejected', 'Approved']) {
    await test(`status "${status}" passes validation (not invalid-status)`, async () => {
      const { csrf, cookieHeader } = await getCsrf();
      const r = await request('POST', '/sms/leave/1/review',
        { ...school, 'X-CSRF-Token': csrf, 'Cookie': cookieHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
        '_csrf=' + csrf + '&status=' + status);
      assert.ok(!/invalid-status/.test(r.body), `"${status}" was treated as invalid: ${r.body}`);
    });
  }

  console.log('\n[finance-leave-fixes] per-dashboard login redirect (real-auth subprocess)');
  await testLoginRedirects();

  console.log(process.exitCode ? '\nFAILED' : '\nALL FINANCE/LEAVE FIX TESTS PASSED');
}

// The main harness runs with DISABLE_AUTH (a test user is always
// injected), so the unauthenticated redirect branch is unreachable here.
// Spawn a short-lived real-auth server to exercise it.
async function testLoginRedirects() {
  const { spawn } = require('child_process');
  const path = require('path');
  const root = path.resolve(__dirname, '..');
  const port = 3097;
  const proc = spawn(process.execPath, [path.join(root, 'src/app.js')], {
    cwd: root,
    env: { ...process.env, DISABLE_AUTH: 'false', JWT_SECRET: 'redir-test', SKIP_DB: 'true', PORT: String(port), NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  try {
    await new Promise((resolve, reject) => {
      let out = '';
      const t = setTimeout(() => reject(new Error('redirect server did not boot')), 8000);
      proc.stdout.on('data', d => { out += d; if (out.includes('Server running')) { clearTimeout(t); resolve(); } });
    });
    const cases = [
      ['/devforge', '/devforge-login'],
      ['/devforge/faults', '/devforge-login'],
      ['/sms/leave', '/school-login'],
      ['/parent/messages', '/parent-login']
    ];
    for (const [pathReq, expected] of cases) {
      await test(`${pathReq} (no session) redirects to ${expected}`, async () => {
        const r = await new Promise((resolve, reject) => {
          const rq = http.request({ host: HOST, port, path: pathReq, method: 'GET' }, res => resolve(res));
          rq.on('error', reject); rq.end();
        });
        assert.strictEqual(r.statusCode, 302, `expected 302, got ${r.statusCode}`);
        assert.ok(String(r.headers.location || '').startsWith(expected), `expected ${expected}, got ${r.headers.location}`);
      });
    }
  } finally {
    proc.kill();
  }
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
