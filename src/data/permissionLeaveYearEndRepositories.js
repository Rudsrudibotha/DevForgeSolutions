// Data Layer - Roles, Leave Types, Leave Balances, Year-End Closing repositories

const { getPool, sql } = require('./db');

class StaffRoleRepository {
  async getBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('schoolId', sql.Int, schoolId)
      .query('SELECT * FROM StaffRoles WHERE SchoolID = @schoolId AND IsActive = 1 ORDER BY RoleName');
    return result.recordset;
  }
  async getById(id, schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, id).input('schoolId', sql.Int, schoolId)
      .query('SELECT * FROM StaffRoles WHERE StaffRoleID = @id AND SchoolID = @schoolId');
    return result.recordset[0];
  }
  async create(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId).input('roleName', sql.NVarChar, data.roleName)
      .input('description', sql.NVarChar, data.description || null)
      .input('permissions', sql.NVarChar(sql.MAX), data.permissions ? JSON.stringify(data.permissions) : null)
      .query(`INSERT INTO StaffRoles (SchoolID,RoleName,Description,Permissions)
              OUTPUT INSERTED.* VALUES (@schoolId,@roleName,@description,@permissions)`);
    return result.recordset[0];
  }
  async update(id, schoolId, data) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, id).input('schoolId', sql.Int, schoolId)
      .input('roleName', sql.NVarChar, data.roleName)
      .input('description', sql.NVarChar, data.description || null)
      .input('permissions', sql.NVarChar(sql.MAX), data.permissions ? JSON.stringify(data.permissions) : null)
      .input('isActive', sql.Bit, data.isActive !== false)
      .query(`UPDATE StaffRoles SET RoleName=@roleName,Description=@description,Permissions=@permissions,
              IsActive=@isActive,UpdatedDate=GETDATE() OUTPUT INSERTED.* WHERE StaffRoleID=@id AND SchoolID=@schoolId`);
    return result.recordset[0];
  }
  async getUserRoles(userId, schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('userId', sql.Int, userId).input('schoolId', sql.Int, schoolId)
      .query(`SELECT sr.* FROM StaffRoles sr INNER JOIN UserRoleAssignments ura ON sr.StaffRoleID = ura.StaffRoleID
              INNER JOIN Users u ON u.UserID = ura.UserID
              WHERE ura.UserID = @userId AND sr.SchoolID = @schoolId AND u.SchoolID = @schoolId AND sr.IsActive = 1`);
    return result.recordset;
  }
  async assignRole(userId, staffRoleId, schoolId, assignedBy) {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId).input('staffRoleId', sql.Int, staffRoleId).input('schoolId', sql.Int, schoolId)
      .input('assignedBy', sql.Int, assignedBy || null)
      .query(`IF NOT EXISTS (SELECT 1 FROM Users WHERE UserID = @userId AND SchoolID = @schoolId AND Role = 'school')
                THROW 50000, 'User must belong to the selected school', 1;
              IF NOT EXISTS (SELECT 1 FROM StaffRoles WHERE StaffRoleID = @staffRoleId AND SchoolID = @schoolId)
                THROW 50000, 'Role must belong to the selected school', 1;
              IF NOT EXISTS (SELECT 1 FROM UserRoleAssignments WHERE UserID=@userId AND StaffRoleID=@staffRoleId)
              INSERT INTO UserRoleAssignments (UserID,StaffRoleID,AssignedBy) OUTPUT INSERTED.* VALUES (@userId,@staffRoleId,@assignedBy)`);
    return result.recordset[0];
  }
  async removeRole(userId, staffRoleId, schoolId) {
    const pool = await getPool();
    await pool.request().input('userId', sql.Int, userId).input('staffRoleId', sql.Int, staffRoleId).input('schoolId', sql.Int, schoolId)
      .query(`DELETE ura
              FROM UserRoleAssignments ura
              INNER JOIN StaffRoles sr ON sr.StaffRoleID = ura.StaffRoleID
              INNER JOIN Users u ON u.UserID = ura.UserID
              WHERE ura.UserID=@userId AND ura.StaffRoleID=@staffRoleId
                AND sr.SchoolID=@schoolId AND u.SchoolID=@schoolId`);
  }
}

class LeaveTypeRepository {
  async getBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('schoolId', sql.Int, schoolId)
      .query('SELECT * FROM LeaveTypes WHERE SchoolID = @schoolId ORDER BY LeaveTypeName');
    return result.recordset;
  }
  async getActiveBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('schoolId', sql.Int, schoolId)
      .query('SELECT * FROM LeaveTypes WHERE SchoolID = @schoolId AND IsActive = 1 ORDER BY LeaveTypeName');
    return result.recordset;
  }
  async getById(id, schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, id).input('schoolId', sql.Int, schoolId)
      .query('SELECT * FROM LeaveTypes WHERE LeaveTypeID = @id AND SchoolID = @schoolId');
    return result.recordset[0];
  }
  async create(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId).input('leaveTypeName', sql.NVarChar, data.leaveTypeName)
      .input('isPaid', sql.Bit, data.isPaid !== false).input('annualAllocation', sql.Int, data.annualAllocation || 0)
      .input('requiresApproval', sql.Bit, data.requiresApproval !== false)
      .input('requiresDocument', sql.Bit, data.requiresDocument || false)
      .input('carryForwardAllowed', sql.Bit, data.carryForwardAllowed || false)
      .input('affectsPayroll', sql.Bit, data.affectsPayroll || false)
      .query(`INSERT INTO LeaveTypes (SchoolID,LeaveTypeName,IsPaid,AnnualAllocation,RequiresApproval,RequiresDocument,CarryForwardAllowed,AffectsPayroll)
              OUTPUT INSERTED.* VALUES (@schoolId,@leaveTypeName,@isPaid,@annualAllocation,@requiresApproval,@requiresDocument,@carryForwardAllowed,@affectsPayroll)`);
    return result.recordset[0];
  }
  async update(id, schoolId, data) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, id).input('schoolId', sql.Int, schoolId)
      .input('leaveTypeName', sql.NVarChar, data.leaveTypeName)
      .input('isPaid', sql.Bit, data.isPaid !== false).input('annualAllocation', sql.Int, data.annualAllocation || 0)
      .input('requiresApproval', sql.Bit, data.requiresApproval !== false)
      .input('requiresDocument', sql.Bit, data.requiresDocument || false)
      .input('carryForwardAllowed', sql.Bit, data.carryForwardAllowed || false)
      .input('affectsPayroll', sql.Bit, data.affectsPayroll || false)
      .input('isActive', sql.Bit, data.isActive !== false)
      .query(`UPDATE LeaveTypes SET LeaveTypeName=@leaveTypeName,IsPaid=@isPaid,AnnualAllocation=@annualAllocation,
              RequiresApproval=@requiresApproval,RequiresDocument=@requiresDocument,CarryForwardAllowed=@carryForwardAllowed,
              AffectsPayroll=@affectsPayroll,IsActive=@isActive,UpdatedDate=GETDATE() OUTPUT INSERTED.* WHERE LeaveTypeID=@id AND SchoolID=@schoolId`);
    return result.recordset[0];
  }
}

class LeaveBalanceRepository {
  async getByEmployee(employeeId, year, schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('employeeId', sql.Int, employeeId).input('year', sql.Int, year).input('schoolId', sql.Int, schoolId)
      .query(`SELECT lb.*, lt.LeaveTypeName, lt.IsPaid FROM LeaveBalances lb
              INNER JOIN LeaveTypes lt ON lb.LeaveTypeID = lt.LeaveTypeID
              INNER JOIN Employees e ON e.EmployeeID = lb.EmployeeID
              WHERE lb.EmployeeID = @employeeId AND lb.Year = @year AND e.SchoolID = @schoolId AND lt.SchoolID = @schoolId`);
    return result.recordset;
  }
  async getOrCreate(employeeId, leaveTypeId, year, allocation, schoolId) {
    const pool = await getPool();
    const existing = await pool.request()
      .input('employeeId', sql.Int, employeeId).input('leaveTypeId', sql.Int, leaveTypeId).input('year', sql.Int, year).input('schoolId', sql.Int, schoolId)
      .query(`SELECT lb.* FROM LeaveBalances lb
              INNER JOIN Employees e ON e.EmployeeID = lb.EmployeeID
              INNER JOIN LeaveTypes lt ON lt.LeaveTypeID = lb.LeaveTypeID
              WHERE lb.EmployeeID=@employeeId AND lb.LeaveTypeID=@leaveTypeId AND lb.Year=@year
                AND e.SchoolID=@schoolId AND lt.SchoolID=@schoolId`);
    if (existing.recordset[0]) return existing.recordset[0];
    const result = await pool.request()
      .input('employeeId', sql.Int, employeeId).input('leaveTypeId', sql.Int, leaveTypeId)
      .input('year', sql.Int, year).input('allocated', sql.Int, allocation || 0).input('schoolId', sql.Int, schoolId)
      .query(`IF NOT EXISTS (SELECT 1 FROM Employees WHERE EmployeeID = @employeeId AND SchoolID = @schoolId)
                THROW 50000, 'Employee must belong to the selected school', 1;
              IF NOT EXISTS (SELECT 1 FROM LeaveTypes WHERE LeaveTypeID = @leaveTypeId AND SchoolID = @schoolId)
                THROW 50000, 'Leave type must belong to the selected school', 1;
              INSERT INTO LeaveBalances (EmployeeID,LeaveTypeID,Year,Allocated) OUTPUT INSERTED.*
              VALUES (@employeeId,@leaveTypeId,@year,@allocated)`);
    return result.recordset[0];
  }
  async deduct(employeeId, leaveTypeId, year, days) {
    const pool = await getPool();
    const result = await pool.request()
      .input('employeeId', sql.Int, employeeId).input('leaveTypeId', sql.Int, leaveTypeId)
      .input('year', sql.Int, year).input('days', sql.Int, days)
      .query(`UPDATE LeaveBalances SET Used=Used+@days, UpdatedDate=GETDATE() OUTPUT INSERTED.*
              WHERE EmployeeID=@employeeId AND LeaveTypeID=@leaveTypeId AND Year=@year`);
    return result.recordset[0];
  }
  async adjust(employeeId, leaveTypeId, year, adjustment, reason, schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('employeeId', sql.Int, employeeId).input('leaveTypeId', sql.Int, leaveTypeId)
      .input('year', sql.Int, year).input('adjustment', sql.Int, adjustment)
      .input('reason', sql.NVarChar, reason).input('schoolId', sql.Int, schoolId)
      .query(`UPDATE lb SET Adjustment=Adjustment+@adjustment, AdjustmentReason=@reason, UpdatedDate=GETDATE()
              OUTPUT INSERTED.*
              FROM LeaveBalances lb
              INNER JOIN Employees e ON e.EmployeeID = lb.EmployeeID
              INNER JOIN LeaveTypes lt ON lt.LeaveTypeID = lb.LeaveTypeID
              WHERE lb.EmployeeID=@employeeId AND lb.LeaveTypeID=@leaveTypeId AND lb.Year=@year
                AND e.SchoolID=@schoolId AND lt.SchoolID=@schoolId`);
    return result.recordset[0];
  }
}

class YearEndClosingRepository {
  async getBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request().input('schoolId', sql.Int, schoolId)
      .query('SELECT * FROM YearEndClosing WHERE SchoolID = @schoolId ORDER BY FinancialYear DESC');
    return result.recordset;
  }
  async getBySchoolAndYear(schoolId, year) {
    const pool = await getPool();
    const result = await pool.request().input('schoolId', sql.Int, schoolId).input('year', sql.Int, year)
      .query('SELECT * FROM YearEndClosing WHERE SchoolID = @schoolId AND FinancialYear = @year');
    return result.recordset[0];
  }
  async getById(schoolId, id) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('id', sql.Int, id)
      .query('SELECT * FROM YearEndClosing WHERE SchoolID = @schoolId AND ClosingID = @id');
    return result.recordset[0];
  }
  async create(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId).input('financialYear', sql.Int, data.financialYear)
      .input('totalOutstanding', sql.Decimal(10,2), data.totalOutstanding || 0)
      .input('totalAdvanceCredit', sql.Decimal(10,2), data.totalAdvanceCredit || 0)
      .input('totalInvoiced', sql.Decimal(10,2), data.totalInvoiced || 0)
      .input('totalPaid', sql.Decimal(10,2), data.totalPaid || 0)
      .query(`INSERT INTO YearEndClosing (SchoolID,FinancialYear,TotalOutstanding,TotalAdvanceCredit,TotalInvoiced,TotalPaid)
              OUTPUT INSERTED.* VALUES (@schoolId,@financialYear,@totalOutstanding,@totalAdvanceCredit,@totalInvoiced,@totalPaid)`);
    return result.recordset[0];
  }
  async updateStatus(id, schoolId, status, userId, reason) {
    const pool = await getPool();
    let extra = '';
    if (status === 'Closed') extra = ', ClosedBy=@userId, ClosedDate=GETDATE()';
    if (status === 'Reopened for Correction') extra = ', ReopenedBy=@userId, ReopenedDate=GETDATE(), ReopenReason=@reason';
    const result = await pool.request().input('id', sql.Int, id).input('schoolId', sql.Int, schoolId).input('status', sql.NVarChar, status)
      .input('userId', sql.Int, userId || null).input('reason', sql.NVarChar, reason || null)
      .query(`UPDATE YearEndClosing SET Status=@status${extra}, UpdatedDate=GETDATE() OUTPUT INSERTED.* WHERE ClosingID=@id AND SchoolID=@schoolId`);
    return result.recordset[0];
  }
  async getBalancesBroughtForward(schoolId, fromYear, toYear) {
    const pool = await getPool();
    const result = await pool.request().input('schoolId', sql.Int, schoolId)
      .input('fromYear', sql.Int, fromYear).input('toYear', sql.Int, toYear)
      .query(`SELECT bbf.*, s.FirstName, s.LastName FROM BalanceBroughtForward bbf
              INNER JOIN Students s ON bbf.StudentID = s.StudentID
              WHERE bbf.SchoolID = @schoolId AND bbf.FromYear = @fromYear AND bbf.ToYear = @toYear`);
    return result.recordset;
  }
  async createBalanceBroughtForward(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId).input('studentId', sql.Int, data.studentId)
      .input('familyId', sql.Int, data.familyId || null)
      .input('fromYear', sql.Int, data.fromYear).input('toYear', sql.Int, data.toYear)
      .input('outstandingAmount', sql.Decimal(10,2), data.outstandingAmount || 0)
      .input('advanceCreditAmount', sql.Decimal(10,2), data.advanceCreditAmount || 0)
      .query(`IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = @studentId AND SchoolID = @schoolId)
                THROW 50000, 'Student must belong to the selected school', 1;
              IF @familyId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Families WHERE FamilyID = @familyId AND SchoolID = @schoolId)
                THROW 50000, 'Family must belong to the selected school', 1;
              INSERT INTO BalanceBroughtForward (SchoolID,StudentID,FamilyID,FromYear,ToYear,OutstandingAmount,AdvanceCreditAmount)
              OUTPUT INSERTED.* VALUES (@schoolId,@studentId,@familyId,@fromYear,@toYear,@outstandingAmount,@advanceCreditAmount)`);
    return result.recordset[0];
  }
}

module.exports = { StaffRoleRepository, LeaveTypeRepository, LeaveBalanceRepository, YearEndClosingRepository };
