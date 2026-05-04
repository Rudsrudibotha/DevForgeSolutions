// Data Layer - Parent repository

const { getPool, sql } = require('./db');

class ParentRepository {
  // Get students linked to a parent's family
  async getStudentsByParentUserId(userId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`SELECT s.*, f.FamilyName, bc.CategoryName
              FROM Students s
              INNER JOIN Families f ON s.FamilyID = f.FamilyID
              INNER JOIN ParentLinks pl ON pl.FamilyID = f.FamilyID
              INNER JOIN Schools sch ON sch.SchoolID = pl.SchoolID
              LEFT JOIN BillingCategories bc ON s.BillingCategoryID = bc.BillingCategoryID
              WHERE pl.UserID = @userId
                AND s.IsActive = 1
                AND sch.SubscriptionStatus = 'Active'
              ORDER BY s.LastName, s.FirstName`);
    return result.recordset;
  }

  async getParentLink(userId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT * FROM ParentLinks WHERE UserID = @userId');
    return result.recordset[0];
  }

  async createParentLink(userId, familyId, schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('familyId', sql.Int, familyId)
      .input('schoolId', sql.Int, schoolId)
      .query(`INSERT INTO ParentLinks (UserID, FamilyID, SchoolID)
              OUTPUT INSERTED.*
              VALUES (@userId, @familyId, @schoolId)`);
    return result.recordset[0];
  }
}

module.exports = ParentRepository;
