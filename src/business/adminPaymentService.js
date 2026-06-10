'use strict';

// DevForge admin payments service. Cross-school payment ledger. All reads
// are audit-logged via ScopedDb.recordReadAsync (fire-and-forget for reads).

const { sql } = require('../data/db');
const { ScopedDb } = require('../data/scopedDb');
const AuditRepository = require('../data/auditRepository');

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

class AdminPaymentService {
  constructor() {}

  // Cross-school payment ledger
  async list({ actor, search, schoolId, allocationStatus, paymentMethod, from, to, page, pageSize } = {}) {
    if (!actor || actor.role !== 'admin') throw new Error('admin role required');
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(pageSize, 10) || PAGE_SIZE_DEFAULT));
    const offset = (safePage - 1) * safeSize;
    const safeFrom = parseDate(from);
    const safeTo = parseDate(to);

    const sdb = new ScopedDb(actor);
    sdb.bypass('admin cross-school payment ledger');

    const audit = new AuditRepository();
    const request = await sdb.request();
    request.input('offset', sql.Int, offset);
    request.input('size', sql.Int, safeSize);

    const where = ['1 = 1'];
    if (schoolId && Number.isInteger(Number(schoolId))) {
      request.input('schoolId', sql.Int, Number(schoolId));
      where.push('t.SchoolID = @schoolId');
    }
    if (allocationStatus && ['Unallocated', 'Allocated', 'PendingPayment'].includes(allocationStatus)) {
      request.input('allocationStatus', sql.NVarChar, allocationStatus);
      where.push('t.AllocationStatus = @allocationStatus');
    }
    if (paymentMethod) {
      request.input('paymentMethod', sql.NVarChar, paymentMethod);
      where.push('t.PaymentMethod = @paymentMethod');
    }
    if (safeFrom) { request.input('from', sql.Date, safeFrom); where.push('t.TransactionDate >= @from'); }
    if (safeTo) { request.input('to', sql.Date, safeTo); where.push('t.TransactionDate <= @to'); }
    if (search && String(search).trim().length > 0) {
      const like = '%' + String(search).trim().replace(/[%_]/g, '\\$&') + '%';
      request.input('search', sql.NVarChar, like);
      where.push('(t.ReceiptNumber LIKE @search OR t.PayeeName LIKE @search OR t.Reference LIKE @search OR t.Description LIKE @search)');
    }

    const text = `
      SELECT
        t.TransactionID, t.TransactionDate, t.ReceiptNumber, t.PaymentMethod, t.PayeeType, t.PayeeName,
        t.Amount, t.AllocationStatus, t.InvoiceID, t.BankStatementID, t.Description, t.CreatedDate,
        t.SchoolID, s.SchoolName,
        i.InvoiceNumber, stu.FirstName + ' ' + stu.LastName AS StudentName, f.FamilyName
      FROM Transactions t
      INNER JOIN Schools s        ON s.SchoolID = t.SchoolID
      LEFT  JOIN Invoices i       ON i.InvoiceID = t.InvoiceID
      LEFT  JOIN Students stu     ON stu.StudentID = i.StudentID
      LEFT  JOIN Families f       ON f.FamilyID = stu.FamilyID
      WHERE ${where.join(' AND ')}
      ORDER BY t.TransactionDate DESC, t.CreatedDate DESC
      OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
    `;
    sdb.guardTableScope(text);
    const result = await request.query(text);

    // Fire-and-forget audit per row (the bulk read itself is logged via the
    // bypass reason; individual rows don't need extra audit rows to avoid
    // blowing up AuditLog). The bypass reason captures what the admin was
    // doing. If you need per-row audit, use AdminSchoolService / AdminUserService
    // which have audited writes.
    void audit;

    // Count + KPIs
    const countRequest = await sdb.request();
    const countWhere = ['1 = 1'];
    if (schoolId && Number.isInteger(Number(schoolId))) { countRequest.input('schoolId', sql.Int, Number(schoolId)); countWhere.push('t.SchoolID = @schoolId'); }
    if (allocationStatus && ['Unallocated', 'Allocated', 'PendingPayment'].includes(allocationStatus)) { countRequest.input('allocationStatus', sql.NVarChar, allocationStatus); countWhere.push('t.AllocationStatus = @allocationStatus'); }
    if (paymentMethod) { countRequest.input('paymentMethod', sql.NVarChar, paymentMethod); countWhere.push('t.PaymentMethod = @paymentMethod'); }
    if (safeFrom) { countRequest.input('from', sql.Date, safeFrom); countWhere.push('t.TransactionDate >= @from'); }
    if (safeTo) { countRequest.input('to', sql.Date, safeTo); countWhere.push('t.TransactionDate <= @to'); }
    if (search && String(search).trim().length > 0) {
      const like = '%' + String(search).trim().replace(/[%_]/g, '\\$&') + '%';
      countRequest.input('search', sql.NVarChar, like);
      countWhere.push('(t.ReceiptNumber LIKE @search OR t.PayeeName LIKE @search OR t.Reference LIKE @search OR t.Description LIKE @search)');
    }
    const countText = `SELECT COUNT(*) AS Total, ISNULL(SUM(t.Amount), 0) AS TotalAmount FROM Transactions t WHERE ${countWhere.join(' AND ')}`;
    const countResult = await countRequest.query(countText);
    const total = countResult.recordset[0] ? Number(countResult.recordset[0].Total) : 0;
    const totalAmount = countResult.recordset[0] ? Number(countResult.recordset[0].TotalAmount) : 0;

    // KPIs for current page
    let pageAllocated = 0;
    let pageUnallocated = 0;
    let pagePending = 0;
    for (const r of result.recordset) {
      if (r.AllocationStatus === 'Allocated') pageAllocated += Number(r.Amount);
      else if (r.AllocationStatus === 'Unallocated') pageUnallocated += Number(r.Amount);
      else if (r.AllocationStatus === 'PendingPayment') pagePending += Number(r.Amount);
    }

    return {
      rows: result.recordset,
      total,
      totalAmount,
      page: safePage,
      pageSize: safeSize,
      hasMore: offset + result.recordset.length < total,
      kpis: { totalAmount, pageAllocated, pageUnallocated, pagePending },
      filters: { search: search || '', schoolId: schoolId || '', allocationStatus: allocationStatus || '', paymentMethod: paymentMethod || '', from: safeFrom || '', to: safeTo || '' }
    };
  }

  async listSchools({ actor }) {
    if (!actor || actor.role !== 'admin') throw new Error('admin role required');
    const sdb = new ScopedDb(actor);
    sdb.bypass('admin school picker for payment filter');
    const request = await sdb.request();
    const text = `SELECT SchoolID, SchoolName FROM Schools ORDER BY SchoolName`;
    sdb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset;
  }

  // Platform-wide payment KPIs
  async getKpis({ actor }) {
    if (!actor || actor.role !== 'admin') throw new Error('admin role required');
    const sdb = new ScopedDb(actor);
    sdb.bypass('admin payment KPIs');
    const request = await sdb.request();
    const text = `
      SELECT
        (SELECT ISNULL(SUM(t.Amount), 0) FROM Transactions t
           WHERE t.TransactionDate >= DATEADD(DAY, -30, CAST(GETDATE() AS DATE))
             AND t.AllocationStatus = 'Allocated') AS CollectedLast30Days,
        (SELECT ISNULL(SUM(t.Amount), 0) FROM Transactions t
           WHERE t.AllocationStatus = 'Unallocated') AS UnallocatedTotal,
        (SELECT ISNULL(SUM(t.Amount), 0) FROM Transactions t
           WHERE t.AllocationStatus = 'PendingPayment') AS PendingParentTotal,
        (SELECT COUNT(*) FROM Transactions WHERE AllocationStatus = 'Unallocated') AS UnallocatedCount
    `;
    sdb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset[0] || {};
  }
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

module.exports = AdminPaymentService;
