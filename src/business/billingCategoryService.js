// Business Layer - Billing categories service

const BillingCategoryRepository = require('../data/billingCategoryRepository');

class BillingCategoryService {
  constructor() {
    this.billingCategoryRepository = new BillingCategoryRepository();
  }

  async createCategory(payload, currentUser) {
    this.validateCategoryData(payload);

    const schoolId = this.resolveSchoolId(payload.schoolId, currentUser);

    return await this.billingCategoryRepository.createCategory({
      schoolId,
      categoryName: payload.categoryName,
      description: payload.description,
      baseAmount: Number(payload.baseAmount || 0),
      frequency: payload.frequency || 'Monthly',
      isActive: payload.isActive !== false
    });
  }

  async getCategories(currentUser) {
    if (currentUser.Role === 'admin') {
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
      frequency: payload.frequency || category.Frequency,
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
  shouldGenerateInvoice(category, lastInvoiceDate = null) {
    const frequency = String(category.Frequency || 'Monthly').trim();

    if (frequency === 'One-time' && lastInvoiceDate) {
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
  }

  validateId(id, label) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`${label} must be a positive integer`);
    }
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

  ensureCategoryAccess(category, currentUser) {
    if (currentUser.Role !== 'admin' && category.SchoolID !== currentUser.SchoolID) {
      throw new Error('You can only access billing categories for your own school');
    }
  }
}

module.exports = BillingCategoryService;
