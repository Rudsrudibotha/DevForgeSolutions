'use strict';

// Tests for the 404 catch-all route and the error page rendering.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');

const BASE = 'http://127.0.0.1:3001';

function req(method, p, headers) {
  return new Promise((resolve, reject) => {
    const r = http.request(BASE + p, { method, headers: headers || {} }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    r.on('error', reject);
    r.end();
  });
}

function get(p, role) { return req('GET', p, { 'X-Test-Role': role }); }

async function run() {
  console.log('404.ejs exists with required markup');
  assert.ok(fs.existsSync('src/views/errors/404.ejs'), '404.ejs missing');
  const four = fs.readFileSync('src/views/errors/404.ejs', 'utf8');
  assert.match(four, /<title>Page not found/, 'title set');
  assert.match(four, /btn-primary/, 'home button rendered');
  assert.match(four, /Go back/, 'go-back button rendered');

  console.log('app.js has 404 catch-all middleware');
  const app = fs.readFileSync('src/app.js', 'utf8');
  assert.match(app, /function notFound/, '404 middleware defined');
  assert.match(app, /res\.status\(404\)\.render\('errors\/404'/, 'renders 404 view');

  console.log('global error handler routes 404 to errors/404');
  assert.match(app, /if \(status === 404\)[\s\S]*?errors\/404/, 'routes 404 to errors/404');
  assert.match(app, /if \(status === 403\)[\s\S]*?errors\/forbidden/, 'routes 403 to errors/forbidden');

  console.log('GET /sms/this-does-not-exist returns 404 with the 404 view');
  let r = await get('/sms/this-does-not-exist', 'school');
  assert.equal(r.status, 404);
  assert.match(r.body, /Page not found/, '404 view rendered');
  assert.match(r.body, /Go back/, 'back button present');
  assert.match(r.body, /class="btn-primary/, 'home button present');

  console.log('GET /parent/this-does-not-exist returns 404');
  r = await get('/parent/this-does-not-exist', 'parent');
  assert.equal(r.status, 404);
  assert.match(r.body, /Page not found/, 'parent 404 view');

  console.log('GET /devforge/this-does-not-exist returns 404');
  r = await get('/devforge/this-does-not-exist', 'admin');
  assert.equal(r.status, 404);
  assert.match(r.body, /Page not found/, 'devforge 404 view');

  console.log('GET /this-does-not-exist (unauthenticated) returns 404 with the 404 view');
  r = await req('GET', '/this-does-not-exist');
  assert.equal(r.status, 404);
  assert.match(r.body, /Page not found/, 'unauth 404 view');

  console.log('GET /devforge/features (removed placeholder) returns 404, not placeholder');
  r = await get('/devforge/features', 'admin');
  assert.equal(r.status, 404, 'features is removed, not a placeholder anymore');
  assert.match(r.body, /Page not found/, 'features 404 view');

  console.log('API 404 returns JSON not HTML');
  r = await req('GET', '/api/this-does-not-exist');
  assert.equal(r.status, 404);
  assert.match(r.headers['content-type'] || '', /json/, 'JSON content-type');
  assert.match(r.body, /"error":\s*"Not found"/, 'JSON error');

  console.log('OK all 9 404 tests passed');
  if (process.exitCode) console.log('\nFAILED'); else console.log('\nALL 404 TESTS PASSED');
}

if (require.main === module) {
  run().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
}

module.exports = run;
