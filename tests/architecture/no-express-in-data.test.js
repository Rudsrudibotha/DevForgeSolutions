'use strict';

// Architecture test: repository files must not import express or
// reference req/res. They must be HTTP-agnostic.
//
// Rule: src/data/**/*.js must NOT require('express') and must NOT
//       reference `req` or `res` as identifiers in handler positions.
//
// Run: node tests/architecture/no-express-in-data.test.js

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

function findViolations() {
  const root = path.resolve(__dirname, '..', '..', 'src', 'data');
  const files = walk(root);
  const violations = [];
  const expressImport = /require\(['"]express['"]\)/;
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    if (expressImport.test(src)) {
      violations.push({ file: f, kind: 'express-import' });
    }
    if (/\(req,\s*res\s*\)/.test(src) || /function\s*\(req/.test(src)) {
      violations.push({ file: f, kind: 'req-arg' });
    }
  }
  return violations;
}

function test(name, fn) {
  try { fn(); console.log(`  PASS: ${name}`); }
  catch (err) { console.error(`  FAIL: ${name}\n    ${err.message}`); process.exitCode = 1; }
}

console.log('\n[arch:no-express-in-data]');
test('no repository file imports express or takes req/res', () => {
  const v = findViolations();
  if (v.length) {
    const msg = v.map(x => `${path.relative(process.cwd(), x.file)} (${x.kind})`).join('\n      ');
    throw new Error(`${v.length} violations:\n      ${msg}`);
  }
});
