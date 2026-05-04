// Business Layer - Transaction service logic

const TransactionRepository = require('../data/transactionRepository');

class TransactionService {
  constructor() {
    this.transactionRepository = new TransactionRepository();
  }

  async getTransactions(currentUser, options = {}) {
    if (currentUser.Role === 'admin') {
      return await this.transactionRepository.getAllTransactions(options);
    }

    const schoolId = this.resolveSchoolId(currentUser);
    return await this.transactionRepository.getTransactionsBySchool(schoolId, options);
  }

  async recordPayment(transactionData) {
    return await this.transactionRepository.createTransaction({
      schoolId: transactionData.schoolId,
      invoiceId: transactionData.invoiceId || null,
      paymentMethod: transactionData.paymentMethod || 'Payment',
      reference: transactionData.reference || null,
      description: transactionData.description || null,
      transactionType: 'Credit',
      amount: transactionData.amount,
      transactionDate: transactionData.transactionDate || new Date()
    });
  }

  async recordBankTransaction(transactionData) {
    return await this.transactionRepository.createTransaction({
      schoolId: transactionData.schoolId,
      bankStatementId: transactionData.bankStatementId || null,
      paymentMethod: transactionData.paymentMethod || 'Bank statement',
      reference: transactionData.reference || null,
      description: transactionData.description || null,
      transactionType: 'Bank',
      amount: transactionData.amount,
      transactionDate: transactionData.transactionDate || new Date()
    });
  }

  // Uses SQL aggregates instead of loading all rows into JS memory
  async getSummary(currentUser) {
    const isAdmin = currentUser.Role === 'admin';
    const schoolId = isAdmin ? null : this.resolveSchoolId(currentUser);

    const totals = isAdmin
      ? await this.transactionRepository.getSummaryAll()
      : await this.transactionRepository.getSummaryBySchool(schoolId);

    const outstanding = isAdmin
      ? await this.transactionRepository.getOutstandingAll()
      : await this.transactionRepository.getOutstandingBySchool(schoolId);

    return {
      totalCredit: Number(totals.totalCredit),
      totalDebit: Number(totals.totalDebit),
      totalBank: Number(totals.totalBank),
      outstandingInvoices: outstanding,
      netPosition: Number(totals.totalCredit) - Number(totals.totalDebit)
    };
  }

  resolveSchoolId(currentUser) {
    if (!currentUser) {
      throw new Error('User context is required');
    }

    if (currentUser.Role !== 'admin' && currentUser.Role !== 'school') {
      throw new Error('School or admin access required');
    }

    if (currentUser.Role !== 'admin') {
      if (!currentUser.SchoolID) {
        throw new Error('School users must be linked to a school');
      }
      return currentUser.SchoolID;
    }

    return currentUser.SchoolID || null;
  }
}

module.exports = TransactionService;
