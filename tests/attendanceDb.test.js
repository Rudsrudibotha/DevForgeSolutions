'use strict';

// SQL-level tests for AttendancePortalService.
// Seeds: school, family, class, 3 students, attendance for 2 of them.
// Asserts: getClassSheet (returns mixed: present+absent+unrecorded),
// recordBulk (insert + update in one call), idempotency,
// getStudentHistory, getClassSummary.

const assert = require('assert');
const { getPool, sql } = require('../src/data/db');
const { ScopedDb } = require('../src/data/scopedDb');
const AttendancePortalService = require('../src/business/attendancePortalService');

const IDS = {
  schoolA: 95001,
  schoolB: 95002,
  familyA: 95010,
  classA: 95020,
  student1: 95030,
  student2: 95031,
  student3: 95032
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
        VALUES (${IDS.schoolA}, 'AttTest A', 'Active', 'ZAR', 'R', 'Standard');
      IF NOT EXISTS (SELECT 1 FROM Schools WHERE SchoolID = ${IDS.schoolB})
        INSERT INTO Schools (SchoolID, SchoolName, SubscriptionStatus, CurrencyCode, CurrencySymbol, SubscriptionPlan)
        VALUES (${IDS.schoolB}, 'AttTest B', 'Active', 'ZAR', 'R', 'Standard');

      IF NOT EXISTS (SELECT 1 FROM Families WHERE FamilyID = ${IDS.familyA})
        INSERT INTO Families (FamilyID, SchoolID, FamilyName, PrimaryParentName) VALUES (${IDS.familyA}, ${IDS.schoolA}, 'AttTest Family', 'Parent');

      IF NOT EXISTS (SELECT 1 FROM Classes WHERE ClassID = ${IDS.classA})
        INSERT INTO Classes (ClassID, SchoolID, ClassName, Grade, ActiveYear, IsActive, IsDeleted)
        VALUES (${IDS.classA}, ${IDS.schoolA}, 'AttTest Class', '1', YEAR(GETDATE()), 1, 0);

      IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = ${IDS.student1})
        INSERT INTO Students (StudentID, SchoolID, FamilyID, FirstName, LastName, ClassID, IsActive, EnrolledDate, CurrentAcademicYear, BillingDate)
        VALUES (${IDS.student1}, ${IDS.schoolA}, ${IDS.familyA}, 'Stu', 'One', ${IDS.classA}, 1, GETDATE(), YEAR(GETDATE()), GETDATE());
      IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = ${IDS.student2})
        INSERT INTO Students (StudentID, SchoolID, FamilyID, FirstName, LastName, ClassID, IsActive, EnrolledDate, CurrentAcademicYear, BillingDate)
        VALUES (${IDS.student2}, ${IDS.schoolA}, ${IDS.familyA}, 'Stu', 'Two', ${IDS.classA}, 1, GETDATE(), YEAR(GETDATE()), GETDATE());
      IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = ${IDS.student3})
        INSERT INTO Students (StudentID, SchoolID, FamilyID, FirstName, LastName, ClassID, IsActive, EnrolledDate, CurrentAcademicYear, BillingDate)
        VALUES (${IDS.student3}, ${IDS.schoolA}, ${IDS.familyA}, 'Stu', 'Three', ${IDS.classA}, 1, GETDATE(), YEAR(GETDATE()), GETDATE());
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
      DELETE FROM Attendance WHERE SchoolID IN (${IDS.schoolA}, ${IDS.schoolB});
      DELETE FROM Students   WHERE StudentID IN (${IDS.student1}, ${IDS.student2}, ${IDS.student3});
      DELETE FROM Classes    WHERE ClassID = ${IDS.classA};
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
  console.log('\n[attendance / SQL] checking database availability...');
  if (!(await isDbAvailable())) {
    console.log('  SKIP: DATABASE_URL not set or SKIP_DB=true.');
    return;
  }
  console.log('  seeding...');
  await seed();
  const svc = new AttendancePortalService();
  const sdb = sdbA();

  try {
    const today = new Date().toISOString().slice(0, 10);

    console.log('\n[1] getClassSheet() with no records returns 3 students, all null status');
    let sheet = await svc.getClassSheet({ schoolDb: sdb, classId: IDS.classA, date: today });
    assert.strictEqual(sheet.rows.length, 3);
    assert.strictEqual(sheet.rows.filter(r => r.Status === null).length, 3);
    console.log(`  PASS: 3 students, all unrecorded`);

    console.log('\n[2] recordBulk() inserts first batch');
    const r1 = await svc.recordBulk({
      schoolDb: sdb,
      classId: IDS.classA,
      date: today,
      records: [
        { studentId: IDS.student1, status: 'Present' },
        { studentId: IDS.student2, status: 'Absent', notes: 'Sick' },
        { studentId: IDS.student3, status: 'Late' }
      ],
      actor: { id: 1, role: 'school' }
    });
    assert.strictEqual(r1.inserted, 3, `expected 3 inserted, got ${r1.inserted}`);
    assert.strictEqual(r1.updated, 0);
    console.log(`  PASS: 3 inserted, 0 updated`);

    console.log('\n[3] getClassSheet() now returns the recorded statuses');
    sheet = await svc.getClassSheet({ schoolDb: sdb, classId: IDS.classA, date: today });
    const byId = {};
    sheet.rows.forEach(r => { byId[r.StudentID] = r; });
    assert.strictEqual(byId[IDS.student1].Status, 'Present');
    assert.strictEqual(byId[IDS.student2].Status, 'Absent');
    assert.strictEqual(byId[IDS.student2].Notes, 'Sick');
    assert.strictEqual(byId[IDS.student3].Status, 'Late');
    console.log('  PASS: 3 students with correct statuses + notes');

    console.log('\n[4] recordBulk() updates existing rows (idempotent)');
    const r2 = await svc.recordBulk({
      schoolDb: sdb,
      classId: IDS.classA,
      date: today,
      records: [
        { studentId: IDS.student1, status: 'Absent' },     // was Present
        { studentId: IDS.student2, status: 'Excused' }   // was Absent
      ],
      actor: { id: 1, role: 'school' }
    });
    assert.strictEqual(r2.inserted, 0, `expected 0 inserted, got ${r2.inserted}`);
    assert.strictEqual(r2.updated, 2, `expected 2 updated, got ${r2.updated}`);
    sheet = await svc.getClassSheet({ schoolDb: sdb, classId: IDS.classA, date: today });
    const byId2 = {};
    sheet.rows.forEach(r => { byId2[r.StudentID] = r; });
    assert.strictEqual(byId2[IDS.student1].Status, 'Absent');
    assert.strictEqual(byId2[IDS.student2].Status, 'Excused');
    console.log('  PASS: idempotent update, no duplicate rows');

    console.log('\n[5] recordBulk() throws on invalid status');
    let threw = false;
    try {
      await svc.recordBulk({
        schoolDb: sdb, classId: IDS.classA, date: today,
        records: [{ studentId: IDS.student1, status: 'Maybe' }],
        actor: { id: 1, role: 'school' }
      });
    } catch (e) { threw = true; }
    assert.ok(threw, 'should throw on invalid status');
    console.log('  PASS: invalid status throws');

    console.log('\n[6] getStudentHistory() returns this student\'s recent attendance');
    const history = await svc.getStudentHistory({ schoolDb: sdb, studentId: IDS.student1, days: 7 });
    assert.ok(history.length >= 1, `expected at least 1 record, got ${history.length}`);
    assert.strictEqual(history[0].Status, 'Absent');
    console.log(`  PASS: history has ${history.length} record(s)`);

    console.log('\n[7] getClassSummary() aggregates by status');
    const summary = await svc.getClassSummary({ schoolDb: sdb, classId: IDS.classA, days: 7 });
    assert.ok(summary);
    assert.strictEqual(summary.totals.Absent, 1);
    assert.strictEqual(summary.totals.Excused, 1);
    assert.strictEqual(summary.totals.Late, 1);
    assert.strictEqual(summary.total, 3);
    console.log(`  PASS: summary = ${JSON.stringify(summary.totals)}`);

    console.log('\n[8] getClassSheet() respects cross-school scope (TENANCY)');
    // Use a different school's scope
    const sdbB = new ScopedDb({ id: 1, role: 'school', schoolId: IDS.schoolB });
    const otherSheet = await svc.getClassSheet({ schoolDb: sdbB, classId: IDS.classA, date: today });
    assert.strictEqual(otherSheet.rows.length, 0, 'cross-school class must return empty');
    console.log('  PASS: cross-school class returns empty');

    console.log('\n[9] getClassSheet() returns null for invalid classId');
    const badSheet = await svc.getClassSheet({ schoolDb: sdb, classId: -1, date: today });
    assert.strictEqual(badSheet, null);
    console.log('  PASS: invalid classId returns null');

    console.log('\n[10] recordBulk() with empty records returns zero counts');
    const r3 = await svc.recordBulk({
      schoolDb: sdb, classId: IDS.classA, date: today, records: [], actor: { id: 1, role: 'school' }
    });
    assert.strictEqual(r3.inserted, 0);
    assert.strictEqual(r3.updated, 0);
    console.log('  PASS: empty records returns {0, 0}');

    console.log('\nALL ATTENDANCE SQL TESTS PASSED');
  } finally {
    console.log('\n  cleaning up...');
    await cleanup();
  }
}

if (require.main === module) {
  run().catch(err => { console.error('Test runner error:', err); process.exit(1); });
}

module.exports = run;
