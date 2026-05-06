// Data Layer - Class repository

const { getPool, sql } = require('./db');

class ClassRepository {
  async getBySchool(schoolId) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .query(`SELECT c.*, e.FirstName AS TeacherFirstName, e.LastName AS TeacherLastName,
                (SELECT COUNT(1) FROM Students s WHERE s.ClassName = c.ClassName AND s.SchoolID = c.SchoolID AND s.IsActive = 1) AS StudentCount
              FROM Classes c
              LEFT JOIN Employees e ON c.TeacherID = e.EmployeeID
              WHERE c.SchoolID = @schoolId ORDER BY c.ActiveYear DESC, c.ClassName`);
    return result.recordset;
  }

  async getById(id) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, id)
      .query('SELECT * FROM Classes WHERE ClassID = @id');
    return result.recordset[0];
  }

  async create(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId)
      .input('className', sql.NVarChar, data.className)
      .input('teacherId', sql.Int, data.teacherId || null)
      .input('capacity', sql.Int, data.capacity || null)
      .input('activeYear', sql.Int, data.activeYear)
      .query(`INSERT INTO Classes (SchoolID, ClassName, TeacherID, Capacity, ActiveYear)
              OUTPUT INSERTED.* VALUES (@schoolId, @className, @teacherId, @capacity, @activeYear)`);
    return result.recordset[0];
  }

  async update(id, data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('className', sql.NVarChar, data.className)
      .input('teacherId', sql.Int, data.teacherId || null)
      .input('capacity', sql.Int, data.capacity || null)
      .input('activeYear', sql.Int, data.activeYear)
      .input('isActive', sql.Bit, data.isActive !== false)
      .query(`UPDATE Classes SET ClassName=@className, TeacherID=@teacherId, Capacity=@capacity, ActiveYear=@activeYear,
              IsActive=@isActive, UpdatedDate=GETDATE() OUTPUT INSERTED.* WHERE ClassID=@id`);
    return result.recordset[0];
  }

  async getTimetable(schoolId, classId) {
    const pool = await getPool();
    const req = pool.request().input('schoolId', sql.Int, schoolId);
    let where = 'WHERE t.SchoolID = @schoolId';
    if (classId) { req.input('classId', sql.Int, classId); where += ' AND t.ClassID = @classId'; }
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
      .query(`INSERT INTO Timetable (SchoolID, ClassID, DayOfWeek, PeriodNumber, Subject, TeacherID, StartTime, EndTime)
              OUTPUT INSERTED.* VALUES (@schoolId, @classId, @dayOfWeek, @periodNumber, @subject, @teacherId, @startTime, @endTime)`);
    return result.recordset[0];
  }
}

module.exports = ClassRepository;
