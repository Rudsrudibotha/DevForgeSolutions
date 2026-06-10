'use strict';

// SQL-level tests for StudentPortalService.
// Seeds: 1 school, 1 family, 1 class, 3 students (2 active, 1 inactive),
// 2 invoices (1 outstanding).
// Asserts:
//   1. list() returns active students by default, scoped to schoolId.
//   2. list() with status=inactive returns only inactive.
//   3. list() with status=all returns all.
//   4. list() with search filters by name LIKE.
//   5. list() with classId filters by class.
//   6. list() pagination returns total count and hasMore.
//   7. getById() returns the student when in scope.
//   8. getById() returns null for a different school's student (TENANCY).
//   9. listClasses() returns only the school's classes.
//   10. softDelete() flips IsDeleted and IsActive.
//
// Auto-skips without DATABASE_URL.

const assert = require('assert');
const { getPool, sql } = require('../src/data/db');
const { ScopedDb } = require('../src/data/scopedDb');
const StudentPortalService = require('../src/business/studentPortalService');

const IDS = {
  schoolA: 92001,
  schoolB: 92002,
  classA:  92010,
  familyA: 92020,
  studentA1: 92030,  // active, in class
  studentA2: 92031,  // active, no class
  studentA3: 92032,  // inactive
  studentB1: 92033   // different school - tenancy check
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
        VALUES (${IDS.schoolA}, 'StuTest A', 'Active', 'ZAR', 'R', 'Standard');
      IF NOT EXISTS (SELECT 1 FROM Schools WHERE SchoolID = ${IDS.schoolB})
        INSERT INTO Schools (SchoolID, SchoolName, SubscriptionStatus, CurrencyCode, CurrencySymbol, SubscriptionPlan)
        VALUES (${IDS.schoolB}, 'StuTest B', 'Active', 'ZAR', 'R', 'Standard');

      IF NOT EXISTS (SELECT 1 FROM Classes WHERE ClassID = ${IDS.classA})
        INSERT INTO Classes (ClassID, SchoolID, ClassName, Grade, IsActive)
        VALUES (${IDS.classA}, ${IDS.schoolA}, 'Test Class A', 1, 1);

      IF NOT EXISTS (SELECT 1 FROM Families WHERE FamilyID = ${IDS.familyA})
        INSERT INTO Families (FamilyID, SchoolID, FamilyName, PrimaryParentName) VALUES (${IDS.familyA}, ${IDS.schoolA}, 'StuTest Family', 'Parent A');

      IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = ${IDS.studentA1})
        INSERT INTO Students (StudentID, SchoolID, FamilyID, FirstName, LastName, ClassID, IsActive, EnrolledDate, CurrentAcademicYear, BillingDate)
        VALUES (${IDS.studentA1}, ${IDS.schoolA}, ${IDS.familyA}, 'Alex',  'Active',   ${IDS.classA}, 1, GETDATE(), YEAR(GETDATE()), GETDATE());
      IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = ${IDS.studentA2})
        INSERT INTO Students (StudentID, SchoolID, FamilyID, FirstName, LastName, ClassID, IsActive, EnrolledDate, CurrentAcademicYear, BillingDate)
        VALUES (${IDS.studentA2}, ${IDS.schoolA}, ${IDS.familyA}, 'Bella', 'Active',   NULL,         1, GETDATE(), YEAR(GETDATE()), GETDATE());
      IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = ${IDS.studentA3})
        INSERT INTO Students (StudentID, SchoolID, FamilyID, FirstName, LastName, ClassID, IsActive, EnrolledDate, CurrentAcademicYear, BillingDate)
        VALUES (${IDS.studentA3}, ${IDS.schoolA}, ${IDS.familyA}, 'Carl',  'Inactive', NULL,         0, GETDATE(), YEAR(GETDATE()), GETDATE());
      IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = ${IDS.studentB1})
        INSERT INTO Students (StudentID, SchoolID, FamilyID, FirstName, LastName, ClassID, IsActive, EnrolledDate, CurrentAcademicYear, BillingDate)
        VALUES (${IDS.studentB1}, ${IDS.schoolB}, ${IDS.familyA}, 'Dana',  'OtherSchool', NULL,     1, GETDATE(), YEAR(GETDATE()), GETDATE());
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
      DELETE FROM Students WHERE StudentID IN (${IDS.studentA1}, ${IDS.studentA2}, ${IDS.studentA3}, ${IDS.studentB1});
      DELETE FROM Classes  WHERE ClassID = ${IDS.classA};
      DELETE FROM Families WHERE FamilyID = ${IDS.familyA};
      DELETE FROM Schools  WHERE SchoolID IN (${IDS.schoolA}, ${IDS.schoolB});
    `);
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

function schoolDbA() { return new ScopedDb({ id: 1, role: 'school', schoolId: IDS.schoolA }); }

async function run() {
  console.log('\n[students / SQL] checking database availability...');
  if (!(await isDbAvailable())) {
    console.log('  SKIP: DATABASE_URL not set or SKIP_DB=true.');
    return;
  }

  console.log('  seeding...');
  await seed();
  const svc = new StudentPortalService();
  const sdb = schoolDbA();

  try {
    console.log('\n[1] list() defaults to active students only');
    let r = await svc.list({ schoolDb: sdb });
    const ids = r.rows.map(x => x.StudentID);
    assert.ok(ids.includes(IDS.studentA1), 'A1 active should be present');
    assert.ok(ids.includes(IDS.studentA2), 'A2 active should be present');
    assert.ok(!ids.includes(IDS.studentA3), 'A3 inactive should NOT be present');
    assert.ok(!ids.includes(IDS.studentB1), 'B1 other school must NOT leak in');
    assert.strictEqual(r.total, 2, `expected total=2, got ${r.total}`);
    console.log(`  PASS: ${r.rows.length} rows, total=${r.total}`);

    console.log('\n[2] list() with status=inactive returns inactive only');
    r = await svc.list({ schoolDb: sdb, status: 'inactive' });
    const inactIds = r.rows.map(x => x.StudentID);
    assert.ok(inactIds.includes(IDS.studentA3), 'A3 inactive should be present');
    assert.ok(!inactIds.includes(IDS.studentA1), 'A1 active should NOT be present');
    assert.strictEqual(r.total, 1);
    console.log(`  PASS: inactive total=${r.total}`);

    console.log('\n[3] list() with status=all returns all 3');
    r = await svc.list({ schoolDb: sdb, status: 'all' });
    assert.strictEqual(r.total, 3, `expected total=3, got ${r.total}`);
    console.log(`  PASS: all status total=${r.total}`);

    console.log('\n[4] list() with search="alex" returns only Alex');
    r = await svc.list({ schoolDb: sdb, search: 'alex', status: 'all' });
    const searchIds = r.rows.map(x => x.StudentID);
    assert.ok(searchIds.includes(IDS.studentA1), 'Alex should be found');
    assert.ok(!searchIds.includes(IDS.studentA2), 'Bella should NOT be found');
    console.log(`  PASS: search total=${r.total}`);

    console.log('\n[5] list() with classId filter');
    r = await svc.list({ schoolDb: sdb, classId: IDS.classA, status: 'all' });
    const classIds = r.rows.map(x => x.StudentID);
    assert.ok(classIds.includes(IDS.studentA1), 'A1 in class should be present');
    assert.ok(!classIds.includes(IDS.studentA2), 'A2 not in class should NOT be present');
    assert.strictEqual(r.total, 1, `expected total=1, got ${r.total}`);
    console.log('  PASS: classId filter works');

    console.log('\n[6] list() pagination');
    r = await svc.list({ schoolDb: sdb, status: 'all', page: 1, pageSize: 2 });
    assert.strictEqual(r.rows.length, 2);
    assert.strictEqual(r.page, 1);
    assert.strictEqual(r.hasMore, true);
    assert.strictEqual(r.total, 3);
    console.log('  PASS: page 1 has 2 rows, hasMore=true');

    r = await svc.list({ schoolDb: sdb, status: 'all', page: 2, pageSize: 2 });
    assert.strictEqual(r.rows.length, 1);
    assert.strictEqual(r.hasMore, false);
    console.log('  PASS: page 2 has 1 row, hasMore=false');

    console.log('\n[7] getById() returns the student when in scope');
    const s = await svc.getById({ schoolDb: sdb, studentId: IDS.studentA1 });
    assert.ok(s, 'should return student');
    assert.strictEqual(s.StudentID, IDS.studentA1);
    assert.strictEqual(s.FirstName, 'Alex');
    console.log('  PASS: getById returns full record');

    console.log('\n[8] getById() returns null for a student in a DIFFERENT school (TENANCY)');
    const otherSchool = await svc.getById({ schoolDb: sdb, studentId: IDS.studentB1 });
    assert.strictEqual(otherSchool, null, 'must NOT leak across schools');
    console.log('  PASS: cross-school getById returns null');

    console.log('\n[9] listClasses() returns only the school\'s classes');
    const classes = await svc.listClasses({ schoolDb: sdb });
    assert.ok(classes.find(c => c.ClassID === IDS.classA), 'classA should be listed');
    assert.ok(classes.length === 1, `expected 1 class, got ${classes.length}`);
    console.log(`  PASS: ${classes.length} class(es)`);

    console.log('\n[10] softDelete() flips IsDeleted and IsActive');
    const ok = await svc.softDelete({ schoolDb: sdb, studentId: IDS.studentA1, actor: { id: 1, role: 'school' } });
    assert.strictEqual(ok, true);
    const after = await svc.getById({ schoolDb: sdb, studentId: IDS.studentA1 });
    assert.strictEqual(after, null, 'soft-deleted student should not be returned by getById');
    console.log('  PASS: soft-deleted, getById returns null');

    console.log('\n[11] softDelete() on a different school\'s student returns false (TENANCY)');
    const denied = await svc.softDelete({ schoolDb: sdb, studentId: IDS.studentB1, actor: { id: 1, role: 'school' } });
    assert.strictEqual(denied, false, 'must NOT delete across schools');
    console.log('  PASS: cross-school softDelete returns false');

    console.log('\nALL STUDENTS SQL TESTS PASSED');
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
