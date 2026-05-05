// Data Layer - Payslip repository

const { getPool, sql } = require('./db');

class PayslipRepository {
  async getPayslipsByEmployee(employeeId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('employeeId', sql.Int, employeeId)
      .query('SELECT * FROM Payslips WHERE EmployeeID = @employeeId ORDER BY PayPeriod DESC');
    return result.recordset;
  }

  async getPayslipsBySchool(schoolId, options = {}) {
    const pool = await getPool();
    const req = pool.request().input('schoolId', sql.Int, schoolId);
    let where = 'WHERE e.SchoolID = @schoolId';

    if (options.employeeId) {
      req.input('employeeId', sql.Int, options.employeeId);
      where += ' AND p.EmployeeID = @employeeId';
    }
    if (options.payPeriod) {
      req.input('payPeriod', sql.NVarChar, options.payPeriod);
      where += ' AND p.PayPeriod = @payPeriod';
    }
    if (options.status) {
      req.input('status', sql.NVarChar, options.status);
      where += ' AND p.Status = @status';
    }

    const result = await req.query(`SELECT p.*, e.FirstName, e.LastName, e.EmployeeNumber, e.JobTitle, e.Department,
              e.Email, e.Phone, e.IdNumber, e.PassportNumber, e.TaxNumber, e.UifNumber,
              e.PaymentMethod, e.BankName, e.BankAccountNumber, e.BranchCode, e.AccountType
            FROM Payslips p
            INNER JOIN Employees e ON p.EmployeeID = e.EmployeeID
            ${where}
            ORDER BY p.PayPeriod DESC`);
    return result.recordset;
  }

  async getPreviousPayslipsBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT p.*, e.FirstName, e.LastName, e.EmployeeNumber, e.JobTitle, e.Department
              FROM Payslips p
              INNER JOIN Employees e ON p.EmployeeID = e.EmployeeID
              WHERE e.SchoolID = @schoolId AND p.IsFinalized = 1
              ORDER BY p.PayPeriod DESC`);
    return result.recordset;
  }

  async getAllPayslips() {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT p.*, e.FirstName, e.LastName, e.EmployeeNumber, e.JobTitle, s.SchoolName
              FROM Payslips p
              INNER JOIN Employees e ON p.EmployeeID = e.EmployeeID
              INNER JOIN Schools s ON e.SchoolID = s.SchoolID
              ORDER BY p.PayPeriod DESC`);
    return result.recordset;
  }

  async getPayslipById(id) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`SELECT p.*, e.FirstName, e.LastName, e.EmployeeNumber, e.SchoolID, e.JobTitle, e.Department,
                e.Email, e.Phone, e.StartDate, e.IdNumber, e.PassportNumber, e.TaxNumber, e.UifNumber,
                e.PaymentMethod, e.BankName, e.BankAccountNumber, e.BranchCode, e.AccountType,
                s.SchoolName, s.Address AS SchoolAddress, s.ContactPhone AS SchoolPhone,
                s.ContactEmail AS SchoolEmail, s.LogoUrl AS SchoolLogo, s.RegistrationNumber AS SchoolRegistrationNumber,
                created.Username AS CreatedByUsername, finalized.Username AS FinalizedByUsername
              FROM Payslips p
              INNER JOIN Employees e ON p.EmployeeID = e.EmployeeID
              INNER JOIN Schools s ON e.SchoolID = s.SchoolID
              LEFT JOIN Users created ON p.CreatedBy = created.UserID
              LEFT JOIN Users finalized ON p.FinalizedBy = finalized.UserID
              WHERE p.PayslipID = @id`);
    return result.recordset[0];
  }

  async getLatestFinalizedPayslip(employeeId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('employeeId', sql.Int, employeeId)
      .query(`SELECT TOP 1 * FROM Payslips
              WHERE EmployeeID = @employeeId AND IsFinalized = 1
              ORDER BY PayPeriod DESC`);
    return result.recordset[0] || null;
  }

  async createPayslip(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('employeeId', sql.Int, data.employeeId)
      .input('payPeriod', sql.NVarChar, data.payPeriod)
      .input('basicSalary', sql.Decimal(10,2), data.basicSalary || 0)
      .input('allowances', sql.Decimal(10,2), data.allowances || 0)
      .input('overtime', sql.Decimal(10,2), data.overtime || 0)
      .input('bonus', sql.Decimal(10,2), data.bonus || 0)
      .input('grossAmount', sql.Decimal(10,2), data.grossAmount)
      .input('deductions', sql.Decimal(10,2), data.deductions || 0)
      .input('leaveDeduction', sql.Decimal(10,2), data.leaveDeduction || 0)
      .input('taxPaye', sql.Decimal(10,2), data.taxPaye || 0)
      .input('uifDeduction', sql.Decimal(10,2), data.uifDeduction || 0)
      .input('otherDeductions', sql.Decimal(10,2), data.otherDeductions || 0)
      .input('netAmount', sql.Decimal(10,2), data.netAmount)
      .input('notes', sql.NVarChar, data.notes || null)
      .input('paymentDate', sql.Date, data.paymentDate || null)
      .input('status', sql.NVarChar, data.status || 'Draft')
      .input('createdBy', sql.Int, data.createdBy || null)
      .query(`INSERT INTO Payslips (EmployeeID, PayPeriod, BasicSalary, Allowances, Overtime, Bonus,
                GrossAmount, Deductions, LeaveDeduction, TaxPaye, UifDeduction, OtherDeductions,
                NetAmount, Notes, PaymentDate, Status, CreatedBy)
              OUTPUT INSERTED.*
              VALUES (@employeeId, @payPeriod, @basicSalary, @allowances, @overtime, @bonus,
                @grossAmount, @deductions, @leaveDeduction, @taxPaye, @uifDeduction, @otherDeductions,
                @netAmount, @notes, @paymentDate, @status, @createdBy)`);
    return result.recordset[0];
  }

  async updatePayslip(id, data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('basicSalary', sql.Decimal(10,2), data.basicSalary || 0)
      .input('allowances', sql.Decimal(10,2), data.allowances || 0)
      .input('overtime', sql.Decimal(10,2), data.overtime || 0)
      .input('bonus', sql.Decimal(10,2), data.bonus || 0)
      .input('grossAmount', sql.Decimal(10,2), data.grossAmount)
      .input('deductions', sql.Decimal(10,2), data.deductions || 0)
      .input('leaveDeduction', sql.Decimal(10,2), data.leaveDeduction || 0)
      .input('taxPaye', sql.Decimal(10,2), data.taxPaye || 0)
      .input('uifDeduction', sql.Decimal(10,2), data.uifDeduction || 0)
      .input('otherDeductions', sql.Decimal(10,2), data.otherDeductions || 0)
      .input('netAmount', sql.Decimal(10,2), data.netAmount)
      .input('notes', sql.NVarChar, data.notes || null)
      .input('paymentDate', sql.Date, data.paymentDate || null)
      .query(`UPDATE Payslips SET BasicSalary = @basicSalary, Allowances = @allowances, Overtime = @overtime,
                Bonus = @bonus, GrossAmount = @grossAmount, Deductions = @deductions,
                LeaveDeduction = @leaveDeduction, TaxPaye = @taxPaye, UifDeduction = @uifDeduction,
                OtherDeductions = @otherDeductions, NetAmount = @netAmount, Notes = @notes,
                PaymentDate = @paymentDate, UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE PayslipID = @id AND IsFinalized = 0`);
    return result.recordset[0];
  }

  async finalizePayslip(id, userId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('finalizedBy', sql.Int, userId || null)
      .query(`UPDATE Payslips SET IsFinalized = 1, FinalizedDate = GETDATE(), FinalizedBy = @finalizedBy,
                Status = 'Finalized', UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE PayslipID = @id AND IsFinalized = 0`);
    return result.recordset[0];
  }

  async payslipExistsForPeriod(employeeId, payPeriod) {
    const pool = await getPool();
    const result = await pool.request()
      .input('employeeId', sql.Int, employeeId)
      .input('payPeriod', sql.NVarChar, payPeriod)
      .query('SELECT 1 FROM Payslips WHERE EmployeeID = @employeeId AND PayPeriod = @payPeriod');
    return result.recordset.length > 0;
  }
}

module.exports = PayslipRepository;
