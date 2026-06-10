// Data Layer - User repository

const { getPool, sql } = require('./db');

class UserRepository {
  async getUserByEmail(email) {
    const pool = await getPool();
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM Users WHERE LOWER(Email) = LOWER(@email)');
    return result.recordset[0];
  }

  async getUserByUsername(username) {
    const pool = await getPool();
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT * FROM Users WHERE LOWER(Username) = LOWER(@username)');
    return result.recordset[0];
  }

  async getUserBySchoolAndUsername(schoolId, username) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('username', sql.NVarChar, username)
      .query(`SELECT u.*
              FROM Users u
              INNER JOIN Employees e ON e.UserID = u.UserID AND e.SchoolID = u.SchoolID
              WHERE u.SchoolID = @schoolId
                AND LOWER(u.Username) = LOWER(@username)
                AND u.Role = 'school'
                AND ISNULL(u.IsActive, 1) = 1
                AND ISNULL(e.IsActive, 1) = 1`);
    return result.recordset[0];
  }

  async getUserBySchoolAndIdentifier(schoolId, identifier) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('identifier', sql.NVarChar, identifier)
      .query(`SELECT u.*
              FROM Users u
              INNER JOIN Employees e ON e.UserID = u.UserID AND e.SchoolID = u.SchoolID
              WHERE u.SchoolID = @schoolId
                AND u.Role = 'school'
                AND ISNULL(u.IsActive, 1) = 1
                AND ISNULL(e.IsActive, 1) = 1
                AND (
                  LOWER(u.Username) = LOWER(@identifier)
                  OR LOWER(u.Email) = LOWER(@identifier)
                )`);
    return result.recordset[0];
  }

  async getStaffLinkedUserBySchoolAndIdentifier(schoolId, identifier) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('identifier', sql.NVarChar, identifier)
      .query(`SELECT TOP 1 u.*
              FROM Users u
              INNER JOIN Employees e ON e.UserID = u.UserID AND e.SchoolID = @schoolId
              WHERE u.Role IN ('school', 'admin')
                AND ISNULL(u.IsActive, 1) = 1
                AND ISNULL(e.IsActive, 1) = 1
                AND (
                  LOWER(u.Username) = LOWER(@identifier)
                  OR LOWER(u.Email) = LOWER(@identifier)
                )
              ORDER BY CASE WHEN u.SchoolID = @schoolId THEN 0 ELSE 1 END, u.UserID`);
    return result.recordset[0];
  }

  async getStaffLinkedUserBySchoolAndUsername(schoolId, username) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('username', sql.NVarChar, username)
      .query(`SELECT TOP 1 u.*
              FROM Users u
              INNER JOIN Employees e ON e.UserID = u.UserID AND e.SchoolID = @schoolId
              WHERE u.Role IN ('school', 'admin')
                AND ISNULL(u.IsActive, 1) = 1
                AND ISNULL(e.IsActive, 1) = 1
                AND LOWER(u.Username) = LOWER(@username)
              ORDER BY CASE WHEN u.SchoolID = @schoolId THEN 0 ELSE 1 END, u.UserID`);
    return result.recordset[0];
  }

  async getUserRecordBySchoolAndIdentifier(schoolId, identifier) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('identifier', sql.NVarChar, identifier)
      .query(`SELECT *
              FROM Users
              WHERE SchoolID = @schoolId
                AND Role = 'school'
                AND (
                  LOWER(Username) = LOWER(@identifier)
                  OR LOWER(Email) = LOWER(@identifier)
                )`);
    return result.recordset[0];
  }

  async getUserRecordBySchoolAndUsername(schoolId, username) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('username', sql.NVarChar, username)
      .query(`SELECT * FROM Users
              WHERE SchoolID = @schoolId AND LOWER(Username) = LOWER(@username)`);
    return result.recordset[0];
  }

  async getAdminByUsername(username) {
    const pool = await getPool();
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query(`SELECT * FROM Users
              WHERE SchoolID IS NULL AND Role = 'admin' AND LOWER(Username) = LOWER(@username) AND ISNULL(IsActive, 1) = 1`);
    return result.recordset[0];
  }

  async getAdminByIdentifier(identifier) {
    const pool = await getPool();
    const result = await pool.request()
      .input('identifier', sql.NVarChar, identifier)
      .query(`SELECT * FROM Users
              WHERE SchoolID IS NULL
                AND Role = 'admin'
                AND ISNULL(IsActive, 1) = 1
                AND (
                  LOWER(Username) = LOWER(@identifier)
                  OR LOWER(Email) = LOWER(@identifier)
                )`);
    return result.recordset[0];
  }

  async getParentByIdentifier(identifier) {
    const pool = await getPool();
    const normalizedPhone = String(identifier || '').replace(/\D/g, '');
    const result = await pool.request()
      .input('identifier', sql.NVarChar, identifier)
      .input('normalizedPhone', sql.NVarChar, normalizedPhone)
      .query(`SELECT TOP 1 u.*
              FROM Users u
              LEFT JOIN ParentLinks pl ON pl.UserID = u.UserID
              LEFT JOIN Families f ON f.FamilyID = pl.FamilyID
              WHERE u.Role = 'parent'
                AND ISNULL(u.IsActive, 1) = 1
                AND (
                  LOWER(u.Username) = LOWER(@identifier)
                  OR LOWER(u.Email) = LOWER(@identifier)
                  OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(ISNULL(f.PrimaryParentPhone, ''), ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = @normalizedPhone
                  OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(ISNULL(f.SecondaryParentPhone, ''), ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') = @normalizedPhone
                )
              ORDER BY u.UserID`);
    return result.recordset[0];
  }

  async getParentLinkedSchools(userId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`SELECT DISTINCT s.SchoolID, s.SchoolName, s.SubscriptionStatus, s.SubscriptionPlan
              FROM ParentLinks pl
              INNER JOIN Schools s ON s.SchoolID = pl.SchoolID
              WHERE pl.UserID = @userId`);
    return result.recordset;
  }

  async getUserById(userId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`SELECT UserID, Username, Email, Role, SchoolID, IsActive, HasHrPermission, CreatedDate
              FROM Users
              WHERE UserID = @userId AND ISNULL(IsActive, 1) = 1`);
    return result.recordset[0];
  }

  async createUser(userData) {
    const pool = await getPool();
    const { username, email, passwordHash, role, schoolId } = userData;
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .input('email', sql.NVarChar, email)
      .input('passwordHash', sql.NVarChar, passwordHash)
      .input('role', sql.NVarChar, role)
      .input('schoolId', sql.Int, schoolId)
      .query(`INSERT INTO Users (Username, Email, PasswordHash, Role, SchoolID, IsActive)
              OUTPUT INSERTED.*
              VALUES (@username, @email, @passwordHash, @role, @schoolId, 1)`);
    return result.recordset[0];
  }

  async getUsersBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT u.UserID, u.Username, u.Email,
                     CASE WHEN u.Role = 'admin' THEN 'school' ELSE u.Role END AS Role,
                     e.SchoolID, u.IsActive, u.CreatedDate,
                     e.EmployeeID, e.FirstName, e.LastName, e.JobTitle, e.Department,
                     e.IsActive AS StaffIsActive
              FROM Users u
              INNER JOIN Employees e ON e.UserID = u.UserID AND e.SchoolID = @schoolId
              WHERE u.Role IN ('school', 'admin')
              ORDER BY u.CreatedDate DESC, u.Username`);
    return result.recordset;
  }

  async getAllUsers() {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT UserID, Username, Email, Role, SchoolID, IsActive, CreatedDate FROM Users');
    return result.recordset;
  }

  async getDevForgeUsers() {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT UserID, Username, Email, Role, SchoolID, IsActive, CreatedDate
              FROM Users
              WHERE SchoolID IS NULL AND Role = 'admin'
              ORDER BY CreatedDate DESC, Username`);
    return result.recordset;
  }

  async getUserRecordById(userId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT UserID, Username, Email, Role, SchoolID, IsActive, CreatedDate FROM Users WHERE UserID = @userId');
    return result.recordset[0];
  }

  async setUserActive(userId, isActive) {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('isActive', sql.Bit, isActive)
      .query(`UPDATE Users
              SET IsActive = @isActive, UpdatedDate = GETDATE()
              OUTPUT INSERTED.UserID, INSERTED.Username, INSERTED.Email, INSERTED.Role, INSERTED.SchoolID, INSERTED.IsActive, INSERTED.CreatedDate
              WHERE UserID = @userId`);
    return result.recordset[0];
  }

  async getActiveStaffMembership(userId, schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT TOP 1 EmployeeID, SchoolID, UserID, FirstName, LastName, Email, JobTitle, Department, IsActive
              FROM Employees
              WHERE UserID = @userId
                AND SchoolID = @schoolId
                AND ISNULL(IsActive, 1) = 1
              ORDER BY EmployeeID`);
    return result.recordset[0];
  }
}

module.exports = UserRepository;
