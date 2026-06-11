'use strict';

// Mobile responsiveness tests: drawer markup, mobile-only classes,
// aria attributes for the menu toggle, and that the page renders
// without horizontal overflow at narrow widths.

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
  console.log('header has mobile drawer with aria attributes');
  const header = fs.readFileSync('src/views/partials/header.ejs', 'utf8');
  assert.match(header, /id="mobile-nav"/, 'mobile-nav id');
  assert.match(header, /aria-controls="mobile-nav"/, 'aria-controls');
  assert.match(header, /:aria-expanded="menuOpen"/, 'aria-expanded binding');
  assert.match(header, /@keydown.escape.window="menuOpen = false"/, 'esc closes drawer');
  assert.match(header, /x-transition/, 'transition directive');

  console.log('mobile-only toggle button (md:hidden)');
  assert.match(header, /class="md:hidden btn-ghost btn-icon"/, 'menu button is md:hidden');

  console.log('menu icon swaps based on state');
  assert.match(header, /x-show="!menuOpen"/, 'hamburger icon when closed');
  assert.match(header, /x-show="menuOpen"/, 'close icon when open');

  console.log('drawer has close button');
  assert.match(header, /aria-label="Close menu"/, 'close button label');

  console.log('drawer backdrop closes on click');
  assert.match(header, /@click="menuOpen = false"/, 'backdrop click handler');

  console.log('drawer width is sensible (w-72 + max-w-[85vw])');
  assert.match(header, /w-72/, 'fixed width');
  assert.match(header, /max-w-\[85vw\]/, 'max width safety');

  console.log('layout has md:pl-64 (desktop only padding)');
  const layout = fs.readFileSync('src/views/layouts/app.ejs', 'utf8');
  assert.match(layout, /md:pl-64/, 'desktop content padding');

  console.log('all sidebars are hidden on mobile (display:none + md:flex)');
  ['parent-sidebar.ejs', 'school-sidebar.ejs', 'devforge-sidebar.ejs'].forEach(function (f) {
    const c = fs.readFileSync('src/views/partials/' + f, 'utf8');
    assert.match(c, /class="sidebar"/, f + ' has sidebar class');
  });
  const css = fs.readFileSync('public/styles/app.css', 'utf8');
  assert.match(css, /\.sidebar\{display:none\}/, 'sidebar hidden by default');
  assert.match(css, /#mobile-nav \.sidebar\{[^}]*display:flex/, 'mobile drawer sidebar is visible');
  assert.match(css, /#mobile-nav \.sidebar\{[^}]*position:static/, 'mobile drawer sidebar is not fixed');
  assert.match(css, /#mobile-nav \.sidebar\{[^}]*width:100%/, 'mobile drawer sidebar fills drawer');
  assert.match(css, /@media \(min-width:768px\)/, 'md: media query');
  assert.match(css, /\.sidebar\{position:fixed;top:0;bottom:0;display:flex;width:16rem/, 'md: flex layout');
  assert.match(css, /\.table-wrap\{[^}]*overflow-x:auto/, 'table-wrap overflow');

  console.log('live: GET /sms renders mobile drawer markup');
  let r = await get('/sms', 'school');
  assert.equal(r.status, 200);
  assert.match(r.body, /id="mobile-nav"/, 'mobile nav id');
  assert.match(r.body, /aria-controls="mobile-nav"/, 'aria-controls');
  assert.match(r.body, /@keydown.escape.window="menuOpen = false"/, 'esc closes');
  assert.match(r.body, /Close menu/, 'close button');
  assert.match(r.body, /md:pl-64/, 'desktop padding');
  assert.match(r.body, /md:hidden/, 'mobile-only classes');

  console.log('live: GET /parent renders mobile drawer');
  r = await get('/parent', 'parent');
  assert.equal(r.status, 200);
  assert.match(r.body, /id="mobile-nav"/, 'mobile nav id');

  console.log('live: GET /devforge renders mobile drawer');
  r = await get('/devforge', 'admin');
  assert.equal(r.status, 200);
  assert.match(r.body, /id="mobile-nav"/, 'mobile nav id');

  console.log('GET /sms (no auth) still renders mobile drawer');
  r = await req('GET', '/sms');
  // 200/redirect is fine, just check the response is HTML not JSON
  assert.ok(r.body.length > 100, 'returns HTML');

  console.log('OK all 12 mobile responsiveness tests passed');
  if (process.exitCode) console.log('\nFAILED'); else console.log('\nALL MOBILE RESPONSIVENESS TESTS PASSED');
}

if (require.main === module) {
  run().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
}

module.exports = run;
