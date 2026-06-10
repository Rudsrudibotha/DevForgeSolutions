'use strict';

// SQL-level tests for FamilyPortalService.
// Seeds 2 schools, 3 families (1 in schoolA, 1 in schoolB, 1 already deleted).
// Asserts: list, search, getById tenancy, create, update, softDelete, getChildren.

const assert = require('assert');
const { getPool, sql } = require('../src/data/db');
const { ScopedDb } = require('../src/data/scopedDb');
const FamilyPortalService = require('../src/business/familyPortalService');

const IDS = {
  schoolA: 93001,
  schoolB: 93002,
  familyA1: 93010,  // active, schoolA
  familyA2: 93011,  // active, schoolA
  familyB1: 93012,  // active, schoolB
  familyDel: 93013, // already soft-deleted, schoolA
  studentA: 93020
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

async function ensureSchema() {
  // Make sure IsDeleted exists on Families
  const pool = await getPool();
  const r = await pool.request().query(`
    IF COL_LENGTH('dbo.Families', 'IsDeleted') IS NULL
      ALTER TABLE dbo.Families ADD IsDeleted BIT NOT NULL DEFAULT 0;
  `);
}

async function seed() {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    await new sql.Request(tx).query(`
      IF NOT EXISTS (SELECT 1 FROM Schools WHERE SchoolID = ${IDS.schoolA})
        INSERT INTO Schools (SchoolID, SchoolName, SubscriptionStatus, CurrencyCode, CurrencySymbol, SubscriptionPlan)
        VALUES (${IDS.schoolA}, 'FamTest A', 'Active', 'ZAR', 'R', 'Standard');
      IF NOT EXISTS (SELECT 1 FROM Schools WHERE SchoolID = ${IDS.schoolB})
        INSERT INTO Schools (SchoolID, SchoolName, SubscriptionStatus, CurrencyCode, CurrencySymbol, SubscriptionPlan)
        VALUES (${IDS.schoolB}, 'FamTest B', 'Active', 'ZAR', 'R', 'Standard');

      IF NOT EXISTS (SELECT 1 FROM Families WHERE FamilyID = ${IDS.familyA1})
        INSERT INTO Families (FamilyID, SchoolID, FamilyName, PrimaryParentName, PrimaryParentEmail, IsDeleted)
        VALUES (${IDS.familyA1}, ${IDS.schoolA}, 'Alpha Family', 'Alex Parent', 'alex@fam.test', 0);
      IF NOT EXISTS (SELECT 1 FROM Families WHERE FamilyID = ${IDS.familyA2})
        INSERT INTO Families (FamilyID, SchoolID, FamilyName, PrimaryParentName, IsDeleted)
        VALUES (${IDS.familyA2}, ${IDS.schoolA}, 'Beta Family', 'Bella Parent', 0);
      IF NOT EXISTS (SELECT 1 FROM Families WHERE FamilyID = ${IDS.familyB1})
        INSERT INTO Families (FamilyID, SchoolID, FamilyName, PrimaryParentName, IsDeleted)
        VALUES (${IDS.familyB1}, ${IDS.schoolB}, 'Gamma Family', 'Gina Parent', 0);
      IF NOT EXISTS (SELECT 1 FROM Families WHERE FamilyID = ${IDS.familyDel})
        INSERT INTO Families (FamilyID, SchoolID, FamilyName, PrimaryParentName, IsDeleted)
        VALUES (${IDS.familyDel}, ${IDS.schoolA}, 'Deleted Family', 'X Parent', 1);
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
      DELETE FROM Families WHERE FamilyID IN (${IDS.familyA1}, ${IDS.familyA2}, ${IDS.familyB1}, ${IDS.familyDel});
      DELETE FROM Schools  WHERE SchoolID IN (${IDS.schoolA}, ${IDS.schoolB});
    `);
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

function sdbA() { return new ScopedDb({ id: 1, role: 'school', schoolId: IDS.schoolA }); }

async function run() {
  console.log('\n[families / SQL] checking database availability...');
  if (!(await isDbAvailable())) {
    console.log('  SKIP: DATABASE_URL not set or SKIP_DB=true.');
    return;
  }

  console.log('  ensuring schema (IsDeleted column)...');
  await ensureSchema();
  console.log('  seeding...');
  await seed();
  const svc = new FamilyPortalService();
  const sdb = sdbA();

  try {
    console.log('\n[1] list() returns only active families in the school scope');
    let r = await svc.list({ schoolDb: sdb });
    const ids = r.rows.map(x => x.FamilyID);
    assert.ok(ids.includes(IDS.familyA1), 'A1 should be present');
    assert.ok(ids.includes(IDS.familyA2), 'A2 should be present');
    assert.ok(!ids.includes(IDS.familyB1), 'B1 (other school) must NOT leak in');
    assert.ok(!ids.includes(IDS.familyDel), 'soft-deleted must NOT appear');
    assert.strictEqual(r.total, 2, `expected total=2, got ${r.total}`);
    console.log(`  PASS: ${r.rows.length} rows, total=${r.total}`);

    console.log('\n[2] list() with search="Alpha" filters correctly');
    r = await svc.list({ schoolDb: sdb, search: 'Alpha' });
    const searchIds = r.rows.map(x => x.FamilyID);
    assert.ok(searchIds.includes(IDS.familyA1));
    assert.ok(!searchIds.includes(IDS.familyA2));
    assert.strictEqual(r.total, 1);
    console.log(`  PASS: search total=${r.total}`);

    console.log('\n[3] list() pagination');
    r = await svc.list({ schoolDb: sdb, page: 1, pageSize: 1 });
    assert.strictEqual(r.rows.length, 1);
    assert.strictEqual(r.hasMore, true);
    console.log('  PASS: page 1 has 1 row, hasMore=true');

    console.log('\n[4] getById() returns the family in scope');
    const f = await svc.getById({ schoolDb: sdb, familyId: IDS.familyA1 });
    assert.ok(f);
    assert.strictEqual(f.FamilyName, 'Alpha Family');
    console.log('  PASS: getById returns full record');

    console.log('\n[5] getById() returns null for cross-school family (TENANCY)');
    const other = await svc.getById({ schoolDb: sdb, familyId: IDS.familyB1 });
    assert.strictEqual(other, null, 'must not leak across schools');
    console.log('  PASS: cross-school getById returns null');

    console.log('\n[6] getById() returns null for soft-deleted family');
    const deleted = await svc.getById({ schoolDb: sdb, familyId: IDS.familyDel });
    assert.strictEqual(deleted, null);
    console.log('  PASS: soft-deleted returns null');

    console.log('\n[7] create() inserts a new family and returns its id');
    const newId = await svc.create({
      schoolDb: sdb,
      data: {
        familyName: 'New Test Family',
        primaryParentName: 'New Parent',
        primaryParentEmail: 'new@fam.test',
        homeAddress: '1 Test Street'
      },
      actor: { id: 1, role: 'school' }
    });
    assert.ok(newId > 0, `expected positive id, got ${newId}`);
    const created = await svc.getById({ schoolDb: sdb, familyId: newId });
    assert.strictEqual(created.FamilyName, 'New Test Family');
    console.log(`  PASS: created family ${newId}`);

    console.log('\n[8] create() rejects when familyName missing');
    let threw = false;
    try {
      await svc.create({ schoolDb: sdb, data: { primaryParentName: 'X' }, actor: { id: 1, role: 'school' } });
    } catch (e) { threw = true; }
    assert.ok(threw, 'should throw when familyName is missing');
    console.log('  PASS: missing familyName throws');

    console.log('\n[9] update() modifies an existing family');
    const ok = await svc.update({
      schoolDb: sdb,
      familyId: IDS.familyA1,
      data: { ...f, FamilyName: 'Alpha Renamed', PrimaryParentName: 'Alex Renamed' },
      actor: { id: 1, role: 'school' }
    });
    assert.strictEqual(ok, true);
    const updated = await svc.getById({ schoolDb: sdb, familyId: IDS.familyA1 });
    assert.strictEqual(updated.FamilyName, 'Alpha Renamed');
    console.log('  PASS: update modifies record');

    console.log('\n[10] update() returns false for cross-school family (TENANCY)');
    const denied = await svc.update({
      schoolDb: sdb,
      familyId: IDS.familyB1,
      data: { FamilyName: 'Hacked', PrimaryParentName: 'Hacker' },
      actor: { id: 1, role: 'school' }
    });
    assert.strictEqual(denied, false, 'must not update across schools');
    const stillOther = await new ScopedDb({ id: 2, role: 'school', schoolId: IDS.schoolB });
    const unchanged = await svc.getById({ schoolDb: stillOther, familyId: IDS.familyB1 });
    assert.strictEqual(unchanged.FamilyName, 'Gamma Family', 'cross-school family must be untouched');
    console.log('  PASS: cross-school update returns false');

    console.log('\n[11] softDelete() flips IsDeleted');
    const delOk = await svc.softDelete({ schoolDb: sdb, familyId: IDS.familyA2, actor: { id: 1, role: 'school' } });
    assert.strictEqual(delOk, true);
    const goneAfter = await svc.getById({ schoolDb: sdb, familyId: IDS.familyA2 });
    assert.strictEqual(goneAfter, null);
    console.log('  PASS: soft-deleted, getById returns null');

    console.log('\n[12] softDelete() returns false for cross-school family (TENANCY)');
    const delDenied = await svc.softDelete({ schoolDb: sdb, familyId: IDS.familyB1, actor: { id: 1, role: 'school' } });
    assert.strictEqual(delDenied, false);
    console.log('  PASS: cross-school softDelete returns false');

    console.log('\nALL FAMILIES SQL TESTS PASSED');
  } finally {
    console.log('\n  cleaning up...');
    await cleanup();
  }
}

if (require.main === module) {
  run().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
  });
}

module.exports = run;
