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
      ;WITH inv AS (
        SELECT i.StudentID, i.FamilyID,
               YEAR(i.InvoiceDate) AS Y, MONTH(i.InvoiceDate) AS M,
               SUM(i.Amount) AS Invoiced
        FROM dbo.Invoices i
        WHERE i.SchoolID = @schoolId AND i.IsDeleted = 0
        GROUP BY i.StudentID, i.FamilyID, YEAR(i.InvoiceDate), MONTH(i.InvoiceDate)
      ),
      pay AS (
        SELECT t.StudentID, YEAR(t.PaymentDate) AS Y, MONTH(t.PaymentDate) AS M,
               SUM(t.Amount) AS Paid
        FROM dbo.Transactions t
        WHERE t.SchoolID = @schoolId AND t.IsDeleted = 0
        GROUP BY t.StudentID, YEAR(t.PaymentDate), MONTH(t.PaymentDate)
      )
      SELECT inv.StudentID, inv.FamilyID, inv.Y, inv.M,
             ISNULL(inv.Invoiced, 0) - ISNULL(pay.Paid, 0) AS Outstanding
      FROM inv
      LEFT JOIN pay ON pay.StudentID = inv.StudentID AND pay.Y = inv.Y AND pay.M = inv.M
      WHERE ISNULL(inv.Invoiced, 0) - ISNULL(pay.Paid, 0) > 0.005
      ORDER BY inv.FamilyID, inv.StudentID, inv.Y, inv.M
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
