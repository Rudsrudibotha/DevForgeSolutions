'use strict';

// SQL tests for DevForge admin audit service. Auto-skips without DB.

const assert = require('node:assert/strict');
const { getPool } = require('../src/data/db');

async function run() {
  if (!process.env.DATABASE_URL || process.env.SKIP_DB === 'true') {
    console.log('SKIP: DATABASE_URL not set or SKIP_DB=true.');
    return;
  }
  const AdminAuditService = require('../src/business/adminAuditService');
  const svc = new AdminAuditService();
  const actor = { id: 1, role: 'admin', email: 'test@devforge.local' };

  console.log('list with no filters (no crash)');
  const all = await svc.list({ actor });
  assert.ok(Array.isArray(all.rows), 'rows must be array');
  assert.ok(typeof all.total === 'number', 'total must be number');
  assert.equal(all.page, 1, 'page is 1');
  assert.equal(all.pageSize, 50, 'pageSize is 50');

  console.log('list with schoolId filter');
  const bySchool = await svc.list({ actor, schoolId: 1, pageSize: 5 });
  for (const r of bySchool.rows) assert.equal(r.SchoolID, 1, 'all rows must be school 1');

  console.log('list with actorEmail filter (LIKE)');
  const byEmail = await svc.list({ actor, actorEmail: 'devforge', pageSize: 5 });
  for (const r of byEmail.rows) assert.ok(r.ActorEmail && r.ActorEmail.includes('devforge'), 'all rows must match email pattern');

  console.log('list with action filter');
  const writes = await svc.list({ actor, action: 'WRITE', pageSize: 5 });
  for (const r of writes.rows) assert.equal(r.Action, 'WRITE', 'all rows must be WRITE');

  console.log('list with invalid action ignored');
  const bogus = await svc.list({ actor, action: 'BOGUS' });
  assert.equal(bogus.rows.length, all.rows.length, 'invalid action returns unfiltered');

  console.log('list with resourceType filter');
  const schoolEvents = await svc.list({ actor, resourceType: 'School', pageSize: 5 });
  for (const r of schoolEvents.rows) assert.equal(r.ResourceType, 'School', 'all rows must be School');

  console.log('list with resourceId filter');
  const oneEvent = await svc.list({ actor, resourceType: 'School', resourceId: '1', pageSize: 5 });
  for (const r of oneEvent.rows) assert.equal(String(r.ResourceID), '1', 'all rows must be resource 1');

  console.log('list with date range');
  const dr = await svc.list({ actor, from: '2099-01-01', to: '2099-12-31' });
  assert.equal(dr.rows.length, 0, 'far-future date range returns 0 rows');

  console.log('list with page=1, pageSize=2 (pagination)');
  const p1 = await svc.list({ actor, page: 1, pageSize: 2 });
  assert.ok(p1.rows.length <= 2, 'page 1 returns at most 2 rows');
  assert.equal(p1.page, 1, 'page is 1');
  assert.equal(p1.pageSize, 2, 'pageSize is 2');

  console.log('list with bad page/pageSize (clamped)');
  const bad = await svc.list({ actor, page: -1, pageSize: 9999 });
  assert.equal(bad.page, 1, 'page clamped to 1');
  assert.ok(bad.pageSize <= 200, 'pageSize clamped to max');

  console.log('listActions returns valid actions');
  const actions = await svc.listActions();
  assert.ok(actions.includes('READ'), 'must include READ');
  assert.ok(actions.includes('WRITE'), 'must include WRITE');

  console.log('non-admin actor rejected');
  await assert.rejects(async () => svc.list({ actor: { id: 2, role: 'parent' } }), /admin role required/);
  await assert.rejects(async () => svc.list({ actor: { id: 3, role: 'school' } }), /admin role required/);
  await assert.rejects(async () => svc.listSchools({ actor: { id: 2, role: 'parent' } }), /admin role required/);
  await assert.rejects(async () => svc.listResourceTypes({ actor: { id: 2, role: 'parent' } }), /admin role required/);

  await getPool().close();
  console.log('OK all 12 admin audit SQL tests passed');
  if (process.exitCode) console.log('\nFAILED'); else console.log('\nALL DEVFORGE AUDIT SQL TESTS PASSED');
}

if (require.main === module) {
  run().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
}

module.exports = run;
