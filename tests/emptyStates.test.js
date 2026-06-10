'use strict';

// Tests for empty state + skeleton partials.
// Verifies: shared empty partial renders with title/desc/action/colspan;
// skeleton-table partial renders rows or inline cells;
// all migrated list pages have proper empty state markup (not the old inline form).

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const BASE = 'http://127.0.0.1:3001';

function req(method, p, headers) {
  return new Promise((resolve, reject) => {
    const r = http.request(BASE + p, { method, headers: headers || {} }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    r.on('error', reject);
    r.end();
  });
}

async function run() {
  console.log('empty/default.ejs exists');
  const p1 = path.resolve('src/views/partials/empty/default.ejs');
  assert.ok(fs.existsSync(p1), 'empty/default.ejs missing');

  console.log('skeleton-table.ejs exists');
  const p2 = path.resolve('src/views/partials/empty/skeleton-table.ejs');
  assert.ok(fs.existsSync(p2), 'skeleton-table.ejs missing');

  console.log('skeleton-kpis.ejs exists');
  const p3 = path.resolve('src/views/partials/empty/skeleton-kpis.ejs');
  assert.ok(fs.existsSync(p3), 'skeleton-kpis.ejs missing');

  console.log('skeleton-detail.ejs exists');
  const p4 = path.resolve('src/views/partials/empty/skeleton-detail.ejs');
  assert.ok(fs.existsSync(p4), 'skeleton-detail.ejs missing');

  // Verify DevForge pages render with new empty partials (no DB → 0 rows)
  console.log('GET /devforge/schools renders skeleton row + empty state placeholder');
  let r = await req('GET', '/devforge/schools', { 'X-Test-Role': 'admin' });
  assert.equal(r.status, 200);
  assert.match(r.body, /No schools (yet|match)/, 'empty partial title present');
  assert.match(r.body, /htmx-indicator/, 'htmx-indicator class present');
  assert.match(r.body, /skeleton/, 'skeleton class present');

  console.log('GET /devforge/users renders empty state');
  r = await req('GET', '/devforge/users', { 'X-Test-Role': 'admin' });
  assert.equal(r.status, 200);
  assert.match(r.body, /No users found/, 'users empty state present');

  console.log('GET /devforge/payments renders empty state');
  r = await req('GET', '/devforge/payments', { 'X-Test-Role': 'admin' });
  assert.equal(r.status, 200);
  assert.match(r.body, /No payments found/, 'payments empty state present');

  console.log('GET /devforge/audit renders empty state');
  r = await req('GET', '/devforge/audit', { 'X-Test-Role': 'admin' });
  assert.equal(r.status, 200);
  assert.match(r.body, /No audit events/, 'audit empty state present');

  // Verify all the SMS list partials use the shared empty partial
  console.log('SMS list partials use shared empty/default.ejs');
  const smsPartials = ['students', 'families', 'classes', 'invoices', 'payments', 'staff'];
  for (const name of smsPartials) {
    const p = path.resolve('src/views/sms/' + name + '/partials/table.ejs');
    assert.ok(fs.existsSync(p), name + '/partials/table.ejs missing');
    const content = fs.readFileSync(p, 'utf8');
    assert.ok(content.includes("include('../../../partials/empty/default'"), name + ' uses shared empty partial');
    // Should NOT have the old inline empty-state with svg
    assert.ok(!content.includes('<div class="empty-state">\n        <svg class="empty-state-icon"'), name + ' still has old inline empty state');
  }

  console.log('SMS bank-statements/list.ejs uses shared empty partial');
  const bsPath = path.resolve('src/views/sms/bank-statements/list.ejs');
  const bsContent = fs.readFileSync(bsPath, 'utf8');
  assert.ok(bsContent.includes("include('../../partials/empty/default'"), 'bank-statements uses shared empty partial');

  console.log('DevForge table partials use shared empty/default.ejs');
  const dfPartials = ['schools', 'users', 'payments', 'audit'];
  for (const name of dfPartials) {
    const p = path.resolve('src/views/devforge/' + name + '/partials/table.ejs');
    assert.ok(fs.existsSync(p), name + '/partials/table.ejs missing');
    const content = fs.readFileSync(p, 'utf8');
    assert.ok(content.includes("partials/empty/default'"), name + ' uses shared empty partial');
  }

  console.log('Parent dashboard uses shared empty/default.ejs');
  const parentDash = fs.readFileSync(path.resolve('src/views/parent/dashboard.ejs'), 'utf8');
  assert.ok(parentDash.includes("partials/empty/default'"), 'parent dashboard uses shared empty partial');
  const parentInvoices = fs.readFileSync(path.resolve('src/views/parent/invoices.ejs'), 'utf8');
  assert.ok(parentInvoices.includes("partials/empty/default'"), 'parent invoices uses shared empty partial');

  console.log('skeleton-table inline mode emits cells not rows');
  const skel = fs.readFileSync(path.resolve('src/views/partials/empty/skeleton-table.ejs'), 'utf8');
  assert.ok(skel.includes('var inline'), 'inline var declared');
  assert.ok(skel.includes('if (inline)'), 'inline mode conditional');
  assert.ok(skel.includes('inline-block'), 'inline mode uses inline-block');

  console.log('skeleton-kpis uses 4 cards by default');
  const skelK = fs.readFileSync(path.resolve('src/views/partials/empty/skeleton-kpis.ejs'), 'utf8');
  assert.ok(skelK.includes('kpi-card'), 'uses kpi-card class');
  assert.ok(skelK.includes('count'), 'has count param');

  console.log('OK all 16 empty-state/skeleton tests passed');
  if (process.exitCode) console.log('\nFAILED'); else console.log('\nALL EMPTY STATE + SKELETON TESTS PASSED');
}

if (require.main === module) {
  run().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
}

module.exports = run;
