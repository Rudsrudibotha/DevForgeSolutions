// Data Layer - Employee repository

const { getPool, sql } = require('./db');

class EmployeeRepository {
  async getEmployeesBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT * FROM Employees WHERE SchoolID = @schoolId ORDER BY LastName, FirstName`);
    return result.recordset;
  }

  async getAllEmployees() {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT e.*, s.SchoolName FROM Employees e
              INNER JOIN Schools s ON e.SchoolID = s.SchoolID
              ORDER BY e.LastName, e.FirstName`);
    return result.recordset;
  }

  async getEmployeeById(id) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Employees WHERE EmployeeID = @id');
    return result.recordset[0];
  }

  async getEmployeeByUserId(userId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT * FROM Employees WHERE UserID = @userId');
    return result.recordset[0];
  }

  async createEmployee(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId)
      .input('userId', sql.Int, data.userId || null)
      .input('firstName', sql.NVarChar, data.firstName)
      .input('lastName', sql.NVarChar, data.lastName)
      .input('email', sql.NVarChar, data.email || null)
      .input('phone', sql.NVarChar, data.phone || null)
      .input('jobTitle', sql.NVarChar, data.jobTitle || null)
      .input('department', sql.NVarChar, data.department || null)
      .input('startDate', sql.Date, data.startDate)
      .input('salary', sql.Decimal(10,2), data.salary || 0)
      .input('leaveBalance', sql.Int, data.leaveBalance ?? 21)
      .query(`INSERT INTO Employees (SchoolID, UserID, FirstName, LastName, Email, Phone,
                JobTitle, Department, StartDate, Salary, LeaveBalance)
              OUTPUT INSERTED.*
              VALUES (@schoolId, @userId, @firstName, @lastName, @email, @phone,
                @jobTitle, @department, @startDate, @salary, @leaveBalance)`);
    return result.recordset[0];
  }

  async updateEmployee(id, data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('firstName', sql.NVarChar, data.firstName)
      .input('lastName', sql.NVarChar, data.lastName)
      .input('email', sql.NVarChar, data.email || null)
      .input('phone', sql.NVarChar, data.phone || null)
      .input('jobTitle', sql.NVarChar, data.jobTitle || null)
      .input('department', sql.NVarChar, data.department || null)
      .input('startDate', sql.Date, data.startDate)
      .input('salary', sql.Decimal(10,2), data.salary || 0)
      .input('leaveBalance', sql.Int, data.leaveBalance ?? 21)
      .input('isActive', sql.Bit, data.isActive !== false)
      .query(`UPDATE Employees SET
                FirstName = @firstName, LastName = @lastName, Email = @email, Phone = @phone,
                JobTitle = @jobTitle, Department = @department, StartDate = @startDate, Salary = @salary,
                LeaveBalance = @leaveBalance, IsActive = @isActive, UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE EmployeeID = @id`);
    return result.recordset[0];
  }
}

module.exports = EmployeeRepository;
