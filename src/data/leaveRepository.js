// Data Layer - Leave request repository

const { getPool, sql } = require('./db');

class LeaveRepository {
  async getLeavesByEmployee(employeeId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('employeeId', sql.Int, employeeId)
      .query(`SELECT * FROM LeaveRequests WHERE EmployeeID = @employeeId
              ORDER BY CreatedDate DESC`);
    return result.recordset;
  }

  async getLeavesBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT lr.*, e.FirstName, e.LastName, e.JobTitle
              FROM LeaveRequests lr
              INNER JOIN Employees e ON lr.EmployeeID = e.EmployeeID
              WHERE e.SchoolID = @schoolId
              ORDER BY lr.CreatedDate DESC`);
    return result.recordset;
  }

  async getAllLeaves() {
    const pool = await getPool();
    const result = await pool.request()
      .query(`SELECT lr.*, e.FirstName, e.LastName, e.JobTitle, s.SchoolName
              FROM LeaveRequests lr
              INNER JOIN Employees e ON lr.EmployeeID = e.EmployeeID
              INNER JOIN Schools s ON e.SchoolID = s.SchoolID
              ORDER BY lr.CreatedDate DESC`);
    return result.recordset;
  }

  async getLeaveById(id) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`SELECT lr.*, e.FirstName, e.LastName, e.SchoolID
              FROM LeaveRequests lr
              INNER JOIN Employees e ON lr.EmployeeID = e.EmployeeID
              WHERE lr.LeaveRequestID = @id`);
    return result.recordset[0];
  }

  async createLeave(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('employeeId', sql.Int, data.employeeId)
      .input('leaveType', sql.NVarChar, data.leaveType)
      .input('startDate', sql.Date, data.startDate)
      .input('endDate', sql.Date, data.endDate)
      .input('days', sql.Int, data.days)
      .input('reason', sql.NVarChar, data.reason || null)
      .query(`INSERT INTO LeaveRequests (EmployeeID, LeaveType, StartDate, EndDate, Days, Reason)
              OUTPUT INSERTED.*
              VALUES (@employeeId, @leaveType, @startDate, @endDate, @days, @reason)`);
    return result.recordset[0];
  }

  async updateLeaveStatus(id, status, reviewedBy) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('status', sql.NVarChar, status)
      .input('reviewedBy', sql.Int, reviewedBy || null)
      .query(`UPDATE LeaveRequests SET Status = @status, ReviewedBy = @reviewedBy,
              ReviewedDate = GETDATE(), UpdatedDate = GETDATE()
              OUTPUT INSERTED.*
              WHERE LeaveRequestID = @id`);
    return result.recordset[0];
  }
}

module.exports = LeaveRepository;
