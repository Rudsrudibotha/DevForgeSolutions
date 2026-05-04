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
    return result.recordset[0];
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
