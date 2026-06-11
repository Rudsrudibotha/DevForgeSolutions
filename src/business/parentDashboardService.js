'use strict';

// Read-side service for the parent portal. Enforces the rule:
// "a parent's view of any child, school, invoice, or attendance record
//  is the union of records linked to them via ParentLinks".
// All queries are scoped by userId; cross-tenant reads come naturally from
// the join, never from a schoolId filter on the request.

const { getPool, sql } = require('../data/db');
const MessagingRepository = require('../data/messagingRepository');

class ParentDashboardService {
  constructor(dependencies = {}) {
    this.messagingRepository = dependencies.messagingRepository || new MessagingRepository();
  }

  async getChildren(userId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT
          s.StudentID, s.FirstName, s.LastName, s.DateOfBirth, s.PhotoUrl,
          s.ClassID, c.ClassName, c.Grade,
          f.FamilyID, f.FamilyName,
          sch.SchoolID, sch.SchoolName, sch.LogoUrl,
          (SELECT ISNULL(SUM(i.Amount - i.AmountPaid), 0)
             FROM Invoices i
             WHERE i.StudentID = s.StudentID
               AND i.Status NOT IN ('Paid', 'Cancelled')) AS OutstandingAmount,
          (SELECT TOP 1 i.DueDate
             FROM Invoices i
             WHERE i.StudentID = s.StudentID
               AND i.Status NOT IN ('Paid', 'Cancelled')
             ORDER BY i.DueDate ASC) AS NextDueDate,
          (SELECT COUNT(*)
             FROM Attendance a
             WHERE a.StudentID = s.StudentID
               AND a.AttendanceDate >= DATEADD(DAY, -7, CAST(GETDATE() AS DATE))
               AND a.Status = 'Present') AS PresentLastWeek
        FROM Students s
        INNER JOIN Families f       ON s.FamilyID = f.FamilyID
        INNER JOIN ParentLinks pl   ON pl.FamilyID = f.FamilyID
        INNER JOIN Schools sch     ON sch.SchoolID = pl.SchoolID
        LEFT  JOIN Classes c       ON c.ClassID = s.ClassID
        WHERE pl.UserID = @userId
          AND s.IsActive = 1
          AND sch.SubscriptionStatus = 'Active'
        ORDER BY s.LastName, s.FirstName
      `);
    return result.recordset;
  }

  async getInvoices(userId, { studentId, status } = {}) {
    const pool = await getPool();
    const request = pool.request().input('userId', sql.Int, userId);
    const where = ['pl.UserID = @userId'];
    if (studentId) { request.input('studentId', sql.Int, studentId); where.push('i.StudentID = @studentId'); }
    if (status)    { request.input('status',    sql.NVarChar, status); where.push('i.Status = @status'); }
    const result = await request.query(`
      SELECT
        i.InvoiceID, i.InvoiceNumber, i.Amount, i.AmountPaid, i.DueDate, i.Status, i.CreatedAt,
        i.Description, i.LineItems,
        s.StudentID, s.FirstName + ' ' + s.LastName AS StudentName,
        sch.SchoolID, sch.SchoolName
      FROM Invoices i
      INNER JOIN Students s    ON s.StudentID = i.StudentID
      INNER JOIN Families f    ON f.FamilyID = s.FamilyID
      INNER JOIN ParentLinks pl ON pl.FamilyID = f.FamilyID
      INNER JOIN Schools sch   ON sch.SchoolID = pl.SchoolID
      WHERE ${where.join(' AND ')}
      ORDER BY i.DueDate ASC, i.CreatedAt DESC
    `);
    return result.recordset;
  }

  async getInvoicesSummary(userId) {
    const invoices = await this.getInvoices(userId);
    const totalOwed = invoices
      .filter(i => !['Paid', 'Cancelled'].includes(i.Status))
      .reduce((sum, i) => sum + Number(i.Amount || 0) - Number(i.AmountPaid || 0), 0);
    const overdue = invoices.filter(i => {
      if (['Paid', 'Cancelled'].includes(i.Status)) return false;
      return i.DueDate && new Date(i.DueDate) < new Date();
    });
    return {
      totalOwed: Number(totalOwed.toFixed(2)),
      outstandingCount: invoices.filter(i => !['Paid', 'Cancelled'].includes(i.Status)).length,
      overdueCount: overdue.length,
      overdueAmount: Number(overdue.reduce((s, i) => s + (Number(i.Amount || 0) - Number(i.AmountPaid || 0)), 0).toFixed(2))
    };
  }

  async getAttendance(userId, { studentId, days = 30 } = {}) {
    const pool = await getPool();
    const request = pool.request()
      .input('userId', sql.Int, userId)
      .input('days', sql.Int, days);
    const where = ['pl.UserID = @userId', 'a.AttendanceDate >= DATEADD(DAY, -@days, CAST(GETDATE() AS DATE))'];
    if (studentId) { request.input('studentId', sql.Int, studentId); where.push('a.StudentID = @studentId'); }
    const result = await request.query(`
      SELECT
        a.AttendanceID, a.AttendanceDate, a.Status, a.Notes,
        s.StudentID, s.FirstName + ' ' + s.LastName AS StudentName,
        sch.SchoolID, sch.SchoolName
      FROM Attendance a
      INNER JOIN Students s     ON s.StudentID = a.StudentID
      INNER JOIN Families f     ON f.FamilyID = s.FamilyID
      INNER JOIN ParentLinks pl ON pl.FamilyID = f.FamilyID
      INNER JOIN Schools sch    ON sch.SchoolID = pl.SchoolID
      WHERE ${where.join(' AND ')}
      ORDER BY a.AttendanceDate DESC, s.LastName
    `);
    return result.recordset;
  }

  async getRecentMessages(userId, { limit = 10 } = {}) {
    const conversations = await this.messagingRepository.listConversationsForParent(userId);
    return conversations.slice(0, Math.min(Math.max(Number(limit) || 10, 1), 50)).map((conversation) => ({
      MessageID: conversation.ConversationID,
      ConversationID: conversation.ConversationID,
      Subject: conversation.Subject,
      Body: conversation.LastMessageBody,
      SentAt: conversation.LastMessageDate || conversation.UpdatedDate || conversation.CreatedDate,
      IsRead: true,
      SchoolID: conversation.SchoolID,
      SchoolName: conversation.SchoolName,
      StudentName: conversation.FamilyName || null
    }));
  }

  async getConsents(userId) {
    const { ConsentRepository } = require('../data/admissionsFinanceRepositories');
    return new ConsentRepository().getByParent(userId);
  }

  async getReEnrolment(userId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT
          r.ReEnrolmentID,
          r.AcademicYear,
          r.Action AS Status,
          r.PreviousClassName AS CurrentClass,
          r.NewClassName AS NextClass,
          r.ProcessedDate,
          s.StudentID,
          s.FirstName + ' ' + s.LastName AS StudentName,
          sch.SchoolID,
          sch.SchoolName
        FROM ReEnrolment r
        INNER JOIN Students s ON s.StudentID = r.StudentID AND s.SchoolID = r.SchoolID
        INNER JOIN ParentLinks pl ON pl.FamilyID = s.FamilyID AND pl.SchoolID = s.SchoolID
        INNER JOIN Schools sch ON sch.SchoolID = r.SchoolID
        WHERE pl.UserID = @userId
          AND r.Action = 'Pending'
          AND sch.SubscriptionStatus = 'Active'
        ORDER BY r.AcademicYear DESC, s.LastName, s.FirstName
      `);
    return result.recordset;
  }
}

module.exports = ParentDashboardService;
