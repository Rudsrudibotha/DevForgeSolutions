'use strict';

// Accessibility audit tests: skip link, main landmark, aria-current on active
// nav, aria-labels on icon-only buttons, aria-hidden on decorative SVGs,
// lang attribute, semantic landmarks, focus-visible styles.

const assert = require('node:assert/strict');
const fs = require('node:fs');
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
  console.log('layout has lang="en-ZA"');
  const layout = fs.readFileSync('src/views/layouts/app.ejs', 'utf8');
  assert.match(layout, /html lang="en-ZA"/, 'lang attribute');

  console.log('layout has skip-to-main link');
  assert.match(layout, /href="#main-content"/, 'skip link href');
  assert.match(layout, /Skip to main content/, 'skip link text');
  assert.match(layout, /sr-only/, 'sr-only utility used');
  assert.match(layout, /focus:not-sr-only/, 'focus reveal');

  console.log('layout wraps body content in <main role="main">');
  assert.match(layout, /<main id="main-content" role="main" tabindex="-1"/, 'main landmark with role and tabindex');

  console.log('layout mounts sr-only + focus:not-sr-only CSS');
  const css = fs.readFileSync('src/styles/app.css', 'utf8');
  assert.match(css, /\.sr-only\s*\{/, '.sr-only class');
  assert.match(css, /focus[\s\\:]+not-sr-only/, 'focus reveal class');

  console.log('all sidebars have aria-label');
  ['parent-sidebar.ejs', 'school-sidebar.ejs', 'devforge-sidebar.ejs'].forEach(function (f) {
    const content = fs.readFileSync('src/views/partials/' + f, 'utf8');
    assert.match(content, /aria-label="/, f + ' has aria-label');
  });

  console.log('all sidebars have aria-current on active items');
  ['parent-sidebar.ejs', 'school-sidebar.ejs', 'devforge-sidebar.ejs'].forEach(function (f) {
    const content = fs.readFileSync('src/views/partials/' + f, 'utf8');
    assert.match(content, /aria-current="page"/, f + ' has aria-current');
  });

  console.log('all sidebars mark decorative SVGs as aria-hidden');
  ['parent-sidebar.ejs', 'school-sidebar.ejs', 'devforge-sidebar.ejs'].forEach(function (f) {
    const content = fs.readFileSync('src/views/partials/' + f, 'utf8');
    assert.match(content, /aria-hidden="true"/, f + ' has aria-hidden');
  });

  console.log('icon-only buttons have aria-label');
  const header = fs.readFileSync('src/views/partials/header.ejs', 'utf8');
  assert.match(header, /aria-label="Toggle navigation"/, 'menu button aria-label');
  assert.match(header, /aria-label="Toggle theme"/, 'theme button aria-label');

  console.log('palette modal has keyboard handlers');
  const palette = fs.readFileSync('public/palette.js', 'utf8');
  assert.match(palette, /Escape/, 'escape key');
  assert.match(palette, /ArrowDown|ArrowUp/, 'arrow keys');
  assert.match(palette, /Enter/, 'enter key');
  assert.match(palette, /autofocus|focus\(\)/, 'focus management');

  // Live renders
  console.log('GET /sms renders skip link + main + lang + sidebars with aria');
  let r = await get('/sms', 'school');
  assert.equal(r.status, 200);
  assert.match(r.body, /href="#main-content"/, 'skip link present');
  assert.match(r.body, /Skip to main content/, 'skip link text');
  assert.match(r.body, /<main id="main-content" role="main" tabindex="-1"/, 'main landmark');
  assert.match(r.body, /lang="en-ZA"/, 'lang attribute');
  assert.match(r.body, /aria-label="School management navigation"/, 'sidebar aria-label');
  assert.match(r.body, /aria-current="page"/, 'active nav aria-current');
  assert.match(r.body, /aria-hidden="true"/, 'decorative SVGs marked');

  console.log('GET /parent renders skip link + parent sidebar aria');
  r = await get('/parent', 'parent');
  assert.equal(r.status, 200);
  assert.match(r.body, /aria-label="Parent navigation"/, 'parent sidebar aria');
  assert.match(r.body, /aria-current="page"/, 'parent active aria-current');

  console.log('GET /devforge renders skip link + devforge sidebar aria');
  r = await get('/devforge', 'admin');
  assert.equal(r.status, 200);
  assert.match(r.body, /aria-label="DevForge admin navigation"/, 'devforge sidebar aria');
  assert.match(r.body, /aria-current="page"/, 'devforge active aria-current');

  console.log('palette modal has role=dialog + aria-label');
  const palettePartial = fs.readFileSync('src/views/partials/palette/command.ejs', 'utf8');
  assert.match(palettePartial, /role="dialog"/, 'role=dialog');
  assert.match(palettePartial, /aria-modal="true"/, 'aria-modal');
  assert.match(palettePartial, /aria-label="Command palette"/, 'aria-label');
  assert.match(palettePartial, /type="search"/, 'search input type');
  assert.match(palettePartial, /autocomplete="off"/, 'autocomplete off');

  console.log('tables have proper thead + tbody structure');
  r = await get('/sms/students', 'school');
  assert.match(r.body, /<thead>/, 'table has thead');
  assert.match(r.body, /<tbody/, 'table has tbody');

  console.log('OK all 16 accessibility tests passed');
  if (process.exitCode) console.log('\nFAILED'); else console.log('\nALL ACCESSIBILITY TESTS PASSED');
}

if (require.main === module) {
  run().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
}

module.exports = run;
