// Business Layer - Parent portal service

const ParentRepository = require('../data/parentRepository');
const InvoiceRepository = require('../data/invoiceRepository');
const TransactionRepository = require('../data/transactionRepository');

class ParentService {
  constructor() {
    this.parentRepository = new ParentRepository();
    this.invoiceRepository = new InvoiceRepository();
    this.transactionRepository = new TransactionRepository();
  }

  async getMyStudents(currentUser) {
    this.requireParent(currentUser);
    return await this.parentRepository.getStudentsByParentUserId(currentUser.UserID);
  }

  async getMyInvoices(currentUser) {
    this.requireParent(currentUser);
    return await this.invoiceRepository.getInvoicesByParentUserId(currentUser.UserID);
  }

  async getMyBalance(currentUser) {
    this.requireParent(currentUser);
    const invoices = await this.invoiceRepository.getInvoicesByParentUserId(currentUser.UserID);

    const totalOwed = invoices
      .filter((inv) => inv.Status !== 'Paid' && inv.Status !== 'Cancelled')
      .reduce((sum, inv) => sum + Number(inv.Amount || 0) - Number(inv.AmountPaid || 0), 0);

    const totalPaid = invoices
      .filter((inv) => inv.Status === 'Paid')
      .reduce((sum, inv) => sum + Number(inv.Amount || 0), 0);

    return {
      totalOwed: Number(totalOwed.toFixed(2)),
      totalPaid: Number(totalPaid.toFixed(2)),
      invoiceCount: invoices.length,
      outstandingCount: invoices.filter((inv) => inv.Status !== 'Paid' && inv.Status !== 'Cancelled').length
    };
  }

  requireParent(currentUser) {
    if (!currentUser || currentUser.Role !== 'parent') {
      throw new Error('Parent access required');
    }
  }
}

module.exports = ParentService;
