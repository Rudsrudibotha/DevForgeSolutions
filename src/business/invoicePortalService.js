'use strict';

// Invoice portal service. Scoped to school via req.schoolDb.

const { sql } = require('../data/db');

const ALLOWED_STATUSES = ['Pending', 'Paid', 'Cancelled', 'Overdue', 'Partial', 'PendingPayment'];
const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

class InvoicePortalService {
  constructor() {}

  // List with filters: status, studentId, familyId, overdue-only, date range, search
  async list({ schoolDb, status, studentId, familyId, overdueOnly, from, to, search, page, pageSize } = {}) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('invoicePortalService.list requires a scoped schoolId');

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(pageSize, 10) || PAGE_SIZE_DEFAULT));
    const offset = (safePage - 1) * safeSize;
    const safeStatus = ALLOWED_STATUSES.includes(status) ? status : null;
    const safeFrom = parseDate(from);
    const safeTo = parseDate(to);

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('offset', sql.Int, offset);
    request.input('size', sql.Int, safeSize);

    const where = ['i.SchoolID = @schoolId', 'i.IsDeleted = 0'];
    if (safeStatus) { request.input('status', sql.NVarChar, safeStatus); where.push('i.Status = @status'); }
    if (studentId && Number.isInteger(Number(studentId))) {
      request.input('studentId', sql.Int, Number(studentId));
      where.push('i.StudentID = @studentId');
    }
    if (familyId && Number.isInteger(Number(familyId))) {
      request.input('familyId', sql.Int, Number(familyId));
      where.push('s.FamilyID = @familyId');
    }
    if (overdueOnly === '1' || overdueOnly === 'true') {
      where.push("i.Status NOT IN ('Paid', 'Cancelled') AND i.DueDate < CAST(GETDATE() AS DATE)");
    }
    if (safeFrom) { request.input('from', sql.Date, safeFrom); where.push('i.DueDate >= @from'); }
    if (safeTo)   { request.input('to', sql.Date, safeTo);     where.push('i.DueDate <= @to'); }
    if (search && String(search).trim().length > 0) {
      const like = '%' + String(search).trim().replace(/[%_]/g, '\\$&') + '%';
      request.input('search', sql.NVarChar, like);
      where.push('(i.InvoiceNumber LIKE @search OR s.FirstName LIKE @search OR s.LastName LIKE @search OR f.FamilyName LIKE @search)');
    }

    const text = `
      SELECT
        i.InvoiceID, i.InvoiceNumber, i.Amount, i.AmountPaid, i.DueDate, i.Status, i.IssueDate, i.Description,
        i.StudentID, s.FirstName + ' ' + s.LastName AS StudentName,
        i.SchoolID, sch.SchoolName,
        f.FamilyID, f.FamilyName,
        (i.Amount - i.AmountPaid) AS Outstanding,
        (SELECT ISNULL(SUM(t.Amount), 0) FROM Transactions t WHERE t.InvoiceID = i.InvoiceID AND t.AllocationStatus = 'Allocated') AS PaidTotal,
        (SELECT COUNT(*) FROM Transactions t WHERE t.InvoiceID = i.InvoiceID) AS PaymentCount
      FROM Invoices i
      LEFT  JOIN Students s  ON s.StudentID = i.StudentID
      LEFT  JOIN Families f  ON f.FamilyID = s.FamilyID
      INNER JOIN Schools sch ON sch.SchoolID = i.SchoolID
      WHERE ${where.join(' AND ')}
      ORDER BY i.DueDate DESC, i.CreatedDate DESC
      OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);

    const countRequest = await schoolDb.request();
    countRequest.input('schoolId', sql.Int, sid);
    const countWhere = ['i.SchoolID = @schoolId', 'i.IsDeleted = 0'];
    if (safeStatus) { countRequest.input('status', sql.NVarChar, safeStatus); countWhere.push('i.Status = @status'); }
    if (studentId && Number.isInteger(Number(studentId))) { countRequest.input('studentId', sql.Int, Number(studentId)); countWhere.push('i.StudentID = @studentId'); }
    if (familyId && Number.isInteger(Number(familyId))) { countRequest.input('familyId', sql.Int, Number(familyId)); countWhere.push('s.FamilyID = @familyId'); }
    if (overdueOnly === '1' || overdueOnly === 'true') countWhere.push("i.Status NOT IN ('Paid', 'Cancelled') AND i.DueDate < CAST(GETDATE() AS DATE)");
    if (safeFrom) { countRequest.input('from', sql.Date, safeFrom); countWhere.push('i.DueDate >= @from'); }
    if (safeTo) { countRequest.input('to', sql.Date, safeTo); countWhere.push('i.DueDate <= @to'); }
    if (search && String(search).trim().length > 0) {
      const like = '%' + String(search).trim().replace(/[%_]/g, '\\$&') + '%';
      countRequest.input('search', sql.NVarChar, like);
      countWhere.push('(i.InvoiceNumber LIKE @search OR s.FirstName LIKE @search OR s.LastName LIKE @search OR f.FamilyName LIKE @search)');
    }
    const countText = `SELECT COUNT(*) AS Total FROM Invoices i LEFT JOIN Students s ON s.StudentID = i.StudentID WHERE ${countWhere.join(' AND ')}`;
    schoolDb.guardTableScope(countText);
    const countResult = await countRequest.query(countText);
    const total = countResult.recordset[0] ? Number(countResult.recordset[0].Total) : 0;

    // KPI aggregation
    let totalOutstanding = 0;
    let totalOverdue = 0;
    for (const row of result.recordset) {
      const o = Number(row.Outstanding || 0);
      totalOutstanding += o;
      if (row.Status !== 'Paid' && row.Status !== 'Cancelled' && row.DueDate && new Date(row.DueDate) < new Date()) {
        totalOverdue += o;
      }
    }

    return {
      rows: result.recordset,
      total,
      page: safePage,
      pageSize: safeSize,
      hasMore: offset + result.recordset.length < total,
      kpis: { totalOutstanding, totalOverdue, count: total },
      filters: { status: status || '', studentId: studentId || '', familyId: familyId || '', overdueOnly: !!overdueOnly, from: safeFrom || '', to: safeTo || '', search: search || '' }
    };
  }

  async getById({ schoolDb, invoiceId }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(invoiceId) || invoiceId <= 0) return null;
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('invoicePortalService.getById requires a scoped schoolId');

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('invoiceId', sql.Int, invoiceId);
    const text = `
      SELECT
        i.*,
        s.StudentID, s.FirstName + ' ' + s.LastName AS StudentName, s.DateOfBirth,
        c.ClassName AS StudentClassName, c.Grade AS StudentGrade,
        f.FamilyID, f.FamilyName, f.PrimaryParentName, f.PrimaryParentEmail, f.PrimaryParentPhone,
        f.SecondaryParentName, f.HomeAddress AS FamilyHomeAddress,
        bc.CategoryName AS BillingCategoryName,
        sch.SchoolName
      FROM Invoices i
      LEFT  JOIN Students s  ON s.StudentID = i.StudentID
      LEFT  JOIN Classes c   ON c.ClassID = s.ClassID
      LEFT  JOIN Families f  ON f.FamilyID = s.FamilyID
      LEFT  JOIN BillingCategories bc ON bc.BillingCategoryID = i.BillingCategoryID
      INNER JOIN Schools sch ON sch.SchoolID = i.SchoolID
      WHERE i.SchoolID = @schoolId AND i.InvoiceID = @invoiceId AND i.IsDeleted = 0
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset[0] || null;
  }

  // Invoice lines grouped per family, for the statement emails. Scope
  // 'outstanding' returns only unpaid balances; 'all' returns every
  // invoice issued this calendar year (a yearly statement). Only active,
  // non-deleted students are included.
  async listFamilyStatements({ schoolDb, scope } = {}) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('invoicePortalService.listFamilyStatements requires a scoped schoolId');

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    const where = [
      'i.SchoolID = @schoolId', 'i.IsDeleted = 0',
      's.IsDeleted = 0', 's.IsActive = 1',
      `i.Status <> 'Cancelled'`
    ];
    if (scope === 'outstanding') {
      where.push(`i.Status <> 'Paid'`, '(i.Amount - ISNULL(i.AmountPaid, 0)) > 0');
    } else {
      where.push('YEAR(i.IssueDate) = YEAR(GETDATE())');
    }

    const text = `
      SELECT
        f.FamilyID, f.FamilyName, f.PrimaryParentEmail, f.SecondaryParentEmail,
        s.StudentID, s.FirstName + ' ' + s.LastName AS StudentName,
        i.InvoiceID, i.InvoiceNumber, i.IssueDate, i.DueDate, i.Status,
        i.Amount, ISNULL(i.AmountPaid, 0) AS AmountPaid
      FROM Invoices i
      INNER JOIN Students s ON s.StudentID = i.StudentID
      INNER JOIN Families f ON f.FamilyID = s.FamilyID
      WHERE ${where.join(' AND ')}
      ORDER BY f.FamilyName, s.LastName, s.FirstName, i.IssueDate
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);

    // Group rows into one statement per family.
    const families = new Map();
    for (const row of result.recordset) {
      let fam = families.get(row.FamilyID);
      if (!fam) {
        const emails = new Set();
        for (const email of [row.PrimaryParentEmail, row.SecondaryParentEmail]) {
          const value = String(email || '').trim().toLowerCase();
          if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) emails.add(value);
        }
        fam = { familyId: row.FamilyID, familyName: row.FamilyName, emails: [...emails], lines: [] };
        families.set(row.FamilyID, fam);
      }
      fam.lines.push({
        studentName: row.StudentName,
        invoiceNumber: row.InvoiceNumber,
        issueDate: row.IssueDate,
        dueDate: row.DueDate,
        status: row.Status,
        amount: Number(row.Amount || 0),
        amountPaid: Number(row.AmountPaid || 0)
      });
    }
    return [...families.values()];
  }

  // Payment history for an invoice
  async getPayments({ schoolDb, invoiceId }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(invoiceId) || invoiceId <= 0) return [];
    const sid = schoolDb.schoolId;

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('invoiceId', sql.Int, invoiceId);
    const text = `
      SELECT TransactionID, ReceiptNumber, PaymentMethod, PayeeName, Amount, AllocationStatus, TransactionDate, Description
      FROM Transactions
      WHERE SchoolID = @schoolId AND InvoiceID = @invoiceId
      ORDER BY TransactionDate DESC
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset;
  }

  // Billing categories for the generate form
  async listBillingCategories({ schoolDb }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) return [];

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    const text = `
      SELECT BillingCategoryID, CategoryName, BaseAmount, Frequency
      FROM BillingCategories
      WHERE SchoolID = @schoolId AND IsActive = 1
      ORDER BY CategoryName
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset;
  }

  // Students for the generate form (within scope)
  async listStudentsForBilling({ schoolDb, classId }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) return [];

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    const where = ['SchoolID = @schoolId', 'IsActive = 1', 'IsDeleted = 0'];
    if (classId && Number.isInteger(Number(classId))) {
      request.input('classId', sql.Int, Number(classId));
      where.push('ClassID = @classId');
    }
    const text = `
      SELECT StudentID, FirstName + ' ' + LastName AS Name, ClassID
      FROM Students
      WHERE ${where.join(' AND ')}
      ORDER BY LastName, FirstName
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset;
  }

  // Generate invoices in bulk. data: { studentIds: [1,2,3], amount, dueDate, description, billingCategoryId? }
  // Returns { generated: [ids], skipped: [ids] } where skipped are students that already have a
  // matching open invoice for the same period.
  async generateBulk({ schoolDb, data, actor }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('invoicePortalService.generateBulk requires a scoped schoolId');
    if (!Array.isArray(data.studentIds) || data.studentIds.length === 0) throw new Error('No students selected');
    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be a positive number');
    const dueDate = parseDate(data.dueDate);
    if (!dueDate) throw new Error('Invalid due date');
    const description = (data.description || '').toString().slice(0, 500);
    const billingCategoryId = data.billingCategoryId ? Number(data.billingCategoryId) : null;

    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    const generated = [];
    const skipped = [];
    try {
      for (const studentIdRaw of data.studentIds) {
        const studentId = Number(studentIdRaw);
        if (!Number.isInteger(studentId) || studentId <= 0) continue;
        // Check student is in scope
        const scopeReq = new sql.Request(tx);
        scopeReq.input('schoolId', sql.Int, sid);
        scopeReq.input('studentId', sql.Int, studentId);
        const scopeCheck = await scopeReq.query(`SELECT 1 AS ok FROM Students WHERE SchoolID = @schoolId AND StudentID = @studentId AND IsDeleted = 0`);
        if (!scopeCheck.recordset[0]) { skipped.push(studentId); continue; }
        // Idempotency: skip if student already has a Pending invoice for the same due month
        const dupReq = new sql.Request(tx);
        dupReq.input('studentId', sql.Int, studentId);
        dupReq.input('from', sql.Date, dueDate.slice(0, 7) + '-01');
        dupReq.input('to', sql.Date, dueDate);
        const dup = await dupReq.query(`SELECT TOP 1 InvoiceID FROM Invoices WHERE StudentID = @studentId AND Status = 'Pending' AND DueDate BETWEEN @from AND @to`);
        if (dup.recordset[0]) { skipped.push(studentId); continue; }
        // Generate
        const ins = new sql.Request(tx);
        const number = 'INV-' + Date.now() + '-' + studentId + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
        ins.input('schoolId', sql.Int, sid);
        ins.input('studentId', sql.Int, studentId);
        ins.input('invoiceNumber', sql.NVarChar, number);
        ins.input('amount', sql.Decimal(10, 2), amount);
        ins.input('dueDate', sql.Date, dueDate);
        ins.input('description', sql.NVarChar, description);
        ins.input('billingCategoryId', sql.Int, billingCategoryId);
        const insertText = `
          INSERT INTO Invoices
            (SchoolID, StudentID, InvoiceNumber, Amount, AmountPaid, DueDate, Status, Description, BillingCategoryID, IssueDate, CurrentAcademicYear)
          OUTPUT INSERTED.InvoiceID
          VALUES
            (@schoolId, @studentId, @invoiceNumber, @amount, 0, @dueDate, 'Pending', @description, @billingCategoryId, CAST(GETDATE() AS DATE), YEAR(GETDATE()))
        `;
        schoolDb.guardTableScope(insertText);
        const ir = await ins.query(insertText);
        if (ir.recordset[0]) generated.push(Number(ir.recordset[0].InvoiceID));
      }
      await tx.commit();
      return { generated, skipped };
    } catch (err) {
      try { await tx.rollback(); } catch (_) {}
      throw err;
    }
  }

  async updateStatus({ schoolDb, invoiceId, status, actor }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!ALLOWED_STATUSES.includes(status)) throw new Error('Invalid status');
    if (!Number.isInteger(invoiceId) || invoiceId <= 0) return false;
    const sid = schoolDb.schoolId;

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('invoiceId', sql.Int, invoiceId);
    request.input('status', sql.NVarChar, status);
    const text = `UPDATE Invoices SET Status = @status, UpdatedDate = GETDATE() WHERE SchoolID = @schoolId AND InvoiceID = @invoiceId AND IsDeleted = 0`;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.rowsAffected && result.rowsAffected[0] > 0;
  }
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

module.exports = InvoicePortalService;
