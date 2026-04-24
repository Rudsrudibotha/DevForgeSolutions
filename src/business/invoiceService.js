// Business Layer - Invoice service logic
// This service owns finance validation, tenant checks, and invoice workflows.

const InvoiceRepository = require('../data/invoiceRepository');

class InvoiceService {
  constructor() {
    this.invoiceRepository = new InvoiceRepository();
  }

  // Admins see all invoices; school users see only their own school's invoices.
  async getAllInvoices(currentUser) {
    if (!currentUser || currentUser.Role !== 'admin') {
      if (!currentUser || !currentUser.SchoolID) {
        return [];
      }

      return await this.invoiceRepository.getInvoicesBySchool(currentUser.SchoolID);
    }

    return await this.invoiceRepository.getAllInvoices();
  }

  // Get invoice by ID with optional tenant access enforcement.
  async getInvoiceById(id, currentUser) {
    this.validateId(id, 'Invoice ID');

    const invoice = await this.invoiceRepository.getInvoiceById(id);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    this.ensureInvoiceAccess(invoice, currentUser);

    return invoice;
  }

  // Get invoices for a school with tenant access enforcement.
  async getInvoicesBySchool(schoolId, currentUser) {
    this.validateId(schoolId, 'School ID');

    if (currentUser && currentUser.Role !== 'admin' && currentUser.SchoolID !== schoolId) {
      throw new Error('You can only access invoices for your own school');
    }

    return await this.invoiceRepository.getInvoicesBySchool(schoolId);
  }

  // Create a new invoice.
  async createInvoice(invoiceData) {
    this.validateInvoiceData(invoiceData, false);

    // A SQL sequence should replace this timestamp-based number before production.
    if (!invoiceData.invoiceNumber) {
      invoiceData.invoiceNumber = `INV-${Date.now()}`;
    }

    return await this.invoiceRepository.createInvoice(invoiceData);
  }

  // Update invoice details.
  async updateInvoice(id, invoiceData) {
    this.validateId(id, 'Invoice ID');
    this.validateInvoiceData(invoiceData, true);
    await this.getInvoiceById(id);

    return await this.invoiceRepository.updateInvoice(id, invoiceData);
  }

  // Delete an invoice if it is not already paid.
  async deleteInvoice(id) {
    this.validateId(id, 'Invoice ID');

    const invoice = await this.getInvoiceById(id);

    if (invoice.Status === 'Paid') {
      throw new Error('Paid invoices cannot be deleted');
    }

    return await this.invoiceRepository.deleteInvoice(id);
  }

  // Mark invoice as paid.
  async markAsPaid(id) {
    this.validateId(id, 'Invoice ID');
    await this.getInvoiceById(id);

    const success = await this.invoiceRepository.markAsPaid(id);

    if (!success) {
      throw new Error('Invoice not found');
    }

    return { message: 'Invoice marked as paid' };
  }

  validateInvoiceData(invoiceData, isUpdate) {
    if (!Number.isInteger(invoiceData.schoolId) || invoiceData.schoolId <= 0) {
      throw new Error('School ID must be a positive integer');
    }

    if (typeof invoiceData.amount !== 'number' || invoiceData.amount <= 0) {
      throw new Error('Amount must be a positive number');
    }

    const allowedStatuses = ['Pending', 'Paid', 'Cancelled', 'Overdue'];

    if (invoiceData.status && !allowedStatuses.includes(invoiceData.status)) {
      throw new Error(`Status must be one of: ${allowedStatuses.join(', ')}`);
    }

    if (isUpdate && !invoiceData.invoiceNumber) {
      throw new Error('Invoice number is required when updating an invoice');
    }
  }

  validateId(id, label) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`${label} must be a positive integer`);
    }
  }

  ensureInvoiceAccess(invoice, currentUser) {
    if (currentUser && currentUser.Role !== 'admin' && currentUser.SchoolID !== invoice.SchoolID) {
      throw new Error('You can only access invoices for your own school');
    }
  }
}

module.exports = InvoiceService;
