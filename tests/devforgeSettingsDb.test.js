'use strict';

// SQL tests for DevForge admin settings + observability service. Auto-skips without DB.

const assert = require('node:assert/strict');
const { getPool } = require('../src/data/db');

async function run() {
  if (!process.env.DATABASE_URL || process.env.SKIP_DB === 'true') {
    console.log('SKIP: DATABASE_URL not set or SKIP_DB=true.');
    return;
  }
  const AdminSettingsService = require('../src/business/adminSettingsService');
  const svc = new AdminSettingsService();
  const actor = { id: 1, role: 'admin', email: 'test@devforge.local' };

  console.log('getDashboard returns settings + health + platform + env');
  const dash = await svc.getDashboard({ actor });
  assert.ok(Array.isArray(dash.settings), 'settings is array');
  assert.ok(dash.platform, 'platform info returned');
  assert.ok(dash.platform.version, 'version present');
  assert.ok(dash.platform.node, 'node version present');
  assert.ok(dash.platform.uptimeHuman, 'uptime present');
  assert.ok(Array.isArray(dash.env), 'env is array');
  assert.ok(dash.health, 'health returned');
  assert.equal(typeof dash.health.database.connected, 'boolean', 'health.db.connected is bool');

  console.log('getDashboard with non-admin rejected');
  await assert.rejects(async () => svc.getDashboard({ actor: { id: 2, role: 'parent' } }), /admin role required/);

  console.log('getSetting for known key returns row');
  const before = await svc.getSetting({ actor, key: 'maintenanceMode' });
  if (before) {
    assert.equal(before.SettingKey, 'maintenanceMode');
  }

  console.log('getSetting for unknown key returns null');
  const unknown = await svc.getSetting({ actor, key: 'definitelyNotAKey' });
  assert.equal(unknown, null, 'unknown key returns null');

  console.log('getSetting with invalid key rejected');
  await assert.rejects(async () => svc.getSetting({ actor, key: 'BAD!KEY' }), /invalid key/);
  await assert.rejects(async () => svc.getSetting({ actor, key: '' }), /invalid key/);
  await assert.rejects(async () => svc.getSetting({ actor, key: '1startsWithNumber' }), /invalid key/);

  console.log('updateSetting persists new value');
  const testKey = 'parentPayEnabled';
  const initial = await svc.getSetting({ actor, key: testKey });
  const newValue = (initial && initial.SettingValue === 'on') ? 'off' : 'on';
  const updated = await svc.updateSetting({ actor, key: testKey, value: newValue });
  assert.equal(updated.SettingValue, newValue, 'value persisted');
  const recheck = await svc.getSetting({ actor, key: testKey });
  assert.equal(recheck.SettingValue, newValue, 'value re-read matches');
  // Restore
  await svc.updateSetting({ actor, key: testKey, value: initial ? initial.SettingValue : 'on' });

  console.log('updateSetting with invalid value rejected');
  await assert.rejects(async () => svc.updateSetting({ actor, key: testKey, value: 12345 }), /invalid value/);

  console.log('updateSetting with non-admin rejected');
  await assert.rejects(async () => svc.updateSetting({ actor: { id: 2, role: 'parent' }, key: testKey, value: 'on' }), /admin role required/);

  console.log('settings include seeded defaults');
  const all = await svc.getDashboard({ actor });
  const keys = all.settings.map(s => s.SettingKey);
  assert.ok(keys.includes('maintenanceMode'), 'maintenanceMode seeded');
  assert.ok(keys.includes('allowNewSignups'), 'allowNewSignups seeded');
  assert.ok(keys.includes('parentPayEnabled'), 'parentPayEnabled seeded');
  assert.ok(keys.includes('maxSchoolsPerUser'), 'maxSchoolsPerUser seeded');

  console.log('env summary redacts secrets');
  const secrety = all.env.find(e => e.key === 'JWT_SECRET');
  if (secrety) {
    assert.equal(secrety.value, '***REDACTED***', 'JWT_SECRET redacted');
    assert.equal(secrety.redacted, true, 'redacted flag set');
  }

  await getPool().close();
  console.log('OK all 11 admin settings SQL tests passed');
  if (process.exitCode) console.log('\nFAILED'); else console.log('\nALL DEVFORGE SETTINGS SQL TESTS PASSED');
}

if (require.main === module) {
  run().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
}

module.exports = run;
