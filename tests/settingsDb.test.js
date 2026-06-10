'use strict';

// SQL-level tests for SettingsPortalService.

const assert = require('assert');
const { getPool, sql } = require('../src/data/db');
const { ScopedDb } = require('../src/data/scopedDb');
const SettingsPortalService = require('../src/business/settingsPortalService');

const IDS = {
  schoolA: 101001,
  schoolB: 101002,
  cat1: 101010
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
        VALUES (${IDS.schoolA}, 'SettingsTest A', 'Active', 'ZAR', 'R', 'Standard');
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
      DELETE FROM BillingCategories WHERE SchoolID = ${IDS.schoolA};
      DELETE FROM Schools WHERE SchoolID = ${IDS.schoolA};
    `);
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

function sdbA() { return new ScopedDb({ id: 1, role: 'school', schoolId: IDS.schoolA }); }

async function run() {
  console.log('\n[settings / SQL] checking database availability...');
  if (!(await isDbAvailable())) {
    console.log('  SKIP: DATABASE_URL not set or SKIP_DB=true.');
    return;
  }
  console.log('  seeding...');
  await seed();
  const svc = new SettingsPortalService();
  const sdb = sdbA();

  try {
    console.log('\n[1] getSchool() returns the school');
    let school = await svc.getSchool({ schoolDb: sdb });
    assert.ok(school);
    assert.strictEqual(school.SchoolName, 'SettingsTest A');
    assert.strictEqual(school.CurrencyCode, 'ZAR');
    console.log('  PASS: getSchool returns full record');

    console.log('\n[2] updateSchool() modifies the school');
    const ok = await svc.updateSchool({
      schoolDb: sdb,
      data: {
        schoolName: 'SettingsTest A Renamed',
        address: '42 Test Lane',
        contactPerson: 'Test Director',
        contactEmail: 'director@settings.test',
        contactPhone: '+27123456789',
        website: 'https://settings.test',
        paymentInstructions: 'EFT to FNB 12345',
        currencyCode: 'ZAR',
        currencySymbol: 'R',
        defaultMonthlyFee: 1750
      },
      actor: { id: 1, role: 'school' }
    });
    assert.strictEqual(ok, true);
    school = await svc.getSchool({ schoolDb: sdb });
    assert.strictEqual(school.SchoolName, 'SettingsTest A Renamed');
    assert.strictEqual(school.DefaultMonthlyFee, 1750);
    assert.strictEqual(school.PaymentInstructions, 'EFT to FNB 12345');
    console.log('  PASS: school updated');

    console.log('\n[3] getSchool() cross-school returns null (TENANCY)');
    const sdbB = new ScopedDb({ id: 2, role: 'school', schoolId: IDS.schoolB });
    const other = await svc.getSchool({ schoolDb: sdbB });
    assert.strictEqual(other, null);
    console.log('  PASS: cross-school getSchool returns null');

    console.log('\n[4] listBillingCategories() returns empty initially');
    let cats = await svc.listBillingCategories({ schoolDb: sdb });
    assert.strictEqual(cats.length, 0);
    console.log('  PASS: empty');

    console.log('\n[5] createBillingCategory() inserts');
    const newId = await svc.createBillingCategory({
      schoolDb: sdb,
      data: { categoryName: 'Tuition', description: 'Monthly tuition fee', baseAmount: 1500, frequency: 'Monthly' },
      actor: { id: 1, role: 'school' }
    });
    assert.ok(newId);
    cats = await svc.listBillingCategories({ schoolDb: sdb });
    assert.strictEqual(cats.length, 1);
    assert.strictEqual(cats[0].CategoryName, 'Tuition');
    console.log('  PASS: created category');

    console.log('\n[6] createBillingCategory() throws on missing name');
    let threw = false;
    try { await svc.createBillingCategory({ schoolDb: sdb, data: { baseAmount: 100, frequency: 'Monthly' }, actor: { id: 1, role: 'school' } }); }
    catch (e) { threw = true; }
    assert.ok(threw);
    console.log('  PASS: missing name throws');

    console.log('\n[7] createBillingCategory() throws on invalid frequency');
    threw = false;
    try { await svc.createBillingCategory({ schoolDb: sdb, data: { categoryName: 'X', baseAmount: 100, frequency: 'BOGUS' }, actor: { id: 1, role: 'school' } }); }
    catch (e) { threw = true; }
    assert.ok(threw);
    console.log('  PASS: invalid frequency throws');

    console.log('\n[8] createBillingCategory() throws on negative amount');
    threw = false;
    try { await svc.createBillingCategory({ schoolDb: sdb, data: { categoryName: 'X', baseAmount: -10, frequency: 'Monthly' }, actor: { id: 1, role: 'school' } }); }
    catch (e) { threw = true; }
    assert.ok(threw);
    console.log('  PASS: negative amount throws');

    console.log('\n[9] updateBillingCategory() modifies the category');
    const u = await svc.updateBillingCategory({
      schoolDb: sdb,
      categoryId: newId,
      data: { categoryName: 'Tuition (renamed)', baseAmount: 2000 },
      actor: { id: 1, role: 'school' }
    });
    assert.strictEqual(u, true);
    cats = await svc.listBillingCategories({ schoolDb: sdb });
    assert.strictEqual(cats[0].CategoryName, 'Tuition (renamed)');
    assert.strictEqual(Number(cats[0].BaseAmount), 2000);
    console.log('  PASS: update works');

    console.log('\n[10] updateBillingCategory() returns false for cross-school (TENANCY)');
    const denied = await svc.updateBillingCategory({
      schoolDb: sdbB, categoryId: newId, data: { isActive: 0 }, actor: { id: 1, role: 'school' }
    });
    assert.strictEqual(denied, false);
    console.log('  PASS: cross-school update returns false');

    console.log('\n[11] softDeleteBillingCategory() flips IsActive to 0');
    const delOk = await svc.softDeleteBillingCategory({ schoolDb: sdb, categoryId: newId, actor: { id: 1, role: 'school' } });
    assert.strictEqual(delOk, true);
    cats = await svc.listBillingCategories({ schoolDb: sdb });
    // soft-deleted should still appear in list but with IsActive=0
    const found = cats.find(c => c.BillingCategoryID === newId);
    assert.ok(found);
    assert.strictEqual(found.IsActive, 0);
    console.log('  PASS: soft-deleted, IsActive=0');

    console.log('\nALL SETTINGS SQL TESTS PASSED');
  } finally {
    console.log('\n  cleaning up...');
    await cleanup();
  }
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
