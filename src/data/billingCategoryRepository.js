// Data Layer - Billing categories repository

const { getPool, sql } = require('./db');

class BillingCategoryRepository {
  constructor() {
    this.billingColumnsEnsured = false;
  }

  async ensureBillingColumns() {
    if (this.billingColumnsEnsured) {
      return;
    }

    const pool = await getPool();
    await pool.request().query(`
      IF COL_LENGTH('dbo.BillingCategories', 'BillingYear') IS NULL
        ALTER TABLE dbo.BillingCategories ADD BillingYear INT NOT NULL CONSTRAINT DF_BillingCategories_BillingYear DEFAULT (YEAR(GETDATE())) WITH VALUES;
    `);
    this.billingColumnsEnsured = true;
  }

  async createCategory(categoryData) {
    await this.ensureBillingColumns();
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, categoryData.schoolId)
      .input('categoryName', sql.NVarChar, categoryData.categoryName)
      .input('description', sql.NVarChar, categoryData.description)
      .input('baseAmount', sql.Decimal(10, 2), categoryData.baseAmount)
      .input('frequency', sql.NVarChar, categoryData.frequency || 'Monthly')
      .input('billingYear', sql.Int, categoryData.billingYear || new Date().getFullYear())
      .input('isActive', sql.Bit, categoryData.isActive !== false)
      .query(`INSERT INTO BillingCategories (SchoolID, CategoryName, Description, BaseAmount, Frequency, BillingYear, IsActive)
              OUTPUT INSERTED.*
              VALUES (@schoolId, @categoryName, @description, @baseAmount, @frequency, @billingYear, @isActive)`);
    return result.recordset[0];
  }

  async getCategoriesBySchool(schoolId) {
    await this.ensureBillingColumns();
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT * FROM BillingCategories
              WHERE SchoolID = @schoolId
              ORDER BY BillingYear DESC, IsActive DESC, CategoryName`);
    return result.recordset;
  }

  async getCategoryById(categoryId) {
    await this.ensureBillingColumns();
    const pool = await getPool();
    const result = await pool.request()
      .input('categoryId', sql.Int, categoryId)
      .query('SELECT * FROM BillingCategories WHERE BillingCategoryID = @categoryId');
    return result.recordset[0];
  }

  async updateCategory(categoryId, categoryData) {
    await this.ensureBillingColumns();
    const pool = await getPool();
    const result = await pool.request()
      .input('categoryId', sql.Int, categoryId)
      .input('categoryName', sql.NVarChar, categoryData.categoryName)
      .input('description', sql.NVarChar, categoryData.description)
      .input('baseAmount', sql.Decimal(10, 2), categoryData.baseAmount)
      .input('frequency', sql.NVarChar, categoryData.frequency)
      .input('billingYear', sql.Int, categoryData.billingYear || new Date().getFullYear())
      .input('isActive', sql.Bit, categoryData.isActive)
      .query(`UPDATE BillingCategories
              SET CategoryName = @categoryName, Description = @description,
                  BaseAmount = @baseAmount, Frequency = @frequency,
                  BillingYear = @billingYear, IsActive = @isActive, UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE BillingCategoryID = @categoryId`);
    return result.recordset[0];
  }

  async deleteCategory(categoryId) {
    await this.ensureBillingColumns();
    const pool = await getPool();
    const result = await pool.request()
      .input('categoryId', sql.Int, categoryId)
      .query(`UPDATE BillingCategories
              SET IsActive = 0, UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE BillingCategoryID = @categoryId`);
    return result.recordset[0];
  }

  async getAllCategories() {
    await this.ensureBillingColumns();
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT bc.*, s.SchoolName
              FROM BillingCategories bc
              INNER JOIN Schools s ON bc.SchoolID = s.SchoolID
              ORDER BY s.SchoolName, bc.BillingYear DESC, bc.IsActive DESC, bc.CategoryName`);
    return result.recordset;
  }
}

module.exports = BillingCategoryRepository;
