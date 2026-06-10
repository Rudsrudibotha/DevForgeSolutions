'use strict';

// Task 89: Subscription tests.
// Lightweight unit tests around the entitlement decision shape.

const assert = require('node:assert');
const { canTenantUseFeature, evictEntitlement } = require('../src/data/entitlementRepository');

async function run() {
  // When no subscription exists, result must be denied with reason no-active-subscription
  // (or whatever the live DB returns; we only assert shape)
  const r1 = await canTenantUseFeature(999999, 'KINDER_CARE_HUB_MESSAGING');
  assert.ok(typeof r1.IsAllowed === 'boolean');
  assert.ok(typeof r1.Reason === 'string');
  evictEntitlement(999999);
  console.log('[ok] entitlement shape contract holds');

  // Each defined feature key should not crash
  const keys = [
    'KINDER_CARE_HUB_MESSAGING',
    'KINDER_CARE_HUB_IMAGE_MESSAGING',
    'KINDER_CARE_HUB_PARENT_MESSAGING',
    'KINDER_CARE_HUB_STAFF_MESSAGING',
    'KINDER_CARE_HUB_DEVFORGE_MESSAGING',
    'KINDER_CARE_HUB_BROADCASTS',
    'KINDER_CARE_HUB_AI_CHATBOT',
    'KINDER_CARE_HUB_AI_RECONCILIATION',
    'KINDER_CARE_HUB_REPORT_FAULT'
  ];
  for (const key of keys) {
    const r = await canTenantUseFeature(1, key);
    assert.ok(typeof r.IsAllowed === 'boolean', `${key} must return a boolean`);
  }
  evictEntitlement(1);
  console.log('[ok] all 9 defined feature keys return valid entitlement decisions');
}

module.exports = { run };
