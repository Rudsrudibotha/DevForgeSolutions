// Business Layer - Invoice service logic
// This service owns finance validation, tenant checks, and invoice workflows.

const InvoiceRepository = require('../data/invoiceRepository');
const StudentRepository = require('../data/studentRepository');
const SchoolRepository = require('../data/schoolRepository');
const BillingCategoryService = require('./billingCategoryService');
const TransactionService = require('./transactionService');

class InvoiceService {
  constructor() {
    this.invoiceRepository = new InvoiceRepository();
    this.studentRepository = new StudentRepository();
    this.schoolRepository = new SchoolRepository();
    this.billingCategoryService = new BillingCategoryService();
    this.transactionService = new TransactionService();
  }

  // Admins see all invoices; school users see only their own school's invoices.
  async getAllInvoices(currentUser, options = {}) {
    if (!currentUser || currentUser.Role !== 'admin') {
      if (!currentUser || !currentUser.SchoolID) {
        return [];
      }

      return await this.invoiceRepository.getInvoicesBySchool(currentUser.SchoolID, options);
    }

    return await this.invoiceRepository.getAllInvoices(options);
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
  async createInvoice(invoiceData, currentUser) {
    const payload = await this.withResolvedSchool(invoiceData, currentUser);
    this.validateInvoiceData(payload, false);

    if (!payload.invoiceNumber) {
      payload.invoiceNumber = `INV-${Date.now()}`;
    }

    return await this.invoiceRepository.createInvoice(payload);
  }

  // Update invoice details.
  async updateInvoice(id, invoiceData, currentUser) {
    this.validateId(id, 'Invoice ID');
    const existingInvoice = await this.getInvoiceById(id, currentUser);
    const payload = await this.withResolvedSchool(invoiceData, currentUser, existingInvoice.SchoolID);
    this.validateInvoiceData(payload, true);

    return await this.invoiceRepository.updateInvoice(id, payload);
  }

  // Delete an invoice if it is not already paid.
  async deleteInvoice(id, currentUser) {
    this.validateId(id, 'Invoice ID');

    const invoice = await this.getInvoiceById(id, currentUser);

    if (invoice.Status === 'Paid') {
      throw new Error('Paid invoices cannot be deleted');
    }

    return await this.invoiceRepository.deleteInvoice(id);
  }

  // Generate missing invoices using billing categories assigned to each student.
  // Uses a batch query to check existing invoices instead of N+1 per student.
  async generateMonthlyInvoices(currentUser) {
    if (currentUser && currentUser.Role !== 'admin') {
      return await this.generateMonthlyInvoicesForSchool(currentUser.SchoolID);
    }

    const schools = await this.schoolRepository.getAllSchools();
    const summary = [];

    for (const school of schools) {
      if (school.SubscriptionStatus !== 'Active') {
        continue;
      }

      const result = await this.generateMonthlyInvoicesForSchool(school.SchoolID);
      summary.push(result);
    }

    return { generated: summary };
  }

  async generateMonthlyInvoicesForSchool(schoolId) {
    this.validateId(schoolId, 'School ID');

    const school = await this.schoolRepository.getSchoolById(schoolId);
    const students = await this.studentRepository.getStudentsBySchool(schoolId, 'active');
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const yearMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    // Batch check: one query instead of one per student
      const existingSet = await this.invoiceRepository.getStudentsWithInvoiceForMonth(schoolId, yearMonth);
    const created = [];

    for (const student of students) {
      const billingCategories = this.studentBillingCategories(student);

      if (!billingCategories.length) {
        continue;
      }

      const enrolledDate = student.EnrolledDate ? new Date(student.EnrolledDate) : null;
      const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);

      if (!enrolledDate || enrolledDate > currentMonthEnd) {
        continue;
      }

      for (const category of billingCategories) {
        if (existingSet.has(`${student.StudentID}:${category.BillingCategoryID}`)) {
          continue;
        }

        let amount = 0;
        let description = '';

        const shouldGenerate = this.billingCategoryService.shouldGenerateInvoice({
          Frequency: category.Frequency,
          BaseAmount: category.BaseAmount
        });

        if (!shouldGenerate) {
          continue;
        }

        amount = this.billingCategoryService.calculateInvoiceAmount({
          Frequency: category.Frequency,
          BaseAmount: category.BaseAmount
        });
        description = `${student.FirstName} ${student.LastName} - ${category.CategoryName} for ${today.toLocaleString('en-ZA', { month: 'long' })} ${currentYear}`;

        if (!amount || amount <= 0) {
          continue;
        }

        const billingDate = student.BillingDate ? new Date(student.BillingDate) : null;
        const day = billingDate ? billingDate.getDate() : 1;
        const dueDate = new Date(currentYear, currentMonth, Math.min(day, 28));

        const invoice = await this.createInvoice({
          schoolId,
          studentId: student.StudentID,
          billingCategoryId: category.BillingCategoryID,
          amount,
          description,
          dueDate: dueDate.toISOString().slice(0, 10)
        });

        created.push(invoice);
      }
    }

    return {
      schoolId,
      schoolName: school.SchoolName,
      createdCount: created.length,
      invoices: created
    };
  }

  studentBillingCategories(student) {
    if (student.BillingCategoriesJson) {
      try {
        const categories = JSON.parse(student.BillingCategoriesJson)
          .filter((category) => category.IsActive !== false && category.IsActive !== 0);
        if (categories.length) {
          return categories;
        }
      } catch (error) {
        // Fall back to the legacy single billing category fields below.
      }
    }

    if (student.BillingCategoryID && student.CategoryAmount && student.CategoryIsActive !== false && student.CategoryIsActive !== 0) {
      return [{
        BillingCategoryID: student.BillingCategoryID,
        CategoryName: student.CategoryName,
        BaseAmount: student.CategoryAmount,
        Frequency: student.CategoryFrequency,
        IsActive: student.CategoryIsActive
      }];
    }

    return [];
  }

  // Mark invoice as paid.
  async markAsPaid(id, currentUser) {
    this.validateId(id, 'Invoice ID');

    const invoice = await this.getInvoiceById(id, currentUser);
    if (invoice.Status === 'Paid') {
      throw new Error('Invoice is already paid');
    }

    const remainingAmount = Math.max(0, Number(invoice.Amount || 0) - Number(invoice.AmountPaid || 0));
    const success = await this.invoiceRepository.markAsPaid(id);

    if (!success) {
      throw new Error('Invoice not found');
    }

    if (remainingAmount > 0) {
      await this.transactionService.recordPayment({
        schoolId: invoice.SchoolID,
        invoiceId: id,
        amount: remainingAmount,
        paymentMethod: 'Invoice payment',
        reference: `Invoice ${invoice.InvoiceNumber}`,
        transactionDate: new Date().toISOString().slice(0, 10)
      });
    }

    return { message: 'Invoice marked as paid' };
  }

  // Record a partial payment against an invoice.
  async recordPartialPayment(id, paymentAmount, currentUser) {
    this.validateId(id, 'Invoice ID');

    if (typeof paymentAmount !== 'number' || paymentAmount <= 0) {
      throw new Error('Payment amount must be a positive number');
    }

    const invoice = await this.getInvoiceById(id, currentUser);

    if (invoice.Status === 'Paid') {
      throw new Error('Invoice is already fully paid');
    }

    const remaining = Number(invoice.Amount) - Number(invoice.AmountPaid || 0);
    if (paymentAmount > remaining) {
      throw new Error(`Payment exceeds remaining balance of ${remaining.toFixed(2)}`);
    }

    const updated = await this.invoiceRepository.recordPartialPayment(id, paymentAmount);

    await this.transactionService.recordPayment({
      schoolId: invoice.SchoolID,
      invoiceId: id,
      amount: paymentAmount,
      paymentMethod: 'Partial payment',
      reference: `Invoice ${invoice.InvoiceNumber}`,
      transactionDate: new Date().toISOString().slice(0, 10)
    });

    return updated;
  }

  // Flag all overdue invoices across the system.
  async flagOverdueInvoices() {
    return await this.invoiceRepository.flagOverdueInvoices();
  }

  // Get invoices for a specific student (parent portal).
  async getInvoicesByStudent(studentId, currentUser) {
    this.validateId(studentId, 'Student ID');
    return await this.invoiceRepository.getInvoicesByStudent(studentId);
  }

  validateInvoiceData(invoiceData, isUpdate) {
    if (!Number.isInteger(invoiceData.schoolId) || invoiceData.schoolId <= 0) {
      throw new Error('School ID must be a positive integer');
    }

    if (typeof invoiceData.amount !== 'number' || invoiceData.amount <= 0) {
      throw new Error('Amount must be a positive number');
    }

    const allowedStatuses = ['Pending', 'Partial', 'Paid', 'Cancelled', 'Overdue'];

    if (invoiceData.status && !allowedStatuses.includes(invoiceData.status)) {
      throw new Error(`Status must be one of: ${allowedStatuses.join(', ')}`);
    }

    if (isUpdate && !invoiceData.invoiceNumber) {
      throw new Error('Invoice number is required when updating an invoice');
    }
  }

  async withResolvedSchool(invoiceData, currentUser, fallbackSchoolId = null) {
    const payload = { ...(invoiceData || {}) };

    if (currentUser && currentUser.Role !== 'admin') {
      if (!currentUser.SchoolID) {
        throw new Error('School users must be linked to a school');
      }

      payload.schoolId = currentUser.SchoolID;
      return await this.withResolvedStudentBilling(payload);
    }

    payload.schoolId = Number(payload.schoolId || fallbackSchoolId);
    return await this.withResolvedStudentBilling(payload);
  }

  async withResolvedStudentBilling(payload) {
    payload.studentId = payload.studentId ? Number(payload.studentId) : null;
    payload.billingCategoryId = payload.billingCategoryId ? Number(payload.billingCategoryId) : null;

    if (!payload.studentId) {
      return payload;
    }

    const student = await this.studentRepository.getStudentById(payload.studentId);

    if (!student || student.SchoolID !== payload.schoolId) {
      throw new Error('Student must belong to the selected school');
    }

    const allowedBillingCategoryIds = this.studentBillingCategories(student)
      .map((category) => Number(category.BillingCategoryID))
      .filter((categoryId) => Number.isInteger(categoryId) && categoryId > 0);

    payload.billingCategoryId = payload.billingCategoryId || allowedBillingCategoryIds[0] || student.BillingCategoryID || null;

    if (!payload.billingCategoryId) {
      throw new Error('Student must have a billing category before invoicing');
    }

    if (allowedBillingCategoryIds.length && !allowedBillingCategoryIds.includes(payload.billingCategoryId)) {
      throw new Error('Invoice billing category must be assigned to the student');
    }

    if (!allowedBillingCategoryIds.length && student.BillingCategoryID && payload.billingCategoryId !== student.BillingCategoryID) {
      throw new Error('Invoice billing category must match the student billing category');
    }

    return payload;
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
