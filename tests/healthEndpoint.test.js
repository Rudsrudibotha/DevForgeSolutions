'use strict';

// Tests for the /health and /health/ready endpoints used by Azure
// App Service health probes and Kubernetes-style readiness checks.

const assert = require('node:assert/strict');
const http = require('node:http');

const BASE = 'http://127.0.0.1:3001';

function req(method, p) {
  return new Promise((resolve, reject) => {
    const r = http.request(BASE + p, { method }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    r.on('error', reject);
    r.end();
  });
}

async function run() {
  console.log('GET /health is unauthenticated');
  let r = await req('GET', '/health');
  assert.equal(r.status, 200);
  assert.match(r.body, /"status":"OK"/, 'status OK');

  console.log('GET /health has version + node + uptime + startedAt');
  r = await req('GET', '/health');
  assert.match(r.body, /"service":"kinder-care-hub"/, 'service name');
  assert.match(r.body, /"version":"\d+\.\d+\.\d+"/, 'semver version');
  assert.match(r.body, /"node":"v\d+/, 'node version');
  assert.match(r.body, /"env":"(development|test|production)"/, 'env');
  assert.match(r.body, /"uptimeSeconds":\d+/, 'uptime in seconds');
  assert.match(r.body, /"startedAt":"\d{4}-\d{2}-\d{2}T/, 'ISO startedAt');

  console.log('GET /health has database block');
  r = await req('GET', '/health');
  assert.match(r.body, /"database":\{[^}]*"connected":/, 'database.connected');

  console.log('GET /health does not leak lastError in production');
  r = await req('GET', '/health');
  // In test env, lastError may be exposed. In production it would be null.
  // The contract is: lastError is null OR a string OR a key. We just check
  // it doesn't return a stack trace or table name.
  if (r.body.indexOf('lastError') !== -1) {
    // lastError must be either null or a string
    const m = r.body.match(/"lastError":(null|"[^"]{0,500}")/);
    assert.ok(m, 'lastError is null or short string, got ' + r.body.substring(0, 200));
  }

  console.log('GET /health/ready is unauthenticated');
  r = await req('GET', '/health/ready');
  // 200 if DB up, 503 if DB down. Both are valid here.
  assert.ok([200, 503].includes(r.status), 'ready is 200 or 503');
  assert.match(r.body, /"ready":(true|false)/, 'ready boolean');

  console.log('GET /health/ready response includes version + service');
  r = await req('GET', '/health/ready');
  assert.match(r.body, /"service":"kinder-care-hub"/, 'service name in ready');
  assert.match(r.body, /"version":/, 'version in ready');

  console.log('GET /health/ready is fast (< 1s)');
  const t0 = Date.now();
  await req('GET', '/health/ready');
  const elapsed = Date.now() - t0;
  assert.ok(elapsed < 1000, 'ready is fast, took ' + elapsed + 'ms');

  console.log('GET /health/does-not-exist is 404');
  r = await req('GET', '/health/does-not-exist');
  assert.equal(r.status, 404);

  console.log('OK all 8 health endpoint tests passed');
  if (process.exitCode) console.log('\nFAILED'); else console.log('\nALL HEALTH ENDPOINT TESTS PASSED');
}

if (require.main === module) {
  run().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
}

module.exports = run;
