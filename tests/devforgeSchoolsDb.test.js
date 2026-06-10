'use strict';

// SQL-level tests for AdminSchoolService.

const assert = require('assert');
const { getPool, sql } = require('../src/data/db');
const AdminSchoolService = require('../src/business/adminSchoolService');

const ACTOR = { id: 999, role: 'admin', email: 'admin@devforge.test' };

const IDS = {
  schoolA: 102001,
  schoolB: 102002
};

async function isDbAvailable() {
  if (process.env.SKIP_DB === 'true') return false;
  if (!process.env.DATABASE_URL) return false;
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS ok');
    return true;
  } catch (_) { return false; }
}

async function seed() {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    await new sql.Request(tx).query(`
      IF NOT EXISTS (SELECT 1 FROM Schools WHERE SchoolID = ${IDS.schoolA})
        INSERT INTO Schools (SchoolID, SchoolName, SubscriptionStatus, CurrencyCode, CurrencySymbol, SubscriptionPlan, ContactPerson)
        VALUES (${IDS.schoolA}, 'AdminTest A', 'Active', 'ZAR', 'R', 'Standard', 'Admin A');
      IF NOT EXISTS (SELECT 1 FROM Schools WHERE SchoolID = ${IDS.schoolB})
        INSERT INTO Schools (SchoolID, SchoolName, SubscriptionStatus, CurrencyCode, CurrencySymbol, SubscriptionPlan, ContactPerson)
        VALUES (${IDS.schoolB}, 'AdminTest B', 'Suspended', 'ZAR', 'R', 'Pro', 'Admin B');
    `);
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

async function cleanup() {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    await new sql.Request(tx).query(`
      DELETE FROM AuditLog WHERE SchoolID IN (${IDS.schoolA}, ${IDS.schoolB});
      DELETE FROM Schools WHERE SchoolID IN (${IDS.schoolA}, ${IDS.schoolB});
    `);
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

async function run() {
  console.log('\n[devforge-schools / SQL] checking database availability...');
  if (!(await isDbAvailable())) {
    console.log('  SKIP: DATABASE_URL not set or SKIP_DB=true.');
    return;
  }
  console.log('  seeding...');
  await seed();
  const svc = new AdminSchoolService();

  try {
    console.log('\n[1] list() returns both schools across the platform');
    let r = await svc.list({ actor: ACTOR });
    const ids = r.rows.map(s => s.SchoolID);
    assert.ok(ids.includes(IDS.schoolA));
    assert.ok(ids.includes(IDS.schoolB));
    assert.strictEqual(r.total, 2);
    console.log(`  PASS: ${r.total} schools returned`);

    console.log('\n[2] list() filter by status=Active');
    r = await svc.list({ actor: ACTOR, status: 'Active' });
    const activeIds = r.rows.map(s => s.SchoolID);
    assert.ok(activeIds.includes(IDS.schoolA));
    assert.ok(!activeIds.includes(IDS.schoolB));
    assert.strictEqual(r.total, 1);
    console.log('  PASS: status filter works');

    console.log('\n[3] list() filter by plan=Pro');
    r = await svc.list({ actor: ACTOR, plan: 'Pro' });
    const proIds = r.rows.map(s => s.SchoolID);
    assert.ok(proIds.includes(IDS.schoolB));
    assert.ok(!proIds.includes(IDS.schoolA));
    assert.strictEqual(r.total, 1);
    console.log('  PASS: plan filter works');

    console.log('\n[4] list() search by name');
    r = await svc.list({ actor: ACTOR, search: 'AdminTest A' });
    const searchIds = r.rows.map(s => s.SchoolID);
    assert.ok(searchIds.includes(IDS.schoolA));
    assert.ok(!searchIds.includes(IDS.schoolB));
    assert.strictEqual(r.total, 1);
    console.log('  PASS: search filter works');

    console.log('\n[5] list() with pagination');
    r = await svc.list({ actor: ACTOR, page: 1, pageSize: 1 });
    assert.strictEqual(r.rows.length, 1);
    assert.strictEqual(r.hasMore, true);
    console.log('  PASS: pagination works');

    console.log('\n[6] getById() returns full record with KPIs');
    const school = await svc.getById({ actor: ACTOR, schoolId: IDS.schoolA });
    assert.ok(school);
    assert.strictEqual(school.SchoolName, 'AdminTest A');
    assert.ok('ActiveUserCount' in school);
    assert.ok('ActiveStudentCount' in school);
    assert.ok('FamilyCount' in school);
    assert.ok('Outstanding' in school);
    console.log('  PASS: getById returns full record with KPIs');

    console.log('\n[7] updateStatus() flips status and writes audit row');
    const ok = await svc.updateStatus({ actor: ACTOR, schoolId: IDS.schoolA, newStatus: 'Suspended', reason: 'Non-payment' });
    assert.strictEqual(ok, true);

    const pool = await getPool();
    const schoolAfter = await pool.request().input('id', sql.Int, IDS.schoolA)
      .query('SELECT SubscriptionStatus FROM Schools WHERE SchoolID = @id');
    assert.strictEqual(schoolAfter.recordset[0].SubscriptionStatus, 'Suspended');

    const audit = await pool.request()
      .input('id', sql.Int, IDS.schoolA)
      .input('action', sql.NVarChar, 'UPDATE_STATUS')
      .query(`SELECT TOP 1 * FROM AuditLog WHERE SchoolID = @id AND Action = @action ORDER BY OccurredAt DESC`);
    assert.ok(audit.recordset.length > 0, 'audit row should be written');
    const auditRow = audit.recordset[0];
    assert.strictEqual(auditRow.ActorUserID, ACTOR.id);
    assert.strictEqual(auditRow.ActorRole, 'admin');
    assert.strictEqual(auditRow.ResourceType, 'school');
    const payload = JSON.parse(auditRow.Payload);
    assert.strictEqual(payload.before.status, 'Active');
    assert.strictEqual(payload.after.status, 'Suspended');
    assert.ok(payload.meta && payload.meta.reason === 'Non-payment');
    console.log('  PASS: status changed + audit row written');

    console.log('\n[8] updateStatus() throws on missing reason');
    let threw = false;
    try { await svc.updateStatus({ actor: ACTOR, schoolId: IDS.schoolA, newStatus: 'Active', reason: 'x' }); }
    catch (e) { threw = true; }
    assert.ok(threw);
    console.log('  PASS: missing reason throws');

    console.log('\n[9] updateStatus() throws on invalid status');
    threw = false;
    try { await svc.updateStatus({ actor: ACTOR, schoolId: IDS.schoolA, newStatus: 'BOGUS', reason: 'valid reason' }); }
    catch (e) { threw = true; }
    assert.ok(threw);
    console.log('  PASS: invalid status throws');

    console.log('\n[10] updateStatus() returns false for non-existent school');
    const notFound = await svc.updateStatus({ actor: ACTOR, schoolId: 9999999, newStatus: 'Active', reason: 'valid reason' });
    assert.strictEqual(notFound, false);
    console.log('  PASS: non-existent school returns false');

    console.log('\n[11] getKpis() returns aggregated metrics');
    const kpis = await svc.getKpis({ actor: ACTOR });
    assert.ok(kpis);
    assert.ok('ActiveSchools' in kpis);
    assert.ok('TotalSchools' in kpis);
    assert.ok('ActiveUsers' in kpis);
    assert.ok('TotalOutstanding' in kpis);
    console.log(`  PASS: KPIs = ${JSON.stringify(kpis).slice(0, 200)}...`);

    console.log('\n[12] list() requires admin role');
    let roleErr = null;
    try { await svc.list({ actor: { role: 'school' } }); }
    catch (e) { roleErr = e; }
    assert.ok(roleErr, 'should throw for non-admin');
    assert.ok(/admin/.test(roleErr.message));
    console.log('  PASS: non-admin rejected');

    console.log('\nALL DEVFORGE SCHOOLS SQL TESTS PASSED');
  } finally {
    console.log('\n  cleaning up...');
    await cleanup();
  }
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
