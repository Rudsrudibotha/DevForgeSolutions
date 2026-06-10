// src/modules/consents/consents.test.js
//
// Architecture-friendly unit test for the Consents module.
// Validates that:
//   1. Service rejects empty title/body
//   2. Service rejects invalid status
//   3. Permissions reject null user
//   4. Service exports the expected functions
//
// Does NOT hit the database. Run with: node tests/architecture/run-consents-test.js
// or via the architecture tests index.

'use strict';

const assert = require('assert');
const service = require('./consents.service');
const perms = require('./consents.permissions');

function test(name, fn) {
  try { fn(); console.log(`  PASS: ${name}`); }
  catch (err) { console.error(`  FAIL: ${name}\n    ${err.message}`); process.exitCode = 1; }
}

console.log('\n[modules:consents]');

test('service rejects create without title', async () => {
  await assert.rejects(
    () => service.create({ ActiveTenantId: 1, ActiveSchoolId: 1, UserId: 1 }, { body: 'x' }),
    /title and body are required/
  );
});

test('service rejects respond with invalid status', async () => {
  await assert.rejects(
    () => service.respond({ ActiveTenantId: 1, UserId: 1 }, { consentId: 1, status: 'Maybe' }),
    /status must be Granted or Declined/
  );
});

test('permissions reject null user', () => {
  assert.strictEqual(perms.canView(null), false);
  assert.strictEqual(perms.canManage(null), false);
});

test('service exports the expected functions', () => {
  assert.strictEqual(typeof service.listForSchool, 'function');
  assert.strictEqual(typeof service.listForParent, 'function');
  assert.strictEqual(typeof service.create, 'function');
  assert.strictEqual(typeof service.respond, 'function');
});
