'use strict';

// Unit tests for the access matrix / feature catalog.
//
//   1. FEATURE_CATALOG has every group and every leaf
//   2. allPermissionKeys returns a deduped, non-empty list
//   3. keyToGroup maps leaves to their parent group
//   4. DEFAULT_GRANTS enables School + Finance; everything else
//      stays Inherit
//   5. applyNavVisibility (from portalLocals) drops denied items
//   6. requireFeature middleware exists and is a function
//
// Run: node tests/architecture/access-matrix.test.js

const assert = require('assert');
const {
  FEATURE_CATALOG,
  allPermissionKeys,
  keyToGroup,
  keyToPath,
  DEFAULT_GRANTS
} = require('../../src/security/featureCatalog');
const { applyNavVisibility } = require('../../src/middleware/portalLocals');
const { requireFeature } = require('../../src/middleware/requireFeature');

function test(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === 'function') {
      return r.then(() => console.log(`  PASS: ${name}`))
        .catch(err => { console.error(`  FAIL: ${name}\n    ${err.message}`); process.exitCode = 1; });
    }
    console.log(`  PASS: ${name}`);
  } catch (err) {
    console.error(`  FAIL: ${name}\n    ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('\n[arch:access-matrix]');

test('FEATURE_CATALOG has at least the five required groups', () => {
  const labels = FEATURE_CATALOG.map(g => g.label);
  for (const need of ['School', 'Finance', 'Kinder Care Hub', 'Settings', 'AI']) {
    assert.ok(labels.includes(need), `missing group: ${need}`);
  }
});

test('FEATURE_CATALOG School group has all required leaves', () => {
  const school = FEATURE_CATALOG.find(g => g.label === 'School');
  const leafLabels = school.leaves.map(l => l.label);
  for (const need of ['Students', 'Families', 'Classes', 'Attendance', 'Staff', 'Leave', 'Payslips']) {
    assert.ok(leafLabels.includes(need), `missing School leaf: ${need}`);
  }
});

test('FEATURE_CATALOG Finance group has Invoices, Payments, Outstanding', () => {
  const fin = FEATURE_CATALOG.find(g => g.label === 'Finance');
  const labels = fin.leaves.map(l => l.label);
  for (const need of ['Invoices', 'Payments', 'Outstanding']) {
    assert.ok(labels.includes(need), `missing Finance leaf: ${need}`);
  }
});

test('allPermissionKeys returns a deduped non-empty list', () => {
  const keys = allPermissionKeys();
  assert.ok(keys.length > 0);
  assert.strictEqual(new Set(keys).size, keys.length, 'duplicate keys');
  for (const k of keys) assert.ok(k && typeof k === 'string');
});

test('keyToGroup maps every leaf to a group', () => {
  const m = keyToGroup();
  for (const k of Object.keys(m)) assert.ok(m[k]);
  for (const group of FEATURE_CATALOG) {
    assert.strictEqual(m[group.key], group.key);
    for (const leaf of group.leaves) {
      assert.strictEqual(m[leaf.key], group.key);
    }
  }
});

test('keyToPath returns a non-empty map for every leaf', () => {
  const m = keyToPath();
  for (const group of FEATURE_CATALOG) {
    for (const leaf of group.leaves) {
      assert.ok(m[leaf.key], `no path for ${leaf.key}`);
      assert.ok(m[leaf.key].startsWith('/sms'), `bad path for ${leaf.key}`);
    }
  }
});

test('DEFAULT_GRANTS turns School + Finance on, leaves KCH/Settings/AI Inherit', () => {
  assert.strictEqual(DEFAULT_GRANTS['feature-group.school'], 'Allow');
  assert.strictEqual(DEFAULT_GRANTS['feature-group.finance'], 'Allow');
  assert.strictEqual(DEFAULT_GRANTS['feature-group.kch'], 'Inherit');
  assert.strictEqual(DEFAULT_GRANTS['feature-group.settings'], 'Inherit');
  assert.strictEqual(DEFAULT_GRANTS['feature-group.ai'], 'Inherit');
  // Every School + Finance leaf is also Allow
  const school = FEATURE_CATALOG.find(g => g.label === 'School');
  for (const leaf of school.leaves) {
    assert.strictEqual(DEFAULT_GRANTS[leaf.key], 'Allow', `School leaf ${leaf.key} should be Allow`);
  }
});

test('applyNavVisibility drops items whose permissionKey is not in the visible set', () => {
  const nav = [
    { key: 'feature-group.school', label: 'School', items: [
      { href: '/sms/students', label: 'Students', permissionKey: 'school.students.view' },
      { href: '/sms/families', label: 'Families', permissionKey: 'school.families.view' },
      { href: '/sms/leave',    label: 'Leave',    permissionKey: 'leave.view' }
    ]}
  ];
  const visibleSet = new Set(['school.students.view']);
  const out = applyNavVisibility(nav, visibleSet);
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].items.length, 1);
  assert.strictEqual(out[0].items[0].label, 'Students');
});

test('applyNavVisibility drops the group entirely when every item is denied', () => {
  const nav = [
    { key: 'feature-group.finance', label: 'Finance', items: [
      { href: '/sms/refunds', label: 'Refunds', permissionKey: 'finance.refunds.create' }
    ]}
  ];
  const out = applyNavVisibility(nav, new Set());
  assert.strictEqual(out.length, 0);
});

test('applyNavVisibility keeps items with no permissionKey', () => {
  const nav = [
    { key: 'feature-group.dashboard', label: 'Overview', items: [
      { href: '/sms', label: 'Dashboard' }
    ]}
  ];
  const out = applyNavVisibility(nav, new Set());
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].items.length, 1);
});

test('requireFeature middleware is a function', () => {
  assert.strictEqual(typeof requireFeature, 'function');
  const mw = requireFeature('finance.refunds.create');
  assert.strictEqual(typeof mw, 'function');
});
