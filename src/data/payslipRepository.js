// Data Layer - Payslip repository

const { getPool, sql } = require('./db');

class PayslipRepository {
  async getPayslipsByEmployee(employeeId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('employeeId', sql.Int, employeeId)
      .query(`SELECT * FROM Payslips WHERE EmployeeID = @employeeId
              ORDER BY PayPeriod DESC`);
    return result.recordset;
  }

  async getPayslipsBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT p.*, e.FirstName, e.LastName, e.JobTitle
              FROM Payslips p
              INNER JOIN Employees e ON p.EmployeeID = e.EmployeeID
              WHERE e.SchoolID = @schoolId
              ORDER BY p.PayPeriod DESC`);
    return result.recordset;
  }

  async getPreviousPayslipsBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT p.*, e.FirstName, e.LastName, e.JobTitle
              FROM Payslips p
              INNER JOIN Employees e ON p.EmployeeID = e.EmployeeID
              WHERE e.SchoolID = @schoolId AND p.IsFinalized = 1
              ORDER BY p.PayPeriod DESC`);
    return result.recordset;
  }

  async getAllPayslips() {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT p.*, e.FirstName, e.LastName, e.JobTitle, s.SchoolName
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
      .query(`SELECT p.*, e.FirstName, e.LastName, e.SchoolID
              FROM Payslips p
              INNER JOIN Employees e ON p.EmployeeID = e.EmployeeID
              WHERE p.PayslipID = @id`);
    return result.recordset[0];
  }

  async createPayslip(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('employeeId', sql.Int, data.employeeId)
      .input('payPeriod', sql.NVarChar, data.payPeriod)
      .input('grossAmount', sql.Decimal(10,2), data.grossAmount)
      .input('deductions', sql.Decimal(10,2), data.deductions || 0)
      .input('netAmount', sql.Decimal(10,2), data.netAmount)
      .input('notes', sql.NVarChar, data.notes || null)
      .query(`INSERT INTO Payslips (EmployeeID, PayPeriod, GrossAmount, Deductions, NetAmount, Notes)
              OUTPUT INSERTED.*
              VALUES (@employeeId, @payPeriod, @grossAmount, @deductions, @netAmount, @notes)`);
    return result.recordset[0];
  }

  async finalizePayslip(id) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`UPDATE Payslips SET IsFinalized = 1, FinalizedDate = GETDATE(), UpdatedDate = GETDATE()
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
