'use strict';

// Tests for global keyboard shortcuts: g+d, g+h, g+i etc. Mounted on every page.

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
  console.log('shortcuts.js exists and is wired');
  assert.ok(fs.existsSync('public/shortcuts.js'), 'shortcuts.js missing');
  const sc = fs.readFileSync('public/shortcuts.js', 'utf8');
  assert.match(sc, /kchShortcuts/, 'component name');
  assert.match(sc, /_onKey/, 'keydown handler');
  assert.match(sc, /_resolve/, 'g+key resolver');
  assert.match(sc, /_showHelp/, 'help dialog');
  assert.match(sc, /_isTypingInField/, 'typing guard');
  assert.match(sc, /common\[key\]/, 'common shortcuts');
  assert.match(sc, /perPortal/, 'per-portal shortcuts');
  assert.match(sc, /sms:[\s\S]*?students/, 'sms student shortcut');
  assert.match(sc, /devforge:[\s\S]*?schools/, 'devforge school shortcut');
  assert.match(sc, /parent:[\s\S]*?invoices/, 'parent invoice shortcut');

  console.log('layout mounts shortcuts.js');
  const layout = fs.readFileSync('src/views/layouts/app.ejs', 'utf8');
  assert.match(layout, /shortcuts\.js/, 'shortcuts script in layout');
  assert.match(layout, /kchShortcuts\(\)/, 'shortcuts component mounted');

  console.log('footer advertises ? shortcut');
  const footer = fs.readFileSync('src/views/partials/footer.ejs', 'utf8');
  assert.match(footer, /Press[\s\S]*shortcuts/, 'footer has shortcut hint');

  console.log('GET /sms has shortcuts.js loaded');
  let r = await get('/sms', 'school');
  assert.equal(r.status, 200);
  assert.match(r.body, /shortcuts\.js/, 'shortcuts script tag');
  assert.match(r.body, /kchShortcuts\(\)/, 'shortcuts alpine component');

  console.log('GET /parent has shortcuts.js loaded');
  r = await get('/parent', 'parent');
  assert.equal(r.status, 200);
  assert.match(r.body, /shortcuts\.js/, 'shortcuts script tag');
  assert.match(r.body, /Press[\s\S]*shortcuts/, 'footer shortcut hint');

  console.log('GET /devforge has shortcuts.js loaded');
  r = await get('/devforge', 'admin');
  assert.equal(r.status, 200);
  assert.match(r.body, /shortcuts\.js/, 'shortcuts script tag');

  console.log('shortcuts has 9+ per-portal destinations for SMS');
  const perPortalMatch = sc.match(/sms:\s*\{[\s\S]+?\},\s*devforge:/);
  assert.ok(perPortalMatch, 'sms shortcuts block');
  // Count entries of the form "x: '/path'" inside the SMS block.
  const smsShortcuts = (perPortalMatch[0].match(/'\/sms\/[^']+'/g) || []).length;
  assert.ok(smsShortcuts >= 9, 'sms has 9+ shortcuts, got ' + smsShortcuts);

  console.log('typing guard prevents shortcuts in fields');
  assert.match(sc, /input.*textarea.*select.*isContentEditable/s, 'typing guard checks all field types');

  console.log('OK all 9 keyboard shortcut tests passed');
  if (process.exitCode) console.log('\nFAILED'); else console.log('\nALL KEYBOARD SHORTCUTS TESTS PASSED');
}

if (require.main === module) {
  run().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
}

module.exports = run;
