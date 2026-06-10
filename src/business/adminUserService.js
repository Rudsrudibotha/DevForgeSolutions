'use strict';

// DevForge admin users service. Cross-school user search and impersonation
// guard. Impersonation is logged in the audit log.

const { sql } = require('../data/db');
const { ScopedDb } = require('../data/scopedDb');
const AuditRepository = require('../data/auditRepository');

const ALLOWED_ROLES = ['admin', 'school', 'parent'];
const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

class AdminUserService {
  constructor() {}

  // List users across the platform with filters
  async list({ actor, search, role, schoolId, status, page, pageSize } = {}) {
    if (!actor || actor.role !== 'admin') throw new Error('admin role required');
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(pageSize, 10) || PAGE_SIZE_DEFAULT));
    const offset = (safePage - 1) * safeSize;

    const sdb = new ScopedDb(actor);
    sdb.bypass('admin user list: ' + (search || 'all'));

    const request = await sdb.request();
    request.input('offset', sql.Int, offset);
    request.input('size', sql.Int, safeSize);

    const where = ['1 = 1'];
    if (role && ALLOWED_ROLES.includes(role)) {
      request.input('role', sql.NVarChar, role);
      where.push('u.Role = @role');
    }
    if (schoolId && Number.isInteger(Number(schoolId))) {
      request.input('schoolId', sql.Int, Number(schoolId));
      where.push('u.SchoolID = @schoolId');
    }
    if (status === 'active')   where.push('u.IsActive = 1');
    if (status === 'inactive') where.push('u.IsActive = 0');
    if (search && String(search).trim().length > 0) {
      const like = '%' + String(search).trim().replace(/[%_]/g, '\\$&') + '%';
      request.input('search', sql.NVarChar, like);
      where.push('(u.Username LIKE @search OR u.Email LIKE @search OR u.UserID::NVARCHAR(20) LIKE @search)');
    }

    const text = `
      SELECT
        u.UserID, u.Username, u.Email, u.Role, u.SchoolID, u.IsActive,
        u.CreatedDate, u.LastLoginDate,
        s.SchoolName
      FROM Users u
      LEFT JOIN Schools s ON s.SchoolID = u.SchoolID
      WHERE ${where.join(' AND ')}
      ORDER BY u.CreatedDate DESC
      OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
    `;
    sdb.guardTableScope(text);
    const result = await request.query(text);

    // Count
    const countRequest = await sdb.request();
    const countWhere = ['1 = 1'];
    if (role && ALLOWED_ROLES.includes(role)) { countRequest.input('role', sql.NVarChar, role); countWhere.push('u.Role = @role'); }
    if (schoolId && Number.isInteger(Number(schoolId))) { countRequest.input('schoolId', sql.Int, Number(schoolId)); countWhere.push('u.SchoolID = @schoolId'); }
    if (status === 'active')   countWhere.push('u.IsActive = 1');
    if (status === 'inactive') countWhere.push('u.IsActive = 0');
    if (search && String(search).trim().length > 0) {
      const like = '%' + String(search).trim().replace(/[%_]/g, '\\$&') + '%';
      countRequest.input('search', sql.NVarChar, like);
      countWhere.push('(u.Username LIKE @search OR u.Email LIKE @search)');
    }
    const countText = `SELECT COUNT(*) AS Total FROM Users u WHERE ${countWhere.join(' AND ')}`;
    const countResult = await countRequest.query(countText);
    const total = countResult.recordset[0] ? Number(countResult.recordset[0].Total) : 0;

    return {
      rows: result.recordset,
      total,
      page: safePage,
      pageSize: safeSize,
      hasMore: offset + result.recordset.length < total,
      filters: { search: search || '', role: role || '', schoolId: schoolId || '', status: status || '' }
    };
  }

  async getById({ actor, userId }) {
    if (!actor || actor.role !== 'admin') throw new Error('admin role required');
    if (!Number.isInteger(userId) || userId <= 0) return null;
    const sdb = new ScopedDb(actor);
    sdb.bypass('admin user detail: id=' + userId);
    const request = await sdb.request();
    request.input('userId', sql.Int, userId);
    const text = `
      SELECT u.*, s.SchoolName
      FROM Users u
      LEFT JOIN Schools s ON s.SchoolID = u.SchoolID
      WHERE u.UserID = @userId
    `;
    sdb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset[0] || null;
  }

  // Set isActive flag (disable/enable a user). Audited.
  async setActive({ actor, userId, isActive, reason }) {
    if (!actor || actor.role !== 'admin') throw new Error('admin role required');
    if (!Number.isInteger(userId) || userId <= 0) return false;
    if (!reason || reason.length < 4) throw new Error('Reason of 4+ chars required for user status changes');

    const sdb = new ScopedDb(actor);
    sdb.bypass('admin user status change: id=' + userId + ' to ' + (isActive ? 'Active' : 'Inactive') + ' - ' + reason);

    const audit = new AuditRepository();
    const beforeReq = await sdb.request();
    beforeReq.input('userId', sql.Int, userId);
    const beforeRes = await beforeReq.query('SELECT IsActive, Email, Role, SchoolID FROM Users WHERE UserID = @userId');
    if (!beforeRes.recordset[0]) return false;
    const before = beforeRes.recordset[0];

    const updateReq = await sdb.request();
    updateReq.input('userId', sql.Int, userId);
    updateReq.input('isActive', sql.Bit, isActive ? 1 : 0);
    const text = `UPDATE Users SET IsActive = @isActive, UpdatedDate = GETDATE() WHERE UserID = @userId`;
    sdb.guardTableScope(text);
    const result = await updateReq.query(text);

    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      try {
        await audit.recordWrite(actor, before.SchoolID || 0, 'user', userId,
          'UPDATE_STATUS',
          { isActive: before.IsActive, email: before.Email, role: before.Role },
          { isActive: isActive ? 1 : 0 },
          { reason }
        );
      } catch (e) {
        console.error('[audit] user status audit failed:', e.message);
      }
      return true;
    }
    return false;
  }

  // Get a list of schools for the filter dropdown
  async listSchools({ actor }) {
    if (!actor || actor.role !== 'admin') throw new Error('admin role required');
    const sdb = new ScopedDb(actor);
    sdb.bypass('admin school picker for user filter');
    const request = await sdb.request();
    const text = `SELECT SchoolID, SchoolName FROM Schools ORDER BY SchoolName`;
    sdb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset;
  }
}

module.exports = AdminUserService;
