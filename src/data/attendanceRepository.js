// Data Layer - Attendance repository

const { getPool, sql } = require('./db');

class AttendanceRepository {
  async recordAttendance(data) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, data.schoolId)
      .input('studentId', sql.Int, data.studentId)
      .input('classId', sql.Int, data.classId || null)
      .input('attendanceDate', sql.Date, data.attendanceDate)
      .input('status', sql.NVarChar, data.status)
      .input('notes', sql.NVarChar, data.notes || null)
      .input('recordedBy', sql.Int, data.recordedBy || null)
      .query(`MERGE Attendance AS t
              USING (SELECT @schoolId AS SchoolID, @studentId AS StudentID, @attendanceDate AS AttendanceDate) AS s
              ON t.SchoolID = s.SchoolID AND t.StudentID = s.StudentID AND t.AttendanceDate = s.AttendanceDate
              WHEN MATCHED THEN UPDATE SET Status = @status, Notes = @notes, RecordedBy = @recordedBy, UpdatedDate = GETDATE()
              WHEN NOT MATCHED THEN INSERT (SchoolID, StudentID, ClassID, AttendanceDate, Status, Notes, RecordedBy)
                VALUES (@schoolId, @studentId, @classId, @attendanceDate, @status, @notes, @recordedBy)
              OUTPUT INSERTED.*;`);
    return result.recordset[0];
  }

  async getBySchoolAndDate(schoolId, date) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('date', sql.Date, date)
      .query(`SELECT a.*, s.FirstName, s.LastName, s.ClassName
              FROM Attendance a
              INNER JOIN Students s ON a.StudentID = s.StudentID
              WHERE a.SchoolID = @schoolId AND a.AttendanceDate = @date
              ORDER BY s.ClassName, s.LastName`);
    return result.recordset;
  }

  async getByStudent(studentId, fromDate, toDate) {
    const pool = await getPool();
    const req = pool.request().input('studentId', sql.Int, studentId);
    let where = 'WHERE a.StudentID = @studentId';
    if (fromDate) { req.input('fromDate', sql.Date, fromDate); where += ' AND a.AttendanceDate >= @fromDate'; }
    if (toDate) { req.input('toDate', sql.Date, toDate); where += ' AND a.AttendanceDate <= @toDate'; }
    const result = await req.query(`SELECT a.* FROM Attendance a ${where} ORDER BY a.AttendanceDate DESC`);
    return result.recordset;
  }

  async getByStudentForSchool(studentId, schoolId, fromDate, toDate) {
    const pool = await getPool();
    const req = pool.request()
      .input('studentId', sql.Int, studentId)
      .input('schoolId', sql.Int, schoolId);
    let where = 'WHERE a.StudentID = @studentId AND a.SchoolID = @schoolId';
    if (fromDate) { req.input('fromDate', sql.Date, fromDate); where += ' AND a.AttendanceDate >= @fromDate'; }
    if (toDate) { req.input('toDate', sql.Date, toDate); where += ' AND a.AttendanceDate <= @toDate'; }
    const result = await req.query(`SELECT a.* FROM Attendance a ${where} ORDER BY a.AttendanceDate DESC`);
    return result.recordset;
  }

  async getSummaryBySchool(schoolId, fromDate, toDate) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('fromDate', sql.Date, fromDate)
      .input('toDate', sql.Date, toDate)
      .query(`SELECT s.ClassName,
                SUM(CASE WHEN a.Status = 'Present' THEN 1 ELSE 0 END) AS PresentCount,
                SUM(CASE WHEN a.Status = 'Absent' THEN 1 ELSE 0 END) AS AbsentCount,
                SUM(CASE WHEN a.Status = 'Late' THEN 1 ELSE 0 END) AS LateCount,
                SUM(CASE WHEN a.Status = 'Excused' THEN 1 ELSE 0 END) AS ExcusedCount,
                COUNT(1) AS TotalRecords
              FROM Attendance a
              INNER JOIN Students s ON a.StudentID = s.StudentID
              WHERE a.SchoolID = @schoolId AND a.AttendanceDate >= @fromDate AND a.AttendanceDate <= @toDate
              GROUP BY s.ClassName`);
    return result.recordset;
  }
}

module.exports = AttendanceRepository;
