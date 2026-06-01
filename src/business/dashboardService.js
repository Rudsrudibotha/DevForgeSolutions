// Business Layer - Dashboard service

const { getPool, sql } = require('../data/db');
const SchoolRepository = require('../data/schoolRepository');
const UserRepository = require('../data/userRepository');
const AuditLogRepository = require('../data/auditLogRepository');
const FaultReportRepository = require('../data/faultReportRepository');

class DashboardService {
  constructor() {
    this.schoolRepository = new SchoolRepository();
    this.userRepository = new UserRepository();
    this.auditLogRepository = new AuditLogRepository();
    this.faultReportRepository = new FaultReportRepository();
    this.devForgeSnapshotCache = null;
    this.devForgeSnapshotTtlMs = 15000;
  }

  // School admin dashboard
  async getSchoolDashboard(schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`
        SELECT
          (SELECT COUNT(1) FROM Students WHERE SchoolID = @schoolId AND IsActive = 1) AS activeStudents,
          (SELECT COUNT(1) FROM Families WHERE SchoolID = @schoolId) AS familyCount,
          (SELECT COUNT(1) FROM Employees WHERE SchoolID = @schoolId AND IsActive = 1) AS employeeCount,
          (SELECT COUNT(1) FROM Invoices WHERE SchoolID = @schoolId AND Status = 'Pending' AND IsDeleted = 0) AS pendingInvoices,
          (SELECT COUNT(1) FROM Invoices WHERE SchoolID = @schoolId AND Status = 'Overdue' AND IsDeleted = 0) AS overdueInvoices,
          (SELECT ISNULL(SUM(Amount - ISNULL(AmountPaid, 0)), 0) FROM Invoices WHERE SchoolID = @schoolId AND Status IN ('Pending','Overdue','Partial') AND IsDeleted = 0) AS outstandingAmount,
          (SELECT ISNULL(SUM(Amount), 0) FROM Invoices WHERE SchoolID = @schoolId AND Status = 'Paid' AND IsDeleted = 0 AND PaidDate >= DATEADD(DAY, -30, GETDATE())) AS paidLast30Days,
          (SELECT COUNT(1) FROM LeaveRequests lr INNER JOIN Employees e ON lr.EmployeeID = e.EmployeeID WHERE e.SchoolID = @schoolId AND lr.Status = 'Pending') AS pendingLeaveRequests
      `);
    const dashboard = result.recordset[0];
    dashboard.warnings = await this.getSchoolWarnings(schoolId);
    dashboard.overview = await this.getSchoolOverviewInsights(schoolId);
    return dashboard;
  }

  async getSchoolOverviewInsights(schoolId) {
    const pool = await getPool();
    const [capacityResult, attendanceResult] = await Promise.all([
      pool.request()
        .input('schoolId', sql.Int, schoolId)
        .query(`SELECT c.ClassID, c.ClassName, c.Capacity,
                   COUNT(CASE WHEN ISNULL(s.IsActive, 1) = 1 THEN 1 END) AS LearnerCount
                 FROM Classes c
                 LEFT JOIN Students s ON s.SchoolID = c.SchoolID AND s.ClassName = c.ClassName
                 WHERE c.SchoolID = @schoolId
                 GROUP BY c.ClassID, c.ClassName, c.Capacity
                 ORDER BY c.ClassName`),
      pool.request()
        .input('schoolId', sql.Int, schoolId)
        .query(`SELECT a.Status, COUNT(1) AS Count
                FROM Attendance a
                WHERE a.SchoolID = @schoolId
                  AND a.AttendanceDate = CONVERT(date, GETDATE())
                GROUP BY a.Status`)
    ]);

    const capacity = capacityResult.recordset.map((row) => ({
      className: row.ClassName || 'No class',
      capacity: Number(row.Capacity || 0),
      learnerCount: Number(row.LearnerCount || 0)
    }));
    const totalCapacity = capacity.reduce((sum, row) => sum + Number(row.capacity || 0), 0);
    const totalLearners = capacity.reduce((sum, row) => sum + Number(row.learnerCount || 0), 0);

    return {
      capacity,
      totalCapacity,
      totalLearners,
      attendanceToday: attendanceResult.recordset.map((row) => ({
        status: row.Status || 'Not captured',
        count: Number(row.Count || 0)
      }))
    };
  }

  async getSchoolWarnings(schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`
        SELECT
          (SELECT COUNT(1)
             FROM Classes c
             WHERE c.SchoolID = @schoolId
               AND ISNULL(c.Capacity, 0) > 0
               AND (SELECT COUNT(1)
                    FROM Students s
                    WHERE s.SchoolID = c.SchoolID
                      AND s.ClassName = c.ClassName
                      AND ISNULL(s.IsActive, 1) = 1) >= c.Capacity) AS classesAtCapacity,
          (SELECT COUNT(1)
             FROM Students s
             WHERE s.SchoolID = @schoolId
               AND ISNULL(s.IsActive, 1) = 1
               AND NOT EXISTS (
                 SELECT 1 FROM Attendance a
                 WHERE a.SchoolID = s.SchoolID
                   AND a.StudentID = s.StudentID
                   AND a.AttendanceDate = CONVERT(date, GETDATE())
               )) AS attendanceNotCaptured,
          (SELECT COUNT(1)
             FROM Students s
             WHERE s.SchoolID = @schoolId
               AND ISNULL(s.IsActive, 1) = 1
               AND NOT EXISTS (SELECT 1 FROM StudentBillingCategories sbc WHERE sbc.StudentID = s.StudentID)
               AND s.BillingCategoryID IS NULL) AS missingBillingCategories,
          (SELECT COUNT(1)
             FROM Students s
             WHERE s.SchoolID = @schoolId
               AND ISNULL(s.IsActive, 1) = 1
               AND NULLIF(LTRIM(RTRIM(ISNULL(s.ResponsiblePayerName, ''))), '') IS NULL) AS missingResponsiblePayers,
          (SELECT COUNT(1)
             FROM Transactions t
             WHERE t.SchoolID = @schoolId
               AND t.BankStatementID IS NOT NULL
               AND t.AllocationStatus IN ('Unallocated','Suggested Match')) AS unallocatedBankPayments,
          (SELECT COUNT(1)
             FROM (
               SELECT UPPER(LTRIM(RTRIM(ISNULL(Reference, '')))) AS NormalizedReference
               FROM Transactions
               WHERE SchoolID = @schoolId
                 AND TransactionType IN ('Bank','Payment','Credit')
                 AND NULLIF(LTRIM(RTRIM(ISNULL(Reference, ''))), '') IS NOT NULL
               GROUP BY UPPER(LTRIM(RTRIM(ISNULL(Reference, '')))), Amount, CONVERT(date, TransactionDate)
               HAVING COUNT(1) > 1
             ) duplicates) AS duplicateReferences,
          (SELECT COUNT(1)
             FROM Invoices
             WHERE SchoolID = @schoolId
               AND IsDeleted = 0
               AND Status IN ('Overdue','Pending','Partial')
               AND DueDate < CONVERT(date, GETDATE())
               AND Amount > ISNULL(AmountPaid, 0)) AS overdueInvoices,
          (SELECT COUNT(1)
             FROM Payslips p
             INNER JOIN Employees e ON p.EmployeeID = e.EmployeeID
             WHERE e.SchoolID = @schoolId
               AND ISNULL(p.IsFinalized, 0) = 0) AS unfinalizedPayslips
      `);
    const counts = result.recordset[0] || {};
    return [
      this.warning('class-capacity', 'Classes at capacity', counts.classesAtCapacity, 'Review class capacity before placing more learners.'),
      this.warning('attendance-not-captured', 'Attendance not captured', counts.attendanceNotCaptured, 'Capture today\'s attendance for current learners.'),
      this.warning('missing-billing', 'Missing billing categories', counts.missingBillingCategories, 'Assign billing categories before monthly invoice generation.'),
      this.warning('missing-payer', 'Missing responsible payer', counts.missingResponsiblePayers, 'Capture the parent or guardian responsible for payment.'),
      this.warning('unallocated-bank', 'Unallocated bank payments', counts.unallocatedBankPayments, 'Review bank reconciliation and allocate payments.'),
      this.warning('duplicate-references', 'Duplicate payment references', counts.duplicateReferences, 'Check repeated references before month-end reconciliation.'),
      this.warning('overdue-invoices', 'Overdue invoices', counts.overdueInvoices, 'Follow up outstanding balances.'),
      this.warning('draft-payslips', 'Unfinalized payslips', counts.unfinalizedPayslips, 'Finalize payroll after review.')
    ].filter((item) => item.count > 0);
  }

  warning(code, title, count, detail) {
    return {
      code,
      title,
      count: Number(count || 0),
      detail
    };
  }

  // Admin (platform) dashboard
  async getAdminDashboard() {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT
          (SELECT COUNT(1) FROM Schools WHERE SubscriptionStatus = 'Active') AS activeSchools,
          (SELECT COUNT(1) FROM Schools WHERE SubscriptionStatus = 'Suspended') AS suspendedSchools,
          (SELECT COUNT(1) FROM Users) AS totalUsers,
          (SELECT COUNT(1) FROM Students WHERE IsActive = 1) AS totalStudents,
          (SELECT COUNT(1) FROM Invoices WHERE Status IN ('Pending','Overdue') AND IsDeleted = 0) AS totalOutstandingInvoices,
          (SELECT ISNULL(SUM(Amount - ISNULL(AmountPaid, 0)), 0) FROM Invoices WHERE Status IN ('Pending','Overdue','Partial') AND IsDeleted = 0) AS totalOutstandingAmount
      `);
    return result.recordset[0];
  }

  async getDevForgeSnapshot(options = {}) {
    const now = Date.now();
    const force = options.force === true;
    const auditLimit = this.limit(options.auditLimit, 100, 200);
    const faultLimit = this.limit(options.faultLimit, 100, 200);
    const cacheKey = `${auditLimit}:${faultLimit}`;

    if (!force
      && this.devForgeSnapshotCache
      && this.devForgeSnapshotCache.cacheKey === cacheKey
      && this.devForgeSnapshotCache.expiresAt > now) {
      return {
        ...this.devForgeSnapshotCache.payload,
        meta: {
          ...this.devForgeSnapshotCache.payload.meta,
          cached: true,
          cacheAgeMs: now - this.devForgeSnapshotCache.createdAt
        }
      };
    }

    const startedAt = Date.now();
    const [dashboard, schools, users, auditLogs, faultReports] = await Promise.all([
      this.getAdminDashboard(),
      this.schoolRepository.getAllSchools(),
      this.userRepository.getDevForgeUsers(),
      auditLimit > 0 ? this.auditLogRepository.getAll(1, auditLimit) : Promise.resolve([]),
      this.faultReportRepository.getAll({ limit: faultLimit })
    ]);

    const payload = {
      dashboard,
      schools,
      users,
      auditLogs,
      faultReports,
      meta: {
        cached: false,
        generatedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        auditLimit,
        faultLimit
      }
    };

    this.devForgeSnapshotCache = {
      payload,
      cacheKey,
      createdAt: now,
      expiresAt: Date.now() + this.devForgeSnapshotTtlMs
    };

    return payload;
  }

  invalidateDevForgeSnapshot() {
    this.devForgeSnapshotCache = null;
  }

  limit(value, fallback, max) {
    if (Number(value) === 0) {
      return 0;
    }

    const parsed = Number(value || fallback);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return fallback;
    }
    return Math.min(parsed, max);
  }
}

module.exports = DashboardService;
