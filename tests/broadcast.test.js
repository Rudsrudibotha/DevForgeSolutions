'use strict';

// Task 84: Broadcast delivery tests.

const assert = require('node:assert');
const { parseOFX, computeFileHash } = require('../src/business/bankReconciliationService');

async function run() {
  // OFX parser smoke test
  const sample = [
    'OFXHEADER:100',
    'DATA:OFXSGML',
    '<OFX>',
    '<BANKMSGSRSV1><STMTTRNRS><STMTRS>',
    '<BANKTRANLIST>',
    '<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260615<TRNAMT>1500.00<FITID>FT-001<NAME>SMITH FEES<MEMO>JUNE FEES</STMTTRN>',
    '<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260616<TRNAMT>-50.00<FITID>FT-002<NAME>BANK CHARGES</STMTTRN>',
    '<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260501<TRNAMT>2000.00<FITID>FT-003<NAME>JANE FEES</STMTTRN>',
    '</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>'
  ].join('\n');

  const txns = parseOFX(sample);
  assert.ok(Array.isArray(txns), 'parseOFX must return array');
  assert.ok(txns.length === 3, 'expected 3 transactions, got ' + txns.length);
  assert.strictEqual(txns[0].amount, 1500.00, 'first amount correct');
  assert.strictEqual(txns[1].direction, 'Debit', 'debit detected');
  assert.strictEqual(txns[2].fitid, 'FT-003', 'fitid parsed');
  console.log('[ok] OFX parser returns correct transactions');

  const hash = computeFileHash('hello world');
  assert.strictEqual(hash.length, 64, 'SHA256 hex is 64 chars');
  const hash2 = computeFileHash('hello world');
  assert.strictEqual(hash, hash2, 'same input produces same hash');
  console.log('[ok] file hash is deterministic');
}

module.exports = { run };
