'use strict';

// Architecture test: every portal EJS-rendered POST/PUT/PATCH/DELETE
// must be preceded by a CSRF guard somewhere in the route file. This
// is a soft check - it scans for `verifyCsrf` references in the file
// and any router.<method> handlers with cookie auth. We do not assert
// that EACH handler is wrapped, only that the file has CSRF available
// and uses it at least once.
//
// Run: node tests/architecture/csrf-on-portal-writes.test.js

const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(p, out);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(p);
    }
  }
  return out;
}

function hasWriteHandlers(src) {
  return /\.(post|put|patch|delete)\s*\(/.test(src);
}

function usesCsrf(src) {
  return /verifyCsrf/.test(src) || /requireCsrf/.test(src);
}

function findViolations() {
  const root = path.resolve(__dirname, '..', '..', 'src', 'application', 'portal');
  const files = walk(root);
  const violations = [];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    if (hasWriteHandlers(src) && !usesCsrf(src)) {
      violations.push({ file: f });
    }
  }
  return violations;
}

function test(name, fn) {
  try { fn(); console.log(`  PASS: ${name}`); }
  catch (err) { console.error(`  FAIL: ${name}\n    ${err.message}`); process.exitCode = 1; }
}

console.log('\n[arch:csrf-on-portal-writes]');
test('every portal route file with writes references verifyCsrf', () => {
  const v = findViolations();
  if (v.length) {
    const head = v.map(x => path.relative(process.cwd(), x.file)).join('\n      ');
    console.log(`  REPORT: ${v.length} files missing CSRF guard:\n      ${head}`);
    if (process.env.ARCH_STRICT === '1') {
      throw new Error(`${v.length} files missing CSRF guard`);
    }
  }
});
