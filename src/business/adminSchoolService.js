'use strict';

// DevForge admin schools service. Admin role: cross-school reads require
// an explicit bypass with a reason. Every cross-school read writes an
// AuditLog row via ScopedDb.recordReadAsync.

const { sql } = require('../data/db');
const { ScopedDb } = require('../data/scopedDb');

const ALLOWED_SUBSCRIPTION_STATUS = ['Active', 'Suspended', 'Cancelled'];
const ALLOWED_SUBSCRIPTION_PLANS = ['Standard', 'Pro', 'Pro+'];
const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

class AdminSchoolService {
  constructor() {}

  // List schools across the platform. Admin can read all, but every row
  // triggers an audit log.
  async list({ actor, search, plan, status, page, pageSize } = {}) {
    if (!actor || actor.role !== 'admin') throw new Error('admin role required');
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(pageSize, 10) || PAGE_SIZE_DEFAULT));
    const offset = (safePage - 1) * safeSize;

    // Admin uses ScopedDb with bypass — every query will audit-log per row
    const sdb = new ScopedDb(actor);
    sdb.bypass('admin cross-school listing: ' + (search || 'all schools'));

    const request = await sdb.request();
    request.input('offset', sql.Int, offset);
    request.input('size', sql.Int, safeSize);

    const where = ['1 = 1'];
    if (plan && ALLOWED_SUBSCRIPTION_PLANS.includes(plan)) {
      request.input('plan', sql.NVarChar, plan);
      where.push('SubscriptionPlan = @plan');
    }
    if (status && ALLOWED_SUBSCRIPTION_STATUS.includes(status)) {
      request.input('status', sql.NVarChar, status);
      where.push('SubscriptionStatus = @status');
    }
    if (search && String(search).trim().length > 0) {
      const like = '%' + String(search).trim().replace(/[%_]/g, '\\$&') + '%';
      request.input('search', sql.NVarChar, like);
      where.push('(SchoolName LIKE @search OR ContactPerson LIKE @search OR ContactEmail LIKE @search OR SchoolID::NVARCHAR(20) LIKE @search)');
    }

    const text = `
      SELECT
        SchoolID, SchoolName, ContactPerson, ContactEmail, ContactPhone, CurrencyCode, CurrencySymbol,
        SubscriptionPlan, SubscriptionStatus, DefaultMonthlyFee,
        CreatedDate, UpdatedDate,
        (SELECT COUNT(*) FROM Users WHERE SchoolID = s.SchoolID AND IsActive = 1) AS ActiveUserCount,
        (SELECT COUNT(*) FROM Students WHERE SchoolID = s.SchoolID AND IsActive = 1 AND IsDeleted = 0) AS ActiveStudentCount
      FROM Schools s
      WHERE ${where.join(' AND ')}
      ORDER BY SchoolName
      OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
    `;
    sdb.guardTableScope(text);
    const result = await request.query(text);

    // Count
    const countRequest = await sdb.request();
    const countWhere = ['1 = 1'];
    if (plan && ALLOWED_SUBSCRIPTION_PLANS.includes(plan)) { countRequest.input('plan', sql.NVarChar, plan); countWhere.push('SubscriptionPlan = @plan'); }
    if (status && ALLOWED_SUBSCRIPTION_STATUS.includes(status)) { countRequest.input('status', sql.NVarChar, status); countWhere.push('SubscriptionStatus = @status'); }
    if (search && String(search).trim().length > 0) {
      const like = '%' + String(search).trim().replace(/[%_]/g, '\\$&') + '%';
      countRequest.input('search', sql.NVarChar, like);
      countWhere.push('(SchoolName LIKE @search OR ContactPerson LIKE @search OR ContactEmail LIKE @search)');
    }
    const countText = `SELECT COUNT(*) AS Total FROM Schools s WHERE ${countWhere.join(' AND ')}`;
    sdb.guardTableScope(countText);
    const countResult = await countRequest.query(countText);
    const total = countResult.recordset[0] ? Number(countResult.recordset[0].Total) : 0;

    return {
      rows: result.recordset,
      total,
      page: safePage,
      pageSize: safeSize,
      hasMore: offset + result.recordset.length < total,
      filters: { search: search || '', plan: plan || '', status: status || '' }
    };
  }

  // Get a single school. Audits.
  async getById({ actor, schoolId }) {
    if (!actor || actor.role !== 'admin') throw new Error('admin role required');
    if (!Number.isInteger(schoolId) || schoolId <= 0) return null;
    const sdb = new ScopedDb(actor);
    sdb.bypass('admin school detail: id=' + schoolId);
    const request = await sdb.request();
    request.input('schoolId', sql.Int, schoolId);
    const text = `
      SELECT
        s.*,
        (SELECT COUNT(*) FROM Users WHERE SchoolID = s.SchoolID AND IsActive = 1) AS ActiveUserCount,
        (SELECT COUNT(*) FROM Students WHERE SchoolID = s.SchoolID AND IsActive = 1 AND IsDeleted = 0) AS ActiveStudentCount,
        (SELECT COUNT(*) FROM Families WHERE SchoolID = s.SchoolID AND IsDeleted = 0) AS FamilyCount,
        (SELECT ISNULL(SUM(i.Amount - i.AmountPaid), 0)
           FROM Invoices i WHERE i.SchoolID = s.SchoolID AND i.Status NOT IN ('Paid', 'Cancelled') AND i.IsDeleted = 0) AS Outstanding
      FROM Schools s
      WHERE s.SchoolID = @schoolId
    `;
    sdb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset[0] || null;
  }

  // Update subscription status. Audited.
  async updateStatus({ actor, schoolId, newStatus, reason }) {
    if (!actor || actor.role !== 'admin') throw new Error('admin role required');
    if (!ALLOWED_SUBSCRIPTION_STATUS.includes(newStatus)) throw new Error('Invalid status');
    if (!Number.isInteger(schoolId) || schoolId <= 0) return false;
    if (!reason || reason.length < 4) throw new Error('A reason of at least 4 characters is required for status changes');

    // Use ScopedDb.bypass so the AuditLog row is written
    const sdb = new ScopedDb(actor);
    sdb.bypass('admin status change: school=' + schoolId + ' to ' + newStatus + ' - ' + reason);

    const AuditRepository = require('../data/auditRepository');
    const audit = new AuditRepository();

    // Capture before-state for the audit
    const beforeReq = await sdb.request();
    beforeReq.input('schoolId', sql.Int, schoolId);
    const beforeRes = await beforeReq.query('SELECT SubscriptionStatus FROM Schools WHERE SchoolID = @schoolId');
    const before = beforeRes.recordset[0] ? beforeRes.recordset[0].SubscriptionStatus : null;

    const updateReq = await sdb.request();
    updateReq.input('schoolId', sql.Int, schoolId);
    updateReq.input('newStatus', sql.NVarChar, newStatus);
    const text = `UPDATE Schools SET SubscriptionStatus = @newStatus, UpdatedDate = GETDATE() WHERE SchoolID = @schoolId`;
    sdb.guardTableScope(text);
    const result = await updateReq.query(text);

    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      // Awaited audit write (writes are awaited, reads are fire-and-forget)
      try {
        await audit.recordWrite(actor, schoolId, 'school', schoolId,
          'UPDATE_STATUS', { status: before }, { status: newStatus }, { reason });
      } catch (e) {
        console.error('[audit] status change audit failed:', e.message);
        // Don't fail the request — the change is committed
      }
      return true;
    }
    return false;
  }

  // Platform-wide KPIs
  async getKpis({ actor }) {
    if (!actor || actor.role !== 'admin') throw new Error('admin role required');
    const sdb = new ScopedDb(actor);
    sdb.bypass('admin KPI dashboard');
    const request = await sdb.request();
    const text = `
      SELECT
        (SELECT COUNT(*) FROM Schools WHERE SubscriptionStatus = 'Active') AS ActiveSchools,
        (SELECT COUNT(*) FROM Schools WHERE SubscriptionStatus = 'Suspended') AS SuspendedSchools,
        (SELECT COUNT(*) FROM Schools) AS TotalSchools,
        (SELECT COUNT(*) FROM Users WHERE IsActive = 1) AS ActiveUsers,
        (SELECT COUNT(*) FROM Students WHERE IsActive = 1 AND IsDeleted = 0) AS ActiveStudents,
        (SELECT ISNULL(SUM(i.Amount - i.AmountPaid), 0)
           FROM Invoices i
           WHERE i.Status NOT IN ('Paid', 'Cancelled') AND i.IsDeleted = 0) AS TotalOutstanding,
        (SELECT ISNULL(SUM(t.Amount), 0)
           FROM Transactions t
           WHERE t.TransactionDate >= DATEADD(DAY, -30, CAST(GETDATE() AS DATE))
             AND t.AllocationStatus = 'Allocated') AS CollectionsLast30Days
    `;
    sdb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset[0] || {};
  }
}

module.exports = AdminSchoolService;
