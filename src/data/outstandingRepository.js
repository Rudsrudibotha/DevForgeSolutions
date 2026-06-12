// Outstanding fees pivot.
//
// Per-family + per-student rows. Columns:
//   Name, Surname, Class, Parent, ParentPhone, ParentEmail
//   then one column per (year, month) plus a per-year total plus a
//   grand total.
//
// "Outstanding" = invoice amount - sum of completed transactions
// for the same (school, student) pair, filtered to the given year+month.
//
// Negative outstanding (overpayment for that month) is reported as 0
// for the pivot (we don't want to confuse the school); the family's
// running balance (see familyBalanceRepository.js) is the source of
// truth for overpayments.

'use strict';

const { getPool, sql } = require('./db');

function monthLabels() {
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
}

async function buildOutstandingPivot({ schoolId }) {
  const pool = await getPool();
  // Build the pivot DIRECTLY from the outstanding invoices, using the
  // exact same definition as the dashboard KPI:
  //   outstanding = SUM(Amount - AmountPaid) where Status is Pending /
  //   Overdue / Partial. Student/family/class names are LEFT-joined, so
  //   an invoice still appears even if its student was removed or never
  //   linked (it falls under an "Unassigned" row) — nothing is silently
  //   dropped, and the page total always matches the dashboard.
  const r = await pool.request()
    .input('schoolId', sql.Int, schoolId)
    .query(`
      SELECT
        i.StudentID, i.FamilyID,
        YEAR(i.IssueDate) AS Y, MONTH(i.IssueDate) AS M,
        SUM(i.Amount - ISNULL(i.AmountPaid, 0)) AS Outstanding,
        MAX(s.FirstName) AS FirstName, MAX(s.LastName) AS LastName,
        MAX(c.ClassName) AS ClassName, MAX(c.Grade) AS Grade,
        MAX(f.FamilyName) AS FamilyName, MAX(f.PrimaryParentName) AS PrimaryParentName,
        MAX(f.PrimaryParentEmail) AS PrimaryParentEmail, MAX(f.PrimaryParentPhone) AS PrimaryParentPhone
      FROM dbo.Invoices i
      LEFT JOIN dbo.Students s ON s.StudentID = i.StudentID
      LEFT JOIN dbo.Classes c ON c.ClassID = s.ClassID
      LEFT JOIN dbo.Families f ON f.FamilyID = i.FamilyID
      WHERE i.SchoolID = @schoolId AND i.IsDeleted = 0
        AND ISNULL(i.Status, '') IN ('Pending', 'Overdue', 'Partial')
      GROUP BY i.StudentID, i.FamilyID, YEAR(i.IssueDate), MONTH(i.IssueDate)
      HAVING SUM(i.Amount - ISNULL(i.AmountPaid, 0)) > 0.005
      ORDER BY i.FamilyID, i.StudentID, YEAR(i.IssueDate), MONTH(i.IssueDate)
    `);
  const raw = r.recordset;

  const sortedYears = [...new Set(raw.map((row) => row.Y))].sort((a, b) => a - b);
  const emptyCells = () => {
    const cells = {};
    const yearTotals = {};
    for (const y of sortedYears) { cells[y] = Array(12).fill(null); yearTotals[y] = 0; }
    return { cells, yearTotals };
  };

  // family -> student -> cells, built from the outstanding rows only.
  const families = new Map();
  for (const row of raw) {
    const famKey = row.FamilyID == null ? 'unassigned' : `f${row.FamilyID}`;
    if (!families.has(famKey)) {
      families.set(famKey, {
        familyId: row.FamilyID || null,
        familyName: row.FamilyName || 'Unassigned',
        primaryParentName: row.PrimaryParentName || '',
        primaryParentEmail: row.PrimaryParentEmail || '',
        primaryParentPhone: row.PrimaryParentPhone || '',
        students: new Map()
      });
    }
    const fam = families.get(famKey);
    const stuKey = row.StudentID == null ? 'unassigned' : `s${row.StudentID}`;
    if (!fam.students.has(stuKey)) {
      const { cells, yearTotals } = emptyCells();
      fam.students.set(stuKey, {
        studentId: row.StudentID || null,
        firstName: row.FirstName || (row.StudentID ? ('Student #' + row.StudentID) : 'Unassigned'),
        lastName: row.LastName || '',
        className: row.ClassName || 'Unassigned',
        grade: row.Grade || null,
        cells,
        yearTotals,
        grandTotal: 0
      });
    }
    const stu = fam.students.get(stuKey);
    const amt = Number(row.Outstanding) || 0;
    stu.cells[row.Y][row.M - 1] = (stu.cells[row.Y][row.M - 1] || 0) + amt;
    stu.yearTotals[row.Y] += amt;
    stu.grandTotal += amt;
  }

  const familyList = [...families.values()]
    .map((f) => ({ ...f, students: [...f.students.values()].sort((a, b) => (a.firstName + a.lastName).localeCompare(b.firstName + b.lastName)) }))
    .sort((a, b) => String(a.familyName).localeCompare(String(b.familyName)));

  const grandYearTotals = {};
  for (const y of sortedYears) grandYearTotals[y] = 0;
  let grandTotal = 0;
  for (const f of familyList) {
    for (const s of f.students) {
      for (const y of sortedYears) grandYearTotals[y] += s.yearTotals[y] || 0;
      grandTotal += s.grandTotal;
    }
  }

  return {
    years: sortedYears,
    months: monthLabels(),
    families: familyList,
    grandYearTotals,
    grandTotal,
    currency: null
  };
}

async function buildOutstandingCsv({ schoolId, tenantId }) {
  const pivot = await buildOutstandingPivot({ schoolId, tenantId });
  const lines = [];
  const header = ['Family', 'Parent', 'Parent phone', 'Parent email', 'Student', 'Class'];
  for (const y of pivot.years) for (const m of pivot.months) header.push(`${y}-${m}`);
  for (const y of pivot.years) header.push(`${y}-Total`);
  header.push('Grand Total');
  lines.push(header.join(','));
  for (const f of pivot.families) {
    for (const s of f.students) {
      const row = [
        csv(f.familyName),
        csv(f.primaryParentName),
        csv(f.primaryParentPhone),
        csv(f.primaryParentEmail),
        csv(`${s.firstName} ${s.lastName}`),
        csv(s.className)
      ];
      for (const y of pivot.years) for (let i = 0; i < 12; i++) {
        row.push(s.cells[y][i] != null ? s.cells[y][i].toFixed(2) : '');
      }
      for (const y of pivot.years) row.push(s.yearTotals[y] ? s.yearTotals[y].toFixed(2) : '');
      row.push(s.grandTotal ? s.grandTotal.toFixed(2) : '');
      lines.push(row.join(','));
    }
  }
  return lines.join('\n');
}

function csv(v) {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

module.exports = { buildOutstandingPivot, buildOutstandingCsv };
