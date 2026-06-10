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
        f.FamilyID, f.FamilyName, f.HomeAddress, f.HomePhone,
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
