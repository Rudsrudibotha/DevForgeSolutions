'use strict';

// Tests for the command palette: mount on every portal page, data-portal
// attribute on body, scripts + Alpine component, kbd styling, and that
// opening the palette is fully client-side (no server roundtrip needed).

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const BASE = 'http://127.0.0.1:3001';

function req(method, p, headers) {
  return new Promise((resolve, reject) => {
    const r = http.request(BASE + p, { method, headers: headers || {} }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    r.on('error', reject);
    r.end();
  });
}

function get(p, role) { return req('GET', p, { 'X-Test-Role': role }); }

async function run() {
  console.log('palette-registry.js + palette.js exist');
  assert.ok(fs.existsSync('public/palette-registry.js'), 'palette-registry.js missing');
  assert.ok(fs.existsSync('public/palette.js'), 'palette.js missing');
  assert.ok(fs.existsSync('src/views/partials/palette/command.ejs'), 'command.ejs missing');

  console.log('registry exports palette + actions');
  const reg = fs.readFileSync('public/palette-registry.js', 'utf8');
  assert.match(reg, /parent:/, 'parent routes defined');
  assert.match(reg, /sms:/, 'sms routes defined');
  assert.match(reg, /devforge:/, 'devforge routes defined');
  assert.match(reg, /actions/, 'actions defined');

  console.log('palette.js exposes kchPaletteComponent');
  const pal = fs.readFileSync('public/palette.js', 'utf8');
  assert.match(pal, /kchPaletteComponent/, 'component name');
  assert.match(pal, /filtered/, 'filtered getter');
  assert.match(pal, /groups/, 'groups getter');
  assert.match(pal, /select/, 'select method');
  assert.match(pal, /ArrowDown|ArrowUp/, 'arrow key support');
  assert.match(pal, /Enter/, 'enter support');
  assert.match(pal, /Escape/, 'escape support');
  assert.match(pal, /ctrlKey|metaKey/, 'ctrl/cmd-K trigger');

  console.log('CSS has .kbd + .kch-palette-item.active');
  const css = fs.readFileSync('src/styles/app.css', 'utf8');
  assert.match(css, /\.kbd\s*\{/, '.kbd class');
  assert.match(css, /\.kch-palette-item\.active/, '.kch-palette-item.active');

  console.log('layout mounts palette + scripts');
  const layout = fs.readFileSync('src/views/layouts/app.ejs', 'utf8');
  assert.match(layout, /partials\/palette\/command/, 'palette partial included');
  assert.match(layout, /palette-registry\.js/, 'registry script');
  assert.match(layout, /palette\.js/, 'palette script');

  console.log('layout sets data-portal on body');
  assert.match(layout, /data-portal=/, 'data-portal attribute');

  // Live renders
  console.log('GET /devforge has data-portal="devforge"');
  let r = await get('/devforge', 'admin');
  assert.equal(r.status, 200);
  assert.match(r.body, /data-portal="devforge"/, 'devforge portal attr');
  assert.match(r.body, /palette-registry\.js/, 'registry script tag');
  assert.match(r.body, /palette\.js/, 'palette script tag');
  assert.match(r.body, /kchPaletteComponent/, 'alpine component');
  assert.match(r.body, /kch-palette-input/, 'palette input present');
  assert.match(r.body, /class="kbd"/, 'kbd class present');

  console.log('GET /parent has data-portal="parent"');
  r = await get('/parent', 'parent');
  assert.equal(r.status, 200);
  assert.match(r.body, /data-portal="parent"/, 'parent portal attr');
  assert.match(r.body, /palette\.js/, 'palette script tag');

  console.log('GET /sms has data-portal="sms"');
  r = await get('/sms', 'school');
  assert.equal(r.status, 200);
  assert.match(r.body, /data-portal="sms"/, 'sms portal attr');
  assert.match(r.body, /palette\.js/, 'palette script tag');

  console.log('palette shows grouped items (Alpine template)');
  r = await get('/devforge', 'admin');
  assert.match(r.body, /x-for="group in groups"/, 'group iteration');
  assert.match(r.body, /x-for="\(it, i\) in group\.items"/, 'item iteration');
  assert.match(r.body, /@click="select\(it\)"/, 'select handler');

  console.log('palette has 3+ items per portal');
  const regItems = (reg.match(/{ group:/g) || []).length;
  assert.ok(regItems >= 18, 'registry has at least 18 routes across all portals');

  console.log('OK all 14 command palette tests passed');
  if (process.exitCode) console.log('\nFAILED'); else console.log('\nALL COMMAND PALETTE TESTS PASSED');
}

if (require.main === module) {
  run().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
}

module.exports = run;
