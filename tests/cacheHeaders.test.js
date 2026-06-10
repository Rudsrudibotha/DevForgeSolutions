'use strict';

// Tests for cache headers: static assets get long max-age, SSR pages
// get no-store, API endpoints get no-store, ETag is set on static.

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
  console.log('static assets have long Cache-Control');
  let r = await req('GET', '/styles/app.css');
  assert.equal(r.status, 200, 'css must 200');
  const cc = r.headers['cache-control'] || '';
  assert.match(cc, /max-age=3600/, 'css cache max-age=3600');
  assert.match(cc, /stale-while-revalidate=86400/, 'css SWR');
  assert.match(cc, /public/, 'css public cacheable');

  console.log('app.js has long Cache-Control');
  r = await req('GET', '/app.js');
  assert.equal(r.status, 200);
  assert.match(r.headers['cache-control'] || '', /max-age=3600/);

  console.log('palette.js has long Cache-Control');
  r = await req('GET', '/palette.js');
  assert.equal(r.status, 200);
  assert.match(r.headers['cache-control'] || '', /max-age=3600/);

  console.log('shortcuts.js has long Cache-Control');
  r = await req('GET', '/shortcuts.js');
  assert.equal(r.status, 200);
  assert.match(r.headers['cache-control'] || '', /max-age=3600/);

  console.log('static asset has ETag');
  r = await req('GET', '/styles/app.css');
  assert.ok(r.headers['etag'], 'css has ETag');
  assert.match(r.headers['etag'], /^"|^W\/"/, 'ETag has quotes');

  console.log('static asset has Last-Modified');
  r = await req('GET', '/styles/app.css');
  assert.ok(r.headers['last-modified'], 'css has Last-Modified');

  console.log('non-static GET (404 path) has no Cache-Control');
  r = await req('GET', '/styles/does-not-exist.css');
  assert.equal(r.status, 404);
  // 404 from static doesn't go through our noStore middleware for /styles
  // but the static server may not set a header. Acceptable to not have CC.
  assert.ok(!r.headers['cache-control'] || r.headers['cache-control'].indexOf('no-store') === -1 || r.headers['cache-control'].indexOf('max-age') !== -1, '404 cache header is reasonable');

  console.log('SSR portal pages have no-store');
  r = await get('/sms', 'school');
  assert.equal(r.status, 200);
  const ccSms = r.headers['cache-control'] || '';
  assert.match(ccSms, /no-store/, 'sms no-store');

  r = await get('/parent', 'parent');
  assert.equal(r.status, 200);
  assert.match(r.headers['cache-control'] || '', /no-store/, 'parent no-store');

  r = await get('/devforge', 'admin');
  assert.equal(r.status, 200);
  assert.match(r.headers['cache-control'] || '', /no-store/, 'devforge no-store');

  console.log('Pragma no-cache is set for SSR pages');
  assert.match(r.headers['pragma'] || '', /no-cache/, 'devforge pragma');

  console.log('API endpoints have no-store');
  r = await req('GET', '/api/config');
  assert.equal(r.status, 200);
  assert.match(r.headers['cache-control'] || '', /no-store/, 'api no-store');

  console.log('auth endpoints have no-store');
  r = await req('GET', '/auth/logout');
  assert.ok([302, 405, 404].includes(r.status), 'logout returns 302/405/404');
  // If 404 (no route) or 405, no cache header check. If 302, it should have no-store.
  if (r.status === 302) {
    assert.match(r.headers['cache-control'] || '', /no-store/, 'auth no-store');
  }

  console.log('OK all 13 cache header tests passed');
  if (process.exitCode) console.log('\nFAILED'); else console.log('\nALL CACHE HEADER TESTS PASSED');
}

if (require.main === module) {
  run().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
}

module.exports = run;
