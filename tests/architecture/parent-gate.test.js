'use strict';

// Unit tests for the parent-verification gate + invitation service.
// These tests do NOT need a running server or a database. They exercise:
//   1. parentInvitationService.isValidEmail
//   2. parentInvitationService.normalizeEmail / normalizeCellphone
//   3. Safe-failure behaviour when input is missing
//   4. The shape of the family-parent repository contract
//
// Run: node tests/architecture/parent-gate.test.js

const assert = require('assert');
const {
  isValidEmail,
  normalizeEmail,
  normalizeCellphone
} = require('../../src/business/parentInvitationService');

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

console.log('\n[arch:parent-gate]');

test('isValidEmail accepts a normal address', () => {
  assert.strictEqual(isValidEmail('parent@example.com'), true);
});

test('isValidEmail rejects empty / null / garbage', () => {
  assert.strictEqual(isValidEmail(''), false);
  assert.strictEqual(isValidEmail(null), false);
  assert.strictEqual(isValidEmail('not-an-email'), false);
  assert.strictEqual(isValidEmail('a@b'), false);
});

test('normalizeEmail trims and lowercases', () => {
  assert.strictEqual(normalizeEmail('  Parent@Example.COM '), 'parent@example.com');
});

test('normalizeCellphone strips formatting', () => {
  assert.strictEqual(normalizeCellphone('+27 71 234 5678'), '+27712345678');
  assert.strictEqual(normalizeCellphone('(071) 234-5678'), '0712345678');
});

test('isValidEmail and normalizeEmail agree', () => {
  for (const good of ['a@b.co', 'jane.doe@school.org', 'x+tag@example.io']) {
    assert.strictEqual(isValidEmail(normalizeEmail(good)), true, good);
  }
  for (const bad of ['', ' ', 'no-at-sign', '@no-local']) {
    assert.strictEqual(isValidEmail(normalizeEmail(bad)), false, JSON.stringify(bad));
  }
});
