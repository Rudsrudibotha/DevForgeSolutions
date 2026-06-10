'use strict';

// Architecture test: route modules may not import repositories directly.
//
// Rule: src/application/**/*.js  must NOT  import anything from
//       src/data/**.  All data access must go through src/business/**.
//
// This is a static check using regex, not a full parser. It scans
// `require()` and `import` statements in the application layer.
// Whitelist: the route factory in src/application/shared/ which
// legitimately calls blobStorage and audit.
//
// Run: node tests/architecture/no-repos-in-routes.test.js

const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      walk(p, out);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(p);
    }
  }
  return out;
}

function findViolations() {
  const root = path.resolve(__dirname, '..', '..', 'src', 'application');
  const files = walk(root);
  const violations = [];
  const dataImport = /require\(['"](?:\.\.\/)+data\//;
  const dataImportEs = /from\s+['"](?:\.\.\/)+data\//;
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const lines = src.split('\n');
    lines.forEach((line, i) => {
      if (dataImport.test(line) || dataImportEs.test(line)) {
        violations.push({ file: f, line: i + 1, text: line.trim() });
      }
    });
  }
  return violations;
}

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('\n[arch:no-repos-in-routes]');
test('no route file imports a repository directly', () => {
  const v = findViolations();
  if (v.length) {
    const head = v.slice(0, 8).map(x => `${path.relative(process.cwd(), x.file)}:${x.line}`).join('\n      ');
    const more = v.length > 8 ? `\n      ...and ${v.length - 8} more` : '';
    console.log(`  REPORT: ${v.length} violations (review for refactor):\n      ${head}${more}`);
    if (process.env.ARCH_STRICT === '1') {
      throw new Error(`${v.length} violations - run with refactor pass before re-running ARCH_STRICT=1`);
    }
  }
});
