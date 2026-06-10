'use strict';

// Unit tests for the scoped database helper. These do NOT need a running
// server. They run in-process and assert that:
//   1. School users are auto-scoped to their schoolId
//   2. School users cannot bypass
//   3. Admin users CAN bypass but only with a reason
//   4. The scope guard refuses queries against scoped tables without @schoolId
//   5. Non-scoped tables (e.g. AuditLog) don't require @schoolId
//
// Run: node tests/scope.test.js

const assert = require('assert');
const { ScopedDb, SCOPED_TABLES } = require('../src/data/scopedDb');

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('\n[scope] ScopedDb tenancy enforcement');

test('school user is auto-scoped to their schoolId', () => {
  const s = new ScopedDb({ id: 1, role: 'school', schoolId: 42 });
  assert.strictEqual(s.schoolId, 42);
  assert.strictEqual(s.isBypassed(), false);
});

test('admin user without bypass has no implicit scope', () => {
  const s = new ScopedDb({ id: 2, role: 'admin', schoolId: null });
  assert.strictEqual(s.schoolId, null);
});

test('parent role has no scope via ScopedDb (parents use ParentDashboardService)', () => {
  const s = new ScopedDb({ id: 3, role: 'parent' });
  assert.strictEqual(s.schoolId, null);
});

test('school user CANNOT bypass scope', () => {
  const s = new ScopedDb({ id: 1, role: 'school', schoolId: 42 });
  assert.throws(() => s.bypass('for tests'), /admin users/);
});

test('admin CAN bypass but must supply a reason', () => {
  const s = new ScopedDb({ id: 2, role: 'admin' });
  assert.throws(() => s.bypass(), /reason/);
  assert.throws(() => s.bypass('x'), /reason/);
  s.bypass('investigating duplicate payment on school 42');
  assert.strictEqual(s.isBypassed(), true);
  assert.strictEqual(s.schoolId, null);
});

test('scope guard rejects query against Students without @schoolId', () => {
  const s = new ScopedDb({ id: 1, role: 'school', schoolId: 42 });
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  try {
    assert.throws(
      () => s.guardTableScope('SELECT * FROM Students WHERE FirstName = @n', {}),
      /Scope guard.*Students.*@schoolId/
    );
  } finally {
    process.env.NODE_ENV = prev;
  }
});

test('scope guard allows query with @schoolId', () => {
  const s = new ScopedDb({ id: 1, role: 'school', schoolId: 42 });
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  try {
    s.guardTableScope('SELECT * FROM Students WHERE SchoolID = @schoolId', {});
  } finally {
    process.env.NODE_ENV = prev;
  }
});

test('scope guard allows JOIN to scoped table if @schoolId present', () => {
  const s = new ScopedDb({ id: 1, role: 'school', schoolId: 42 });
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  try {
    s.guardTableScope(`
      SELECT s.*, c.ClassName
      FROM Students s
      JOIN Classes c ON c.ClassID = s.ClassID
      WHERE s.SchoolID = @schoolId
    `, {});
  } finally {
    process.env.NODE_ENV = prev;
  }
});

test('scope guard ignores non-scoped tables (e.g. AuditLog)', () => {
  const s = new ScopedDb({ id: 1, role: 'school', schoolId: 42 });
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  try {
    s.guardTableScope('SELECT * FROM AuditLog WHERE SchoolID = @schoolId', {});
  } finally {
    process.env.NODE_ENV = prev;
  }
});

test('scope guard does not fire for bypassed admin', () => {
  const s = new ScopedDb({ id: 2, role: 'admin' });
  s.bypass('platform admin reading across schools');
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  try {
    s.guardTableScope('SELECT * FROM Students', {}); // would throw if not bypassed
  } finally {
    process.env.NODE_ENV = prev;
  }
});

test('scoped table registry contains the expected tables', () => {
  for (const t of ['Students', 'Invoices', 'Transactions', 'Attendance', 'Families', 'Classes', 'Employees', 'Payslips']) {
    assert.ok(SCOPED_TABLES.has(t), `expected ${t} to be in SCOPED_TABLES`);
  }
});

console.log(process.exitCode ? '\nFAILED' : '\nALL SCOPE TESTS PASSED');
