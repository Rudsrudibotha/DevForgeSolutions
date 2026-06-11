// Business Layer - thin service facade for the new SMS portal
// EJS pages. Each method wraps the underlying repository layer so the
// EJS renderer never has to import data-layer modules directly.

const AdmissionsFinanceRepositories = require('../data/admissionsFinanceRepositories');
const FinancePeriodLockRepository = require('../data/financePeriodLockRepository');
const PermissionLeaveYearEndRepositories = require('../data/permissionLeaveYearEndRepositories');
const RolloverTemplateRepositories = require('../data/rolloverTemplateRepositories');
const AuditLogRepository = require('../data/auditLogRepository');
const UserRepository = require('../data/userRepository');
const SchoolRepository = require('../data/schoolRepository');
const { getPool, sql } = require('../data/db');

class AdmissionsFinanceService {
  async getRefunds(currentUser) {
    if (!currentUser || !currentUser.SchoolID) return [];
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, Number(currentUser.SchoolID))
      .input('tenantId', sql.Int, Number(currentUser.tenantId || 0))
      .query(`
        SELECT TOP 200 r.RefundID, r.SchoolID, r.FamilyID, r.StudentID, r.Amount, r.Reason, r.Status, r.CreatedAt,
               f.FamilyName, s.FirstName + ' ' + s.LastName AS StudentName, sch.CurrencyCode
        FROM dbo.Refunds r
        INNER JOIN dbo.Schools sch ON sch.SchoolID = r.SchoolID
        LEFT JOIN dbo.Families f ON f.FamilyID = r.FamilyID
        LEFT JOIN dbo.Students s ON s.StudentID = r.StudentID
        WHERE r.SchoolID = @schoolId AND r.TenantId = @tenantId
        ORDER BY r.CreatedAt DESC
      `);
    return result.recordset;
  }

  async getAdjustments(currentUser) {
    if (!currentUser || !currentUser.SchoolID) return [];
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, Number(currentUser.SchoolID))
      .input('tenantId', sql.Int, Number(currentUser.tenantId || 0))
      .query(`
        SELECT TOP 200 a.AdjustmentID, a.SchoolID, a.StudentID, a.FamilyID, a.AdjustmentType, a.Amount, a.Reason, a.CreatedAt, a.TenantId,
               s.FirstName + ' ' + s.LastName AS StudentName, f.FamilyName, sch.CurrencyCode
        FROM dbo.FinancialAdjustments a
        INNER JOIN dbo.Schools sch ON sch.SchoolID = a.SchoolID
        LEFT JOIN dbo.Students s ON s.StudentID = a.StudentID
        LEFT JOIN dbo.Families f ON f.FamilyID = a.FamilyID
        WHERE a.SchoolID = @schoolId AND a.TenantId = @tenantId
        ORDER BY a.CreatedAt DESC
      `);
    return result.recordset;
  }

  async getRegistrationFees(currentUser) {
    if (!currentUser || !currentUser.SchoolID) return [];
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, Number(currentUser.SchoolID))
      .input('tenantId', sql.Int, Number(currentUser.tenantId || 0))
      .query(`
        SELECT TOP 200 rf.RegistrationFeeID, rf.SchoolID, rf.StudentID, rf.FamilyID, rf.FeeType, rf.Amount, rf.Refundable, rf.Status, rf.Notes, rf.CreatedAt, rf.TenantId,
               s.FirstName + ' ' + s.LastName AS StudentName, f.FamilyName, sch.CurrencyCode
        FROM dbo.RegistrationFees rf
        INNER JOIN dbo.Schools sch ON sch.SchoolID = rf.SchoolID
        LEFT JOIN dbo.Students s ON s.StudentID = rf.StudentID
        LEFT JOIN dbo.Families f ON f.FamilyID = rf.FamilyID
        WHERE rf.SchoolID = @schoolId AND rf.TenantId = @tenantId
        ORDER BY rf.CreatedAt DESC
      `);
    return result.recordset;
  }

  // List families with their current running balance (used to drive
  // the refund and adjustment create forms).
  async getFamiliesWithBalance(currentUser) {
    if (!currentUser || !currentUser.SchoolID) return [];
    const { getAvailableRefundBalance } = require('../data/familyBalanceRepository');
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, Number(currentUser.SchoolID))
      .query(`
        SELECT FamilyID, FamilyName, PrimaryParentName, PrimaryParentEmail, PrimaryParentPhone
        FROM dbo.Families
        WHERE SchoolID = @schoolId AND IsDeleted = 0
        ORDER BY FamilyName
      `);
    const out = [];
    for (const f of result.recordset) {
      const bal = await getAvailableRefundBalance({ schoolId: Number(currentUser.SchoolID), familyId: f.FamilyID });
      out.push({ ...f, runningBalance: bal.runningBalance, pendingRefunds: bal.pendingRefunds, availableForRefund: bal.availableForRefund });
    }
    return out;
  }

  async getStudentsForFamily(currentUser, familyId) {
    if (!currentUser || !currentUser.SchoolID) return [];
    const pool = await getPool();
    const studentsResult = await pool.request()
      .input('schoolId', sql.Int, Number(currentUser.SchoolID))
      .input('familyId', sql.Int, Number(familyId))
      .query(`
        SELECT s.StudentID, s.FirstName, s.LastName, s.IsActive, c.ClassName, c.Grade
        FROM dbo.Students s
        LEFT JOIN dbo.Classes c ON c.ClassID = s.ClassID
        WHERE s.SchoolID = @schoolId AND s.FamilyID = @familyId AND s.IsDeleted = 0
        ORDER BY s.FirstName, s.LastName
      `);
    const invoiceResult = await pool.request()
      .input('schoolId', sql.Int, Number(currentUser.SchoolID))
      .input('familyId', sql.Int, Number(familyId))
      .query(`
        SELECT i.InvoiceID, i.InvoiceNumber, i.StudentID, i.Amount, ISNULL(i.AmountPaid, 0) AS AmountPaid, i.Status, i.DueDate
        FROM dbo.Invoices i
        INNER JOIN dbo.Students s ON s.StudentID = i.StudentID AND s.SchoolID = i.SchoolID
        WHERE i.SchoolID = @schoolId
          AND s.FamilyID = @familyId
          AND i.IsDeleted = 0
          AND ISNULL(i.Status, '') <> 'Cancelled'
        ORDER BY i.DueDate DESC, i.InvoiceID DESC
      `);
    const invoicesByStudent = new Map();
    for (const inv of invoiceResult.recordset) {
      const key = Number(inv.StudentID);
      if (!invoicesByStudent.has(key)) invoicesByStudent.set(key, []);
      invoicesByStudent.get(key).push(inv);
    }
    return studentsResult.recordset.map((student) => ({
      ...student,
      invoices: invoicesByStudent.get(Number(student.StudentID)) || []
    }));
  }

  async createRefund(currentUser, payload) {
    if (!currentUser || !currentUser.SchoolID) return { ok: false, error: 'no-school-context' };
    const { getAvailableRefundBalance } = require('../data/familyBalanceRepository');
    const familyId = Number(payload.familyId);
    const amount = Number(payload.amount);
    if (!Number.isInteger(familyId) || familyId <= 0) return { ok: false, error: 'family-required' };
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'amount-must-be-positive' };
    const avail = await getAvailableRefundBalance({ schoolId: Number(currentUser.SchoolID), familyId });
    if (amount > avail.availableForRefund) {
      return {
        ok: false,
        error: 'refund-exceeds-available-balance',
        availableBalance: Number(avail.availableForRefund),
        requestedAmount: amount
      };
    }
    const pool = await getPool();
    const r = await pool.request()
      .input('schoolId', sql.Int, Number(currentUser.SchoolID))
      .input('tenantId', sql.Int, Number(currentUser.tenantId || 0))
      .input('familyId', sql.Int, familyId)
      .input('studentId', sql.Int, payload.studentId ? Number(payload.studentId) : null)
      .input('amount', sql.Decimal(10, 2), amount)
      .input('reason', sql.NVarChar, String(payload.reason || '').slice(0, 500))
      .input('createdBy', sql.Int, Number(currentUser.UserID || currentUser.id))
      .query(`
        IF NOT EXISTS (SELECT 1 FROM dbo.Families WHERE FamilyID = @familyId AND SchoolID = @schoolId)
          THROW 50000, 'Family must belong to the selected school', 1;
        INSERT INTO dbo.Refunds
          (TenantId, SchoolID, FamilyID, StudentID, Amount, Reason, Status, CreatedBy, CreatedAt)
        OUTPUT INSERTED.RefundID, INSERTED.Amount, INSERTED.Status, INSERTED.CreatedAt
        VALUES
          (@tenantId, @schoolId, @familyId, @studentId, @amount, @reason, 'Pending', @createdBy, SYSUTCDATETIME())
      `);
    return { ok: true, refund: r.recordset[0] };
  }

  async approveRefund(currentUser, refundId) {
    if (!currentUser || !currentUser.SchoolID) return { ok: false, error: 'no-school-context' };
    const pool = await getPool();
    const r = await pool.request()
      .input('id', sql.Int, Number(refundId))
      .input('schoolId', sql.Int, Number(currentUser.SchoolID))
      .input('approvedBy', sql.Int, Number(currentUser.UserID || currentUser.id))
      .query(`
        UPDATE dbo.Refunds
          SET Status = 'Approved', ApprovedBy = @approvedBy, ApprovedDate = SYSUTCDATETIME()
        OUTPUT INSERTED.RefundID, INSERTED.Status
        WHERE RefundID = @id AND SchoolID = @schoolId AND Status = 'Pending'
      `);
    return r.recordset[0] ? { ok: true } : { ok: false, error: 'refund-not-pending' };
  }

  async completeRefund(currentUser, refundId) {
    if (!currentUser || !currentUser.SchoolID) return { ok: false, error: 'no-school-context' };
    const { complete } = new AdmissionsFinanceRepositories.RefundRepository();
    const r = await complete(Number(refundId), Number(currentUser.SchoolID));
    return r;
  }

  async createAdjustment(currentUser, payload) {
    if (!currentUser || !currentUser.SchoolID) return { ok: false, error: 'no-school-context' };
    const familyId = Number(payload.familyId);
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (!Number.isInteger(familyId) || familyId <= 0) return { ok: false, error: 'family-required' };
    if (items.length === 0) return { ok: false, error: 'at-least-one-student-required' };
    const tenantId = Number(currentUser.tenantId || currentUser.TenantId || 0);
    if (!Number.isInteger(tenantId) || tenantId <= 0) return { ok: false, error: 'tenant-required' };
    const pool = await getPool();
    const created = [];
    for (const it of items) {
      const amount = Number(it.amount);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      const studentId = Number(it.studentId);
      const invoiceId = it.invoiceId ? Number(it.invoiceId) : null;
      if (!Number.isInteger(studentId) || studentId <= 0) return { ok: false, error: 'student-required' };
      if (invoiceId !== null && (!Number.isInteger(invoiceId) || invoiceId <= 0)) return { ok: false, error: 'invalid-invoice' };
      const r = await pool.request()
        .input('schoolId', sql.Int, Number(currentUser.SchoolID))
        .input('tenantId', sql.Int, tenantId)
        .input('studentId', sql.Int, studentId)
        .input('familyId', sql.Int, familyId)
        .input('invoiceId', sql.Int, invoiceId)
        .input('type', sql.NVarChar, String(it.adjustmentType || 'Fee Correction'))
        .input('amount', sql.Decimal(10, 2), amount)
        .input('reason', sql.NVarChar, String(it.reason || payload.reason || '').slice(0, 500))
        .input('createdBy', sql.Int, Number(currentUser.UserID || currentUser.id))
        .query(`
          IF NOT EXISTS (SELECT 1 FROM dbo.Students WHERE StudentID = @studentId AND SchoolID = @schoolId AND FamilyID = @familyId)
            THROW 50000, 'Student must belong to the selected family', 1;
          IF @invoiceId IS NOT NULL AND NOT EXISTS (
            SELECT 1
            FROM dbo.Invoices i
            INNER JOIN dbo.Students s ON s.StudentID = i.StudentID AND s.SchoolID = i.SchoolID
            WHERE i.InvoiceID = @invoiceId
              AND i.SchoolID = @schoolId
              AND i.StudentID = @studentId
              AND s.FamilyID = @familyId
              AND i.IsDeleted = 0
          )
            THROW 50001, 'Invoice must belong to the selected student and family', 1;
          INSERT INTO dbo.FinancialAdjustments
            (SchoolID, TenantId, StudentID, FamilyID, InvoiceID, AdjustmentType, Amount, Reason, CreatedBy, CreatedDate)
          OUTPUT INSERTED.AdjustmentID, INSERTED.Amount
          VALUES
            (@schoolId, @tenantId, @studentId, @familyId, @invoiceId, @type, @amount, @reason, @createdBy, GETDATE())
        `);
      if (r.recordset[0]) created.push(r.recordset[0]);
    }
    return { ok: true, created };
  }

  async getFinancePeriodLocks(currentUser) {
    if (!currentUser || !currentUser.SchoolID) return [];
    const repo = new FinancePeriodLockRepository();
    return repo.getBySchool(Number(currentUser.SchoolID));
  }

  async getConsents(currentUser) {
    if (!currentUser || !currentUser.SchoolID) return [];
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, Number(currentUser.SchoolID))
      .input('tenantId', sql.Int, Number(currentUser.tenantId || 0))
      .query(`
        SELECT TOP 200 cr.ConsentRequestID, cr.SchoolID, cr.Title, cr.Description, cr.Audience, cr.SentAt, cr.DueDate, cr.Status, cr.TenantId,
               (SELECT COUNT(*) FROM dbo.ConsentRecords rr WHERE rr.ConsentRequestID = cr.ConsentRequestID) AS ResponseCount
        FROM dbo.ConsentRequests cr
        WHERE cr.SchoolID = @schoolId AND cr.TenantId = @tenantId
        ORDER BY cr.SentAt DESC
      `);
    return result.recordset;
  }
}

class PermissionLeaveYearEndService {
  async getStaffRoles(currentUser) {
    if (!currentUser || !currentUser.SchoolID) return [];
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, Number(currentUser.SchoolID))
      .input('tenantId', sql.Int, Number(currentUser.tenantId || 0))
      .query(`
        SELECT StaffRoleID, SchoolID, RoleName, Description, IsActive, CreatedAt
        FROM dbo.StaffRoles
        WHERE SchoolID = @schoolId AND TenantId = @tenantId
        ORDER BY RoleName
      `);
    return result.recordset;
  }

  async getYearEndClosings(currentUser) {
    if (!currentUser || !currentUser.SchoolID) return [];
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, Number(currentUser.SchoolID))
      .input('tenantId', sql.Int, Number(currentUser.tenantId || 0))
      .query(`
        SELECT YearEndClosingID, SchoolID, TenantId, Year, Status, OpenedAt, ClosedAt
        FROM dbo.YearEndClosing
        WHERE SchoolID = @schoolId AND TenantId = @tenantId
        ORDER BY Year DESC
      `);
    return result.recordset;
  }
}

class RolloverTemplateService {
  async getPendingStudentsForYear(currentUser, year) {
    if (!currentUser || !currentUser.SchoolID) return [];
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, Number(currentUser.SchoolID))
      .input('tenantId', sql.Int, Number(currentUser.tenantId || 0))
      .input('year', sql.Int, Number(year))
      .query(`
        SELECT TOP 200 s.StudentID, s.FirstName, s.LastName, s.SchoolID, s.EnrolledDate,
               c.ClassName AS CurrentClass, nc.ClassName AS NextClass, s.NextClassId AS NextClassID,
               rre.Status, rre.Year
        FROM dbo.ReEnrolment rre
        INNER JOIN dbo.Students s ON s.StudentID = rre.StudentID
        LEFT JOIN dbo.Classes c ON c.ClassID = s.ClassID
        LEFT JOIN dbo.Classes nc ON nc.ClassID = s.NextClassId
        WHERE rre.SchoolID = @schoolId AND rre.TenantId = @tenantId AND rre.Year = @year AND rre.Status = 'Pending'
        ORDER BY s.LastName
      `);
    return result.recordset;
  }
}

class AdminAuditService {
  async getSchoolAudit(currentUser, filters = {}) {
    if (!currentUser || !currentUser.SchoolID) return [];
    const pool = await getPool();
    const req = pool.request()
      .input('schoolId', sql.Int, Number(currentUser.SchoolID))
      .input('tenantId', sql.Int, Number(currentUser.tenantId || 0));
    const where = ['SchoolID = @schoolId', 'TenantId = @tenantId'];
    if (filters.from) { req.input('from', sql.DateTime2, new Date(filters.from)); where.push('CreatedAt >= @from'); }
    if (filters.to) { req.input('to', sql.DateTime2, new Date(filters.to)); where.push('CreatedAt <= @to'); }
    if (filters.entityName) { req.input('entityName', sql.NVarChar, filters.entityName); where.push('EntityName = @entityName'); }
    if (filters.action) { req.input('action', sql.NVarChar, filters.action); where.push('Action = @action'); }
    const result = await req.query(`
      SELECT TOP 200 AuditLogID, SchoolID, TenantId, UserId, ActionType, EntityName, EntityId, Description, IPAddress, UserAgent, WasBlocked, CreatedAt
      FROM dbo.AuditLog
      WHERE ${where.join(' AND ')}
      ORDER BY CreatedAt DESC
    `);
    return result.recordset;
  }
}

class SchoolServiceFacade {
  async getSchoolById(schoolId) {
    if (!schoolId) return null;
    const repo = new SchoolRepository();
    return repo.getSchoolById(schoolId);
  }
  async updateSchool(schoolId, body, currentUser) {
    if (!schoolId) throw new Error('schoolId-required');
    const repo = new SchoolRepository();
    const updated = await repo.updateSchool(schoolId, body);
    await this.upsertImportBankAccount(updated, currentUser);
    return updated;
  }

  async upsertImportBankAccount(school, currentUser) {
    if (!school || !school.SchoolID || !school.BankAccountNumber) return;
    const tenantId = Number(school.TenantId || school.TenantID || currentUser?.tenantId || currentUser?.TenantId || 0);
    if (!Number.isInteger(tenantId) || tenantId <= 0) return;
    const accountName = String(school.BankAccountHolder || school.BankName || school.SchoolName || 'Primary account').slice(0, 200);
    const pool = await getPool();
    await pool.request()
      .input('tenantId', sql.Int, tenantId)
      .input('schoolId', sql.Int, Number(school.SchoolID))
      .input('accountName', sql.NVarChar, accountName)
      .input('accountNumber', sql.NVarChar, String(school.BankAccountNumber).slice(0, 50))
      .input('bankName', sql.NVarChar, school.BankName || null)
      .query(`
        IF EXISTS (
          SELECT 1 FROM dbo.BankAccounts
          WHERE TenantId = @tenantId AND SchoolID = @schoolId AND AccountNumber = @accountNumber
        )
          UPDATE dbo.BankAccounts
          SET AccountName = @accountName, BankName = @bankName, IsActive = 1
          WHERE TenantId = @tenantId AND SchoolID = @schoolId AND AccountNumber = @accountNumber;
        ELSE
          INSERT INTO dbo.BankAccounts (TenantId, SchoolID, AccountName, AccountNumber, BankName, IsActive, CreatedAt)
          VALUES (@tenantId, @schoolId, @accountName, @accountNumber, @bankName, 1, SYSUTCDATETIME());
      `);
  }
}

class UserServiceFacade {
  async getSchoolUsers(currentUser, schoolId) {
    if (!currentUser || !schoolId) return [];
    const repo = new UserRepository();
    return repo.getUsersBySchool(schoolId);
  }
}

module.exports = {
  AdmissionsFinanceService,
  PermissionLeaveYearEndService,
  RolloverTemplateService,
  AdminAuditService,
  SchoolServiceFacade,
  UserServiceFacade
};
