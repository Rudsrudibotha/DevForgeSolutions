'use strict';

// Staff portal service. Scoped to school via req.schoolDb.

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../data/db');

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
        u.Username, CAST(NULL AS DATETIME) AS LastLoginDate
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
      SELECT e.*, u.Username, CAST(NULL AS DATETIME) AS LastLoginDate
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
      SELECT TOP (@limit) lr.LeaveRequestID, lr.StartDate, lr.EndDate, lr.LeaveType, lr.Status, lr.Reason, lr.CreatedDate
      FROM LeaveRequests lr
      INNER JOIN Employees e ON e.EmployeeID = lr.EmployeeID
      WHERE e.SchoolID = @schoolId AND lr.EmployeeID = @employeeId
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
      SELECT TOP (@limit) p.PayslipID, p.PayPeriod, p.GrossAmount, p.NetAmount, p.PaymentDate, p.Status
      FROM Payslips p
      INNER JOIN Employees e ON e.EmployeeID = p.EmployeeID
      WHERE e.SchoolID = @schoolId AND p.EmployeeID = @employeeId
      ORDER BY p.PayPeriod DESC
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

  async create({ schoolDb, data, actor } = {}) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('requires scoped schoolId');

    const firstName = requiredString(data.firstName, 'First name', 100);
    const lastName = requiredString(data.lastName, 'Last name', 100);
    const email = requiredEmail(data.email);
    const phone = optionalString(data.phone, 50);
    const jobTitle = optionalString(data.jobTitle || data.role, 100);
    const department = optionalString(data.department, 100);
    const startDate = parseDate(data.startDate || data.hireDate) || new Date().toISOString().slice(0, 10);
    const salary = positiveMoney(data.salary || data.basicSalary || 0, 'Basic salary');
    const employeeNumber = optionalString(data.employeeNumber || data.staffNumber, 50);
    const idNumber = optionalString(data.idNumber, 50);
    const taxNumber = optionalString(data.taxNumber, 50);
    const uifNumber = optionalString(data.uifNumber, 50);
    const createSystemUser = data.createSystemUser === true || data.createSystemUser === 'true' || data.createSystemUser === '1';

    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      let userId = null;
      if (createSystemUser) {
        const userLookup = new sql.Request(tx);
        userLookup.input('email', sql.NVarChar, email);
        const existing = await userLookup.query('SELECT UserID FROM Users WHERE Email = @email');
        if (existing.recordset[0]) {
          userId = existing.recordset[0].UserID;
          const updUser = new sql.Request(tx);
          updUser.input('userId', sql.Int, userId);
          updUser.input('schoolId', sql.Int, sid);
          updUser.input('firstName', sql.NVarChar, firstName);
          updUser.input('lastName', sql.NVarChar, lastName);
          await updUser.query(`
            UPDATE Users
            SET Role = 'school', SchoolID = @schoolId, FirstName = @firstName,
                LastName = @lastName, IsActive = 1, UpdatedDate = GETDATE()
            WHERE UserID = @userId
          `);
        } else {
          const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
          const insUser = new sql.Request(tx);
          insUser.input('username', sql.NVarChar, email.split('@')[0]);
          insUser.input('email', sql.NVarChar, email);
          insUser.input('hash', sql.NVarChar, hash);
          insUser.input('schoolId', sql.Int, sid);
          insUser.input('firstName', sql.NVarChar, firstName);
          insUser.input('lastName', sql.NVarChar, lastName);
          const created = await insUser.query(`
            INSERT INTO Users (Username, Email, PasswordHash, Role, SchoolID, FirstName, LastName, IsActive)
            OUTPUT INSERTED.UserID
            VALUES (@username, @email, @hash, 'school', @schoolId, @firstName, @lastName, 1)
          `);
          userId = created.recordset[0].UserID;
        }
      }

      const req = new sql.Request(tx);
      req.input('schoolId', sql.Int, sid);
      req.input('userId', sql.Int, userId);
      req.input('firstName', sql.NVarChar, firstName);
      req.input('lastName', sql.NVarChar, lastName);
      req.input('email', sql.NVarChar, email);
      req.input('phone', sql.NVarChar, phone);
      req.input('jobTitle', sql.NVarChar, jobTitle);
      req.input('department', sql.NVarChar, department);
      req.input('startDate', sql.Date, startDate);
      req.input('salary', sql.Decimal(10, 2), salary);
      req.input('employeeNumber', sql.NVarChar, employeeNumber);
      req.input('idNumber', sql.NVarChar, idNumber);
      req.input('taxNumber', sql.NVarChar, taxNumber);
      req.input('uifNumber', sql.NVarChar, uifNumber);
      const result = await req.query(`
        IF EXISTS (SELECT 1 FROM Employees WHERE SchoolID = @schoolId AND Email = @email)
        BEGIN
          UPDATE Employees
          SET UserID = COALESCE(@userId, UserID), FirstName = @firstName, LastName = @lastName,
              Phone = @phone, JobTitle = @jobTitle, Department = @department, StartDate = @startDate,
              Salary = @salary, EmployeeNumber = @employeeNumber, IdNumber = @idNumber,
              TaxNumber = @taxNumber, UifNumber = @uifNumber, IsActive = 1, UpdatedDate = GETDATE()
          OUTPUT INSERTED.*
          WHERE SchoolID = @schoolId AND Email = @email
        END
        ELSE
        BEGIN
          INSERT INTO Employees (
            SchoolID, UserID, FirstName, LastName, Email, Phone, JobTitle, Department,
            StartDate, Salary, EmployeeNumber, IdNumber, TaxNumber, UifNumber, IsActive
          )
          OUTPUT INSERTED.*
          VALUES (
            @schoolId, @userId, @firstName, @lastName, @email, @phone, @jobTitle, @department,
            @startDate, @salary, @employeeNumber, @idNumber, @taxNumber, @uifNumber, 1
          )
        END
      `);

      await tx.commit();
      return result.recordset[0];
    } catch (err) {
      try { await tx.rollback(); } catch (_) {}
      throw err;
    }
  }
}

function requiredString(value, label, maxLength) {
  const cleaned = optionalString(value, maxLength);
  if (!cleaned) throw new Error(`${label} is required`);
  return cleaned;
}

function optionalString(value, maxLength) {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLength);
}

function requiredEmail(value) {
  const cleaned = requiredString(value, 'Email', 255).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) throw new Error('Valid email is required');
  return cleaned;
}

function positiveMoney(value, label) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount < 0) throw new Error(`${label} must be zero or more`);
  return amount;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

module.exports = StaffPortalService;
