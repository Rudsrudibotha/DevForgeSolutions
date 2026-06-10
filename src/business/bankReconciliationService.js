// Business Layer - Bank reconciliation (monthly OFX import + statement reconcile).

const crypto = require('crypto');
const {
  BankReconciliationStatementRepository,
  BankStatementImportRepository,
  BankTransactionRepository,
  computeTransactionHash,
  assertBankAccountForSchool,
  resolveTenantIdForSchool
} = require('../data/bankReconciliationRepository');
const TransactionRepository = require('../data/transactionRepository');
const { getPool, sql } = require('../data/db');

function computeFileHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function normalizeDate(s) {
  if (!s) return null;
  const raw = String(s).trim();
  const ofx = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (ofx) return `${ofx[1]}-${ofx[2]}-${ofx[3]}`;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function inMonth(dateStr, year, month) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  return d.getUTCFullYear() === Number(year) && (d.getUTCMonth() + 1) === Number(month);
}

function parseOFX(content) {
  if (!content || typeof content !== 'string') return [];
  const result = [];
  const cleaned = content.replace(/<\?xml[^?]*\?>/g, '');
  const re = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let m;
  while ((m = re.exec(cleaned)) !== null) {
    const block = m[1];
    const pick = (tag) => {
      const r = new RegExp('<' + tag + '>([^<\\r\\n]*)', 'i');
      const x = block.match(r);
      return x ? x[1].trim() : null;
    };
    const postedDate = normalizeDate(pick('DTPOSTED'));
    const transactionDate = normalizeDate(pick('DTUSER')) || postedDate;
    const bankEffectiveDate = postedDate || transactionDate;
    const amt = pick('TRNAMT');
    const fitid = pick('FITID');
    const memo = pick('MEMO');
    const name = pick('NAME') || pick('PAYEE');
    const ref = fitid || memo || name || '';
    const amount = Number(amt || 0);
    const direction = amount >= 0 ? 'Credit' : 'Debit';
    result.push({
      transactionDate,
      postedDate,
      bankEffectiveDate,
      amount,
      direction,
      reference: ref,
      description: [name, memo].filter(Boolean).join(' - ').slice(0, 500),
      fitid: fitid || null
    });
  }
  return result;
}

class BankReconciliationService {
  constructor() {
    this.statementRepo = new BankReconciliationStatementRepository();
    this.importRepo = new BankStatementImportRepository();
    this.txRepo = new BankTransactionRepository();
    this.transactionRepo = new TransactionRepository();
  }

  static async resolveTenantIdForSchool(schoolId) {
    return resolveTenantIdForSchool(schoolId);
  }

  async assertContext({ tenantId, schoolId, bankAccountId }) {
    if (!schoolId) throw Object.assign(new Error('School context is required'), { status: 403 });
    if (!tenantId) {
      tenantId = await resolveTenantIdForSchool(schoolId);
    }
    if (!tenantId) throw Object.assign(new Error('Tenant could not be resolved for this school'), { status: 403 });
    if (bankAccountId) {
      const account = await assertBankAccountForSchool(schoolId, bankAccountId);
      if (!account) throw Object.assign(new Error('Bank account not found for this school'), { status: 403 });
      if (Number(account.TenantId) !== Number(tenantId)) {
        throw Object.assign(new Error('Bank account does not belong to this school'), { status: 403 });
      }
    }
    return { tenantId, schoolId };
  }

  async importOFX({ tenantId, schoolId, bankAccountId, importYear, importMonth, ofxContent, originalFileName, importedByUserId }) {
    const ctx = await this.assertContext({ tenantId, schoolId, bankAccountId });
    tenantId = ctx.tenantId;
    schoolId = ctx.schoolId;

    if (!importYear || !importMonth) {
      throw new Error('importYear and importMonth are required');
    }

    const fileHash = computeFileHash(Buffer.from(String(ofxContent || ''), 'utf8'));
    const existing = await this.importRepo.getByHashAndPeriod({
      tenantId, schoolId, bankAccountId, fileHash, importYear: Number(importYear), importMonth: Number(importMonth)
    });
    if (existing) {
      const err = new Error('This OFX file has already been imported for this account and month');
      err.status = 409;
      throw err;
    }

    const monthName = new Date(Number(importYear), Number(importMonth) - 1, 1).toLocaleString('en-US', { month: 'long' });
    const statement = await this.statementRepo.getOrCreateForMonth({
      tenantId, schoolId, bankAccountId, statementYear: Number(importYear), statementMonth: Number(importMonth), statementMonthName: monthName, importedByUserId
    });

    const importId = await this.importRepo.create({
      tenantId, schoolId, bankAccountId,
      bankReconciliationStatementId: statement.BankReconciliationStatementId,
      importYear: Number(importYear), importMonth: Number(importMonth),
      originalFileName, fileHash, importedByUserId,
      totalTransactionsInFile: 0, totalTransactionsImported: 0, totalTransactionsSkippedOutsideMonth: 0, totalDuplicatesSkipped: 0, totalPaymentsCreated: 0,
      status: 'Processing'
    });

    const allTx = parseOFX(ofxContent);
    let imported = 0;
    let skippedOutside = 0;
    let duplicates = 0;
    let paymentsCreated = 0;

    for (const tx of allTx) {
      if (!inMonth(tx.bankEffectiveDate, importYear, importMonth)) {
        skippedOutside += 1;
        continue;
      }

      let existingTx = null;
      if (tx.fitid) {
        existingTx = await this.txRepo.findByFitid({ tenantId, schoolId, bankAccountId, fitid: tx.fitid });
      }
      const hash = computeTransactionHash({
        tenantId, schoolId, bankAccountId,
        date: tx.bankEffectiveDate, amount: Math.abs(tx.amount), direction: tx.direction,
        reference: tx.reference, description: tx.description
      });
      if (!existingTx) {
        existingTx = await this.txRepo.findByHash({ tenantId, schoolId, bankAccountId, transactionHash: hash });
      }
      if (existingTx) {
        duplicates += 1;
        continue;
      }

      const bankTransactionId = await this.txRepo.create({
        tenantId, schoolId, bankAccountId,
        bankReconciliationStatementId: statement.BankReconciliationStatementId,
        bankStatementImportId: importId,
        transactionDate: tx.transactionDate,
        postedDate: tx.postedDate,
        bankEffectiveDate: tx.bankEffectiveDate,
        amount: tx.amount,
        direction: tx.direction,
        reference: tx.reference,
        description: tx.description,
        fitid: tx.fitid,
        transactionHash: hash,
        status: 'Imported'
      });
      imported += 1;

      if (tx.direction === 'Credit' && tx.amount > 0) {
        const created = await this.createPaymentForBankTransaction({
          schoolId,
          bankTransactionId,
          amount: tx.amount,
          reference: tx.reference,
          description: tx.description,
          transactionDate: tx.bankEffectiveDate,
          payeeName: (tx.description || tx.reference || 'Imported').slice(0, 200)
        });
        if (created) paymentsCreated += 1;
      }
    }

    const pool = await getPool();
    await pool.request()
      .input('id', sql.BigInt, importId)
      .input('inFile', sql.Int, allTx.length)
      .input('imp', sql.Int, imported)
      .input('sk', sql.Int, skippedOutside)
      .input('dup', sql.Int, duplicates)
      .input('pay', sql.Int, paymentsCreated)
      .query(`
        UPDATE dbo.BankStatementImports
        SET TotalTransactionsInFile = @inFile,
            TotalTransactionsImported = @imp,
            TotalTransactionsSkippedOutsideMonth = @sk,
            TotalDuplicatesSkipped = @dup,
            TotalPaymentsCreated = @pay,
            Status = 'Completed'
        WHERE BankStatementImportId = @id
      `);

    return {
      importId,
      statementId: statement.BankReconciliationStatementId,
      totalInFile: allTx.length,
      imported,
      skippedOutside,
      duplicates,
      paymentsCreated
    };
  }

  async createPaymentForBankTransaction({ schoolId, bankTransactionId, amount, reference, description, transactionDate, payeeName }) {
    const existing = await this.transactionRepo.findByBankTransactionId(schoolId, bankTransactionId);
    if (existing) return null;

    return this.transactionRepo.createTransaction({
      schoolId,
      bankTransactionId,
      receiptNumber: `OFX-${bankTransactionId}`,
      payeeType: 'Family',
      payeeName,
      amount,
      reference: reference || null,
      description: description || null,
      transactionType: 'Bank',
      transactionDate: transactionDate || new Date(),
      paymentMethod: 'EFT',
      allocationStatus: 'Unallocated',
      bankTransactionKey: `bt:${bankTransactionId}`
    });
  }

  async listStatements({ tenantId, schoolId, bankAccountId, statusFilter, page = 1, pageSize = 50 }) {
    const ctx = await this.assertContext({ tenantId, schoolId, bankAccountId: bankAccountId || null });
    return this.statementRepo.list({
      tenantId: ctx.tenantId,
      schoolId: ctx.schoolId,
      bankAccountId,
      statusFilter,
      page,
      pageSize
    });
  }

  async getStatement(statementId, tenantId, schoolId) {
    const ctx = await this.assertContext({ tenantId, schoolId });
    return this.statementRepo.getById(statementId, ctx.tenantId, ctx.schoolId);
  }

  async listTransactionsForStatement(statementId, tenantId, schoolId) {
    const ctx = await this.assertContext({ tenantId, schoolId });
    const stmt = await this.statementRepo.getById(statementId, ctx.tenantId, ctx.schoolId);
    if (!stmt) return [];
    return this.txRepo.listForStatement(statementId, ctx.tenantId, ctx.schoolId);
  }

  async matchBankTransactionToInvoice({ statementId, bankTransactionId, invoiceId, tenantId, schoolId, userId }) {
    const ctx = await this.assertContext({ tenantId, schoolId });
    const stmt = await this.statementRepo.getById(statementId, ctx.tenantId, ctx.schoolId);
    if (!stmt) throw Object.assign(new Error('Statement not found'), { status: 404 });

    const bankTx = await this.txRepo.getById(bankTransactionId, ctx.tenantId, ctx.schoolId);
    if (!bankTx || Number(bankTx.BankReconciliationStatementId) !== Number(statementId)) {
      throw Object.assign(new Error('Bank transaction not found for this statement'), { status: 404 });
    }

    const payment = await this.transactionRepo.findByBankTransactionId(ctx.schoolId, bankTransactionId);
    if (!payment) {
      throw Object.assign(new Error('Only imported credit transactions can be matched to invoices'), { status: 400 });
    }

    await this.transactionRepo.approveBankMatch(payment.TransactionID, invoiceId, userId);
    await this.txRepo.setStatus(bankTransactionId, ctx.tenantId, ctx.schoolId, 'Matched');
    return { ok: true, status: 'Matched' };
  }

  async markReconciled(statementId, tenantId, schoolId, userId) {
    const ctx = await this.assertContext({ tenantId, schoolId });
    const stmt = await this.statementRepo.getById(statementId, ctx.tenantId, ctx.schoolId);
    if (!stmt) throw Object.assign(new Error('Statement not found'), { status: 404 });

    const counts = await this.txRepo.countForStatement(statementId, ctx.tenantId, ctx.schoolId);
    const blocking = counts.Imported || 0;
    if (blocking > 0) {
      const err = new Error('Cannot reconcile while imported transactions remain unmatched');
      err.status = 400;
      err.details = counts;
      throw err;
    }

    await this.statementRepo.setStatus(statementId, ctx.tenantId, ctx.schoolId, 'Reconciled', userId);
    return { ok: true, status: 'Reconciled' };
  }
}

module.exports = { BankReconciliationService, parseOFX, computeFileHash };
