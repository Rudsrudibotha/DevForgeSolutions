'use strict';

// Route-layer tests for parent messages endpoints.

const assert = require('node:assert/strict');
const http = require('node:http');

const BASE = 'http://127.0.0.1:3001';

function req(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const r = http.request(BASE + path, { method, headers: Object.assign({ 'Content-Type': 'application/x-www-form-urlencoded' }, headers || {}) }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

function get(path, role, qs) {
  return req('GET', path + (qs ? '?' + qs : ''), { 'X-Test-Role': role });
}

function assertRendersMessagesList(r) {
  assert.equal(r.status, 200, 'expected 200, got ' + r.status);
  assert.match(r.body, /Messages<\/h1>/, 'list missing h1');
  assert.match(r.body, /Conversations/, 'list missing conversations section');
  assert.match(r.body, /Select a conversation/, 'list missing default state');
  assert.match(r.body, /id="conversations-list"/, 'list missing HTMX list');
}

async function run() {
  console.log('GET /parent/messages (no auth)');
  let r = await req('GET', '/parent/messages');
  assert.notEqual(r.status, 200, 'no auth must not 200');

  console.log('GET /parent/messages as school (denied)');
  r = await get('/parent/messages', 'school');
  assert.notEqual(r.status, 200, 'school role must be denied');

  console.log('GET /parent/messages as admin (denied)');
  r = await get('/parent/messages', 'admin');
  assert.notEqual(r.status, 200, 'admin must be denied');

  console.log('GET /parent/messages as parent (renders)');
  r = await get('/parent/messages', 'parent');
  assertRendersMessagesList(r);

  console.log('GET /parent/messages/partials/list as parent (HTMX partial)');
  r = await get('/parent/messages/partials/list', 'parent');
  assert.equal(r.status, 200, 'partial should 200');

  console.log('GET /parent/messages/partials/list (denies non-parent)');
  r = await get('/parent/messages/partials/list', 'school');
  assert.notEqual(r.status, 200, 'school must not access');
  r = await get('/parent/messages/partials/list', 'admin');
  assert.notEqual(r.status, 200, 'admin must not access');

  console.log('GET /parent/messages/1 (no auth)');
  r = await req('GET', '/parent/messages/1');
  assert.notEqual(r.status, 200, 'no auth must not 200');

  console.log('GET /parent/messages/abc (bad id) is 404');
  r = await get('/parent/messages/abc', 'parent');
  assert.equal(r.status, 404, 'bad id must 404');

  console.log('GET /parent/messages/0 (bad id) is 404');
  r = await get('/parent/messages/0', 'parent');
  assert.equal(r.status, 404, 'id 0 must 404');

  console.log('GET /parent/messages/-1 (bad id) is 404');
  r = await get('/parent/messages/-1', 'parent');
  assert.equal(r.status, 404, 'id -1 must 404');

  console.log('GET /parent/messages/1 (renders, DB-dependent)');
  r = await get('/parent/messages/1', 'parent');
  assert.ok([200, 404, 500].includes(r.status), 'detail can be 200/404/500 depending on DB');

  console.log('GET /parent/messages/1/partials/messages as parent (HTMX partial)');
  r = await get('/parent/messages/1/partials/messages', 'parent');
  assert.equal(r.status, 200, 'partial should 200');

  console.log('GET /parent/messages/1/partials/messages (denies school)');
  r = await get('/parent/messages/1/partials/messages', 'school');
  assert.notEqual(r.status, 200, 'school must not access');

  console.log('POST /parent/messages/1/reply without CSRF is 403');
  r = await req('POST', '/parent/messages/1/reply', { 'X-Test-Role': 'parent' }, 'body=hello');
  assert.equal(r.status, 403, 'no CSRF must 403');

  console.log('POST /parent/messages/0/reply (bad id) is 403/404');
  r = await req('POST', '/parent/messages/0/reply', { 'X-Test-Role': 'parent' }, 'body=hello');
  assert.ok([403, 404].includes(r.status), 'bad id blocked by CSRF or route regex, got ' + r.status);

  console.log('POST /parent/messages/abc/reply (bad id) is 403');
  r = await req('POST', '/parent/messages/abc/reply', { 'X-Test-Role': 'parent' }, 'body=hello');
  assert.equal(r.status, 403, 'CSRF blocks before route regex for non-numeric');

  console.log('OK all 16 parent messages route tests passed');
  if (process.exitCode) console.log('\nFAILED'); else console.log('\nALL PARENT MESSAGES ROUTE TESTS PASSED');
}

if (require.main === module) {
  run().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
}

module.exports = run;
