'use strict';

// SQL-level tests for AdminUserService.

const assert = require('assert');
const { getPool, sql } = require('../src/data/db');
const AdminUserService = require('../src/business/adminUserService');

const ACTOR = { id: 888, role: 'admin', email: 'admin@devforge.test' };

const IDS = {
  schoolA: 103001,
  schoolB: 103002,
  user1: 103010,  // school user, active
  user2: 103011,  // school user, INACTIVE
  user3: 103012,  // admin
  user4: 103013,  // parent
  user5: 103014   // different school
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
        INSERT INTO Schools (SchoolID, SchoolName, SubscriptionStatus, CurrencyCode, CurrencySymbol, SubscriptionPlan)
        VALUES (${IDS.schoolA}, 'UserTest A', 'Active', 'ZAR', 'R', 'Standard');
      IF NOT EXISTS (SELECT 1 FROM Schools WHERE SchoolID = ${IDS.schoolB})
        INSERT INTO Schools (SchoolID, SchoolName, SubscriptionStatus, CurrencyCode, CurrencySymbol, SubscriptionPlan)
        VALUES (${IDS.schoolB}, 'UserTest B', 'Active', 'ZAR', 'R', 'Standard');

      IF NOT EXISTS (SELECT 1 FROM Users WHERE UserID = ${IDS.user1})
        INSERT INTO Users (UserID, Username, Email, PasswordHash, Role, SchoolID, IsActive)
        VALUES (${IDS.user1}, 'schoolA1', 'a1@user.test', 'x', 'school', ${IDS.schoolA}, 1);
      IF NOT EXISTS (SELECT 1 FROM Users WHERE UserID = ${IDS.user2})
        INSERT INTO Users (UserID, Username, Email, PasswordHash, Role, SchoolID, IsActive)
        VALUES (${IDS.user2}, 'schoolA2', 'a2@user.test', 'x', 'school', ${IDS.schoolA}, 0);
      IF NOT EXISTS (SELECT 1 FROM Users WHERE UserID = ${IDS.user3})
        INSERT INTO Users (UserID, Username, Email, PasswordHash, Role, SchoolID, IsActive)
        VALUES (${IDS.user3}, 'admin1', 'admin@user.test', 'x', 'admin', NULL, 1);
      IF NOT EXISTS (SELECT 1 FROM Users WHERE UserID = ${IDS.user4})
        INSERT INTO Users (UserID, Username, Email, PasswordHash, Role, SchoolID, IsActive)
        VALUES (${IDS.user4}, 'parent1', 'p1@user.test', 'x', 'parent', ${IDS.schoolA}, 1);
      IF NOT EXISTS (SELECT 1 FROM Users WHERE UserID = ${IDS.user5})
        INSERT INTO Users (UserID, Username, Email, PasswordHash, Role, SchoolID, IsActive)
        VALUES (${IDS.user5}, 'schoolB1', 'b1@user.test', 'x', 'school', ${IDS.schoolB}, 1);
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
      DELETE FROM Users    WHERE UserID IN (${IDS.user1}, ${IDS.user2}, ${IDS.user3}, ${IDS.user4}, ${IDS.user5});
      DELETE FROM Schools  WHERE SchoolID IN (${IDS.schoolA}, ${IDS.schoolB});
    `);
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

async function run() {
  console.log('\n[devforge-users / SQL] checking database availability...');
  if (!(await isDbAvailable())) {
    console.log('  SKIP: DATABASE_URL not set or SKIP_DB=true.');
    return;
  }
  console.log('  seeding...');
  await seed();
  const svc = new AdminUserService();

  try {
    console.log('\n[1] list() returns all 5 users');
    let r = await svc.list({ actor: ACTOR });
    const ids = r.rows.map(u => u.UserID);
    assert.strictEqual(r.total, 5);
    for (const id of [IDS.user1, IDS.user2, IDS.user3, IDS.user4, IDS.user5]) {
      assert.ok(ids.includes(id), 'user ' + id + ' should be listed');
    }
    console.log(`  PASS: ${r.total} users listed`);

    console.log('\n[2] list() with status=inactive');
    r = await svc.list({ actor: ACTOR, status: 'inactive' });
    assert.strictEqual(r.total, 1);
    assert.strictEqual(r.rows[0].UserID, IDS.user2);
    console.log('  PASS: inactive filter works');

    console.log('\n[3] list() with role=admin');
    r = await svc.list({ actor: ACTOR, role: 'admin' });
    assert.strictEqual(r.total, 1);
    assert.strictEqual(r.rows[0].UserID, IDS.user3);
    console.log('  PASS: role filter works');

    console.log('\n[4] list() with schoolId filter');
    r = await svc.list({ actor: ACTOR, schoolId: IDS.schoolA });
    const schoolAIds = r.rows.map(u => u.UserID);
    assert.ok(schoolAIds.includes(IDS.user1));
    assert.ok(schoolAIds.includes(IDS.user2));
    assert.ok(schoolAIds.includes(IDS.user4));
    assert.ok(!schoolAIds.includes(IDS.user5), 'schoolB user must not appear');
    assert.ok(!schoolAIds.includes(IDS.user3), 'admin (no school) must not appear');
    console.log(`  PASS: schoolA filter = ${r.total} users`);

    console.log('\n[5] list() with search by email');
    r = await svc.list({ actor: ACTOR, search: 'a1@user.test' });
    assert.strictEqual(r.total, 1);
    assert.strictEqual(r.rows[0].UserID, IDS.user1);
    console.log('  PASS: search filter works');

    console.log('\n[6] list() with pagination');
    r = await svc.list({ actor: ACTOR, page: 1, pageSize: 2 });
    assert.strictEqual(r.rows.length, 2);
    assert.strictEqual(r.hasMore, true);
    console.log('  PASS: pagination works');

    console.log('\n[7] getById() returns the user in scope (any school)');
    const u = await svc.getById({ actor: ACTOR, userId: IDS.user5 });
    assert.ok(u);
    assert.strictEqual(u.Username, 'schoolB1');
    assert.strictEqual(u.SchoolName, 'UserTest B');
    console.log('  PASS: getById crosses school boundaries for admin');

    console.log('\n[8] setActive() flips flag and writes audit row');
    const ok = await svc.setActive({ actor: ACTOR, userId: IDS.user1, isActive: false, reason: 'Security incident' });
    assert.strictEqual(ok, true);

    const pool = await getPool();
    const userAfter = await pool.request().input('id', sql.Int, IDS.user1)
      .query('SELECT IsActive FROM Users WHERE UserID = @id');
    assert.strictEqual(userAfter.recordset[0].IsActive, 0);

    const audit = await pool.request()
      .input('id', sql.Int, IDS.user1)
      .input('action', sql.NVarChar, 'UPDATE_STATUS')
      .query(`SELECT TOP 1 * FROM AuditLog WHERE ResourceID = @id AND Action = @action ORDER BY OccurredAt DESC`);
    assert.ok(audit.recordset.length > 0, 'audit row should be written');
    const row = audit.recordset[0];
    assert.strictEqual(row.ActorUserID, ACTOR.id);
    assert.strictEqual(row.ResourceType, 'user');
    const payload = JSON.parse(row.Payload);
    assert.strictEqual(payload.before.isActive, 1);
    assert.strictEqual(payload.after.isActive, 0);
    assert.strictEqual(payload.meta.reason, 'Security incident');
    console.log('  PASS: status changed + audit row written');

    console.log('\n[9] setActive() throws on missing reason');
    let threw = false;
    try { await svc.setActive({ actor: ACTOR, userId: IDS.user2, isActive: true, reason: 'x' }); }
    catch (e) { threw = true; }
    assert.ok(threw);
    console.log('  PASS: missing reason throws');

    console.log('\n[10] setActive() returns false for non-existent user');
    const notFound = await svc.setActive({ actor: ACTOR, userId: 9999999, isActive: false, reason: 'valid reason' });
    assert.strictEqual(notFound, false);
    console.log('  PASS: non-existent user returns false');

    console.log('\n[11] listSchools() returns all schools');
    const schools = await svc.listSchools({ actor: ACTOR });
    assert.ok(schools.find(s => s.SchoolID === IDS.schoolA));
    assert.ok(schools.find(s => s.SchoolID === IDS.schoolB));
    console.log(`  PASS: ${schools.length} schools`);

    console.log('\n[12] list() requires admin');
    let roleErr = null;
    try { await svc.list({ actor: { role: 'school' } }); }
    catch (e) { roleErr = e; }
    assert.ok(roleErr, 'should throw for non-admin');
    assert.ok(/admin/.test(roleErr.message));
    console.log('  PASS: non-admin rejected');

    console.log('\nALL DEVFORGE USERS SQL TESTS PASSED');
  } finally {
    console.log('\n  cleaning up...');
    await cleanup();
  }
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
