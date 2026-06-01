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

  async getPayrollOptionsBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT EmployeeID, SchoolID, FirstName, LastName, EmployeeNumber, PayrollNumber,
                Salary, StandardAllowances, StandardDeductions, TaxPaye, UifDeduction, IsActive
              FROM Employees
              WHERE SchoolID = @schoolId
              ORDER BY LastName, FirstName`);
    return result.recordset;
  }

  async getAllPayrollOptions() {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT e.EmployeeID, e.SchoolID, e.FirstName, e.LastName, e.EmployeeNumber, e.PayrollNumber,
                e.Salary, e.StandardAllowances, e.StandardDeductions, e.TaxPaye, e.UifDeduction, e.IsActive,
                s.SchoolName
              FROM Employees e
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

  async getActiveEmployeeByUserAndSchool(userId, schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT TOP 1 *
              FROM Employees
              WHERE UserID = @userId
                AND SchoolID = @schoolId
                AND ISNULL(IsActive, 1) = 1
              ORDER BY EmployeeID`);
    return result.recordset[0];
  }

  async createEmployee(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId)
      .input('userId', sql.Int, data.userId || null)
      .input('employeeNumber', sql.NVarChar, data.employeeNumber || null)
      .input('payrollNumber', sql.NVarChar, data.payrollNumber || null)
      .input('firstName', sql.NVarChar, data.firstName)
      .input('lastName', sql.NVarChar, data.lastName)
      .input('email', sql.NVarChar, data.email || null)
      .input('phone', sql.NVarChar, data.phone || null)
      .input('physicalAddress', sql.NVarChar, data.physicalAddress || null)
      .input('jobTitle', sql.NVarChar, data.jobTitle || null)
      .input('department', sql.NVarChar, data.department || null)
      .input('startDate', sql.Date, data.startDate)
      .input('salary', sql.Decimal(10,2), data.salary || 0)
      .input('leaveBalance', sql.Int, data.leaveBalance ?? 21)
      .input('idNumber', sql.NVarChar, data.idNumber || null)
      .input('passportNumber', sql.NVarChar, data.passportNumber || null)
      .input('taxNumber', sql.NVarChar, data.taxNumber || null)
      .input('payeReference', sql.NVarChar, data.payeReference || null)
      .input('uifNumber', sql.NVarChar, data.uifNumber || null)
      .input('uifReferenceNumber', sql.NVarChar, data.uifReferenceNumber || null)
      .input('paymentMethod', sql.NVarChar, data.paymentMethod || null)
      .input('bankName', sql.NVarChar, data.bankName || null)
      .input('bankAccountNumber', sql.NVarChar, data.bankAccountNumber || null)
      .input('branchCode', sql.NVarChar, data.branchCode || null)
      .input('accountType', sql.NVarChar, data.accountType || null)
      .input('standardAllowances', sql.Decimal(10,2), data.standardAllowances || 0)
      .input('standardDeductions', sql.Decimal(10,2), data.standardDeductions || 0)
      .input('taxPaye', sql.Decimal(10,2), data.taxPaye || 0)
      .input('uifDeduction', sql.Decimal(10,2), data.uifDeduction || 0)
      .query(`IF @userId IS NOT NULL AND NOT EXISTS (
                SELECT 1
                FROM Users
                WHERE UserID = @userId
                  AND Role IN ('school', 'admin')
                  AND (SchoolID = @schoolId OR SchoolID IS NULL)
              )
                THROW 50000, 'Linked user must belong to the selected school', 1;
              INSERT INTO Employees (SchoolID, UserID, EmployeeNumber, PayrollNumber, FirstName, LastName, Email, Phone,
                PhysicalAddress, JobTitle, Department, StartDate, Salary, LeaveBalance, IdNumber, PassportNumber,
                TaxNumber, PayeReference, UifNumber, UifReferenceNumber, PaymentMethod, BankName, BankAccountNumber, BranchCode,
                AccountType, StandardAllowances, StandardDeductions, TaxPaye, UifDeduction)
              OUTPUT INSERTED.*
              VALUES (@schoolId, @userId, @employeeNumber, @payrollNumber, @firstName, @lastName, @email, @phone,
                @physicalAddress, @jobTitle, @department, @startDate, @salary, @leaveBalance, @idNumber, @passportNumber,
                @taxNumber, @payeReference, @uifNumber, @uifReferenceNumber, @paymentMethod, @bankName, @bankAccountNumber, @branchCode,
                @accountType, @standardAllowances, @standardDeductions, @taxPaye, @uifDeduction)`);
    return result.recordset[0];
  }

  async updateEmployee(id, data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('employeeNumber', sql.NVarChar, data.employeeNumber || null)
      .input('payrollNumber', sql.NVarChar, data.payrollNumber || null)
      .input('firstName', sql.NVarChar, data.firstName)
      .input('lastName', sql.NVarChar, data.lastName)
      .input('email', sql.NVarChar, data.email || null)
      .input('phone', sql.NVarChar, data.phone || null)
      .input('physicalAddress', sql.NVarChar, data.physicalAddress || null)
      .input('jobTitle', sql.NVarChar, data.jobTitle || null)
      .input('department', sql.NVarChar, data.department || null)
      .input('startDate', sql.Date, data.startDate)
      .input('salary', sql.Decimal(10,2), data.salary || 0)
      .input('leaveBalance', sql.Int, data.leaveBalance ?? 21)
      .input('isActive', sql.Bit, data.isActive !== false)
      .input('idNumber', sql.NVarChar, data.idNumber || null)
      .input('passportNumber', sql.NVarChar, data.passportNumber || null)
      .input('taxNumber', sql.NVarChar, data.taxNumber || null)
      .input('payeReference', sql.NVarChar, data.payeReference || null)
      .input('uifNumber', sql.NVarChar, data.uifNumber || null)
      .input('uifReferenceNumber', sql.NVarChar, data.uifReferenceNumber || null)
      .input('paymentMethod', sql.NVarChar, data.paymentMethod || null)
      .input('bankName', sql.NVarChar, data.bankName || null)
      .input('bankAccountNumber', sql.NVarChar, data.bankAccountNumber || null)
      .input('branchCode', sql.NVarChar, data.branchCode || null)
      .input('accountType', sql.NVarChar, data.accountType || null)
      .input('standardAllowances', sql.Decimal(10,2), data.standardAllowances || 0)
      .input('standardDeductions', sql.Decimal(10,2), data.standardDeductions || 0)
      .input('taxPaye', sql.Decimal(10,2), data.taxPaye || 0)
      .input('uifDeduction', sql.Decimal(10,2), data.uifDeduction || 0)
      .query(`UPDATE Employees SET
                EmployeeNumber = @employeeNumber, PayrollNumber = @payrollNumber, FirstName = @firstName, LastName = @lastName, Email = @email, Phone = @phone,
                PhysicalAddress = @physicalAddress,
                JobTitle = @jobTitle, Department = @department, StartDate = @startDate, Salary = @salary,
                LeaveBalance = @leaveBalance, IsActive = @isActive, IdNumber = @idNumber,
                PassportNumber = @passportNumber, TaxNumber = @taxNumber, PayeReference = @payeReference,
                UifNumber = @uifNumber, UifReferenceNumber = @uifReferenceNumber,
                PaymentMethod = @paymentMethod, BankName = @bankName, BankAccountNumber = @bankAccountNumber,
                BranchCode = @branchCode, AccountType = @accountType, StandardAllowances = @standardAllowances,
                StandardDeductions = @standardDeductions, TaxPaye = @taxPaye, UifDeduction = @uifDeduction,
                UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE EmployeeID = @id`);
    return result.recordset[0];
  }

  async linkEmployeeUser(employeeId, schoolId, userId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('employeeId', sql.Int, employeeId)
      .input('schoolId', sql.Int, schoolId)
      .input('userId', sql.Int, userId)
      .query(`IF NOT EXISTS (
                SELECT 1
                FROM Users
                WHERE UserID = @userId
                  AND Role IN ('school', 'admin')
                  AND (SchoolID = @schoolId OR SchoolID IS NULL)
              )
                THROW 50000, 'Linked user must belong to the selected school', 1;
              UPDATE Employees
              SET UserID = @userId, UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE EmployeeID = @employeeId
                AND SchoolID = @schoolId
                AND (UserID IS NULL OR UserID = @userId)`);
    return result.recordset[0];
  }
}

module.exports = EmployeeRepository;
