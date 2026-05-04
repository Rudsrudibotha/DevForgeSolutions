// Data Layer - Billing categories repository

const { getPool, sql } = require('./db');

class BillingCategoryRepository {
  async createCategory(categoryData) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, categoryData.schoolId)
      .input('categoryName', sql.NVarChar, categoryData.categoryName)
      .input('description', sql.NVarChar, categoryData.description)
      .input('baseAmount', sql.Decimal(10, 2), categoryData.baseAmount)
      .input('frequency', sql.NVarChar, categoryData.frequency || 'Monthly')
      .input('isActive', sql.Bit, categoryData.isActive !== false)
      .query(`INSERT INTO BillingCategories (SchoolID, CategoryName, Description, BaseAmount, Frequency, IsActive)
              OUTPUT INSERTED.*
              VALUES (@schoolId, @categoryName, @description, @baseAmount, @frequency, @isActive)`);
    return result.recordset[0];
  }

  async getCategoriesBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT * FROM BillingCategories
              WHERE SchoolID = @schoolId AND IsActive = 1
              ORDER BY CategoryName`);
    return result.recordset;
  }

  async getCategoryById(categoryId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('categoryId', sql.Int, categoryId)
      .query('SELECT * FROM BillingCategories WHERE BillingCategoryID = @categoryId');
    return result.recordset[0];
  }

  async updateCategory(categoryId, categoryData) {
    const pool = await getPool();
    const result = await pool.request()
      .input('categoryId', sql.Int, categoryId)
      .input('categoryName', sql.NVarChar, categoryData.categoryName)
      .input('description', sql.NVarChar, categoryData.description)
      .input('baseAmount', sql.Decimal(10, 2), categoryData.baseAmount)
      .input('frequency', sql.NVarChar, categoryData.frequency)
      .input('isActive', sql.Bit, categoryData.isActive)
      .query(`UPDATE BillingCategories
              SET CategoryName = @categoryName, Description = @description,
                  BaseAmount = @baseAmount, Frequency = @frequency,
                  IsActive = @isActive, UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE BillingCategoryID = @categoryId`);
    return result.recordset[0];
  }

  async deleteCategory(categoryId) {
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
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT bc.*, s.SchoolName
              FROM BillingCategories bc
              INNER JOIN Schools s ON bc.SchoolID = s.SchoolID
              WHERE bc.IsActive = 1
              ORDER BY s.SchoolName, bc.CategoryName`);
    return result.recordset;
  }
}

module.exports = BillingCategoryRepository;
