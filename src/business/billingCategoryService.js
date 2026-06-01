// Business Layer - Billing categories service

const BillingCategoryRepository = require('../data/billingCategoryRepository');
const SchoolRepository = require('../data/schoolRepository');

class BillingCategoryService {
  constructor() {
    this.billingCategoryRepository = new BillingCategoryRepository();
    this.schoolRepository = new SchoolRepository();
  }

  async createCategory(payload, currentUser) {
    this.validateCategoryData(payload);

    const schoolId = this.resolveSchoolId(payload.schoolId, currentUser);
    await this.ensureSchoolExists(schoolId);

    return await this.billingCategoryRepository.createCategory({
      schoolId,
      categoryName: payload.categoryName,
      description: payload.description,
      baseAmount: Number(payload.baseAmount || 0),
      frequency: this.normalizeTerm(payload.frequency),
      billingYear: this.billingYear(payload.billingYear),
      isActive: payload.isActive !== false
    });
  }

  async getCategories(currentUser, options = {}) {
    if (currentUser.Role === 'admin') {
      if (options.schoolId) {
        const schoolId = this.resolveSchoolId(options.schoolId, currentUser);
        await this.ensureSchoolExists(schoolId);
        return await this.billingCategoryRepository.getCategoriesBySchool(schoolId);
      }

      return await this.billingCategoryRepository.getAllCategories();
    }

    const schoolId = this.resolveSchoolId(null, currentUser);
    return await this.billingCategoryRepository.getCategoriesBySchool(schoolId);
  }

  async getCategoryById(categoryId, currentUser) {
    this.validateId(categoryId, 'Category ID');

    const category = await this.billingCategoryRepository.getCategoryById(categoryId);

    if (!category) {
      throw new Error('Billing category not found');
    }

    this.ensureCategoryAccess(category, currentUser);

    return category;
  }

  async updateCategory(categoryId, payload, currentUser) {
    this.validateId(categoryId, 'Category ID');
    this.validateCategoryData(payload);

    const category = await this.getCategoryById(categoryId, currentUser);

    return await this.billingCategoryRepository.updateCategory(categoryId, {
      categoryName: payload.categoryName,
      description: payload.description,
      baseAmount: Number(payload.baseAmount || 0),
      frequency: this.normalizeTerm(payload.frequency || category.Frequency),
      billingYear: this.billingYear(payload.billingYear || category.BillingYear),
      isActive: payload.isActive !== undefined ? payload.isActive : category.IsActive
    });
  }

  async deleteCategory(categoryId, currentUser) {
    this.validateId(categoryId, 'Category ID');

    await this.getCategoryById(categoryId, currentUser);

    const category = await this.billingCategoryRepository.deleteCategory(categoryId);
    return {
      message: 'Billing category deactivated',
      category
    };
  }

  // Calculate the monthly invoice amount based on the category's base amount and frequency/term.
  // BaseAmount is the total for the billing term. Monthly invoice = BaseAmount / term months.
  calculateInvoiceAmount(category) {
    const baseAmount = Number(category.BaseAmount || 0);
    const frequency = String(category.Frequency || 'Monthly').trim();

    const termMonths = this.parseTermMonths(frequency);
    return Number((baseAmount / termMonths).toFixed(2));
  }

  // Check if an invoice should be generated for this category this month.
  shouldGenerateInvoice(category, lastInvoiceDate = null, invoiceDate = new Date()) {
    const frequency = String(category.Frequency || 'Monthly').trim();

    if (frequency === 'One-time' && lastInvoiceDate) {
      return false;
    }

    const invoiceYear = invoiceDate.getFullYear();
    const billingYear = Number(category.BillingYear || invoiceYear);
    if (Number.isInteger(billingYear) && billingYear !== invoiceYear) {
      return false;
    }

    const invoiceMonth = invoiceDate.getMonth() + 1;
    if (invoiceMonth > this.termEndMonth(frequency)) {
      return false;
    }

    return true;
  }

  // Parse frequency/term string into number of months.
  // Supports: 'Monthly', 'Quarterly', 'Annually', 'One-time', or numeric like '3', '6', '10', '12'.
  parseTermMonths(frequency) {
    const lower = frequency.toLowerCase();
    if (lower === 'monthly' || lower === '1') return 1;
    if (lower === 'quarterly' || lower === '3') return 3;
    if (lower === 'annually' || lower === '12') return 12;
    if (lower === 'one-time') return 1;

    const parsed = parseInt(frequency, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;

    return 1;
  }

  termEndMonth(frequency) {
    const lower = String(frequency || '').trim().toLowerCase();
    if (lower === 'monthly') return 12;
    return Math.min(Math.max(this.parseTermMonths(frequency), 1), 12);
  }

  normalizeTerm(value) {
    const text = String(value || '12 months').trim();
    const months = parseInt(text, 10);
    if (![3, 6, 10, 11, 12].includes(months)) {
      throw new Error('Billing term must be 3, 6, 10, 11, or 12 months');
    }

    return `${months} months`;
  }

  billingYear(value) {
    const year = Number(value || new Date().getFullYear());
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new Error('Billing year must be between 2000 and 2100');
    }
    return year;
  }

  validateCategoryData(categoryData) {
    if (!categoryData.categoryName || String(categoryData.categoryName).trim().length === 0) {
      throw new Error('Category name is required');
    }

    if (categoryData.categoryName.length > 255) {
      throw new Error('Category name must be 255 characters or less');
    }

    if (categoryData.description && categoryData.description.length > 500) {
      throw new Error('Description must be 500 characters or less');
    }

    const amount = Number(categoryData.baseAmount || 0);
    if (isNaN(amount) || amount < 0) {
      throw new Error('Base amount must be a non-negative number');
    }

    if (categoryData.frequency && String(categoryData.frequency).trim().length > 50) {
      throw new Error('Frequency or term must be 50 characters or less');
    }

    this.normalizeTerm(categoryData.frequency);
    this.billingYear(categoryData.billingYear);
  }

  validateId(id, label) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`${label} must be a positive integer`);
    }
  }

  resolveSchoolId(schoolId, currentUser) {
    if (currentUser.Role === 'admin') {
      const resolvedSchoolId = Number(schoolId || currentUser.SchoolID || 0);
      this.validateId(resolvedSchoolId, 'School ID');
      return resolvedSchoolId;
    }

    if (!currentUser.SchoolID) {
      throw new Error('School users must be linked to a school');
    }

    return currentUser.SchoolID;
  }

  async ensureSchoolExists(schoolId) {
    const school = await this.schoolRepository.getSchoolById(schoolId);
    if (!school) {
      throw new Error('School not found');
    }

    return school;
  }

  ensureCategoryAccess(category, currentUser) {
    if (currentUser.Role !== 'admin' && category.SchoolID !== currentUser.SchoolID) {
      throw new Error('You can only access billing categories for your own school');
    }
  }
}

module.exports = BillingCategoryService;
