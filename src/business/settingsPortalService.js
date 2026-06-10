'use strict';

// Settings portal service. Scoped to school via req.schoolDb.

const { sql } = require('../data/db');

const ALLOWED_FREQUENCIES = ['Monthly', 'Quarterly', 'Annually', 'One-time'];

class SettingsPortalService {
  constructor() {}

  // Get the current school's profile
  async getSchool({ schoolDb }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('requires scoped schoolId');
    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    const text = `SELECT * FROM Schools WHERE SchoolID = @schoolId`;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset[0] || null;
  }

  async updateSchool({ schoolDb, data, actor }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('requires scoped schoolId');
    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('schoolName', sql.NVarChar, String(data.schoolName || '').trim().slice(0, 255));
    request.input('address', sql.NVarChar, data.address ? String(data.address).slice(0, 500) : null);
    request.input('contactPerson', sql.NVarChar, data.contactPerson ? String(data.contactPerson).slice(0, 255) : null);
    request.input('contactEmail', sql.NVarChar, data.contactEmail ? String(data.contactEmail).slice(0, 255) : null);
    request.input('contactPhone', sql.NVarChar, data.contactPhone ? String(data.contactPhone).slice(0, 50) : null);
    request.input('website', sql.NVarChar, data.website ? String(data.website).slice(0, 255) : null);
    request.input('paymentInstructions', sql.NVarChar, data.paymentInstructions ? String(data.paymentInstructions).slice(0, 500) : null);
    request.input('currencyCode', sql.NVarChar, data.currencyCode ? String(data.currencyCode).slice(0, 3).toUpperCase() : 'ZAR');
    request.input('currencySymbol', sql.NVarChar, data.currencySymbol ? String(data.currencySymbol).slice(0, 10) : 'R');
    request.input('defaultMonthlyFee', sql.Decimal(10, 2), data.defaultMonthlyFee ? Number(data.defaultMonthlyFee) : 0);
    const text = `
      UPDATE Schools SET
        SchoolName = @schoolName,
        Address = @address,
        ContactPerson = @contactPerson,
        ContactEmail = @contactEmail,
        ContactPhone = @contactPhone,
        Website = @website,
        PaymentInstructions = @paymentInstructions,
        CurrencyCode = @currencyCode,
        CurrencySymbol = @currencySymbol,
        DefaultMonthlyFee = @defaultMonthlyFee,
        UpdatedDate = GETDATE()
      WHERE SchoolID = @schoolId
    `;
    schoolDb.guardTableScope(text);
    await request.query(text);
    return true;
  }

  // Billing categories
  async listBillingCategories({ schoolDb }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('requires scoped schoolId');
    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    const text = `
      SELECT BillingCategoryID, CategoryName, Description, BaseAmount, Frequency, IsActive
      FROM BillingCategories
      WHERE SchoolID = @schoolId
      ORDER BY CategoryName
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset;
  }

  async createBillingCategory({ schoolDb, data, actor }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('requires scoped schoolId');
    if (!data.categoryName || !String(data.categoryName).trim()) throw new Error('Category name is required');
    const frequency = data.frequency || 'Monthly';
    if (!ALLOWED_FREQUENCIES.includes(frequency)) throw new Error('Invalid frequency');
    const baseAmount = Number(data.baseAmount);
    if (!Number.isFinite(baseAmount) || baseAmount < 0) throw new Error('Base amount must be a non-negative number');

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('categoryName', sql.NVarChar, String(data.categoryName).trim().slice(0, 255));
    request.input('description', sql.NVarChar, data.description ? String(data.description).slice(0, 500) : null);
    request.input('baseAmount', sql.Decimal(10, 2), baseAmount);
    request.input('frequency', sql.NVarChar, frequency);
    const text = `
      INSERT INTO BillingCategories (SchoolID, CategoryName, Description, BaseAmount, Frequency, IsActive)
      OUTPUT INSERTED.BillingCategoryID
      VALUES (@schoolId, @categoryName, @description, @baseAmount, @frequency, 1)
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset[0] ? Number(result.recordset[0].BillingCategoryID) : null;
  }

  async updateBillingCategory({ schoolDb, categoryId, data, actor }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('requires scoped schoolId');
    if (!Number.isInteger(categoryId) || categoryId <= 0) return false;
    if (data.frequency && !ALLOWED_FREQUENCIES.includes(data.frequency)) throw new Error('Invalid frequency');

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('categoryId', sql.Int, categoryId);
    request.input('categoryName', sql.NVarChar, data.categoryName ? String(data.categoryName).trim().slice(0, 255) : null);
    request.input('description', sql.NVarChar, data.description !== undefined ? (data.description ? String(data.description).slice(0, 500) : null) : null);
    request.input('baseAmount', sql.Decimal(10, 2), data.baseAmount !== undefined ? Number(data.baseAmount) : 0);
    request.input('frequency', sql.NVarChar, data.frequency || 'Monthly');
    request.input('isActive', sql.Bit, data.isActive === false || data.isActive === '0' ? 0 : 1);
    const text = `
      UPDATE BillingCategories SET
        CategoryName = @categoryName,
        Description = @description,
        BaseAmount = @baseAmount,
        Frequency = @frequency,
        IsActive = @isActive,
        UpdatedDate = GETDATE()
      WHERE SchoolID = @schoolId AND BillingCategoryID = @categoryId
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.rowsAffected && result.rowsAffected[0] > 0;
  }

  async softDeleteBillingCategory({ schoolDb, categoryId, actor }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(categoryId) || categoryId <= 0) return false;
    const sid = schoolDb.schoolId;
    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('categoryId', sql.Int, categoryId);
    const text = `UPDATE BillingCategories SET IsActive = 0, UpdatedDate = GETDATE() WHERE SchoolID = @schoolId AND BillingCategoryID = @categoryId`;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.rowsAffected && result.rowsAffected[0] > 0;
  }
}

module.exports = SettingsPortalService;
