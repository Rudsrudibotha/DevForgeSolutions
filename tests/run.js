'use strict';

// Spawns the server, runs the tenancy test suite, and shuts down.

const { spawn } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const PORT = process.env.TEST_PORT || 3001;

const proc = spawn(process.execPath, [path.join(root, 'src/app.js')], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(PORT),
    DISABLE_AUTH: 'true',
    JWT_SECRET: 'test-secret-' + Date.now(),
    SKIP_DB: 'true',
    NODE_ENV: 'development'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let booted = false;
let errorOut = '';

proc.stdout.on('data', d => {
  const s = d.toString();
  if (s.includes('Server running')) booted = true;
  if (process.env.VERBOSE) process.stdout.write('[server] ' + s);
});
proc.stderr.on('data', d => { errorOut += d.toString(); });

(async function main() {
  const start = Date.now();
  while (!booted && Date.now() - start < 8000) {
    await new Promise(r => setTimeout(r, 100));
  }
  if (!booted) {
    console.error('[runner] server did not boot in time. stderr:', errorOut);
    proc.kill();
    process.exit(1);
  }

  try {
    // Unit tests (no server required)
    console.log('\n=== Unit tests ===');
    require('./scope.test.js');

    console.log('\n=== Architecture tests ===');
    require('./architecture/no-repos-in-routes.test.js');
    require('./architecture/no-express-in-data.test.js');
    require('./architecture/tenant-isolation-on-reads.test.js');
    require('./architecture/csrf-on-portal-writes.test.js');
    require('./architecture/audit-on-state-changes.test.js');
    require('./architecture/parent-gate.test.js');
    require('./architecture/finance-wiring.test.js');
    require('./architecture/access-matrix.test.js');

    // Integration tests (require server)
    console.log('\n=== Integration tests ===');
    const runTenancy = require('./tenancy.test.js');
    await runTenancy();
    const runParent = require('./parentTenancy.test.js');
    await runParent();
    const runPay = require('./parentPayment.test.js');
    await runPay();
    const runStudents = require('./students.test.js');
    await runStudents();
    const runFamilies = require('./families.test.js');
    await runFamilies();
    const runClasses = require('./classes.test.js');
    await runClasses();
    const runAttendance = require('./attendance.test.js');
    await runAttendance();
    const runInvoices = require('./invoices.test.js');
    await runInvoices();
    const runPayments = require('./payments.test.js');
    await runPayments();
    const runBankStatements = require('./bankStatements.test.js');
    await runBankStatements();
    const runStaff = require('./staff.test.js');
    await runStaff();
    const runReports = require('./reports.test.js');
    await runReports();
    const runSettings = require('./settings.test.js');
    await runSettings();
    const runDevforgeSchools = require('./devforgeSchools.test.js');
    await runDevforgeSchools();
    const runDevforgeUsers = require('./devforgeUsers.test.js');
    await runDevforgeUsers();
    const runDevforgePayments = require('./devforgePayments.test.js');
    await runDevforgePayments();
    const runDevforgeAudit = require('./devforgeAudit.test.js');
    await runDevforgeAudit();
    const runDevforgeSettings = require('./devforgeSettings.test.js');
    await runDevforgeSettings();
    const runEmptyStates = require('./emptyStates.test.js');
    await runEmptyStates();
    const runParentMessages = require('./parentMessages.test.js');
    await runParentMessages();
    const runCommandPalette = require('./commandPalette.test.js');
    await runCommandPalette();
    const runKeyboardShortcuts = require('./keyboardShortcuts.test.js');
    await runKeyboardShortcuts();
    const runAccessibility = require('./accessibility.test.js');
    await runAccessibility();
    const runMobileResponsive = require('./mobileResponsive.test.js');
    await runMobileResponsive();
    const runCacheHeaders = require('./cacheHeaders.test.js');
    await runCacheHeaders();
    const runCoveringIndexes = require('./coveringIndexes.test.js');
    await runCoveringIndexes();
    const runDatabasePool = require('./databasePool.test.js');
    await runDatabasePool();
    const runDocs = require('./docs.test.js');
    await runDocs();
    const runHealth = require('./healthEndpoint.test.js');
    await runHealth();
    const runNotFound = require('./notFound.test.js');
    await runNotFound();

    // SQL-level tests - auto-skip without DB
    console.log('\n=== SQL-level tests ===');
    const runParentDb = require('./parentTenancyDb.test.js');
    await runParentDb();
    const runPayDb = require('./parentPaymentDb.test.js');
    await runPayDb();
    const runStudentsDb = require('./studentsDb.test.js');
    await runStudentsDb();
    const runFamiliesDb = require('./familiesDb.test.js');
    await runFamiliesDb();
    const runClassesDb = require('./classesDb.test.js');
    await runClassesDb();
    const runAttendanceDb = require('./attendanceDb.test.js');
    await runAttendanceDb();
    const runInvoicesDb = require('./invoicesDb.test.js');
    await runInvoicesDb();
    const runPaymentsDb = require('./paymentsDb.test.js');
    await runPaymentsDb();
    const runBankDb = require('./bankStatementsDb.test.js');
    await runBankDb();
    const runStaffDb = require('./staffDb.test.js');
    await runStaffDb();
    const runReportsDb = require('./reportsDb.test.js');
    await runReportsDb();
    const runSettingsDb = require('./settingsDb.test.js');
    await runSettingsDb();
    const runDevforgeSchoolsDb = require('./devforgeSchoolsDb.test.js');
    await runDevforgeSchoolsDb();
    const runDevforgeUsersDb = require('./devforgeUsersDb.test.js');
    await runDevforgeUsersDb();
    const runDevforgePaymentsDb = require('./devforgePaymentsDb.test.js');
    await runDevforgePaymentsDb();
    const runDevforgeAuditDb = require('./devforgeAuditDb.test.js');
    await runDevforgeAuditDb();
    const runDevforgeSettingsDb = require('./devforgeSettingsDb.test.js');
    await runDevforgeSettingsDb();
  } catch (err) {
    console.error('[runner] test threw:', err);
    process.exitCode = 1;
  } finally {
    proc.kill();
    setTimeout(() => process.exit(process.exitCode || 0), 500);
  }
})();
