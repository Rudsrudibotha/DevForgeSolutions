'use strict';

// Student portal service. Built specifically for the SSR + HTMX pages.
// Every read goes through req.schoolDb so the scope guard catches any
// missing @schoolId filter. Admin reads of foreign schools are audit-logged.

const { sql } = require('../data/db');

const ALLOWED_STATUSES = ['active', 'inactive', 'all'];
const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

class StudentPortalService {
  constructor() {}

  // List students with server-side search, class filter, status filter, and
  // pagination. Returns { rows, total, page, pageSize, hasMore, filters }.
  // shape is shaped for the table partial.
  async list({ schoolDb, search, classId, status, page, pageSize } = {}) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('studentPortalService.list requires a scoped schoolId');

    const safeStatus = ALLOWED_STATUSES.includes(status) ? status : 'active';
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(pageSize, 10) || PAGE_SIZE_DEFAULT));
    const offset = (safePage - 1) * safeSize;

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('offset', sql.Int, offset);
    request.input('size', sql.Int, safeSize);

    const where = ['s.SchoolID = @schoolId', 's.IsDeleted = 0'];
    if (safeStatus === 'active')   where.push('s.IsActive = 1');
    if (safeStatus === 'inactive') where.push('s.IsActive = 0');
    if (classId && Number.isInteger(Number(classId))) {
      request.input('classId', sql.Int, Number(classId));
      where.push('s.ClassID = @classId');
    }
    if (search && String(search).trim().length > 0) {
      const like = '%' + String(search).trim().replace(/[%_]/g, '\\$&') + '%';
      request.input('search', sql.NVarChar, like);
      where.push('(s.FirstName LIKE @search OR s.LastName LIKE @search OR f.FamilyName LIKE @search)');
    }

    const text = `
      SELECT
        s.StudentID, s.FirstName, s.LastName, s.DateOfBirth, s.IsActive,
        s.CurrentAcademicYear, s.EnrolledDate, s.PhotoUrl,
        s.ClassID, c.ClassName, c.Grade,
        f.FamilyID, f.FamilyName,
        (SELECT ISNULL(SUM(i.Amount - i.AmountPaid), 0)
           FROM Invoices i
           WHERE i.StudentID = s.StudentID
             AND i.Status NOT IN ('Paid', 'Cancelled')) AS OutstandingAmount,
        (SELECT COUNT(*)
           FROM Attendance a
           WHERE a.StudentID = s.StudentID
             AND a.AttendanceDate >= DATEADD(DAY, -7, CAST(GETDATE() AS DATE))) AS AttendanceLastWeek
      FROM Students s
      INNER JOIN Families f ON f.FamilyID = s.FamilyID
      LEFT  JOIN Classes  c ON c.ClassID = s.ClassID
      WHERE ${where.join(' AND ')}
      ORDER BY s.LastName, s.FirstName
      OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);

    // Count
    const countRequest = await schoolDb.request();
    countRequest.input('schoolId', sql.Int, sid);
    const countWhere = ['s.SchoolID = @schoolId', 's.IsDeleted = 0'];
    if (safeStatus === 'active')   countWhere.push('s.IsActive = 1');
    if (safeStatus === 'inactive') countWhere.push('s.IsActive = 0');
    if (classId && Number.isInteger(Number(classId))) {
      countRequest.input('classId', sql.Int, Number(classId));
      countWhere.push('s.ClassID = @classId');
    }
    if (search && String(search).trim().length > 0) {
      const like = '%' + String(search).trim().replace(/[%_]/g, '\\$&') + '%';
      countRequest.input('search', sql.NVarChar, like);
      countWhere.push('(s.FirstName LIKE @search OR s.LastName LIKE @search OR f.FamilyName LIKE @search)');
    }
    const countText = `SELECT COUNT(*) AS Total FROM Students s INNER JOIN Families f ON f.FamilyID = s.FamilyID WHERE ${countWhere.join(' AND ')}`;
    schoolDb.guardTableScope(countText);
    const countResult = await countRequest.query(countText);
    const total = countResult.recordset[0] ? Number(countResult.recordset[0].Total) : 0;

    return {
      rows: result.recordset,
      total,
      page: safePage,
      pageSize: safeSize,
      hasMore: offset + result.recordset.length < total,
      filters: { search: search || '', classId: classId || '', status: safeStatus }
    };
  }

  // Single student detail. Returns null if not in the school scope.
  async getById({ schoolDb, studentId }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(studentId) || studentId <= 0) return null;
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('studentPortalService.getById requires a scoped schoolId');

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('studentId', sql.Int, studentId);
    const text = `
      SELECT
        s.*,
        f.FamilyID, f.FamilyName,
        f.HomeAddress AS FamilyHomeAddress, f.HomePhone AS FamilyHomePhone,
        f.PrimaryParentName, f.PrimaryParentEmail, f.PrimaryParentPhone,
        f.SecondaryParentName, f.SecondaryParentEmail, f.SecondaryParentPhone,
        c.ClassID, c.ClassName, c.Grade,
        bc.CategoryName AS BillingCategoryName
      FROM Students s
      INNER JOIN Families f ON f.FamilyID = s.FamilyID
      LEFT  JOIN Classes c  ON c.ClassID = s.ClassID
      LEFT  JOIN BillingCategories bc ON bc.BillingCategoryID = s.BillingCategoryID
      WHERE s.SchoolID = @schoolId AND s.StudentID = @studentId AND s.IsDeleted = 0
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset[0] || null;
  }

  // Class list for the filter dropdown
  async listClasses({ schoolDb }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('studentPortalService.listClasses requires a scoped schoolId');

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    const text = `
      SELECT ClassID, ClassName, Grade
      FROM Classes
      WHERE SchoolID = @schoolId AND IsActive = 1
      ORDER BY Grade, ClassName
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset;
  }

  // Family list for the create-student picker. Limit to 200 most recent.
  async listFamilies({ schoolDb, search } = {}) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('studentPortalService.listFamilies requires a scoped schoolId');

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    const where = ['SchoolID = @schoolId'];
    if (search && String(search).trim().length > 0) {
      request.input('search', sql.NVarChar, '%' + String(search).trim() + '%');
      where.push('FamilyName LIKE @search');
    }
    const text = `
      SELECT TOP 200 FamilyID, FamilyName, PrimaryParentName
      FROM Families
      WHERE ${where.join(' AND ')}
      ORDER BY FamilyName
    `;
    const result = await request.query(text);
    return result.recordset;
  }

  // Billing categories assigned to one student, primary first. Scoped
  // through the Students join (StudentBillingCategories itself has no
  // SchoolID column).
  async listAssignedBillingCategories({ schoolDb, studentId }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(studentId) || studentId <= 0) return [];
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('studentPortalService.listAssignedBillingCategories requires a scoped schoolId');

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('studentId', sql.Int, studentId);
    const text = `
      SELECT sbc.BillingCategoryID, bc.CategoryName, bc.BaseAmount, bc.Frequency, bc.IsActive, sbc.IsPrimary
      FROM StudentBillingCategories sbc
      INNER JOIN Students s ON s.StudentID = sbc.StudentID
      INNER JOIN BillingCategories bc ON bc.BillingCategoryID = sbc.BillingCategoryID
      WHERE s.SchoolID = @schoolId AND s.StudentID = @studentId AND bc.SchoolID = @schoolId
      ORDER BY sbc.IsPrimary DESC, bc.CategoryName
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset;
  }

  // Replace a student's billing-category assignments. The first id in
  // the list becomes the primary category; Students.BillingCategoryID
  // mirrors it for the invoicing paths that still read the old column.
  // Ids that don't belong to this school are silently dropped.
  async syncBillingCategories({ schoolDb, studentId, categoryIds }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(studentId) || studentId <= 0) return false;
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('studentPortalService.syncBillingCategories requires a scoped schoolId');

    const requested = [...new Set((Array.isArray(categoryIds) ? categoryIds : [categoryIds])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0))];

    // Tenant check: the student must be in scope.
    const studentCheck = await schoolDb.request();
    studentCheck.input('schoolId', sql.Int, sid);
    studentCheck.input('studentId', sql.Int, studentId);
    const studentText = `
      SELECT StudentID FROM Students
      WHERE SchoolID = @schoolId AND StudentID = @studentId AND IsDeleted = 0
    `;
    schoolDb.guardTableScope(studentText);
    const studentRow = await studentCheck.query(studentText);
    if (!studentRow.recordset.length) return false;

    // Tenant check: keep only category ids that belong to this school.
    let ids = [];
    if (requested.length) {
      const catRequest = await schoolDb.request();
      catRequest.input('schoolId', sql.Int, sid);
      const placeholders = requested.map((id, index) => {
        catRequest.input(`categoryId${index}`, sql.Int, id);
        return `@categoryId${index}`;
      });
      const catText = `
        SELECT BillingCategoryID FROM BillingCategories
        WHERE SchoolID = @schoolId AND BillingCategoryID IN (${placeholders.join(', ')})
      `;
      schoolDb.guardTableScope(catText);
      const catResult = await catRequest.query(catText);
      const valid = new Set(catResult.recordset.map((r) => Number(r.BillingCategoryID)));
      ids = requested.filter((id) => valid.has(id));
    }

    // Remove unassigned rows, then upsert the kept ones in order.
    const deleteRequest = await schoolDb.request();
    deleteRequest.input('studentId', sql.Int, studentId);
    const keepPlaceholders = ids.map((id, index) => {
      deleteRequest.input(`keepId${index}`, sql.Int, id);
      return `@keepId${index}`;
    });
    await deleteRequest.query(`
      DELETE FROM StudentBillingCategories
      WHERE StudentID = @studentId
      ${keepPlaceholders.length ? `AND BillingCategoryID NOT IN (${keepPlaceholders.join(', ')})` : ''}
    `);

    for (let index = 0; index < ids.length; index += 1) {
      const upsert = await schoolDb.request();
      upsert.input('studentId', sql.Int, studentId);
      upsert.input('categoryId', sql.Int, ids[index]);
      upsert.input('isPrimary', sql.Bit, index === 0 ? 1 : 0);
      await upsert.query(`
        IF EXISTS (SELECT 1 FROM StudentBillingCategories WHERE StudentID = @studentId AND BillingCategoryID = @categoryId)
        BEGIN
          UPDATE StudentBillingCategories SET IsPrimary = @isPrimary
          WHERE StudentID = @studentId AND BillingCategoryID = @categoryId;
        END
        ELSE
        BEGIN
          INSERT INTO StudentBillingCategories (StudentID, BillingCategoryID, IsPrimary)
          VALUES (@studentId, @categoryId, @isPrimary);
        END
      `);
    }

    // Keep the legacy single-category column in step (primary or NULL).
    const mirror = await schoolDb.request();
    mirror.input('schoolId', sql.Int, sid);
    mirror.input('studentId', sql.Int, studentId);
    mirror.input('primaryCategoryId', sql.Int, ids.length ? ids[0] : null);
    const mirrorText = `
      UPDATE Students SET BillingCategoryID = @primaryCategoryId, UpdatedDate = GETDATE()
      WHERE SchoolID = @schoolId AND StudentID = @studentId
    `;
    schoolDb.guardTableScope(mirrorText);
    await mirror.query(mirrorText);

    return true;
  }

  // Outstanding balances per student per month for one calendar year,
  // grouped by family — feeds the year-calendar view. A cell is the sum
  // of (Amount - AmountPaid) over unpaid invoices issued in that month.
  async outstandingByMonth({ schoolDb, year } = {}) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('studentPortalService.outstandingByMonth requires a scoped schoolId');

    const safeYear = Number.isInteger(Number(year)) && Number(year) >= 2000 && Number(year) <= 2100
      ? Number(year)
      : new Date().getFullYear();

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('year', sql.Int, safeYear);
    const text = `
      SELECT
        f.FamilyID, f.FamilyName,
        s.StudentID, s.FirstName, s.LastName, s.IsActive,
        MONTH(i.IssueDate) AS InvoiceMonth,
        SUM(i.Amount - ISNULL(i.AmountPaid, 0)) AS Outstanding
      FROM Invoices i
      INNER JOIN Students s ON s.StudentID = i.StudentID
      INNER JOIN Families f ON f.FamilyID = s.FamilyID
      WHERE i.SchoolID = @schoolId AND i.IsDeleted = 0
        AND s.IsDeleted = 0
        AND i.Status NOT IN ('Paid', 'Cancelled')
        AND (i.Amount - ISNULL(i.AmountPaid, 0)) > 0
        AND YEAR(i.IssueDate) = @year
      GROUP BY f.FamilyID, f.FamilyName, s.StudentID, s.FirstName, s.LastName, s.IsActive, MONTH(i.IssueDate)
      ORDER BY f.FamilyName, s.LastName, s.FirstName, MONTH(i.IssueDate)
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);

    const families = new Map();
    const monthTotals = new Array(13).fill(0); // 1-indexed by month
    let grandTotal = 0;

    for (const row of result.recordset) {
      let fam = families.get(row.FamilyID);
      if (!fam) {
        fam = { familyId: row.FamilyID, familyName: row.FamilyName, students: new Map(), total: 0 };
        families.set(row.FamilyID, fam);
      }
      let stu = fam.students.get(row.StudentID);
      if (!stu) {
        stu = {
          studentId: row.StudentID,
          name: row.FirstName + ' ' + row.LastName,
          isActive: !!row.IsActive,
          months: new Array(13).fill(0),
          total: 0
        };
        fam.students.set(row.StudentID, stu);
      }
      const amount = Number(row.Outstanding || 0);
      const month = Number(row.InvoiceMonth);
      stu.months[month] += amount;
      stu.total += amount;
      fam.total += amount;
      monthTotals[month] += amount;
      grandTotal += amount;
    }

    return {
      year: safeYear,
      families: [...families.values()].map(f => ({ ...f, students: [...f.students.values()] })),
      monthTotals,
      grandTotal
    };
  }

  // Distinct parent email addresses for a set of students, a class, or
  // the whole school ("entire body"). Reads the family record's primary
  // and secondary parent emails. Only active, non-deleted students count.
  // Returns { emails, studentCount }.
  async listParentEmails({ schoolDb, scope, studentIds, classId } = {}) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('studentPortalService.listParentEmails requires a scoped schoolId');

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    const where = ['s.SchoolID = @schoolId', 's.IsDeleted = 0', 's.IsActive = 1'];

    if (scope === 'class') {
      const cid = Number(classId);
      if (!Number.isInteger(cid) || cid <= 0) return { emails: [], studentCount: 0 };
      request.input('classId', sql.Int, cid);
      where.push('s.ClassID = @classId');
    } else if (scope === 'selected') {
      const ids = [...new Set((Array.isArray(studentIds) ? studentIds : [studentIds])
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0))];
      if (!ids.length) return { emails: [], studentCount: 0 };
      const placeholders = ids.map((id, index) => {
        request.input(`studentId${index}`, sql.Int, id);
        return `@studentId${index}`;
      });
      where.push(`s.StudentID IN (${placeholders.join(', ')})`);
    } else if (scope !== 'all') {
      return { emails: [], studentCount: 0 };
    }

    const text = `
      SELECT s.StudentID, f.PrimaryParentEmail, f.SecondaryParentEmail
      FROM Students s
      INNER JOIN Families f ON f.FamilyID = s.FamilyID
      WHERE ${where.join(' AND ')}
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);

    const emails = new Set();
    for (const row of result.recordset) {
      for (const email of [row.PrimaryParentEmail, row.SecondaryParentEmail]) {
        const value = String(email || '').trim().toLowerCase();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) emails.add(value);
      }
    }
    return { emails: [...emails], studentCount: result.recordset.length };
  }

  // Soft-delete (set IsDeleted = 1). Returns true on success, false if not found.
  async softDelete({ schoolDb, studentId, actor }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(studentId) || studentId <= 0) return false;
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('studentPortalService.softDelete requires a scoped schoolId');

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('studentId', sql.Int, studentId);
    const text = `
      UPDATE Students
      SET IsDeleted = 1, IsActive = 0, UpdatedDate = GETDATE()
      WHERE SchoolID = @schoolId AND StudentID = @studentId AND IsDeleted = 0
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.rowsAffected && result.rowsAffected[0] > 0;
  }
}

module.exports = StudentPortalService;
