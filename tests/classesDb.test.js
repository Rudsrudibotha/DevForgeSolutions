'use strict';

// SQL-level tests for ClassPortalService.
// Seeds: 2 schools, 2 employees, 3 classes (2 in schoolA, 1 in schoolB),
// 1 already-soft-deleted class, students assigned to classes.
// Asserts: list, getById, getRoster, listGrades, listTeachers, create,
// update, softDelete (unassigns students).

const assert = require('assert');
const { getPool, sql } = require('../src/data/db');
const { ScopedDb } = require('../src/data/scopedDb');
const ClassPortalService = require('../src/business/classPortalService');

const IDS = {
  schoolA: 94001,
  schoolB: 94002,
  familyA: 94010,
  classA1: 94020,  // schoolA, active
  classA2: 94021,  // schoolA, active, with students
  classB1: 94022,  // schoolB
  classDel: 94023, // schoolA, soft-deleted
  teacherA: 94030,
  teacherB: 94031,
  studentA1: 94040,
  studentA2: 94041
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
  const pool = await getPool();
  await pool.request().query(`
    IF COL_LENGTH('dbo.Classes', 'IsDeleted') IS NULL
      ALTER TABLE dbo.Classes ADD IsDeleted BIT NOT NULL DEFAULT 0;
    IF COL_LENGTH('dbo.Classes', 'Grade') IS NULL
      ALTER TABLE dbo.Classes ADD Grade NVARCHAR(20) NULL;
    IF COL_LENGTH('dbo.Classes', 'Room') IS NULL
      ALTER TABLE dbo.Classes ADD Room NVARCHAR(50) NULL;
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
        VALUES (${IDS.schoolA}, 'ClsTest A', 'Active', 'ZAR', 'R', 'Standard');
      IF NOT EXISTS (SELECT 1 FROM Schools WHERE SchoolID = ${IDS.schoolB})
        INSERT INTO Schools (SchoolID, SchoolName, SubscriptionStatus, CurrencyCode, CurrencySymbol, SubscriptionPlan)
        VALUES (${IDS.schoolB}, 'ClsTest B', 'Active', 'ZAR', 'R', 'Standard');

      IF NOT EXISTS (SELECT 1 FROM Families WHERE FamilyID = ${IDS.familyA})
        INSERT INTO Families (FamilyID, SchoolID, FamilyName, PrimaryParentName) VALUES (${IDS.familyA}, ${IDS.schoolA}, 'ClsTest Family', 'Parent');

      IF NOT EXISTS (SELECT 1 FROM Employees WHERE EmployeeID = ${IDS.teacherA})
        INSERT INTO Employees (EmployeeID, SchoolID, FirstName, LastName, EmployeeNumber, IsActive)
        VALUES (${IDS.teacherA}, ${IDS.schoolA}, 'Alice', 'Teacher', 'T-001', 1);
      IF NOT EXISTS (SELECT 1 FROM Employees WHERE EmployeeID = ${IDS.teacherB})
        INSERT INTO Employees (EmployeeID, SchoolID, FirstName, LastName, EmployeeNumber, IsActive)
        VALUES (${IDS.teacherB}, ${IDS.schoolA}, 'Bob', 'Teacher', 'T-002', 1);

      IF NOT EXISTS (SELECT 1 FROM Classes WHERE ClassID = ${IDS.classA1})
        INSERT INTO Classes (ClassID, SchoolID, ClassName, Grade, Room, Capacity, ActiveYear, IsActive, IsDeleted)
        VALUES (${IDS.classA1}, ${IDS.schoolA}, 'Class A1', '1', 'Room 1', 30, YEAR(GETDATE()), 1, 0);
      IF NOT EXISTS (SELECT 1 FROM Classes WHERE ClassID = ${IDS.classA2})
        INSERT INTO Classes (ClassID, SchoolID, ClassName, Grade, Room, Capacity, ActiveYear, IsActive, IsDeleted, TeacherID)
        VALUES (${IDS.classA2}, ${IDS.schoolA}, 'Class A2', '2', 'Room 2', 25, YEAR(GETDATE()), 1, 0, ${IDS.teacherA});
      IF NOT EXISTS (SELECT 1 FROM Classes WHERE ClassID = ${IDS.classB1})
        INSERT INTO Classes (ClassID, SchoolID, ClassName, Grade, ActiveYear, IsActive, IsDeleted)
        VALUES (${IDS.classB1}, ${IDS.schoolB}, 'Class B1', '1', YEAR(GETDATE()), 1, 0);
      IF NOT EXISTS (SELECT 1 FROM Classes WHERE ClassID = ${IDS.classDel})
        INSERT INTO Classes (ClassID, SchoolID, ClassName, Grade, ActiveYear, IsActive, IsDeleted)
        VALUES (${IDS.classDel}, ${IDS.schoolA}, 'Deleted', 'X', YEAR(GETDATE()), 0, 1);

      IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = ${IDS.studentA1})
        INSERT INTO Students (StudentID, SchoolID, FamilyID, FirstName, LastName, ClassID, IsActive, EnrolledDate, CurrentAcademicYear, BillingDate)
        VALUES (${IDS.studentA1}, ${IDS.schoolA}, ${IDS.familyA}, 'Stu', 'One', ${IDS.classA2}, 1, GETDATE(), YEAR(GETDATE()), GETDATE());
      IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = ${IDS.studentA2})
        INSERT INTO Students (StudentID, SchoolID, FamilyID, FirstName, LastName, ClassID, IsActive, EnrolledDate, CurrentAcademicYear, BillingDate)
        VALUES (${IDS.studentA2}, ${IDS.schoolA}, ${IDS.familyA}, 'Stu', 'Two', ${IDS.classA2}, 1, GETDATE(), YEAR(GETDATE()), GETDATE());
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
      DELETE FROM Students   WHERE StudentID IN (${IDS.studentA1}, ${IDS.studentA2});
      DELETE FROM Classes    WHERE ClassID IN (${IDS.classA1}, ${IDS.classA2}, ${IDS.classB1}, ${IDS.classDel});
      DELETE FROM Employees  WHERE EmployeeID IN (${IDS.teacherA}, ${IDS.teacherB});
      DELETE FROM Families   WHERE FamilyID = ${IDS.familyA};
      DELETE FROM Schools    WHERE SchoolID IN (${IDS.schoolA}, ${IDS.schoolB});
    `);
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

function sdbA() { return new ScopedDb({ id: 1, role: 'school', schoolId: IDS.schoolA }); }

async function run() {
  console.log('\n[classes / SQL] checking database availability...');
  if (!(await isDbAvailable())) {
    console.log('  SKIP: DATABASE_URL not set or SKIP_DB=true.');
    return;
  }
  console.log('  ensuring schema...');
  await ensureSchema();
  console.log('  seeding...');
  await seed();
  const svc = new ClassPortalService();
  const sdb = sdbA();

  try {
    console.log('\n[1] list() returns only active classes in scope');
    let r = await svc.list({ schoolDb: sdb });
    const ids = r.rows.map(x => x.ClassID);
    assert.ok(ids.includes(IDS.classA1), 'A1 should be present');
    assert.ok(ids.includes(IDS.classA2), 'A2 should be present');
    assert.ok(!ids.includes(IDS.classB1), 'B1 (other school) must NOT leak in');
    assert.ok(!ids.includes(IDS.classDel), 'soft-deleted must NOT appear');
    assert.strictEqual(r.total, 2, `expected total=2, got ${r.total}`);
    console.log(`  PASS: ${r.rows.length} rows, total=${r.total}`);

    console.log('\n[2] list() with grade="1" filter');
    r = await svc.list({ schoolDb: sdb, grade: '1' });
    const gradeIds = r.rows.map(x => x.ClassID);
    assert.ok(gradeIds.includes(IDS.classA1));
    assert.ok(!gradeIds.includes(IDS.classA2));
    assert.strictEqual(r.total, 1);
    console.log('  PASS: grade filter works');

    console.log('\n[3] list() with search="Class"');
    r = await svc.list({ schoolDb: sdb, search: 'Class' });
    assert.ok(r.total >= 2);
    console.log(`  PASS: search total=${r.total}`);

    console.log('\n[4] list() with status=all includes inactive but not deleted');
    r = await svc.list({ schoolDb: sdb, status: 'all' });
    const allIds = r.rows.map(x => x.ClassID);
    assert.ok(!allIds.includes(IDS.classDel), 'soft-deleted must NOT appear in all');
    console.log(`  PASS: status=all total=${r.total}, soft-deleted excluded`);

    console.log('\n[5] getById() returns the class in scope');
    const c = await svc.getById({ schoolDb: sdb, classId: IDS.classA2 });
    assert.ok(c);
    assert.strictEqual(c.ClassName, 'Class A2');
    assert.strictEqual(c.TeacherName, 'Alice Teacher');
    console.log('  PASS: getById returns full record with teacher name');

    console.log('\n[6] getById() returns null for cross-school class (TENANCY)');
    const other = await svc.getById({ schoolDb: sdb, classId: IDS.classB1 });
    assert.strictEqual(other, null);
    console.log('  PASS: cross-school getById returns null');

    console.log('\n[7] getRoster() returns students in the class');
    const roster = await svc.getRoster({ schoolDb: sdb, classId: IDS.classA2 });
    assert.strictEqual(roster.length, 2, `expected 2 students, got ${roster.length}`);
    const rIds = roster.map(s => s.StudentID);
    assert.ok(rIds.includes(IDS.studentA1));
    assert.ok(rIds.includes(IDS.studentA2));
    console.log(`  PASS: roster has ${roster.length} students`);

    console.log('\n[8] getRoster() returns empty for empty class');
    const empty = await svc.getRoster({ schoolDb: sdb, classId: IDS.classA1 });
    assert.strictEqual(empty.length, 0);
    console.log('  PASS: empty class returns empty roster');

    console.log('\n[9] listGrades() returns distinct grades');
    const grades = await svc.listGrades({ schoolDb: sdb });
    assert.ok(grades.includes('1'));
    assert.ok(grades.includes('2'));
    console.log(`  PASS: grades = ${JSON.stringify(grades)}`);

    console.log('\n[10] listTeachers() returns active employees in school');
    const teachers = await svc.listTeachers({ schoolDb: sdb });
    const tIds = teachers.map(t => t.EmployeeID);
    assert.ok(tIds.includes(IDS.teacherA));
    assert.ok(tIds.includes(IDS.teacherB));
    console.log(`  PASS: ${teachers.length} teachers`);

    console.log('\n[11] create() inserts a new class');
    const newId = await svc.create({
      schoolDb: sdb,
      data: { className: 'Newly Created', grade: '3', room: 'R3', capacity: 20, activeYear: 2026, isActive: true },
      actor: { id: 1, role: 'school' }
    });
    assert.ok(newId > 0);
    const created = await svc.getById({ schoolDb: sdb, classId: newId });
    assert.strictEqual(created.ClassName, 'Newly Created');
    console.log(`  PASS: created class ${newId}`);

    console.log('\n[12] create() rejects when className missing');
    let threw = false;
    try { await svc.create({ schoolDb: sdb, data: { grade: '1' }, actor: { id: 1, role: 'school' } }); }
    catch (e) { threw = true; }
    assert.ok(threw);
    console.log('  PASS: missing className throws');

    console.log('\n[13] update() modifies the class');
    const upd = await svc.update({
      schoolDb: sdb,
      classId: IDS.classA1,
      data: { className: 'A1 Renamed', grade: '1', capacity: 35, isActive: true },
      actor: { id: 1, role: 'school' }
    });
    assert.strictEqual(upd, true);
    const after = await svc.getById({ schoolDb: sdb, classId: IDS.classA1 });
    assert.strictEqual(after.ClassName, 'A1 Renamed');
    assert.strictEqual(after.Capacity, 35);
    console.log('  PASS: update modifies record');

    console.log('\n[14] update() returns false for cross-school (TENANCY)');
    const denied = await svc.update({
      schoolDb: sdb,
      classId: IDS.classB1,
      data: { className: 'Hacked', isActive: true },
      actor: { id: 1, role: 'school' }
    });
    assert.strictEqual(denied, false);
    console.log('  PASS: cross-school update returns false');

    console.log('\n[15] softDelete() unassigns students + flips IsDeleted');
    const delOk = await svc.softDelete({ schoolDb: sdb, classId: IDS.classA2, actor: { id: 1, role: 'school' } });
    assert.strictEqual(delOk, true);
    // After delete, getById should return null
    const goneAfter = await svc.getById({ schoolDb: sdb, classId: IDS.classA2 });
    assert.strictEqual(goneAfter, null);
    // And the students should be unassigned
    const studentsAfter = await svc.getRoster({ schoolDb: sdb, classId: IDS.classA2 });
    assert.strictEqual(studentsAfter.length, 0);
    // Verify the students themselves still exist (we only unassigned them)
    const pool = await getPool();
    const stillThere = await pool.request().input('id', sql.Int, IDS.studentA1)
      .query('SELECT ClassID FROM Students WHERE StudentID = @id');
    assert.strictEqual(stillThere.recordset[0].ClassID, null, 'student should have ClassID=NULL after class delete');
    console.log('  PASS: class deleted, students unassigned but preserved');

    console.log('\n[16] softDelete() returns false for cross-school (TENANCY)');
    const delDenied = await svc.softDelete({ schoolDb: sdb, classId: IDS.classB1, actor: { id: 1, role: 'school' } });
    assert.strictEqual(delDenied, false);
    console.log('  PASS: cross-school softDelete returns false');

    console.log('\nALL CLASSES SQL TESTS PASSED');
  } finally {
    console.log('\n  cleaning up...');
    await cleanup();
  }
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
