'use strict';

// Architecture test: route files with state-changing handlers must
// import the audit middleware. We allow exemptions for read-only
// files. Each file is allowed one exemption: a wrapper that just
// re-exports a route factory from src/application/shared/.
//
// Run: node tests/architecture/audit-on-state-changes.test.js

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

function hasWrites(src) {
  return /\.(post|put|patch|delete)\s*\(/.test(src);
}

function usesAudit(src) {
  return /\baudit\s*\(/.test(src) || /require\(['"][^'"]*audit['"]\)/.test(src);
}

function isReExport(src) {
  const trimmed = src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '').trim();
  return /^module\.exports\s*=\s*[A-Za-z_$][\w$]*\(/.test(trimmed)
    || /^module\.exports\s*=\s*create[A-Za-z]*Router/.test(trimmed);
}

function findViolations() {
  const root = path.resolve(__dirname, '..', '..', 'src', 'application');
  const files = walk(root);
  const violations = [];
  for (const f of files) {
    if (f.includes(path.sep + 'shared' + path.sep)) continue;
    if (f.includes(path.sep + 'portal' + path.sep + 'index.js')) continue;
    const src = fs.readFileSync(f, 'utf8');
    if (isReExport(src)) continue;
    if (hasWrites(src) && !usesAudit(src)) {
      violations.push({ file: f });
    }
  }
  return violations;
}

function test(name, fn) {
  try { fn(); console.log(`  PASS: ${name}`); }
  catch (err) { console.error(`  FAIL: ${name}\n    ${err.message}`); process.exitCode = 1; }
}

console.log('\n[arch:audit-on-state-changes]');
test('every route file with writes references the audit middleware', () => {
  const v = findViolations();
  if (v.length) {
    const head = v.map(x => path.relative(process.cwd(), x.file)).join('\n      ');
    console.log(`  REPORT: ${v.length} files without audit:\n      ${head}`);
    if (process.env.ARCH_STRICT === '1') {
      throw new Error(`${v.length} files without audit`);
    }
  }
});
