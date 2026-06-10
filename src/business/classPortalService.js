'use strict';

// Class portal service. Scoped to school via req.schoolDb.

const { sql } = require('../data/db');

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

class ClassPortalService {
  constructor() {}

  async list({ schoolDb, search, grade, year, status, page, pageSize } = {}) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('classPortalService.list requires a scoped schoolId');

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(pageSize, 10) || PAGE_SIZE_DEFAULT));
    const offset = (safePage - 1) * safeSize;
    const safeStatus = ['active', 'inactive', 'all'].includes(status) ? status : 'active';
    const currentYear = year || new Date().getFullYear();

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('year', sql.Int, currentYear);
    request.input('offset', sql.Int, offset);
    request.input('size', sql.Int, safeSize);

    const where = ['c.SchoolID = @schoolId', 'c.IsDeleted = 0', 'c.ActiveYear = @year'];
    if (safeStatus === 'active')   where.push('c.IsActive = 1');
    if (safeStatus === 'inactive') where.push('c.IsActive = 0');
    if (grade && String(grade).trim()) {
      request.input('grade', sql.NVarChar, String(grade).trim());
      where.push('c.Grade = @grade');
    }
    if (search && String(search).trim().length > 0) {
      const like = '%' + String(search).trim().replace(/[%_]/g, '\\$&') + '%';
      request.input('search', sql.NVarChar, like);
      where.push('(c.ClassName LIKE @search OR c.Room LIKE @search OR e.FirstName LIKE @search OR e.LastName LIKE @search)');
    }

    const text = `
      SELECT
        c.ClassID, c.ClassName, c.Grade, c.Room, c.Capacity, c.IsActive, c.ActiveYear,
        c.TeacherID, e.FirstName + ' ' + e.LastName AS TeacherName,
        (SELECT COUNT(*) FROM Students s
           WHERE s.ClassID = c.ClassID AND s.IsActive = 1 AND s.IsDeleted = 0) AS StudentCount
      FROM Classes c
      LEFT JOIN Employees e ON e.EmployeeID = c.TeacherID
      WHERE ${where.join(' AND ')}
      ORDER BY c.Grade, c.ClassName
      OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);

    const countRequest = await schoolDb.request();
    countRequest.input('schoolId', sql.Int, sid);
    countRequest.input('year', sql.Int, currentYear);
    const countWhere = ['c.SchoolID = @schoolId', 'c.IsDeleted = 0', 'c.ActiveYear = @year'];
    if (safeStatus === 'active')   countWhere.push('c.IsActive = 1');
    if (safeStatus === 'inactive') countWhere.push('c.IsActive = 0');
    if (grade && String(grade).trim()) {
      countRequest.input('grade', sql.NVarChar, String(grade).trim());
      countWhere.push('c.Grade = @grade');
    }
    if (search && String(search).trim().length > 0) {
      const like = '%' + String(search).trim().replace(/[%_]/g, '\\$&') + '%';
      countRequest.input('search', sql.NVarChar, like);
      countWhere.push('(c.ClassName LIKE @search OR c.Room LIKE @search OR e.FirstName LIKE @search OR e.LastName LIKE @search)');
    }
    const countText = `SELECT COUNT(*) AS Total FROM Classes c LEFT JOIN Employees e ON e.EmployeeID = c.TeacherID WHERE ${countWhere.join(' AND ')}`;
    schoolDb.guardTableScope(countText);
    const countResult = await countRequest.query(countText);
    const total = countResult.recordset[0] ? Number(countResult.recordset[0].Total) : 0;

    return {
      rows: result.recordset,
      total,
      page: safePage,
      pageSize: safeSize,
      hasMore: offset + result.recordset.length < total,
      currentYear,
      filters: { search: search || '', grade: grade || '', status: safeStatus, year: currentYear }
    };
  }

  async getById({ schoolDb, classId }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(classId) || classId <= 0) return null;
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('classPortalService.getById requires a scoped schoolId');

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('classId', sql.Int, classId);
    const text = `
      SELECT
        c.*,
        e.FirstName + ' ' + e.LastName AS TeacherName,
        e.EmployeeNumber, e.Email AS TeacherEmail
      FROM Classes c
      LEFT JOIN Employees e ON e.EmployeeID = c.TeacherID
      WHERE c.SchoolID = @schoolId AND c.ClassID = @classId AND c.IsDeleted = 0
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset[0] || null;
  }

  // Roster: students in this class
  async getRoster({ schoolDb, classId }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(classId) || classId <= 0) return [];
    const sid = schoolDb.schoolId;

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('classId', sql.Int, classId);
    const text = `
      SELECT s.StudentID, s.FirstName, s.LastName, s.DateOfBirth, s.IsActive, s.EnrolledDate,
             f.FamilyID, f.FamilyName,
             (SELECT ISNULL(SUM(i.Amount - i.AmountPaid), 0)
                FROM Invoices i
                WHERE i.StudentID = s.StudentID
                  AND i.Status NOT IN ('Paid', 'Cancelled')) AS OutstandingAmount
      FROM Students s
      INNER JOIN Families f ON f.FamilyID = s.FamilyID
      WHERE s.SchoolID = @schoolId AND s.ClassID = @classId AND s.IsDeleted = 0
      ORDER BY s.LastName, s.FirstName
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset;
  }

  // Distinct grades for the filter
  async listGrades({ schoolDb }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('classPortalService.listGrades requires a scoped schoolId');

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    const text = `
      SELECT DISTINCT Grade
      FROM Classes
      WHERE SchoolID = @schoolId AND IsDeleted = 0 AND Grade IS NOT NULL AND Grade <> ''
      ORDER BY Grade
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset.map(r => r.Grade);
  }

  // Available teachers (employees in this school)
  async listTeachers({ schoolDb }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) return [];

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    const text = `
      SELECT EmployeeID, FirstName + ' ' + LastName AS Name, EmployeeNumber
      FROM Employees
      WHERE SchoolID = @schoolId AND IsActive = 1
      ORDER BY FirstName, LastName
    `;
    const result = await request.query(text);
    return result.recordset;
  }

  async create({ schoolDb, data, actor }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('classPortalService.create requires a scoped schoolId');
    if (!data.className || !String(data.className).trim()) throw new Error('Class name is required');

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('className', sql.NVarChar, String(data.className).trim());
    request.input('grade', sql.NVarChar, data.grade || null);
    request.input('room', sql.NVarChar, data.room || null);
    request.input('capacity', sql.Int, data.capacity ? Number(data.capacity) : null);
    request.input('teacherId', sql.Int, data.teacherId ? Number(data.teacherId) : null);
    request.input('year', sql.Int, data.activeYear ? Number(data.activeYear) : new Date().getFullYear());
    request.input('isActive', sql.Bit, data.isActive === false || data.isActive === '0' ? 0 : 1);

    const text = `
      INSERT INTO Classes
        (SchoolID, ClassName, Grade, Room, Capacity, TeacherID, ActiveYear, IsActive)
      OUTPUT INSERTED.ClassID
      VALUES
        (@schoolId, @className, @grade, @room, @capacity, @teacherId, @year, @isActive)
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset[0] ? Number(result.recordset[0].ClassID) : null;
  }

  async update({ schoolDb, classId, data, actor }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('classPortalService.update requires a scoped schoolId');
    if (!Number.isInteger(classId) || classId <= 0) return false;

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('classId', sql.Int, classId);
    request.input('className', sql.NVarChar, String(data.className || '').trim());
    request.input('grade', sql.NVarChar, data.grade || null);
    request.input('room', sql.NVarChar, data.room || null);
    request.input('capacity', sql.Int, data.capacity ? Number(data.capacity) : null);
    request.input('teacherId', sql.Int, data.teacherId ? Number(data.teacherId) : null);
    request.input('isActive', sql.Bit, data.isActive === false || data.isActive === '0' ? 0 : 1);

    const text = `
      UPDATE Classes SET
        ClassName = @className,
        Grade = @grade,
        Room = @room,
        Capacity = @capacity,
        TeacherID = @teacherId,
        IsActive = @isActive,
        UpdatedDate = GETDATE()
      WHERE SchoolID = @schoolId AND ClassID = @classId AND IsDeleted = 0
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.rowsAffected && result.rowsAffected[0] > 0;
  }

  async softDelete({ schoolDb, classId, actor }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(classId) || classId <= 0) return false;
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('classPortalService.softDelete requires a scoped schoolId');

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('classId', sql.Int, classId);
    // Unassign students before soft-deleting so they don't appear in a class list
    const unassignText = `UPDATE Students SET ClassID = NULL, UpdatedDate = GETDATE() WHERE SchoolID = @schoolId AND ClassID = @classId AND IsDeleted = 0`;
    schoolDb.guardTableScope(unassignText);
    await request.query(unassignText);

    const text = `UPDATE Classes SET IsDeleted = 1, IsActive = 0 WHERE SchoolID = @schoolId AND ClassID = @classId AND IsDeleted = 0`;
    const result = await request.query(text);
    return result.rowsAffected && result.rowsAffected[0] > 0;
  }
}

module.exports = ClassPortalService;
