// Data Layer - Class repository

const { getPool, sql } = require('./db');

class ClassRepository {
  async getBySchool(schoolId, teacherUserId = null) {
    const pool = await getPool();
    const req = pool.request().input('schoolId', sql.Int, schoolId);
    let where = 'WHERE c.SchoolID = @schoolId';
    if (teacherUserId) {
      req.input('teacherUserId', sql.Int, teacherUserId);
      where += ' AND e.UserID = @teacherUserId';
    }
    const result = await req.query(`SELECT c.*, e.FirstName AS TeacherFirstName, e.LastName AS TeacherLastName,
                (SELECT COUNT(1) FROM Students s WHERE s.ClassName = c.ClassName AND s.SchoolID = c.SchoolID AND s.IsActive = 1) AS StudentCount
              FROM Classes c
              LEFT JOIN Employees e ON c.TeacherID = e.EmployeeID
              ${where} ORDER BY c.ActiveYear DESC, c.ClassName`);
    return result.recordset;
  }

  async getById(id) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, id)
      .query('SELECT * FROM Classes WHERE ClassID = @id');
    return result.recordset[0];
  }

  async getBySchoolYearAndName(schoolId, activeYear, className) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('activeYear', sql.Int, activeYear)
      .input('className', sql.NVarChar, className)
      .query(`SELECT TOP 1 *
              FROM Classes
              WHERE SchoolID = @schoolId
                AND ActiveYear = @activeYear
                AND ClassName = @className
                AND IsActive = 1`);
    return result.recordset[0] || null;
  }

  async create(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId)
      .input('className', sql.NVarChar, data.className)
      .input('teacherId', sql.Int, data.teacherId || null)
      .input('capacity', sql.Int, data.capacity || null)
      .input('activeYear', sql.Int, data.activeYear)
      .query(`IF @teacherId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Employees WHERE EmployeeID = @teacherId AND SchoolID = @schoolId)
                THROW 50000, 'Teacher must belong to the selected school', 1;
              INSERT INTO Classes (SchoolID, ClassName, TeacherID, Capacity, ActiveYear)
              OUTPUT INSERTED.* VALUES (@schoolId, @className, @teacherId, @capacity, @activeYear)`);
    return result.recordset[0];
  }

  async update(id, data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('schoolId', sql.Int, data.schoolId)
      .input('className', sql.NVarChar, data.className)
      .input('teacherId', sql.Int, data.teacherId || null)
      .input('capacity', sql.Int, data.capacity || null)
      .input('activeYear', sql.Int, data.activeYear)
      .input('isActive', sql.Bit, data.isActive !== false)
      .query(`IF @teacherId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Employees WHERE EmployeeID = @teacherId AND SchoolID = @schoolId)
                THROW 50000, 'Teacher must belong to the selected school', 1;
              UPDATE Classes SET ClassName=@className, TeacherID=@teacherId, Capacity=@capacity, ActiveYear=@activeYear,
              IsActive=@isActive, UpdatedDate=GETDATE() OUTPUT INSERTED.* WHERE ClassID=@id AND SchoolID=@schoolId`);
    return result.recordset[0];
  }

  async getTimetable(schoolId, classId, teacherUserId = null) {
    const pool = await getPool();
    const req = pool.request().input('schoolId', sql.Int, schoolId);
    let where = 'WHERE t.SchoolID = @schoolId';
    if (classId) { req.input('classId', sql.Int, classId); where += ' AND t.ClassID = @classId'; }
    if (teacherUserId) {
      req.input('teacherUserId', sql.Int, teacherUserId);
      where += ` AND EXISTS (
        SELECT 1
        FROM Classes scoped
        LEFT JOIN Employees scopedTeacher ON scoped.TeacherID = scopedTeacher.EmployeeID
        LEFT JOIN Employees timetableTeacher ON t.TeacherID = timetableTeacher.EmployeeID
        WHERE scoped.ClassID = t.ClassID
          AND scoped.SchoolID = @schoolId
          AND (scopedTeacher.UserID = @teacherUserId OR timetableTeacher.UserID = @teacherUserId)
      )`;
    }
    const result = await req.query(`SELECT t.*, c.ClassName, e.FirstName AS TeacherFirstName, e.LastName AS TeacherLastName
              FROM Timetable t INNER JOIN Classes c ON t.ClassID = c.ClassID
              LEFT JOIN Employees e ON t.TeacherID = e.EmployeeID ${where}
              ORDER BY t.ClassID, CASE t.DayOfWeek WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3
              WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 ELSE 6 END, t.PeriodNumber`);
    return result.recordset;
  }

  async addTimetableEntry(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId)
      .input('classId', sql.Int, data.classId)
      .input('dayOfWeek', sql.NVarChar, data.dayOfWeek)
      .input('periodNumber', sql.Int, data.periodNumber)
      .input('subject', sql.NVarChar, data.subject || null)
      .input('teacherId', sql.Int, data.teacherId || null)
      .input('startTime', sql.NVarChar, data.startTime || null)
      .input('endTime', sql.NVarChar, data.endTime || null)
      .query(`IF NOT EXISTS (SELECT 1 FROM Classes WHERE ClassID = @classId AND SchoolID = @schoolId)
                THROW 50000, 'Class must belong to the selected school', 1;
              IF @teacherId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Employees WHERE EmployeeID = @teacherId AND SchoolID = @schoolId)
                THROW 50000, 'Teacher must belong to the selected school', 1;
              INSERT INTO Timetable (SchoolID, ClassID, DayOfWeek, PeriodNumber, Subject, TeacherID, StartTime, EndTime)
              OUTPUT INSERTED.* VALUES (@schoolId, @classId, @dayOfWeek, @periodNumber, @subject, @teacherId, @startTime, @endTime)`);
    return result.recordset[0];
  }
}

module.exports = ClassRepository;
