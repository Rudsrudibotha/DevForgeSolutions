'use strict';

// Tests for covering indexes. Schema is SQL, not executable here without a DB,
// so we validate the schema.sql file contains the expected CREATE INDEX
// statements with the right INCLUDE columns.

const assert = require('node:assert/strict');
const fs = require('node:fs');

const schema = fs.readFileSync('db/schema.sql', 'utf8');

const REQUIRED_INDEXES = [
  // (indexName, expectedColumnList, expectedIncludeColumns)
  { name: 'IX_Students_School_Active_Class', columns: ['SchoolID', 'IsDeleted', 'IsActive', 'ClassID'], includes: ['StudentID', 'FirstName', 'LastName'] },
  { name: 'IX_Students_School_LastName',     columns: ['SchoolID', 'LastName'],                    includes: ['StudentID', 'FamilyID', 'ClassID'] },
  { name: 'IX_Invoices_School_Status_Due',    columns: ['SchoolID', 'Status', 'DueDate'],          includes: ['InvoiceID', 'InvoiceNumber', 'Amount'] },
  { name: 'IX_Invoices_School_Student_Status',columns: ['SchoolID', 'StudentID', 'Status'],        includes: ['InvoiceID', 'Amount', 'AmountPaid'] },
  { name: 'IX_Transactions_School_Date',      columns: ['SchoolID', 'TransactionDate'],           includes: ['TransactionID', 'ReceiptNumber', 'Amount'] },
  { name: 'IX_Transactions_Allocation_School',columns: ['AllocationStatus', 'SchoolID'],          includes: ['TransactionID', 'Amount'] },
  { name: 'IX_AuditLog_School_OccurredAt_Covering', columns: ['SchoolID', 'OccurredAt'],    includes: ['AuditID', 'Action', 'ResourceType', 'Payload'] },
  { name: 'IX_Users_Email',                   columns: ['Email'],                                 includes: ['UserID', 'Username', 'Role'] },
  { name: 'IX_ParentLinks_User',              columns: ['UserID'],                                 includes: ['ParentLinkID', 'SchoolID', 'FamilyID'] },
  { name: 'IX_BankStatements_School_Date',    columns: ['SchoolID', 'StatementDate'],             includes: ['BankStatementID', 'FileName'] },
  { name: 'IX_BankStmts_School_Match',        columns: ['SchoolID', 'IsMatched'],                  includes: ['BankStatementTransactionID', 'Amount'] },
  { name: 'IX_Employees_School_Active',       columns: ['SchoolID', 'IsActive'],                    includes: ['EmployeeID', 'LastName', 'FirstName'] },
  { name: 'IX_Conversations_School',          columns: ['SchoolID', 'LastMessageAt'],              includes: ['ConversationID', 'ConversationName'] }
];

async function run() {
  console.log('schema.sql has covering indexes for hot query paths');

  for (const idx of REQUIRED_INDEXES) {
    console.log('index ' + idx.name);
    // Find the CREATE INDEX statement that starts the multi-line block.
    // Match: optional whitespace + "CREATE INDEX" + whitespace + the full name + whitespace/newline.
    const createRe = new RegExp('CREATE INDEX\\s+' + idx.name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b');
    const createMatch = schema.match(createRe);
    assert.ok(createMatch, idx.name + ' missing from schema.sql');
    const createIdx = createMatch.index;
    // Idempotent guard
    const escapedName = idx.name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const guardRegex = new RegExp("IF NOT EXISTS \\(SELECT 1 FROM sys\\.indexes WHERE name = '" + escapedName + "'");
    assert.match(schema, guardRegex, idx.name + ' has idempotent guard');
    // Context window: 1000 chars should reach the INCLUDE clause.
    const ctx = schema.substring(createIdx, createIdx + 1000);
    for (const col of idx.columns) {
      assert.ok(ctx.indexOf(col) !== -1, idx.name + ' missing column ' + col);
    }
    if (idx.includes && idx.includes.length > 0) {
      assert.ok(ctx.indexOf('INCLUDE') !== -1, idx.name + ' missing INCLUDE clause');
      for (const inc of idx.includes) {
        assert.ok(ctx.indexOf(inc) !== -1, idx.name + ' missing INCLUDE column ' + inc);
      }
    }
  }

  console.log('all covering indexes are idempotent (IF NOT EXISTS guard)');
  const matches = schema.match(/CREATE INDEX/g) || [];
  const createCount = matches.length;
  const guardCount = (schema.match(/IF NOT EXISTS \(SELECT 1 FROM sys\.indexes/g) || []).length;
  assert.ok(guardCount >= REQUIRED_INDEXES.length, 'all new indexes have idempotent guards, got ' + guardCount + ' guards, ' + createCount + ' creates');

  console.log('indexes are using INCLUDE for covering (not just key columns)');
  const includeCount = (schema.match(/INCLUDE \(/g) || []).length;
  assert.ok(includeCount >= REQUIRED_INDEXES.length, 'all new indexes use INCLUDE for covering, got ' + includeCount);

  console.log('transactions unallocated index has filtered WHERE clause');
  // The index lives inside an sp_executesql string, so quotes may be doubled.
  assert.match(schema, /WHERE AllocationStatus IN \('{1,2}Unallocated'{1,2}, '{1,2}PendingPayment'{1,2}\)/, 'unallocated index has partial filter');

  console.log('OK all 7 covering index tests passed');
  if (process.exitCode) console.log('\nFAILED'); else console.log('\nALL COVERING INDEX TESTS PASSED');
}

if (require.main === module) {
  run().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
}

module.exports = run;
