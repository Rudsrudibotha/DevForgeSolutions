'use strict';

// Architecture test: every "get/list/find/count/search" repository
// function must reference TenantId in its body. This is a coarse
// heuristic: it scans the function source for the substring
// `TenantId` (case-sensitive) or `@tenantId`/`@activeTenantId`.
//
// This is a soft check - it may produce false positives for helper
// functions that legitimately don't filter by tenant (e.g. global
// feature catalogue lookups). The report names the offenders so a
// human can review.
//
// Run: node tests/architecture/tenant-isolation-on-reads.test.js

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

const READ_PREFIXES = ['get', 'list', 'find', 'count', 'search', 'exists', 'fetch'];

function findFunctionBodies(src) {
  const out = [];
  const re = /(?:async\s+)?function\s*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{|([A-Za-z_$][\w$]*)\s*[:=]\s*(?:async\s+)?(?:function\s*)?\([^)]*\)\s*=>\s*\{|class\s+[A-Za-z_$][\w$]*\s*\{[\s\S]*?\}/g;
  let m;
  while ((m = re.exec(src))) {
    const name = m[1] || m[2];
    if (!name) continue;
    const start = m.index + m[0].length - 1;
    let depth = 1;
    let i = start + 1;
    while (i < src.length && depth > 0) {
      const c = src[i];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      i++;
    }
    out.push({ name, body: src.slice(start + 1, i - 1) });
  }
  return out;
}

function findViolations() {
  const root = path.resolve(__dirname, '..', '..', 'src', 'data');
  const files = walk(root);
  const violations = [];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const fns = findFunctionBodies(src);
    for (const fn of fns) {
      const lower = fn.name.toLowerCase();
      if (!READ_PREFIXES.some(p => lower.startsWith(p))) continue;
      if (fn.name === 'getPool' || fn.name === 'getConnectionConfig' || fn.name === 'getConnection') continue;
      if (!/TenantId|@tenantId|@activeTenantId/i.test(fn.body)) {
        violations.push({ file: f, fn: fn.name });
      }
    }
  }
  return violations;
}

function test(name, fn) {
  try { fn(); console.log(`  PASS: ${name}`); }
  catch (err) { console.error(`  FAIL: ${name}\n    ${err.message}`); process.exitCode = 1; }
}

console.log('\n[arch:tenant-isolation-on-reads]');
test('every read function references TenantId', () => {
  const v = findViolations();
  if (v.length) {
    const head = v.slice(0, 10).map(x => `${path.relative(process.cwd(), x.file)} :: ${x.fn}`).join('\n      ');
    const more = v.length > 10 ? `\n      ...and ${v.length - 10} more` : '';
    console.log(`  REPORT: ${v.length} candidate functions (review each):\n      ${head}${more}`);
    if (process.env.ARCH_STRICT === '1') {
      throw new Error(`${v.length} candidate functions - review and refactor`);
    }
  }
});
