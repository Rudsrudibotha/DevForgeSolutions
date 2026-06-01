// Business Layer - Bank statement and reconciliation service

const BankStatementRepository = require('../data/bankStatementRepository');
const TransactionRepository = require('../data/transactionRepository');
const InvoiceRepository = require('../data/invoiceRepository');
const TransactionService = require('./transactionService');
const SchoolService = require('./schoolService');
const FinancePeriodLockRepository = require('../data/financePeriodLockRepository');

class BankStatementService {
  constructor() {
    this.bankStatementRepository = new BankStatementRepository();
    this.transactionRepository = new TransactionRepository();
    this.invoiceRepository = new InvoiceRepository();
    this.transactionService = new TransactionService();
    this.schoolService = new SchoolService();
    this.financePeriodLockRepository = new FinancePeriodLockRepository();
  }

  async uploadStatement(payload, currentUser) {
    const schoolId = this.resolveSchoolId(payload.schoolId, currentUser);
    const ofxText = String(payload.ofxText || '').trim();
    if (!ofxText) throw new Error('OFX file content is required');

    const statementDate = this.parseStatementDate(ofxText);
    const statementEndDate = this.parseStatementEndDate(ofxText);
    const fileName = this.requiredString(payload.fileName, 'File name', 255);
    const parsedTransactions = this.parseOfx(ofxText);
    const today = new Date().toISOString().slice(0, 10);
    const period = this.validateStatementPeriod(statementDate, statementEndDate);
    await this.financePeriodLockRepository.assertOpenForRange(
      schoolId,
      period.statementDate,
      period.statementEndDate,
      'Uploading a bank statement'
    );
    const overlap = await this.bankStatementRepository.findOverlappingStatement(schoolId, period.statementDate, period.statementEndDate);

    if (overlap) {
      throw new Error(`A bank statement already exists for ${overlap.StatementDate?.toISOString?.().slice(0, 10) || overlap.StatementDate} to ${overlap.StatementEndDate?.toISOString?.().slice(0, 10) || overlap.StatementEndDate}`);
    }

    let rowsImported = 0;
    let rowsSkippedDuplicate = 0;
    let rowsSkippedPending = 0;

    const statement = await this.bankStatementRepository.createStatement({
      schoolId, fileName, statementDate: period.statementDate, statementEndDate: period.statementEndDate, rawData: ofxText,
      uploadedBy: currentUser.UserID, totalRows: parsedTransactions.length,
      rowsImported: 0, rowsSkippedDuplicate: 0, rowsSkippedPending: 0
    });

    for (const item of parsedTransactions) {
      // Skip current-day and future-dated transactions and treat them as pending.
      // This prevents a future month (for example July) from being imported during the current month.
      if (item.transactionDate >= today) {
        rowsSkippedPending++;
        continue;
      }

      // Build unique transaction key for duplicate prevention
      const bankTransactionKey = this.buildTransactionKey(schoolId, item);

      // Check for duplicate
      const isDuplicate = await this.transactionRepository.transactionKeyExists(schoolId, bankTransactionKey);
      if (isDuplicate) {
        rowsSkippedDuplicate++;
        continue;
      }

      await this.transactionService.recordBankTransaction({
        schoolId,
        bankStatementId: statement.BankStatementID,
        amount: item.amount,
        reference: item.reference,
        description: item.description,
        transactionDate: item.transactionDate,
        bankTransactionKey
      });
      rowsImported++;
    }

    await this.bankStatementRepository.updateStatementCounts(statement.BankStatementID, {
      totalRows: parsedTransactions.length, rowsImported, rowsSkippedDuplicate, rowsSkippedPending
    });

    return {
      statement: { ...statement, TotalRows: parsedTransactions.length, RowsImported: rowsImported, RowsSkippedDuplicate: rowsSkippedDuplicate, RowsSkippedPending: rowsSkippedPending },
      importedTransactions: rowsImported,
      summary: { totalRows: parsedTransactions.length, rowsImported, rowsSkippedDuplicate, rowsSkippedPending }
    };
  }

  buildTransactionKey(schoolId, item) {
    return `${schoolId}|${item.transactionDate}|${item.amount}|${(item.reference || '').slice(0, 100)}|${(item.fitId || '')}`;
  }

  async getStatements(currentUser, options = {}) {
    const period = this.resolvePeriodOptions(options);
    if (currentUser.Role === 'admin') {
      return await this.bankStatementRepository.getAllStatements({
        ...period,
        schoolId: options.schoolId ? Number(options.schoolId) : null
      });
    }

    const schoolId = this.resolveSchoolId(null, currentUser);
    return await this.bankStatementRepository.getStatementsBySchool(schoolId, period);
  }

  async getStatementDetail(statementId, currentUser) {
    const parsedStatementId = Number(statementId);
    if (!Number.isInteger(parsedStatementId) || parsedStatementId <= 0) {
      throw new Error('Bank statement ID must be a positive integer');
    }

    const schoolId = currentUser.Role === 'admin'
      ? null
      : this.resolveSchoolId(null, currentUser);
    const statement = await this.bankStatementRepository.getStatementById(parsedStatementId, schoolId);
    if (!statement) {
      throw new Error('Bank statement not found or does not belong to your school');
    }

    const transactions = await this.transactionRepository.getTransactionsByBankStatement(
      statement.BankStatementID,
      statement.SchoolID
    );

    return { statement, transactions };
  }

  async getReconciliation(currentUser, options = {}) {
    const period = this.resolvePeriodOptions(options);
    const summary = await this.transactionService.getSummary(currentUser, period);
    const statements = await this.getStatements(currentUser, options);
    const coverageStatements = options.year
      ? await this.getStatements(currentUser, { year: options.year })
      : statements;
    return {
      ...summary,
      statements,
      coverage: this.statementCoverage(coverageStatements, options.year, options.month),
      message: 'Reconciliation data is ready for review.'
    };
  }

  async getReconciliationTransactions(currentUser, options = {}) {
    const schoolId = this.resolveSchoolId(null, currentUser);
    const transactions = await this.transactionRepository.getReconciliationTransactions(schoolId, options);
    const invoices = await this.invoiceRepository.getInvoicesBySchool(schoolId, { limit: 500 });
    const openInvoices = this.openInvoices(invoices);
    return await Promise.all(transactions.map(async (transaction) => ({
      ...transaction,
      suggestions: await this.suggestionsForTransaction(transaction, schoolId, 3, openInvoices)
    })));
  }

  async searchForAllocation(query, currentUser) {
    if (!query || String(query).trim().length < 2) throw new Error('Search query must be at least 2 characters');
    const schoolId = this.resolveSchoolId(null, currentUser);
    return await this.transactionRepository.searchForAllocation(schoolId, String(query).trim());
  }

  async getOutstandingInvoicesForStudent(studentId, currentUser) {
    const schoolId = this.resolveSchoolId(null, currentUser);
    const invoices = await this.transactionRepository.getOutstandingInvoicesForStudent(studentId, schoolId);
    return invoices;
  }

  async allocateToDebtor(transactionId, allocation, currentUser) {
    const transaction = await this.verifyTransactionOwnership(transactionId, this.resolveSchoolId(allocation.schoolId, currentUser), currentUser);
    const schoolId = transaction.SchoolID;

    if (transaction.AllocationStatus === 'Allocated') {
      throw new Error('Transaction is already allocated');
    }

    await this.financePeriodLockRepository.assertOpenForDate(
      schoolId,
      transaction.TransactionDate,
      'Allocating a bank payment'
    );

    const result = await this.transactionRepository.allocateTransaction(transactionId, schoolId, {
      invoiceId: allocation.invoiceId || null,
      familyId: allocation.familyId || null,
      studentId: allocation.studentId || null,
      allocationType: allocation.allocationType || 'Debtor',
      paymentMethod: allocation.paymentMethod || 'Manual debtor allocation'
    }, currentUser.UserID);

    // Handle overpayment: allocate to invoice up to remaining, store rest as advance credit
    if (allocation.invoiceId) {
      const invoice = await this.invoiceRepository.getInvoiceById(allocation.invoiceId);
      if (!invoice || invoice.SchoolID !== schoolId) {
        throw new Error('Invoice must belong to the same school as the bank transaction');
      }

      const remaining = Number(invoice.Amount) - Number(invoice.AmountPaid || 0);
      const txAmount = Number(transaction.Amount);
      const paymentAmount = Math.min(txAmount, remaining);
      if (paymentAmount > 0) {
        await this.invoiceRepository.recordPartialPayment(allocation.invoiceId, paymentAmount, transaction.TransactionDate);
      }
      // Overpayment becomes advance credit
      if (txAmount > remaining && remaining > 0) {
        result.advanceCreditAmount = txAmount - remaining;
      }
    }

    return result;
  }

  async allocateToCreditor(transactionId, allocation, currentUser) {
    const transaction = await this.verifyTransactionOwnership(transactionId, this.resolveSchoolId(allocation.schoolId, currentUser), currentUser);
    const schoolId = transaction.SchoolID;

    await this.financePeriodLockRepository.assertOpenForDate(
      schoolId,
      transaction.TransactionDate,
      'Allocating a bank transaction'
    );

    return await this.transactionRepository.allocateTransaction(transactionId, schoolId, {
      allocationType: allocation.allocationType || 'Creditor',
      paymentMethod: allocation.paymentMethod || allocation.creditorName || 'Manual creditor allocation'
    }, currentUser.UserID);
  }

  async reallocateTransaction(transactionId, allocation, currentUser) {
    allocation = allocation || {};
    const transaction = await this.verifyTransactionOwnership(transactionId, this.resolveSchoolId(allocation.schoolId, currentUser), currentUser);
    const schoolId = transaction.SchoolID;

    if (!transaction.BankStatementID) {
      throw new Error('Only imported bank statement payments can be reallocated');
    }

    if (transaction.AllocationStatus !== 'Allocated') {
      throw new Error('Only allocated bank payments can be reallocated');
    }

    await this.financePeriodLockRepository.assertOpenForDate(
      schoolId,
      transaction.TransactionDate,
      'Reallocating a bank transaction'
    );

    const reason = this.requiredString(allocation.reason, 'Reallocation reason', 500);
    const allocationType = String(allocation.allocationType || 'Debtor').trim();
    if (!['Debtor', 'Creditor'].includes(allocationType)) {
      throw new Error('Reallocation type must be Debtor or Creditor');
    }

    const target = {
      allocationType,
      reason,
      invoiceId: allocationType === 'Debtor' ? this.optionalPositiveInteger(allocation.invoiceId, 'Invoice ID') : null,
      studentId: allocationType === 'Debtor' ? this.optionalPositiveInteger(allocation.studentId, 'Student ID') : null,
      familyId: allocationType === 'Debtor' ? this.optionalPositiveInteger(allocation.familyId, 'Family ID') : null,
      paymentMethod: allocation.paymentMethod || `Bank reallocation - ${reason.slice(0, 80)}`
    };

    return await this.transactionRepository.reallocateTransaction(transaction.TransactionID, schoolId, target, currentUser.UserID);
  }

  async verifyTransactionOwnership(transactionId, schoolId, currentUser) {
    const parsedId = Number(transactionId);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw new Error('Transaction ID must be a positive integer');
    }

    const transaction = currentUser.Role === 'admin'
      ? await this.transactionRepository.getTransactionById(parsedId)
      : await this.transactionRepository.getTransactionByIdForSchool(parsedId, schoolId);
    if (!transaction) throw new Error('Transaction not found or does not belong to your school');
    return transaction;
  }

  async getMatchSuggestions(currentUser) {
    const bankTransactions = currentUser.Role === 'admin'
      ? await this.transactionRepository.getUnmatchedBankTransactionsAll()
      : await this.transactionRepository.getUnmatchedBankTransactionsBySchool(this.resolveSchoolId(null, currentUser));

    const invoices = currentUser.Role === 'admin'
      ? await this.invoiceRepository.getAllInvoices({ limit: 200 })
      : await this.invoiceRepository.getInvoicesBySchool(this.resolveSchoolId(null, currentUser), { limit: 200 });

    const openInvoices = this.openInvoices(invoices);

    const suggestions = [];
    for (const transaction of bankTransactions) {
      const candidates = await this.suggestionsForTransaction(
        transaction,
        transaction.SchoolID,
        3,
        openInvoices.filter((invoice) => invoice.SchoolID === transaction.SchoolID)
      );
      for (const candidate of candidates) suggestions.push(candidate);
    }
    return suggestions;
  }

  async approveMatch(transactionId, invoiceId, currentUser) {
    const parsedTransactionId = Number(transactionId);
    const parsedInvoiceId = Number(invoiceId);
    if (!Number.isInteger(parsedTransactionId) || parsedTransactionId <= 0) throw new Error('Transaction ID must be a positive integer');
    if (!Number.isInteger(parsedInvoiceId) || parsedInvoiceId <= 0) throw new Error('Invoice ID must be a positive integer');

    const invoice = await this.invoiceRepository.getInvoiceById(parsedInvoiceId);
    if (!invoice) throw new Error('Invoice not found');
    if (currentUser.Role !== 'admin' && currentUser.SchoolID !== invoice.SchoolID) {
      throw new Error('You can only approve matches for your own school');
    }
    const transaction = await this.verifyTransactionOwnership(
      parsedTransactionId,
      currentUser.Role === 'admin' ? null : currentUser.SchoolID,
      currentUser
    );
    if (transaction.SchoolID !== invoice.SchoolID) {
      throw new Error('Bank transaction and invoice must belong to the same school');
    }
    await this.financePeriodLockRepository.assertOpenForDate(
      transaction.SchoolID,
      transaction.TransactionDate,
      'Approving a bank match'
    );

    return await this.transactionRepository.approveBankMatch(parsedTransactionId, parsedInvoiceId, currentUser.UserID);
  }

  openInvoices(invoices) {
    return invoices
      .filter((invoice) => invoice.Status !== 'Paid')
      .map((invoice) => ({
        ...invoice,
        remaining: Number(invoice.remaining ?? invoice.Remaining ?? (Number(invoice.Amount || 0) - Number(invoice.AmountPaid || 0)))
      }))
      .filter((invoice) => invoice.remaining > 0);
  }

  async suggestionsForTransaction(transaction, schoolId, limit = 3, openInvoices = null) {
    if (transaction.AllocationStatus === 'Allocated') {
      return [];
    }

    const suggestions = [];
    const seenInvoices = new Set();
    const history = await this.transactionRepository.getPreviousAllocationsForReference(
      schoolId,
      transaction.Reference,
      transaction.Description,
      transaction.TransactionID,
      transaction.TransactionDate
    );

    for (const previous of history) {
      const invoices = previous.StudentID
        ? await this.transactionRepository.getOutstandingInvoicesForStudent(previous.StudentID, schoolId)
        : previous.FamilyID
          ? await this.transactionRepository.getOutstandingInvoicesForFamily(previous.FamilyID, schoolId)
          : [];

      const ordered = this.openInvoices(invoices)
        .filter((invoice) => Number(transaction.Amount || 0) <= Number(invoice.remaining || 0))
        .sort((a, b) => {
          const amount = Number(transaction.Amount || 0);
          const aExact = Number(a.remaining || 0) === amount ? 1 : 0;
          const bExact = Number(b.remaining || 0) === amount ? 1 : 0;
          if (aExact !== bExact) return bExact - aExact;
          return new Date(a.DueDate || a.IssueDate || 0) - new Date(b.DueDate || b.IssueDate || 0);
        });

      for (const invoice of ordered) {
        if (seenInvoices.has(invoice.InvoiceID)) continue;
        seenInvoices.add(invoice.InvoiceID);
        const remaining = Number(invoice.remaining || 0);
        const exactAmount = Number(transaction.Amount || 0) === remaining;
        suggestions.push({
          transactionId: transaction.TransactionID,
          invoiceId: invoice.InvoiceID,
          schoolId,
          score: exactAmount ? 98 : 88,
          reason: `same reference was previously allocated to ${this.historyLabel(previous)}`,
          transactionReference: transaction.Reference,
          transactionDescription: transaction.Description,
          transactionDate: transaction.TransactionDate,
          bankStatementFile: transaction.BankStatementFile,
          invoiceNumber: invoice.InvoiceNumber,
          invoiceStudent: `${invoice.FirstName || ''} ${invoice.LastName || ''}`.trim(),
          amount: Number(transaction.Amount || 0),
          invoiceRemaining: remaining,
          source: 'previous-reference'
        });
        if (suggestions.length >= limit) return suggestions;
      }
    }

    const invoicePool = openInvoices || this.openInvoices(await this.invoiceRepository.getInvoicesBySchool(schoolId, { limit: 500 }));
    const scored = invoicePool
      .filter((invoice) => Number(invoice.SchoolID) === Number(schoolId))
      .map((invoice) => this.scoreMatch(transaction, invoice))
      .filter((candidate) => candidate.score >= 50 && !seenInvoices.has(candidate.invoiceId))
      .sort((a, b) => b.score - a.score);

    for (const candidate of scored) {
      seenInvoices.add(candidate.invoiceId);
      suggestions.push(candidate);
      if (suggestions.length >= limit) break;
    }

    return suggestions;
  }

  historyLabel(previous) {
    const student = `${previous.FirstName || ''} ${previous.LastName || ''}`.trim();
    return student || previous.FamilyName || previous.InvoiceNumber || 'this account';
  }

  scoreMatch(transaction, invoice) {
    const transactionText = `${transaction.Reference || ''} ${transaction.Description || ''}`.toLowerCase();
    const invoiceNumber = String(invoice.InvoiceNumber || '').toLowerCase();
    const studentName = `${invoice.FirstName || ''} ${invoice.LastName || ''}`.trim().toLowerCase();
    const amount = Number(transaction.Amount || 0);
    const remaining = Number(invoice.remaining ?? invoice.Remaining ?? 0);
    let score = 0;
    const reasons = [];

    if (amount === remaining) { score += 55; reasons.push('amount matches remaining balance'); }
    else if (amount < remaining) { score += 35; reasons.push('amount can be applied as partial payment'); }
    if (invoiceNumber && transactionText.includes(invoiceNumber)) { score += 35; reasons.push('reference contains invoice number'); }
    if (studentName && transactionText.includes(studentName)) { score += 20; reasons.push('reference contains student name'); }
    if (!invoiceNumber && !studentName && amount === remaining) score += 5;

    return {
      transactionId: transaction.TransactionID, invoiceId: invoice.InvoiceID, schoolId: invoice.SchoolID,
      score: Math.min(score, 100), reason: reasons.join(', ') || 'possible amount match',
      transactionReference: transaction.Reference, transactionDescription: transaction.Description,
      transactionDate: transaction.TransactionDate, bankStatementFile: transaction.BankStatementFile,
      invoiceNumber: invoice.InvoiceNumber, invoiceStudent: `${invoice.FirstName || ''} ${invoice.LastName || ''}`.trim(),
      amount, invoiceRemaining: remaining,
      source: 'amount-reference'
    };
  }

  validateStatementPeriod(statementDate, statementEndDate) {
    if (!statementDate || !statementEndDate) {
      throw new Error('Bank statement must include both a start date and an end date');
    }

    const start = new Date(`${statementDate}T00:00:00`);
    const end = new Date(`${statementEndDate}T00:00:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error('Bank statement dates are invalid');
    }

    if (start > end) {
      throw new Error('Bank statement start date cannot be after the end date');
    }

    return {
      statementDate: this.formatDateOnly(start),
      statementEndDate: this.formatDateOnly(end)
    };
  }

  resolvePeriodOptions(options = {}) {
    const month = Number(options.month || 0);
    const year = Number(options.year || 0);

    if (!month && !year) {
      return {
        fromDate: options.fromDate || null,
        toDate: options.toDate || null
      };
    }

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new Error('Reconciliation year must be between 2000 and 2100');
    }

    if (!month) {
      return {
        fromDate: `${year}-01-01`,
        toDate: `${year + 1}-01-01`
      };
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error('Reconciliation month must be between 1 and 12');
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    return {
      fromDate: this.formatDateOnly(start),
      toDate: this.formatDateOnly(end)
    };
  }

  statementCoverage(statements, selectedYear, selectedMonth = null) {
    const coverageByDate = new Map();
    const year = Number(selectedYear || new Date().getFullYear());

    for (const statement of statements || []) {
      const start = this.parseDateOnly(statement.StatementDate);
      const end = this.parseDateOnly(statement.StatementEndDate || statement.StatementDate);
      if (!start || !end || end < start) continue;

      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);
      let cursor = new Date(Math.max(start.getTime(), yearStart.getTime()));
      const last = new Date(Math.min(end.getTime(), yearEnd.getTime()));

      while (cursor <= last) {
        const key = this.formatDateOnly(cursor);
        coverageByDate.set(key, (coverageByDate.get(key) || 0) + 1);
        cursor = this.addDays(cursor, 1);
      }
    }

    const current = new Date();
    const selectedMonthNumber = Number(selectedMonth || 0);
    const lastMonth = selectedMonthNumber
      ? Math.min(Math.max(selectedMonthNumber, 1), 12)
      : current.getFullYear() === year ? current.getMonth() + 1 : 12;
    const missingMonths = [];
    const duplicateMonths = [];
    const completeMonths = [];
    const missingDates = [];
    const duplicateDates = [];

    for (let month = 1; month <= lastMonth; month += 1) {
      const key = `${year}-${String(month).padStart(2, '0')}`;
      const monthEndDate = new Date(year, month, 0);
      const monthMissingDates = [];
      const monthDuplicateDates = [];

      for (let day = 1; day <= monthEndDate.getDate(); day += 1) {
        const dateKey = `${key}-${String(day).padStart(2, '0')}`;
        const count = coverageByDate.get(dateKey) || 0;
        if (!count) monthMissingDates.push(dateKey);
        if (count > 1) monthDuplicateDates.push(dateKey);
      }

      if (monthMissingDates.length === monthEndDate.getDate()) {
        missingMonths.push(key);
      } else if (!monthMissingDates.length && !monthDuplicateDates.length) {
        completeMonths.push(key);
      }

      if (monthDuplicateDates.length) duplicateMonths.push(key);
      if (monthMissingDates.length && monthMissingDates.length < monthEndDate.getDate()) {
        missingDates.push(...monthMissingDates);
      }
      duplicateDates.push(...monthDuplicateDates);
    }

    return {
      year,
      completeMonths,
      missingMonths,
      duplicateMonths,
      missingDateRanges: this.dateRanges(missingDates),
      duplicateDateRanges: this.dateRanges(duplicateDates)
    };
  }

  parseDateOnly(value) {
    if (!value) return null;
    const text = value instanceof Date ? this.formatDateOnly(value) : String(value).slice(0, 10);
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  dateRanges(dateKeys) {
    if (!dateKeys.length) return [];
    const unique = [...new Set(dateKeys)].sort();
    const ranges = [];
    let start = unique[0];
    let previous = unique[0];

    for (const current of unique.slice(1)) {
      const expected = this.formatDateOnly(this.addDays(this.parseDateOnly(previous), 1));
      if (current === expected) {
        previous = current;
        continue;
      }
      ranges.push(start === previous ? start : `${start} to ${previous}`);
      start = current;
      previous = current;
    }

    ranges.push(start === previous ? start : `${start} to ${previous}`);
    return ranges;
  }

  formatDateOnly(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  parseOfx(ofxText) {
    const cleanedText = ofxText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const blocks = cleanedText.split(/<STMTTRN>/i).slice(1);

    return blocks.map((block) => {
      const findTag = (tag) => {
        const regex = new RegExp(`<${tag}>([^<\\n\\r]+)`, 'i');
        const match = block.match(regex);
        return match ? match[1].trim() : null;
      };

      const amount = Number(findTag('TRNAMT') || 0);
      const transactionDate = this.formatOfxDate(findTag('DTPOSTED')) || new Date().toISOString().slice(0, 10);
      const fitId = findTag('FITID') || '';
      const name = findTag('NAME') || '';
      const memo = findTag('MEMO') || '';
      const reference = name || memo || fitId || 'Bank transaction';
      const description = memo || name || fitId || '';

      return { amount: Math.abs(amount), transactionDate, reference, description, fitId };
    }).filter((item) => item.amount > 0);
  }

  parseStatementDate(ofxText) {
    const match = ofxText.match(/<DTSTART>([0-9]{8})/i);
    return match ? this.formatOfxDate(match[1]) : null;
  }

  parseStatementEndDate(ofxText) {
    const match = ofxText.match(/<DTEND>([0-9]{8})/i);
    return match ? this.formatOfxDate(match[1]) : null;
  }

  formatOfxDate(value) {
    if (!value) return null;
    const dateValue = String(value).slice(0, 8);
    if (dateValue.length !== 8) return null;
    return `${dateValue.slice(0, 4)}-${dateValue.slice(4, 6)}-${dateValue.slice(6, 8)}`;
  }

  resolveSchoolId(schoolId, currentUser) {
    if (currentUser.Role === 'admin') return schoolId || currentUser.SchoolID || null;
    if (!currentUser.SchoolID) throw new Error('School users must be linked to a school');
    return currentUser.SchoolID;
  }

  requiredString(value, label, maxLength) {
    if (!value || String(value).trim().length === 0) throw new Error(`${label} is required`);
    const cleaned = String(value).trim();
    if (cleaned.length > maxLength) throw new Error(`${label} must be ${maxLength} characters or less`);
    return cleaned;
  }

  optionalPositiveInteger(value, label) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${label} must be a positive integer`);
    return parsed;
  }
}

module.exports = BankStatementService;
