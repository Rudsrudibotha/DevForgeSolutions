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
      .input('employeeNumber', sql.NVarChar, data.employeeNumber || null)
      .input('firstName', sql.NVarChar, data.firstName)
      .input('lastName', sql.NVarChar, data.lastName)
      .input('email', sql.NVarChar, data.email || null)
      .input('phone', sql.NVarChar, data.phone || null)
      .input('jobTitle', sql.NVarChar, data.jobTitle || null)
      .input('department', sql.NVarChar, data.department || null)
      .input('startDate', sql.Date, data.startDate)
      .input('salary', sql.Decimal(10,2), data.salary || 0)
      .input('leaveBalance', sql.Int, data.leaveBalance ?? 21)
      .input('idNumber', sql.NVarChar, data.idNumber || null)
      .input('passportNumber', sql.NVarChar, data.passportNumber || null)
      .input('taxNumber', sql.NVarChar, data.taxNumber || null)
      .input('uifNumber', sql.NVarChar, data.uifNumber || null)
      .input('paymentMethod', sql.NVarChar, data.paymentMethod || null)
      .input('bankName', sql.NVarChar, data.bankName || null)
      .input('bankAccountNumber', sql.NVarChar, data.bankAccountNumber || null)
      .input('branchCode', sql.NVarChar, data.branchCode || null)
      .input('accountType', sql.NVarChar, data.accountType || null)
      .input('standardAllowances', sql.Decimal(10,2), data.standardAllowances || 0)
      .input('standardDeductions', sql.Decimal(10,2), data.standardDeductions || 0)
      .input('taxPaye', sql.Decimal(10,2), data.taxPaye || 0)
      .input('uifDeduction', sql.Decimal(10,2), data.uifDeduction || 0)
      .query(`INSERT INTO Employees (SchoolID, UserID, EmployeeNumber, FirstName, LastName, Email, Phone,
                JobTitle, Department, StartDate, Salary, LeaveBalance, IdNumber, PassportNumber,
                TaxNumber, UifNumber, PaymentMethod, BankName, BankAccountNumber, BranchCode,
                AccountType, StandardAllowances, StandardDeductions, TaxPaye, UifDeduction)
              OUTPUT INSERTED.*
              VALUES (@schoolId, @userId, @employeeNumber, @firstName, @lastName, @email, @phone,
                @jobTitle, @department, @startDate, @salary, @leaveBalance, @idNumber, @passportNumber,
                @taxNumber, @uifNumber, @paymentMethod, @bankName, @bankAccountNumber, @branchCode,
                @accountType, @standardAllowances, @standardDeductions, @taxPaye, @uifDeduction)`);
    return result.recordset[0];
  }

  async updateEmployee(id, data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('employeeNumber', sql.NVarChar, data.employeeNumber || null)
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
      .input('idNumber', sql.NVarChar, data.idNumber || null)
      .input('passportNumber', sql.NVarChar, data.passportNumber || null)
      .input('taxNumber', sql.NVarChar, data.taxNumber || null)
      .input('uifNumber', sql.NVarChar, data.uifNumber || null)
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
                EmployeeNumber = @employeeNumber, FirstName = @firstName, LastName = @lastName, Email = @email, Phone = @phone,
                JobTitle = @jobTitle, Department = @department, StartDate = @startDate, Salary = @salary,
                LeaveBalance = @leaveBalance, IsActive = @isActive, IdNumber = @idNumber,
                PassportNumber = @passportNumber, TaxNumber = @taxNumber, UifNumber = @uifNumber,
                PaymentMethod = @paymentMethod, BankName = @bankName, BankAccountNumber = @bankAccountNumber,
                BranchCode = @branchCode, AccountType = @accountType, StandardAllowances = @standardAllowances,
                StandardDeductions = @standardDeductions, TaxPaye = @taxPaye, UifDeduction = @uifDeduction,
                UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE EmployeeID = @id`);
    return result.recordset[0];
  }
}

module.exports = EmployeeRepository;
