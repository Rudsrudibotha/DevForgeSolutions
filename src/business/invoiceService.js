// Business Layer - Invoice service logic
// This service owns finance validation, tenant checks, and invoice workflows.

const InvoiceRepository = require('../data/invoiceRepository');
const StudentRepository = require('../data/studentRepository');
const SchoolRepository = require('../data/schoolRepository');
const BillingCategoryService = require('./billingCategoryService');
const TransactionService = require('./transactionService');
const { getPool, sql } = require('../data/db');
const FinancePeriodLockRepository = require('../data/financePeriodLockRepository');

class InvoiceService {
  constructor() {
    this.invoiceRepository = new InvoiceRepository();
    this.studentRepository = new StudentRepository();
    this.schoolRepository = new SchoolRepository();
    this.billingCategoryService = new BillingCategoryService();
    this.transactionService = new TransactionService();
    this.financePeriodLockRepository = new FinancePeriodLockRepository();
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

  async getStudentFinanceStatement(studentId, currentUser) {
    this.validateId(studentId, 'Student ID');
    const student = await this.studentRepository.getStudentById(studentId);

    if (!student) {
      throw new Error('Student not found');
    }

    this.ensureSchoolAccess(student.SchoolID, currentUser);

    const [invoices, wallet, walletLedger, transactions, balanceBroughtForward] = await Promise.all([
      this.invoiceRepository.getInvoicesByStudentForSchool(studentId, student.SchoolID),
      this.invoiceRepository.getStudentWallet(studentId, student.SchoolID),
      this.invoiceRepository.getStudentWalletLedger(studentId, student.SchoolID),
      this.invoiceRepository.getStudentTransactionsForSchool(studentId, student.SchoolID),
      this.invoiceRepository.getBalanceBroughtForwardForStudent(studentId, student.SchoolID)
    ]);

    return {
      student,
      wallet: wallet || {
        SchoolID: student.SchoolID,
        StudentID: student.StudentID,
        FamilyID: student.FamilyID,
        Balance: 0
      },
      walletLedger,
      transactions,
      balanceBroughtForward,
      invoices
    };
  }

  // Create a new invoice.
  async createInvoice(invoiceData, currentUser) {
    const payload = await this.withResolvedSchool(invoiceData, currentUser);
    this.validateInvoiceData(payload, false);
    await this.financePeriodLockRepository.assertOpenForDate(
      payload.schoolId,
      payload.dueDate || new Date(),
      'Creating an invoice'
    );

    if (!payload.invoiceNumber) {
      payload.invoiceNumber = `INV-${Date.now()}`;
    }

    const invoice = await this.invoiceRepository.createInvoice(payload);
    return await this.applyAdvanceCreditsToInvoice(invoice, currentUser);
  }

  // Update invoice details.
  async updateInvoice(id, invoiceData, currentUser) {
    this.validateId(id, 'Invoice ID');
    const existingInvoice = await this.getInvoiceById(id, currentUser);
    const payload = await this.withResolvedSchool(invoiceData, currentUser, existingInvoice.SchoolID);
    this.validateInvoiceData(payload, true);
    await this.financePeriodLockRepository.assertOpenForDate(
      existingInvoice.SchoolID,
      existingInvoice.IssueDate || existingInvoice.DueDate || new Date(),
      'Editing an invoice'
    );
    await this.financePeriodLockRepository.assertOpenForDate(
      existingInvoice.SchoolID,
      payload.dueDate || existingInvoice.DueDate || existingInvoice.IssueDate || new Date(),
      'Editing an invoice'
    );

    return await this.invoiceRepository.updateInvoice(id, payload);
  }

  // Delete an invoice if it is not already paid.
  async deleteInvoice(id, currentUser) {
    this.validateId(id, 'Invoice ID');

    const invoice = await this.getInvoiceById(id, currentUser);

    if (invoice.Status === 'Paid') {
      throw new Error('Paid invoices cannot be deleted');
    }

    await this.financePeriodLockRepository.assertOpenForDate(
      invoice.SchoolID,
      invoice.IssueDate || invoice.DueDate || new Date(),
      'Deleting an invoice'
    );

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
    const monthStart = new Date(currentYear, currentMonth, 1);
    await this.financePeriodLockRepository.assertOpenForDate(
      schoolId,
      monthStart,
      'Generating monthly invoices'
    );
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
        if (!this.billingCategoryAppliesToInvoiceMonth(category, monthStart)) {
          continue;
        }

        if (existingSet.has(`${student.StudentID}:${category.BillingCategoryID}`)) {
          continue;
        }

        let amount = 0;
        let description = '';

        const shouldGenerate = this.billingCategoryService.shouldGenerateInvoice({
          Frequency: category.Frequency,
          BaseAmount: category.BaseAmount,
          BillingYear: category.BillingYear
        }, null, monthStart);

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

        const dueDate = this.dueDateForBillingMonth(student.BillingDate, currentYear, currentMonth);

        const invoice = await this.createInvoice({
          schoolId,
          studentId: student.StudentID,
          billingCategoryId: category.BillingCategoryID,
          amount,
          description,
          dueDate: this.formatDateOnly(dueDate)
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

  billingCategoryAppliesToInvoiceMonth(category, monthStart) {
    const billingYear = Number(category.BillingYear || monthStart.getFullYear());
    if (Number.isInteger(billingYear) && billingYear !== monthStart.getFullYear()) {
      return false;
    }

    return monthStart.getMonth() + 1 <= this.billingCategoryService.termEndMonth(category.Frequency || '12 months');
  }

  dueDateForBillingMonth(billingDate, year, month) {
    const requestedDay = this.billingDayOfMonth(billingDate);
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(requestedDay, lastDayOfMonth));
  }

  billingDayOfMonth(billingDate) {
    if (!billingDate) {
      return 1;
    }

    if (typeof billingDate === 'string') {
      const match = billingDate.match(/^\d{4}-\d{2}-(\d{2})/);
      if (match) {
        return Math.min(Math.max(Number(match[1]), 1), 31);
      }
    }

    const parsed = new Date(billingDate);
    if (Number.isNaN(parsed.getTime())) {
      return 1;
    }

    return Math.min(Math.max(parsed.getDate(), 1), 31);
  }

  formatDateOnly(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
        BillingYear: student.CategoryBillingYear,
        IsActive: student.CategoryIsActive
      }];
    }

    return [];
  }

  async issueReceipt(receiptData, currentUser) {
    const schoolId = this.resolveCurrentSchoolId(currentUser, receiptData?.schoolId);
    const studentId = Number(receiptData?.studentId);
    const amount = this.moneyAmount(receiptData?.amount, 'Receipt amount');
    const paymentDate = this.requiredDate(receiptData?.paymentDate, 'Payment date');
    const paymentMethod = this.optionalText(receiptData?.paymentMethod, 100) || 'Receipt';
    const reference = this.optionalText(receiptData?.reference, 250) || `Receipt ${Date.now()}`;
    const description = this.optionalText(receiptData?.description, 500) || 'Learner receipt';

    this.validateId(studentId, 'Student ID');
    await this.financePeriodLockRepository.assertOpenForDate(
      schoolId,
      paymentDate,
      'Issuing a receipt'
    );

    const student = await this.studentRepository.getStudentById(studentId);
    if (!student || student.SchoolID !== schoolId) {
      throw new Error('Student not found for this school');
    }

    const payee = this.resolveReceiptPayee(receiptData, student);
    const allocations = await this.normalizedReceiptAllocations(receiptData?.allocations, studentId, schoolId, amount, receiptData?.autoAllocate !== false);
    const allocatedTotal = this.roundMoney(allocations.reduce((sum, item) => sum + item.amount, 0));

    if (allocatedTotal > amount) {
      throw new Error('Allocated amount cannot be more than the receipt amount');
    }

    const advanceAmount = this.roundMoney(amount - allocatedTotal);
    const receiptNumber = await this.nextReceiptNumber(schoolId);
    const pool = await getPool();
    const dbTransaction = new sql.Transaction(pool);
    await dbTransaction.begin();

    try {
      const receiptResult = await new sql.Request(dbTransaction)
        .input('schoolId', sql.Int, schoolId)
        .input('studentId', sql.Int, student.StudentID)
        .input('familyId', sql.Int, student.FamilyID || null)
        .input('receiptNumber', sql.NVarChar, receiptNumber)
        .input('paymentMethod', sql.NVarChar, paymentMethod)
        .input('payeeType', sql.NVarChar, payee.type)
        .input('payeeName', sql.NVarChar, payee.name)
        .input('payeePhone', sql.NVarChar, payee.phone)
        .input('payeeEmail', sql.NVarChar, payee.email)
        .input('reference', sql.NVarChar, reference)
        .input('description', sql.NVarChar, description)
        .input('amount', sql.Decimal(10, 2), amount)
        .input('paymentDate', sql.DateTime, paymentDate)
        .input('allocatedBy', sql.Int, currentUser?.UserID || null)
        .query(`INSERT INTO Transactions (
                  SchoolID, StudentID, FamilyID, ReceiptNumber, PaymentMethod,
                  PayeeType, PayeeName, PayeePhone, PayeeEmail, Reference, Description,
                  TransactionType, Amount, TransactionDate, AllocationStatus, AllocationType, AllocatedBy, AllocatedDate
                )
                OUTPUT INSERTED.*
                VALUES (
                  @schoolId, @studentId, @familyId, @receiptNumber, @paymentMethod,
                  @payeeType, @payeeName, @payeePhone, @payeeEmail, @reference, @description,
                  'Payment', @amount, @paymentDate, 'Allocated', 'Receipt', @allocatedBy, GETDATE()
                )`);
      const receipt = receiptResult.recordset[0];
      const applied = [];

      for (const allocation of allocations) {
        const updatedInvoice = await this.applyReceiptToInvoice(dbTransaction, {
          invoiceId: allocation.invoiceId,
          paymentAmount: allocation.amount,
          paymentDate
        });
        applied.push({
          invoiceId: updatedInvoice.InvoiceID,
          invoiceNumber: updatedInvoice.InvoiceNumber,
          amount: allocation.amount,
          status: updatedInvoice.Status,
          paidDate: updatedInvoice.PaidDate
        });
      }

      const wallet = advanceAmount > 0
        ? await this.addAdvanceCredit(dbTransaction, {
          schoolId,
          studentId: student.StudentID,
          familyId: student.FamilyID || null,
          transactionId: receipt.TransactionID,
          amount: advanceAmount,
          entryDate: paymentDate,
          reference: receiptNumber,
          description: 'Advance payment held for future invoices',
          createdBy: currentUser?.UserID || null
        })
        : await this.walletSnapshot(dbTransaction, schoolId, student.StudentID);

      await dbTransaction.commit();

      return {
        receipt,
        receiptNumber,
        allocatedAmount: allocatedTotal,
        advanceAmount,
        applied,
        wallet
      };
    } catch (error) {
      await dbTransaction.rollback();
      throw error;
    }
  }

  resolveReceiptPayee(receiptData, student) {
    const requestedType = this.optionalText(receiptData?.payeeType, 50);
    const type = this.normalizePayeeType(requestedType || 'Responsible payer');
    const source = this.payeeContactForStudent(student, type);
    const name = this.optionalText(receiptData?.payeeName, 255) || source.name;
    const phone = this.optionalText(receiptData?.payeePhone, 50) || source.phone;
    const email = this.optionalText(receiptData?.payeeEmail, 255) || source.email;

    if (!name) {
      throw new Error('Receipt payee is required');
    }

    return {
      type,
      name,
      phone,
      email
    };
  }

  normalizePayeeType(value) {
    const normalized = String(value || '').trim().toLowerCase();

    if (['secondary', 'secondary parent', 'father'].includes(normalized)) {
      return 'Secondary parent';
    }

    if (['primary', 'primary parent', 'mother'].includes(normalized)) {
      return 'Primary parent';
    }

    if (['other', 'custom', 'guardian'].includes(normalized)) {
      return 'Other';
    }

    return 'Responsible payer';
  }

  payeeContactForStudent(student, type) {
    if (type === 'Responsible payer') {
      return {
        name: student.ResponsiblePayerName || student.PrimaryParentName,
        phone: student.ResponsiblePayerPhone || student.PrimaryParentPhone,
        email: student.ResponsiblePayerEmail || student.PrimaryParentEmail
      };
    }

    if (type === 'Secondary parent') {
      return {
        name: student.SecondaryParentName,
        phone: student.SecondaryParentPhone,
        email: student.SecondaryParentEmail
      };
    }

    if (type === 'Primary parent') {
      return {
        name: student.PrimaryParentName,
        phone: student.PrimaryParentPhone,
        email: student.PrimaryParentEmail
      };
    }

    return {
      name: null,
      phone: null,
      email: null
    };
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

  async normalizedReceiptAllocations(rawAllocations, studentId, schoolId, receiptAmount, autoAllocate) {
    const explicit = Array.isArray(rawAllocations)
      ? rawAllocations
        .map((item) => ({
          invoiceId: Number(item.invoiceId),
          amount: this.roundMoney(Number(item.amount || 0))
        }))
        .filter((item) => Number.isInteger(item.invoiceId) && item.invoiceId > 0 && item.amount > 0)
      : [];

    if (explicit.length) {
      return await this.validateReceiptAllocations(explicit, studentId, schoolId);
    }

    if (!autoAllocate) {
      return [];
    }

    const invoices = await this.invoiceRepository.getInvoicesByStudentForSchool(studentId, schoolId);
    let remainingReceipt = receiptAmount;
    const generated = [];

    for (const invoice of invoices
      .filter((item) => item.Status !== 'Paid' && item.Status !== 'Cancelled')
      .sort((a, b) => new Date(a.DueDate || a.IssueDate || 0) - new Date(b.DueDate || b.IssueDate || 0))) {
      const remainingInvoice = this.invoiceRemaining(invoice);
      if (remainingInvoice <= 0 || remainingReceipt <= 0) continue;
      const amount = this.roundMoney(Math.min(remainingInvoice, remainingReceipt));
      generated.push({ invoiceId: invoice.InvoiceID, amount });
      remainingReceipt = this.roundMoney(remainingReceipt - amount);
    }

    return generated;
  }

  async validateReceiptAllocations(allocations, studentId, schoolId) {
    const invoices = await this.invoiceRepository.getInvoicesByStudentForSchool(studentId, schoolId);
    const invoiceMap = new Map(invoices.map((invoice) => [Number(invoice.InvoiceID), invoice]));
    const merged = new Map();

    for (const allocation of allocations) {
      const invoice = invoiceMap.get(Number(allocation.invoiceId));
      if (!invoice) {
        throw new Error('Receipt allocation invoice must belong to the selected student and school');
      }
      if (invoice.Status === 'Paid' || invoice.Status === 'Cancelled') {
        throw new Error(`Invoice ${invoice.InvoiceNumber} is not open for allocation`);
      }
      const nextAmount = this.roundMoney((merged.get(allocation.invoiceId) || 0) + allocation.amount);
      const remaining = this.invoiceRemaining(invoice);
      if (nextAmount > remaining) {
        throw new Error(`Allocation for ${invoice.InvoiceNumber} exceeds the remaining balance of ${remaining.toFixed(2)}`);
      }
      merged.set(allocation.invoiceId, nextAmount);
    }

    return [...merged.entries()].map(([invoiceId, amount]) => ({ invoiceId, amount }));
  }

  async applyReceiptToInvoice(dbTransaction, allocation) {
    const result = await new sql.Request(dbTransaction)
      .input('invoiceId', sql.Int, allocation.invoiceId)
      .input('paymentAmount', sql.Decimal(10, 2), allocation.paymentAmount)
      .input('paymentDate', sql.DateTime, allocation.paymentDate)
      .query(`UPDATE Invoices SET
                AmountPaid = ISNULL(AmountPaid, 0) + @paymentAmount,
                Status = CASE WHEN ISNULL(AmountPaid, 0) + @paymentAmount >= Amount THEN 'Paid' ELSE 'Partial' END,
                PaidDate = CASE WHEN ISNULL(AmountPaid, 0) + @paymentAmount >= Amount THEN @paymentDate ELSE PaidDate END,
                UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE InvoiceID = @invoiceId AND IsDeleted = 0`);
    return result.recordset[0];
  }

  async addAdvanceCredit(dbTransaction, entry) {
    const wallet = await this.getOrCreateWallet(dbTransaction, entry.schoolId, entry.studentId, entry.familyId);
    const nextBalance = this.roundMoney(Number(wallet.Balance || 0) + Number(entry.amount || 0));

    await new sql.Request(dbTransaction)
      .input('walletId', sql.Int, wallet.WalletID)
      .input('balance', sql.Decimal(10, 2), nextBalance)
      .query(`UPDATE StudentWallets SET Balance = @balance, UpdatedDate = GETDATE()
              WHERE WalletID = @walletId`);

    await new sql.Request(dbTransaction)
      .input('walletId', sql.Int, wallet.WalletID)
      .input('schoolId', sql.Int, entry.schoolId)
      .input('studentId', sql.Int, entry.studentId)
      .input('familyId', sql.Int, entry.familyId || null)
      .input('transactionId', sql.Int, entry.transactionId || null)
      .input('amount', sql.Decimal(10, 2), entry.amount)
      .input('balanceAfter', sql.Decimal(10, 2), nextBalance)
      .input('reference', sql.NVarChar, entry.reference || null)
      .input('description', sql.NVarChar, entry.description || null)
      .input('entryDate', sql.DateTime, entry.entryDate)
      .input('createdBy', sql.Int, entry.createdBy || null)
      .query(`INSERT INTO StudentWalletLedger (
                WalletID, SchoolID, StudentID, FamilyID, TransactionID, EntryType, Amount,
                BalanceAfter, Reference, Description, EntryDate, CreatedBy
              )
              VALUES (
                @walletId, @schoolId, @studentId, @familyId, @transactionId, 'Receipt', @amount,
                @balanceAfter, @reference, @description, @entryDate, @createdBy
              )`);

    return { ...wallet, Balance: nextBalance };
  }

  async applyAdvanceCreditsToInvoice(invoice, currentUser = null) {
    if (!invoice?.InvoiceID || !invoice.StudentID) {
      return invoice;
    }

    const pool = await getPool();
    const dbTransaction = new sql.Transaction(pool);
    await dbTransaction.begin();

    try {
      const invoiceResult = await new sql.Request(dbTransaction)
        .input('invoiceId', sql.Int, invoice.InvoiceID)
        .query(`SELECT i.*, s.FamilyID
                FROM Invoices i
                INNER JOIN Students s ON i.StudentID = s.StudentID AND s.SchoolID = i.SchoolID
                WHERE i.InvoiceID = @invoiceId AND i.IsDeleted = 0`);
      const currentInvoice = invoiceResult.recordset[0];

      if (!currentInvoice || currentInvoice.Status === 'Paid' || currentInvoice.Status === 'Cancelled') {
        await dbTransaction.commit();
        return invoice;
      }

      const wallet = await this.lockWallet(dbTransaction, currentInvoice.SchoolID, currentInvoice.StudentID);
      const walletBalance = Number(wallet?.Balance || 0);
      const remaining = this.invoiceRemaining(currentInvoice);

      if (!wallet || walletBalance <= 0 || remaining <= 0) {
        await dbTransaction.commit();
        return invoice;
      }

      const appliedAmount = this.roundMoney(Math.min(walletBalance, remaining));
      const applicationDate = currentInvoice.IssueDate || new Date();
      const updatedInvoice = await this.applyReceiptToInvoice(dbTransaction, {
        invoiceId: currentInvoice.InvoiceID,
        paymentAmount: appliedAmount,
        paymentDate: applicationDate
      });
      const nextBalance = this.roundMoney(walletBalance - appliedAmount);

      await new sql.Request(dbTransaction)
        .input('walletId', sql.Int, wallet.WalletID)
        .input('balance', sql.Decimal(10, 2), nextBalance)
        .query(`UPDATE StudentWallets SET Balance = @balance, UpdatedDate = GETDATE()
                WHERE WalletID = @walletId`);

      await new sql.Request(dbTransaction)
        .input('walletId', sql.Int, wallet.WalletID)
        .input('schoolId', sql.Int, currentInvoice.SchoolID)
        .input('studentId', sql.Int, currentInvoice.StudentID)
        .input('familyId', sql.Int, currentInvoice.FamilyID || null)
        .input('invoiceId', sql.Int, currentInvoice.InvoiceID)
        .input('amount', sql.Decimal(10, 2), -appliedAmount)
        .input('balanceAfter', sql.Decimal(10, 2), nextBalance)
        .input('reference', sql.NVarChar, currentInvoice.InvoiceNumber)
        .input('description', sql.NVarChar, 'Advance credit applied to generated invoice')
        .input('entryDate', sql.DateTime, applicationDate)
        .input('createdBy', sql.Int, currentUser?.UserID || null)
        .query(`INSERT INTO StudentWalletLedger (
                  WalletID, SchoolID, StudentID, FamilyID, InvoiceID, EntryType, Amount,
                  BalanceAfter, Reference, Description, EntryDate, CreatedBy
                )
                VALUES (
                  @walletId, @schoolId, @studentId, @familyId, @invoiceId, 'Invoice Allocation', @amount,
                  @balanceAfter, @reference, @description, @entryDate, @createdBy
                )`);

      await dbTransaction.commit();
      return updatedInvoice;
    } catch (error) {
      await dbTransaction.rollback();
      throw error;
    }
  }

  async getOrCreateWallet(dbTransaction, schoolId, studentId, familyId) {
    const existing = await this.lockWallet(dbTransaction, schoolId, studentId);
    if (existing) return existing;

    const result = await new sql.Request(dbTransaction)
      .input('schoolId', sql.Int, schoolId)
      .input('studentId', sql.Int, studentId)
      .input('familyId', sql.Int, familyId || null)
      .query(`INSERT INTO StudentWallets (SchoolID, StudentID, FamilyID, Balance)
              OUTPUT INSERTED.*
              VALUES (@schoolId, @studentId, @familyId, 0.00)`);
    return result.recordset[0];
  }

  async lockWallet(dbTransaction, schoolId, studentId) {
    const result = await new sql.Request(dbTransaction)
      .input('schoolId', sql.Int, schoolId)
      .input('studentId', sql.Int, studentId)
      .query(`SELECT TOP 1 *
              FROM StudentWallets WITH (UPDLOCK, HOLDLOCK)
              WHERE SchoolID = @schoolId AND StudentID = @studentId`);
    return result.recordset[0] || null;
  }

  async walletSnapshot(dbTransaction, schoolId, studentId) {
    return await this.lockWallet(dbTransaction, schoolId, studentId) || { SchoolID: schoolId, StudentID: studentId, Balance: 0 };
  }

  async nextReceiptNumber(schoolId) {
    return `RCPT-${schoolId}-${Date.now()}`;
  }

  invoiceRemaining(invoice) {
    return this.roundMoney(Math.max(0, Number(invoice.Amount || 0) - Number(invoice.AmountPaid || 0)));
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

  resolveCurrentSchoolId(currentUser, requestedSchoolId = null) {
    if (!currentUser) {
      throw new Error('User context is required');
    }

    if (currentUser.Role === 'admin') {
      const schoolId = Number(requestedSchoolId || currentUser.SchoolID);
      if (!Number.isInteger(schoolId) || schoolId <= 0) {
        throw new Error('School ID is required');
      }
      return schoolId;
    }

    if (!currentUser.SchoolID) {
      throw new Error('School users must be linked to a school');
    }

    return currentUser.SchoolID;
  }

  ensureSchoolAccess(schoolId, currentUser) {
    if (currentUser && currentUser.Role !== 'admin' && Number(currentUser.SchoolID) !== Number(schoolId)) {
      throw new Error('You can only access records for your own school');
    }
  }

  requiredDate(value, label) {
    const text = String(value || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      throw new Error(`${label} is required`);
    }
    if (text > this.formatDateOnly(new Date())) {
      throw new Error(`${label} cannot be in the future`);
    }
    return text;
  }

  moneyAmount(value, label) {
    const amount = this.roundMoney(Number(value));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(`${label} must be a positive amount`);
    }
    return amount;
  }

  roundMoney(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  optionalText(value, maxLength) {
    if (value === undefined || value === null) return null;
    const cleaned = String(value).trim();
    return cleaned ? cleaned.slice(0, maxLength) : null;
  }

  ensureInvoiceAccess(invoice, currentUser) {
    if (currentUser && currentUser.Role !== 'admin' && currentUser.SchoolID !== invoice.SchoolID) {
      throw new Error('You can only access invoices for your own school');
    }
  }
}

module.exports = InvoiceService;
