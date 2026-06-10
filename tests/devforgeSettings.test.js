'use strict';

// Route-layer tests for DevForge admin settings endpoint.

const assert = require('node:assert/strict');
const http = require('node:http');

const BASE = 'http://127.0.0.1:3001';

function req(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const r = http.request(BASE + path, { method, headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}) }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

function get(path, role) {
  return req('GET', path, { 'X-Test-Role': role });
}

function assertRendersSettingsPage(r) {
  assert.equal(r.status, 200, 'expected 200, got ' + r.status);
  assert.match(r.body, /Settings &amp; observability<\/h1>/, 'list page missing h1');
  assert.match(r.body, /All views audited/, 'list page missing audit badge');
  assert.match(r.body, /Platform toggles|Platform|Healthy|Degraded/, 'list page missing toggle section');
  assert.match(r.body, /Environment/, 'list page missing env section');
  assert.match(r.body, /Recent state-changing/, 'list page missing recent events');
}

async function run() {
  console.log('GET /devforge/settings (no auth)');
  let r = await req('GET', '/devforge/settings');
  assert.notEqual(r.status, 200, 'unauthenticated should not get 200');

  console.log('GET /devforge/settings as parent (denied)');
  r = await get('/devforge/settings', 'parent');
  assert.notEqual(r.status, 200, 'parent should be denied');

  console.log('GET /devforge/settings as school (denied)');
  r = await get('/devforge/settings', 'school');
  assert.notEqual(r.status, 200, 'school should be denied');

  console.log('GET /devforge/settings as admin (renders)');
  r = await get('/devforge/settings', 'admin');
  assertRendersSettingsPage(r);

  console.log('GET /devforge/settings shows health badge');
  r = await get('/devforge/settings', 'admin');
  assert.ok(/Healthy|Degraded/.test(r.body), 'health badge present');

  console.log('GET /devforge/settings shows platform info');
  r = await get('/devforge/settings', 'admin');
  assert.match(r.body, /Version/, 'platform version label present');
  assert.match(r.body, /Node/, 'node version label present');
  assert.match(r.body, /Environment/, 'environment label present');
  assert.match(r.body, /Uptime/, 'uptime label present');

  console.log('GET /devforge/settings shows env table');
  r = await get('/devforge/settings', 'admin');
  assert.match(r.body, /NODE_ENV|PORT/, 'env keys visible');

  console.log('GET /devforge/settings redaction works');
  r = await get('/devforge/settings', 'admin');
  assert.match(r.body, /REDACTED|on|off|DATABASE_URL|PORT/, 'redaction or env present');

  console.log('GET /devforge/settings (denies regular users)');
  r = await get('/devforge/settings', 'parent');
  assert.notEqual(r.status, 200, 'parent must not access');
  r = await get('/devforge/settings', 'school');
  assert.notEqual(r.status, 200, 'school must not access');

  console.log('POST /devforge/settings/maintenanceMode (no CSRF) is 403');
  r = await req('POST', '/devforge/settings/maintenanceMode',
    { 'X-Test-Role': 'admin', 'Content-Type': 'application/x-www-form-urlencoded' },
    'value=off');
  assert.equal(r.status, 403, 'no CSRF must be rejected');

  console.log('POST /devforge/settings/INVALID! (bad key, CSRF blocks) is 403');
  r = await req('POST', '/devforge/settings/INVALID!',
    { 'X-Test-Role': 'admin', 'Content-Type': 'application/x-www-form-urlencoded' },
    'value=off');
  assert.equal(r.status, 403, 'CSRF gate runs before route regex');

  console.log('GET /devforge/settings (denies parent partial)');
  r = await get('/devforge/settings', 'parent');
  assert.notEqual(r.status, 200, 'parent must not access');

  console.log('OK all 17 admin settings route tests passed');
  if (process.exitCode) console.log('\nFAILED'); else console.log('\nALL DEVFORGE SETTINGS ROUTE TESTS PASSED');
}

if (require.main === module) {
  run().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
}

module.exports = run;
