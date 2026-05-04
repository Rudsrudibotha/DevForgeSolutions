// Business Layer - Bank statement and reconciliation service

const BankStatementRepository = require('../data/bankStatementRepository');
const TransactionRepository = require('../data/transactionRepository');
const InvoiceRepository = require('../data/invoiceRepository');
const TransactionService = require('./transactionService');
const SchoolService = require('./schoolService');

class BankStatementService {
  constructor() {
    this.bankStatementRepository = new BankStatementRepository();
    this.transactionRepository = new TransactionRepository();
    this.invoiceRepository = new InvoiceRepository();
    this.transactionService = new TransactionService();
    this.schoolService = new SchoolService();
  }

  async uploadStatement(payload, currentUser) {
    const schoolId = this.resolveSchoolId(payload.schoolId, currentUser);
    const ofxText = String(payload.ofxText || '').trim();

    if (!ofxText) {
      throw new Error('OFX file content is required');
    }

    const statementDate = this.parseStatementDate(ofxText);
    const fileName = this.requiredString(payload.fileName, 'File name', 255);

    const statement = await this.bankStatementRepository.createStatement({
      schoolId,
      fileName,
      statementDate,
      rawData: ofxText
    });

    const transactions = this.parseOfx(ofxText);

    for (const item of transactions) {
      await this.transactionService.recordBankTransaction({
        schoolId,
        bankStatementId: statement.BankStatementID,
        amount: item.amount,
        reference: item.reference,
        description: item.description,
        transactionDate: item.transactionDate
      });
    }

    return {
      statement,
      importedTransactions: transactions.length
    };
  }

  async getStatements(currentUser) {
    if (currentUser.Role === 'admin') {
      return await this.bankStatementRepository.getAllStatements();
    }

    const schoolId = this.resolveSchoolId(null, currentUser);
    return await this.bankStatementRepository.getStatementsBySchool(schoolId);
  }

  async getReconciliation(currentUser) {
    const summary = await this.transactionService.getSummary(currentUser);
    const statements = await this.getStatements(currentUser);

    return {
      ...summary,
      statements,
      message: 'Reconciliation data is ready for review.'
    };
  }

  async getMatchSuggestions(currentUser) {
    const bankTransactions = currentUser.Role === 'admin'
      ? await this.transactionRepository.getUnmatchedBankTransactionsAll()
      : await this.transactionRepository.getUnmatchedBankTransactionsBySchool(this.resolveSchoolId(null, currentUser));

    const invoices = currentUser.Role === 'admin'
      ? await this.invoiceRepository.getAllInvoices({ limit: 200 })
      : await this.invoiceRepository.getInvoicesBySchool(this.resolveSchoolId(null, currentUser), { limit: 200 });

    const openInvoices = invoices
      .filter((invoice) => invoice.Status !== 'Paid')
      .map((invoice) => ({
        ...invoice,
        remaining: Number(invoice.Amount || 0) - Number(invoice.AmountPaid || 0)
      }))
      .filter((invoice) => invoice.remaining > 0);

    const suggestions = [];

    for (const transaction of bankTransactions) {
      const candidates = openInvoices
        .filter((invoice) => invoice.SchoolID === transaction.SchoolID)
        .map((invoice) => this.scoreMatch(transaction, invoice))
        .filter((candidate) => candidate.score >= 50)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      for (const candidate of candidates) {
        suggestions.push(candidate);
      }
    }

    return suggestions;
  }

  async approveMatch(transactionId, invoiceId, currentUser) {
    const parsedTransactionId = Number(transactionId);
    const parsedInvoiceId = Number(invoiceId);

    if (!Number.isInteger(parsedTransactionId) || parsedTransactionId <= 0) {
      throw new Error('Transaction ID must be a positive integer');
    }

    if (!Number.isInteger(parsedInvoiceId) || parsedInvoiceId <= 0) {
      throw new Error('Invoice ID must be a positive integer');
    }

    const invoice = await this.invoiceRepository.getInvoiceById(parsedInvoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (currentUser.Role !== 'admin' && currentUser.SchoolID !== invoice.SchoolID) {
      throw new Error('You can only approve matches for your own school');
    }

    return await this.transactionRepository.approveBankMatch(parsedTransactionId, parsedInvoiceId, currentUser.UserID);
  }

  scoreMatch(transaction, invoice) {
    const transactionText = `${transaction.Reference || ''} ${transaction.Description || ''}`.toLowerCase();
    const invoiceNumber = String(invoice.InvoiceNumber || '').toLowerCase();
    const studentDisplayName = `${invoice.FirstName || ''} ${invoice.LastName || ''}`.trim();
    const studentName = studentDisplayName.toLowerCase();
    const amount = Number(transaction.Amount || 0);
    const remaining = Number(invoice.remaining || 0);
    let score = 0;
    const reasons = [];

    if (amount === remaining) {
      score += 55;
      reasons.push('amount matches remaining balance');
    } else if (amount < remaining) {
      score += 35;
      reasons.push('amount can be applied as partial payment');
    }

    if (invoiceNumber && transactionText.includes(invoiceNumber)) {
      score += 35;
      reasons.push('reference contains invoice number');
    }

    if (studentName && transactionText.includes(studentName)) {
      score += 20;
      reasons.push('reference contains student name');
    }

    if (!invoiceNumber && !studentName && amount === remaining) {
      score += 5;
    }

    return {
      transactionId: transaction.TransactionID,
      invoiceId: invoice.InvoiceID,
      schoolId: invoice.SchoolID,
      score: Math.min(score, 100),
      reason: reasons.join(', ') || 'possible amount match',
      transactionReference: transaction.Reference,
      transactionDescription: transaction.Description,
      transactionDate: transaction.TransactionDate,
      bankStatementFile: transaction.BankStatementFile,
      invoiceNumber: invoice.InvoiceNumber,
      invoiceStudent: studentDisplayName,
      amount,
      invoiceRemaining: remaining
    };
  }

  parseOfx(ofxText) {
    const cleanedText = ofxText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const blocks = cleanedText.split(/<STMTTRN>/i).slice(1);

    return blocks.map((block) => {
      const findTag = (tag) => {
        const regex = new RegExp(`<${tag}>([^<\n\r]+)`, 'i');
        const match = block.match(regex);
        return match ? match[1].trim() : null;
      };

      const amount = Number(findTag('TRNAMT') || 0);
      const transactionDate = this.formatOfxDate(findTag('DTPOSTED')) || new Date().toISOString().slice(0, 10);
      const reference = findTag('FITID') || findTag('NAME') || findTag('MEMO') || 'Bank transaction';
      const description = findTag('MEMO') || findTag('NAME') || '';

      return {
        amount: Math.abs(amount),
        transactionDate,
        reference,
        description
      };
    }).filter((item) => item.amount > 0);
  }

  parseStatementDate(ofxText) {
    const match = ofxText.match(/<DTSTART>([0-9]{8})/i);

    if (!match) {
      return null;
    }

    return this.formatOfxDate(match[1]);
  }

  formatOfxDate(value) {
    if (!value) {
      return null;
    }

    const dateValue = String(value).slice(0, 8);
    if (dateValue.length !== 8) {
      return null;
    }

    const year = dateValue.slice(0, 4);
    const month = dateValue.slice(4, 6);
    const day = dateValue.slice(6, 8);

    return `${year}-${month}-${day}`;
  }

  resolveSchoolId(schoolId, currentUser) {
    if (currentUser.Role === 'admin') {
      return schoolId || currentUser.SchoolID || null;
    }

    if (!currentUser.SchoolID) {
      throw new Error('School users must be linked to a school');
    }

    return currentUser.SchoolID;
  }

  requiredString(value, label, maxLength) {
    if (!value || String(value).trim().length === 0) {
      throw new Error(`${label} is required`);
    }

    const cleaned = String(value).trim();

    if (cleaned.length > maxLength) {
      throw new Error(`${label} must be ${maxLength} characters or less`);
    }

    return cleaned;
  }
}

module.exports = BankStatementService;
