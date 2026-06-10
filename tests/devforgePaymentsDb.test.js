'use strict';

// SQL tests for DevForge admin payments service. Auto-skips without DB.

const assert = require('node:assert/strict');
const { getPool } = require('../src/data/db');

async function run() {
  if (!process.env.DATABASE_URL || process.env.SKIP_DB === 'true') {
    console.log('SKIP: DATABASE_URL not set or SKIP_DB=true.');
    return;
  }
  const AdminPaymentService = require('../src/business/adminPaymentService');
  const svc = new AdminPaymentService();
  const actor = { id: 1, role: 'admin' };

  console.log('list with no filters (no crash)');
  const all = await svc.list({ actor });
  assert.ok(Array.isArray(all.rows), 'rows must be array');
  assert.ok(typeof all.total === 'number', 'total must be number');
  assert.ok(typeof all.totalAmount === 'number', 'totalAmount must be number');

  console.log('list with search filter');
  const filtered = await svc.list({ actor, search: 'nonsense-search-xyz' });
  assert.equal(filtered.rows.length, 0, 'impossible search returns 0 rows');
  assert.equal(filtered.total, 0, 'impossible search total is 0');

  console.log('list with schoolId filter');
  const bySchool = await svc.list({ actor, schoolId: 1, pageSize: 5 });
  for (const r of bySchool.rows) assert.equal(r.SchoolID, 1, 'all rows must be school 1');

  console.log('list with allocationStatus filter (Allocated)');
  const alloc = await svc.list({ actor, allocationStatus: 'Allocated', pageSize: 100 });
  for (const r of alloc.rows) assert.equal(r.AllocationStatus, 'Allocated', 'all rows must be Allocated');

  console.log('list with allocationStatus filter (Unallocated)');
  const unalloc = await svc.list({ actor, allocationStatus: 'Unallocated', pageSize: 100 });
  for (const r of unalloc.rows) assert.equal(r.AllocationStatus, 'Unallocated', 'all rows must be Unallocated');

  console.log('list with paymentMethod filter');
  const eft = await svc.list({ actor, paymentMethod: 'EFT', pageSize: 100 });
  for (const r of eft.rows) assert.equal(r.PaymentMethod, 'EFT', 'all rows must be EFT');

  console.log('list with date range');
  const dr = await svc.list({ actor, from: '2099-01-01', to: '2099-12-31', pageSize: 5 });
  assert.equal(dr.rows.length, 0, 'far-future date range returns 0 rows');

  console.log('list with page=1, pageSize=2 (pagination)');
  const p1 = await svc.list({ actor, page: 1, pageSize: 2 });
  assert.ok(p1.rows.length <= 2, 'page 1 returns at most 2 rows');
  assert.equal(p1.page, 1, 'page is 1');
  assert.equal(p1.pageSize, 2, 'pageSize is 2');

  console.log('list with bad page/pageSize (clamped)');
  const bad = await svc.list({ actor, page: -1, pageSize: 9999 });
  assert.equal(bad.page, 1, 'page clamped to 1');
  assert.ok(bad.pageSize <= 100, 'pageSize clamped to max');

  console.log('listSchools returns all schools');
  const schools = await svc.listSchools({ actor });
  assert.ok(Array.isArray(schools) && schools.length > 0, 'must return schools');
  for (const s of schools) {
    assert.ok(s.SchoolID, 'school has id');
    assert.ok(s.SchoolName, 'school has name');
  }

  console.log('getKpis returns platform metrics');
  const kpis = await svc.getKpis({ actor });
  assert.ok(kpis, 'kpis returned');
  assert.ok('CollectedLast30Days' in kpis, 'kpis has CollectedLast30Days');
  assert.ok('UnallocatedTotal' in kpis, 'kpis has UnallocatedTotal');
  assert.ok('PendingParentTotal' in kpis, 'kpis has PendingParentTotal');

  console.log('non-admin actor rejected');
  await assert.rejects(async () => svc.list({ actor: { id: 2, role: 'parent' } }), /admin role required/);
  await assert.rejects(async () => svc.list({ actor: { id: 3, role: 'school' } }), /admin role required/);
  await assert.rejects(async () => svc.listSchools({ actor: { id: 2, role: 'parent' } }), /admin role required/);
  await assert.rejects(async () => svc.getKpis({ actor: { id: 2, role: 'parent' } }), /admin role required/);

  await getPool().close();
  console.log('OK all 12 admin payments SQL tests passed');
  if (process.exitCode) console.log('\nFAILED'); else console.log('\nALL DEVFORGE PAYMENTS SQL TESTS PASSED');
}

if (require.main === module) {
  run().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
}

module.exports = run;
