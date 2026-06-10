'use strict';

// Staff portal service. Scoped to school via req.schoolDb.

const { sql } = require('../data/db');

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

class StaffPortalService {
  constructor() {}

  async list({ schoolDb, search, department, status, page, pageSize } = {}) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('requires scoped schoolId');

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(pageSize, 10) || PAGE_SIZE_DEFAULT));
    const offset = (safePage - 1) * safeSize;
    const safeStatus = ['active', 'inactive', 'all'].includes(status) ? status : 'active';

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('offset', sql.Int, offset);
    request.input('size', sql.Int, safeSize);

    const where = ['e.SchoolID = @schoolId'];
    if (safeStatus === 'active')   where.push('e.IsActive = 1');
    if (safeStatus === 'inactive') where.push('e.IsActive = 0');
    if (department && String(department).trim()) {
      request.input('department', sql.NVarChar, String(department).trim());
      where.push('e.Department = @department');
    }
    if (search && String(search).trim().length > 0) {
      const like = '%' + String(search).trim().replace(/[%_]/g, '\\$&') + '%';
      request.input('search', sql.NVarChar, like);
      where.push('(e.FirstName LIKE @search OR e.LastName LIKE @search OR e.Email LIKE @search OR e.JobTitle LIKE @search)');
    }

    const text = `
      SELECT
        e.EmployeeID, e.FirstName, e.LastName, e.Email, e.Phone, e.JobTitle, e.Department,
        e.StartDate, e.Salary, e.LeaveBalance, e.IsActive,
        u.Username, u.LastLoginDate
      FROM Employees e
      LEFT JOIN Users u ON u.UserID = e.UserID
      WHERE ${where.join(' AND ')}
      ORDER BY e.LastName, e.FirstName
      OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);

    const countRequest = await schoolDb.request();
    countRequest.input('schoolId', sql.Int, sid);
    const countWhere = ['e.SchoolID = @schoolId'];
    if (safeStatus === 'active')   countWhere.push('e.IsActive = 1');
    if (safeStatus === 'inactive') countWhere.push('e.IsActive = 0');
    if (department && String(department).trim()) { countRequest.input('department', sql.NVarChar, String(department).trim()); countWhere.push('e.Department = @department'); }
    if (search && String(search).trim().length > 0) {
      const like = '%' + String(search).trim().replace(/[%_]/g, '\\$&') + '%';
      countRequest.input('search', sql.NVarChar, like);
      countWhere.push('(e.FirstName LIKE @search OR e.LastName LIKE @search OR e.Email LIKE @search OR e.JobTitle LIKE @search)');
    }
    const countText = `SELECT COUNT(*) AS Total FROM Employees e WHERE ${countWhere.join(' AND ')}`;
    const countResult = await countRequest.query(countText);
    const total = countResult.recordset[0] ? Number(countResult.recordset[0].Total) : 0;

    return { rows: result.recordset, total, page: safePage, pageSize: safeSize, hasMore: offset + result.recordset.length < total, filters: { search: search || '', department: department || '', status: safeStatus } };
  }

  async getById({ schoolDb, employeeId }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(employeeId) || employeeId <= 0) return null;
    const sid = schoolDb.schoolId;
    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('employeeId', sql.Int, employeeId);
    const text = `
      SELECT e.*, u.Username, u.LastLoginDate
      FROM Employees e
      LEFT JOIN Users u ON u.UserID = e.UserID
      WHERE e.SchoolID = @schoolId AND e.EmployeeID = @employeeId
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset[0] || null;
  }

  // Leave requests for an employee (last 20)
  async getLeaveRequests({ schoolDb, employeeId, limit }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(employeeId) || employeeId <= 0) return [];
    const sid = schoolDb.schoolId;
    const lim = Math.min(50, Math.max(1, Number(limit) || 20));
    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('employeeId', sql.Int, employeeId);
    request.input('limit', sql.Int, lim);
    const text = `
      SELECT TOP (@limit) LeaveRequestID, StartDate, EndDate, LeaveType, Status, Reason, CreatedDate
      FROM LeaveRequests
      WHERE SchoolID = @schoolId AND EmployeeID = @employeeId
      ORDER BY CreatedDate DESC
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset;
  }

  // Recent payslips
  async getPayslips({ schoolDb, employeeId, limit }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(employeeId) || employeeId <= 0) return [];
    const sid = schoolDb.schoolId;
    const lim = Math.min(24, Math.max(1, Number(limit) || 12));
    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('employeeId', sql.Int, employeeId);
    request.input('limit', sql.Int, lim);
    const text = `
      SELECT TOP (@limit) PayslipID, PayPeriodStart, PayPeriodEnd, GrossPay, NetPay, PayDate, Status
      FROM Payslips
      WHERE SchoolID = @schoolId AND EmployeeID = @employeeId
      ORDER BY PayPeriodEnd DESC
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset;
  }

  async listDepartments({ schoolDb }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    const text = `
      SELECT DISTINCT Department
      FROM Employees
      WHERE SchoolID = @schoolId AND Department IS NOT NULL AND Department <> ''
      ORDER BY Department
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset.map(r => r.Department);
  }
}

module.exports = StaffPortalService;
