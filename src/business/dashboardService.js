// Business Layer - Dashboard service

const { getPool, sql } = require('../data/db');

class DashboardService {
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
    return dashboard;
  }

  async getSchoolWarnings(schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`
        SELECT
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
}

module.exports = DashboardService;
