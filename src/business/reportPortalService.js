'use strict';

// Reports portal service. Scoped to school via req.schoolDb.
// Reports run server-side; export as CSV or JSON.

const { sql } = require('../data/db');

const REPORT_TYPES = {
  'aging':           { label: 'Aging report', description: 'Outstanding invoices grouped by age (0-30, 31-60, 61-90, 90+ days)' },
  'collections':     { label: 'Collections report', description: 'Payments received in the date range' },
  'attendance-rate': { label: 'Attendance rate', description: 'Attendance % per class for the date range' },
  'class-roster':    { label: 'Class roster', description: 'All students in a class with family contact' },
  'family-balances': { label: 'Family balances', description: 'Outstanding balance per family' }
};

class ReportPortalService {
  constructor() {}

  listReports() {
    return Object.entries(REPORT_TYPES).map(([id, def]) => ({ id, ...def }));
  }

  // Returns { columns: [...], rows: [...], summary: {} } for a report
  async run({ schoolDb, type, from, to, classId, familyId }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!REPORT_TYPES[type]) throw new Error('Unknown report type: ' + type);
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('requires scoped schoolId');

    switch (type) {
      case 'aging':           return this.runAging({ schoolDb, sid });
      case 'collections':     return this.runCollections({ schoolDb, sid, from, to });
      case 'attendance-rate': return this.runAttendanceRate({ schoolDb, sid, from, to, classId });
      case 'class-roster':    return this.runClassRoster({ schoolDb, sid, classId });
      case 'family-balances': return this.runFamilyBalances({ schoolDb, sid });
      default: throw new Error('Unsupported report type');
    }
  }

  async runAging({ schoolDb, sid }) {
    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    const text = `
      SELECT
        i.InvoiceID, i.InvoiceNumber, i.Amount, i.AmountPaid,
        (i.Amount - i.AmountPaid) AS Outstanding,
        i.DueDate, i.Status,
        s.FirstName + ' ' + s.LastName AS StudentName,
        f.FamilyID, f.FamilyName, f.PrimaryParentName, f.PrimaryParentPhone, f.PrimaryParentEmail,
        CASE
          WHEN i.Status IN ('Paid', 'Cancelled') THEN 'Paid'
          WHEN i.DueDate >= CAST(GETDATE() AS DATE) THEN 'Current'
          WHEN DATEDIFF(DAY, i.DueDate, CAST(GETDATE() AS DATE)) BETWEEN 1 AND 30 THEN '1-30 days'
          WHEN DATEDIFF(DAY, i.DueDate, CAST(GETDATE() AS DATE)) BETWEEN 31 AND 60 THEN '31-60 days'
          WHEN DATEDIFF(DAY, i.DueDate, CAST(GETDATE() AS DATE)) BETWEEN 61 AND 90 THEN '61-90 days'
          ELSE '90+ days'
        END AS AgingBucket
      FROM Invoices i
      LEFT JOIN Students s ON s.StudentID = i.StudentID
      LEFT JOIN Families f ON f.FamilyID = s.FamilyID
      WHERE i.SchoolID = @schoolId
        AND i.IsDeleted = 0
        AND i.Status NOT IN ('Cancelled')
        AND (i.Amount - i.AmountPaid) > 0
      ORDER BY f.FamilyName, i.DueDate
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    const buckets = { Current: 0, '1-30 days': 0, '31-60 days': 0, '61-90 days': 0, '90+ days': 0 };
    for (const r of result.recordset) {
      buckets[r.AgingBucket] = (buckets[r.AgingBucket] || 0) + Number(r.Outstanding);
    }
    return {
      columns: ['Invoice', 'Student', 'Family', 'Status', 'Due date', 'Amount', 'Paid', 'Outstanding', 'Bucket'],
      rows: result.recordset.map(r => ({
        Invoice: r.InvoiceNumber, Student: r.StudentName, Family: r.FamilyName,
        Status: r.Status, 'Due date': r.DueDate ? new Date(r.DueDate).toISOString().slice(0,10) : '',
        Amount: Number(r.Amount).toFixed(2), Paid: Number(r.AmountPaid || 0).toFixed(2),
        Outstanding: Number(r.Outstanding).toFixed(2), Bucket: r.AgingBucket
      })),
      summary: { totalOutstanding: Object.values(buckets).reduce((s, n) => s + n, 0).toFixed(2), buckets }
    };
  }

  async runCollections({ schoolDb, sid, from, to }) {
    const safeFrom = from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0,10);
    const safeTo = to || new Date().toISOString().slice(0,10);
    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('from', sql.Date, safeFrom);
    request.input('to', sql.Date, safeTo);
    const text = `
      SELECT
        t.TransactionID, t.TransactionDate, t.ReceiptNumber, t.PaymentMethod,
        t.Amount, t.AllocationStatus, t.InvoiceID,
        i.InvoiceNumber, s.FirstName + ' ' + s.LastName AS StudentName, f.FamilyName
      FROM Transactions t
      LEFT JOIN Invoices i ON i.InvoiceID = t.InvoiceID
      LEFT JOIN Students s ON s.StudentID = i.StudentID
      LEFT JOIN Families f ON f.FamilyID = s.FamilyID
      WHERE t.SchoolID = @schoolId
        AND t.TransactionDate BETWEEN @from AND @to
        AND t.TransactionType IN ('Credit', 'Payment')
        AND t.AllocationStatus = 'Allocated'
      ORDER BY t.TransactionDate DESC
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    let total = 0;
    for (const r of result.recordset) total += Number(r.Amount);
    return {
      columns: ['Date', 'Receipt', 'Method', 'Invoice', 'Student', 'Family', 'Amount'],
      rows: result.recordset.map(r => ({
        Date: r.TransactionDate ? new Date(r.TransactionDate).toISOString().slice(0,10) : '',
        Receipt: r.ReceiptNumber, Method: r.PaymentMethod,
        Invoice: r.InvoiceNumber || '', Student: r.StudentName || '', Family: r.FamilyName || '',
        Amount: Number(r.Amount).toFixed(2)
      })),
      summary: { totalCollected: total.toFixed(2), count: result.recordset.length, from: safeFrom, to: safeTo }
    };
  }

  async runAttendanceRate({ schoolDb, sid, from, to, classId }) {
    const safeFrom = from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0,10);
    const safeTo = to || new Date().toISOString().slice(0,10);
    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('from', sql.Date, safeFrom);
    request.input('to', sql.Date, safeTo);
    const where = ['a.SchoolID = @schoolId', 'a.AttendanceDate BETWEEN @from AND @to'];
    if (classId && Number.isInteger(Number(classId))) {
      request.input('classId', sql.Int, Number(classId));
      where.push('a.ClassID = @classId');
    }
    const text = `
      SELECT
        c.ClassID, c.ClassName, c.Grade,
        COUNT(*) AS TotalRecords,
        SUM(CASE WHEN a.Status = 'Present' THEN 1 ELSE 0 END) AS PresentCount,
        SUM(CASE WHEN a.Status = 'Late' THEN 1 ELSE 0 END) AS LateCount,
        SUM(CASE WHEN a.Status = 'Absent' THEN 1 ELSE 0 END) AS AbsentCount,
        SUM(CASE WHEN a.Status = 'Excused' THEN 1 ELSE 0 END) AS ExcusedCount,
        CAST(SUM(CASE WHEN a.Status IN ('Present','Late') THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0) AS DECIMAL(5,2)) AS AttendanceRate
      FROM Attendance a
      INNER JOIN Classes c ON c.ClassID = a.ClassID
      WHERE ${where.join(' AND ')}
      GROUP BY c.ClassID, c.ClassName, c.Grade
      ORDER BY c.Grade, c.ClassName
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return {
      columns: ['Class', 'Grade', 'Records', 'Present', 'Late', 'Absent', 'Excused', 'Rate %'],
      rows: result.recordset.map(r => ({
        Class: r.ClassName, Grade: r.Grade || '',
        Records: r.TotalRecords, Present: r.PresentCount, Late: r.LateCount,
        Absent: r.AbsentCount, Excused: r.ExcusedCount,
        'Rate %': r.AttendanceRate != null ? r.AttendanceRate : '0.00'
      })),
      summary: { from: safeFrom, to: safeTo, classCount: result.recordset.length }
    };
  }

  async runClassRoster({ schoolDb, sid, classId }) {
    if (!classId || !Number.isInteger(Number(classId))) throw new Error('classId required for class-roster report');
    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('classId', sql.Int, Number(classId));
    const text = `
      SELECT
        s.StudentID, s.FirstName, s.LastName, s.DateOfBirth, s.EnrolledDate, s.IsActive,
        c.ClassName, c.Grade,
        f.FamilyID, f.FamilyName, f.PrimaryParentName, f.PrimaryParentPhone, f.PrimaryParentEmail,
        f.HomeAddress,
        (SELECT ISNULL(SUM(i.Amount - i.AmountPaid), 0)
           FROM Invoices i WHERE i.StudentID = s.StudentID AND i.Status NOT IN ('Paid', 'Cancelled')) AS Outstanding
      FROM Students s
      INNER JOIN Families f ON f.FamilyID = s.FamilyID
      LEFT  JOIN Classes c  ON c.ClassID = s.ClassID
      WHERE s.SchoolID = @schoolId AND s.ClassID = @classId AND s.IsDeleted = 0
      ORDER BY s.LastName, s.FirstName
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return {
      columns: ['Student', 'DOB', 'Enrolled', 'Family', 'Primary contact', 'Phone', 'Email', 'Outstanding'],
      rows: result.recordset.map(r => ({
        Student: r.FirstName + ' ' + r.LastName,
        DOB: r.DateOfBirth ? new Date(r.DateOfBirth).toISOString().slice(0,10) : '',
        Enrolled: r.EnrolledDate ? new Date(r.EnrolledDate).toISOString().slice(0,10) : '',
        Family: r.FamilyName, 'Primary contact': r.PrimaryParentName || '',
        Phone: r.PrimaryParentPhone || '', Email: r.PrimaryParentEmail || '',
        Outstanding: Number(r.Outstanding).toFixed(2)
      })),
      summary: { classId, className: result.recordset[0] ? result.recordset[0].ClassName : '', studentCount: result.recordset.length }
    };
  }

  async runFamilyBalances({ schoolDb, sid }) {
    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    const text = `
      SELECT
        f.FamilyID, f.FamilyName, f.PrimaryParentName, f.PrimaryParentPhone, f.PrimaryParentEmail,
        f.HomeAddress,
        (SELECT ISNULL(SUM(i.Amount - i.AmountPaid), 0)
           FROM Invoices i
           INNER JOIN Students s ON s.StudentID = i.StudentID
           WHERE s.FamilyID = f.FamilyID
             AND i.Status NOT IN ('Paid', 'Cancelled')
             AND i.IsDeleted = 0) AS Outstanding,
        (SELECT ISNULL(SUM(i.AmountPaid), 0)
           FROM Invoices i
           INNER JOIN Students s ON s.StudentID = i.StudentID
           WHERE s.FamilyID = f.FamilyID
             AND i.IsDeleted = 0) AS TotalPaid,
        (SELECT COUNT(*) FROM Students s WHERE s.FamilyID = f.FamilyID AND s.IsDeleted = 0) AS StudentCount
      FROM Families f
      WHERE f.SchoolID = @schoolId AND f.IsDeleted = 0
      ORDER BY f.FamilyName
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return {
      columns: ['Family', 'Primary contact', 'Phone', 'Email', 'Students', 'Outstanding', 'Total paid'],
      rows: result.recordset.map(r => ({
        Family: r.FamilyName, 'Primary contact': r.PrimaryParentName || '',
        Phone: r.PrimaryParentPhone || '', Email: r.PrimaryParentEmail || '',
        Students: r.StudentCount,
        Outstanding: Number(r.Outstanding).toFixed(2),
        'Total paid': Number(r.TotalPaid).toFixed(2)
      })),
      summary: { familyCount: result.recordset.length }
    };
  }

  // Render a report as CSV text
  toCSV(report) {
    const escape = (v) => {
      const s = v == null ? '' : String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    const header = report.columns.map(escape).join(',');
    const rows = report.rows.map(r => report.columns.map(c => escape(r[c])).join(','));
    return [header].concat(rows).join('\n');
  }
}

module.exports = ReportPortalService;
