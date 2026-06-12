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

async function buildOutstandingPivot({ schoolId, tenantId }) {
  const pool = await getPool();
  // Pull the raw (school, family, student, year, month, outstanding) rows.
  const r = await pool.request()
    .input('schoolId', sql.Int, schoolId)
    .input('tenantId', sql.Int, tenantId || 0)
    .query(`
      -- Outstanding per invoice = Amount - AmountPaid (the same canonical
      -- field the DevForge KPIs and school detail use). Grouped by the
      -- invoice's issue month. Paid / cancelled invoices are excluded.
      SELECT i.StudentID, i.FamilyID,
             YEAR(i.IssueDate) AS Y, MONTH(i.IssueDate) AS M,
             SUM(i.Amount - ISNULL(i.AmountPaid, 0)) AS Outstanding
      FROM dbo.Invoices i
      WHERE i.SchoolID = @schoolId AND i.IsDeleted = 0
        AND ISNULL(i.Status, '') NOT IN ('Paid', 'Cancelled')
        AND i.StudentID IS NOT NULL
      GROUP BY i.StudentID, i.FamilyID, YEAR(i.IssueDate), MONTH(i.IssueDate)
      HAVING SUM(i.Amount - ISNULL(i.AmountPaid, 0)) > 0.005
      ORDER BY i.FamilyID, i.StudentID, YEAR(i.IssueDate), MONTH(i.IssueDate)
    `);
  const raw = r.recordset;

  // Now load families + students + class info for the header rows.
  const meta = await pool.request()
    .input('schoolId', sql.Int, schoolId)
    .query(`
      SELECT s.StudentID, s.FirstName, s.LastName, s.FamilyID, s.IsActive,
             c.ClassName, c.Grade,
             f.FamilyName, f.PrimaryParentName, f.PrimaryParentEmail, f.PrimaryParentPhone
      FROM dbo.Students s
      INNER JOIN dbo.Families f ON f.FamilyID = s.FamilyID
      LEFT JOIN dbo.Classes c ON c.ClassID = s.ClassID
      WHERE s.SchoolID = @schoolId AND s.IsDeleted = 0
      ORDER BY f.FamilyName, s.FirstName, s.LastName
    `);
  const studentMeta = new Map();
  for (const row of meta.recordset) studentMeta.set(row.StudentID, row);

  // Determine the set of years present
  const years = new Set();
  for (const row of raw) years.add(row.Y);
  const sortedYears = [...years].sort((a, b) => a - b);

  // Group outstanding by (studentId, year, month)
  const outMap = new Map();
  for (const row of raw) {
    const key = `${row.StudentID}|${row.Y}|${row.M}`;
    outMap.set(key, Number(row.Outstanding));
  }

  // Build families, students under each, plus cells
  const families = new Map();
  for (const meta of studentMeta.values()) {
    if (!families.has(meta.FamilyID)) {
      families.set(meta.FamilyID, {
        familyId: meta.FamilyID,
        familyName: meta.FamilyName,
        primaryParentName: meta.PrimaryParentName,
        primaryParentEmail: meta.PrimaryParentEmail,
        primaryParentPhone: meta.PrimaryParentPhone,
        students: []
      });
    }
    const cellMap = {};
    let familyYearTotals = {};
    let studentYearTotals = {};
    const cells = {}; // cells[year][month] = amount
    for (const y of sortedYears) {
      cells[y] = Array(12).fill(null);
      studentYearTotals[y] = 0;
    }
    for (const y of sortedYears) {
      for (let m = 1; m <= 12; m++) {
        const v = outMap.get(`${meta.StudentID}|${y}|${m}`);
        if (v) {
          cells[y][m - 1] = v;
          studentYearTotals[y] += v;
        }
      }
    }
    const studentGrandTotal = Object.values(studentYearTotals).reduce((s, v) => s + v, 0);
    families.get(meta.FamilyID).students.push({
      studentId: meta.StudentID,
      firstName: meta.FirstName,
      lastName: meta.LastName,
      className: meta.ClassName || 'Unassigned',
      grade: meta.Grade || null,
      isActive: meta.IsActive,
      cells,
      yearTotals: studentYearTotals,
      grandTotal: studentGrandTotal
    });
  }

  // Sort students inside each family
  for (const f of families.values()) {
    f.students.sort((a, b) => (a.firstName + a.lastName).localeCompare(b.firstName + b.lastName));
  }
  const familyList = [...families.values()].sort((a, b) => a.familyName.localeCompare(b.familyName));

  // Compute grand totals across the pivot for header
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
