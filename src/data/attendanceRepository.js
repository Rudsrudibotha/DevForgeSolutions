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
      .input('arrivalTime', sql.NVarChar, data.arrivalTime !== undefined ? data.arrivalTime : null)
      .input('departureTime', sql.NVarChar, data.departureTime !== undefined ? data.departureTime : null)
      .input('notes', sql.NVarChar, data.notes || null)
      .input('recordedBy', sql.Int, data.recordedBy || null)
      .input('teacherUserId', sql.Int, data.teacherUserId || null)
      .query(`IF NOT EXISTS (SELECT 1 FROM Students WHERE StudentID = @studentId AND SchoolID = @schoolId)
                THROW 50000, 'Student must belong to the signed-in school', 1;
              IF @classId IS NOT NULL AND NOT EXISTS (
                SELECT 1
                FROM Classes c
                INNER JOIN Students s ON s.SchoolID = c.SchoolID AND s.ClassName = c.ClassName
                WHERE c.ClassID = @classId AND c.SchoolID = @schoolId AND s.StudentID = @studentId
              )
                THROW 50000, 'Class must match the selected student', 1;
              IF @teacherUserId IS NOT NULL AND NOT EXISTS (
                SELECT 1
                FROM Students s
                INNER JOIN Classes c ON c.SchoolID = s.SchoolID AND c.ClassName = s.ClassName
                INNER JOIN Employees e ON e.EmployeeID = c.TeacherID
                WHERE s.StudentID = @studentId AND s.SchoolID = @schoolId AND e.UserID = @teacherUserId
              )
                THROW 50000, 'You can only record attendance for your assigned classes', 1;
              MERGE Attendance AS t
              USING (SELECT @schoolId AS SchoolID, @studentId AS StudentID, @attendanceDate AS AttendanceDate) AS s
              ON t.SchoolID = s.SchoolID AND t.StudentID = s.StudentID AND t.AttendanceDate = s.AttendanceDate
              WHEN MATCHED THEN UPDATE SET
                Status = @status,
                ClassID = @classId,
                ArrivalTime = CASE WHEN @arrivalTime IS NOT NULL AND LEN(@arrivalTime) > 0 THEN TRY_CONVERT(TIME, @arrivalTime) WHEN @arrivalTime = '' THEN NULL ELSE t.ArrivalTime END,
                DepartureTime = CASE WHEN @departureTime IS NOT NULL AND LEN(@departureTime) > 0 THEN TRY_CONVERT(TIME, @departureTime) WHEN @departureTime = '' THEN NULL ELSE t.DepartureTime END,
                Notes = @notes,
                RecordedBy = @recordedBy,
                UpdatedDate = GETDATE()
              WHEN NOT MATCHED THEN INSERT (SchoolID, StudentID, ClassID, AttendanceDate, Status, ArrivalTime, DepartureTime, Notes, RecordedBy)
                VALUES (@schoolId, @studentId, @classId, @attendanceDate, @status, TRY_CONVERT(TIME, @arrivalTime), TRY_CONVERT(TIME, @departureTime), @notes, @recordedBy)
              OUTPUT INSERTED.*,
                CONVERT(VARCHAR(5), INSERTED.ArrivalTime, 108) AS ArrivalTimeDisplay,
                CONVERT(VARCHAR(5), INSERTED.DepartureTime, 108) AS DepartureTimeDisplay;`);
    return result.recordset[0];
  }

  async undoTime(attendanceId, schoolId, field, recordedBy, teacherUserId = null) {
    const column = field === 'arrival' ? 'ArrivalTime' : 'DepartureTime';
    const pool = await getPool();
    const req = pool.request()
      .input('attendanceId', sql.Int, attendanceId)
      .input('schoolId', sql.Int, schoolId)
      .input('recordedBy', sql.Int, recordedBy || null);
    let scope = '';
    if (teacherUserId) {
      req.input('teacherUserId', sql.Int, teacherUserId);
      scope = ` AND EXISTS (
        SELECT 1
        FROM Students s
        INNER JOIN Classes c ON c.SchoolID = s.SchoolID AND c.ClassName = s.ClassName
        INNER JOIN Employees e ON e.EmployeeID = c.TeacherID
        WHERE s.StudentID = Attendance.StudentID AND s.SchoolID = @schoolId AND e.UserID = @teacherUserId
      )`;
    }
    const result = await req.query(`UPDATE Attendance
              SET ${column} = NULL, RecordedBy = @recordedBy, UpdatedDate = GETDATE()
              OUTPUT INSERTED.*,
                CONVERT(VARCHAR(5), INSERTED.ArrivalTime, 108) AS ArrivalTimeDisplay,
                CONVERT(VARCHAR(5), INSERTED.DepartureTime, 108) AS DepartureTimeDisplay
              WHERE AttendanceID = @attendanceId AND SchoolID = @schoolId${scope}`);
    return result.recordset[0];
  }

  async getBySchoolAndDate(schoolId, date, teacherUserId = null) {
    const pool = await getPool();
    const req = pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('date', sql.Date, date);
    let scope = '';
    if (teacherUserId) {
      req.input('teacherUserId', sql.Int, teacherUserId);
      scope = ` AND EXISTS (
        SELECT 1
        FROM Classes c
        INNER JOIN Employees e ON e.EmployeeID = c.TeacherID
        WHERE c.SchoolID = @schoolId AND c.ClassName = s.ClassName AND e.UserID = @teacherUserId
      )`;
    }
    const result = await req.query(`SELECT a.*,
                CONVERT(VARCHAR(5), a.ArrivalTime, 108) AS ArrivalTimeDisplay,
                CONVERT(VARCHAR(5), a.DepartureTime, 108) AS DepartureTimeDisplay,
                s.FirstName, s.LastName, s.ClassName
              FROM Attendance a
              INNER JOIN Students s ON a.StudentID = s.StudentID
              WHERE a.SchoolID = @schoolId AND a.AttendanceDate = @date${scope}
              ORDER BY s.ClassName, s.LastName`);
    return result.recordset;
  }

  async getBySchoolAndRange(schoolId, fromDate, toDate, teacherUserId = null) {
    const pool = await getPool();
    const req = pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('fromDate', sql.Date, fromDate)
      .input('toDate', sql.Date, toDate);
    let scope = '';
    if (teacherUserId) {
      req.input('teacherUserId', sql.Int, teacherUserId);
      scope = ` AND EXISTS (
        SELECT 1
        FROM Classes c
        INNER JOIN Employees e ON e.EmployeeID = c.TeacherID
        WHERE c.SchoolID = @schoolId AND c.ClassName = s.ClassName AND e.UserID = @teacherUserId
      )`;
    }
    const result = await req.query(`SELECT a.*,
                CONVERT(VARCHAR(5), a.ArrivalTime, 108) AS ArrivalTimeDisplay,
                CONVERT(VARCHAR(5), a.DepartureTime, 108) AS DepartureTimeDisplay,
                s.FirstName, s.LastName, s.ClassName
              FROM Attendance a
              INNER JOIN Students s ON a.StudentID = s.StudentID
              WHERE a.SchoolID = @schoolId
                AND a.AttendanceDate >= @fromDate
                AND a.AttendanceDate <= @toDate
                AND a.AttendanceDate < CAST(GETDATE() AS DATE)${scope}
              ORDER BY s.ClassName, a.AttendanceDate DESC, s.LastName`);
    return result.recordset;
  }

  async getByStudent(studentId, fromDate, toDate) {
    const pool = await getPool();
    const req = pool.request().input('studentId', sql.Int, studentId);
    let where = 'WHERE a.StudentID = @studentId';
    if (fromDate) { req.input('fromDate', sql.Date, fromDate); where += ' AND a.AttendanceDate >= @fromDate'; }
    if (toDate) { req.input('toDate', sql.Date, toDate); where += ' AND a.AttendanceDate <= @toDate'; }
    const result = await req.query(`SELECT a.*,
                                      CONVERT(VARCHAR(5), a.ArrivalTime, 108) AS ArrivalTimeDisplay,
                                      CONVERT(VARCHAR(5), a.DepartureTime, 108) AS DepartureTimeDisplay
                                    FROM Attendance a ${where} ORDER BY a.AttendanceDate DESC`);
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
    const result = await req.query(`SELECT a.*,
                                      CONVERT(VARCHAR(5), a.ArrivalTime, 108) AS ArrivalTimeDisplay,
                                      CONVERT(VARCHAR(5), a.DepartureTime, 108) AS DepartureTimeDisplay
                                    FROM Attendance a ${where} ORDER BY a.AttendanceDate DESC`);
    return result.recordset;
  }

  async getSummaryBySchool(schoolId, fromDate, toDate, teacherUserId = null) {
    const pool = await getPool();
    const req = pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('fromDate', sql.Date, fromDate)
      .input('toDate', sql.Date, toDate);
    let scope = '';
    if (teacherUserId) {
      req.input('teacherUserId', sql.Int, teacherUserId);
      scope = ` AND EXISTS (
        SELECT 1
        FROM Classes c
        INNER JOIN Employees e ON e.EmployeeID = c.TeacherID
        WHERE c.SchoolID = @schoolId AND c.ClassName = s.ClassName AND e.UserID = @teacherUserId
      )`;
    }
    const result = await req.query(`SELECT s.ClassName,
                SUM(CASE WHEN a.Status = 'Present' THEN 1 ELSE 0 END) AS PresentCount,
                SUM(CASE WHEN a.Status = 'Absent' THEN 1 ELSE 0 END) AS AbsentCount,
                COUNT(1) AS TotalRecords
              FROM Attendance a
              INNER JOIN Students s ON a.StudentID = s.StudentID
              WHERE a.SchoolID = @schoolId AND a.AttendanceDate >= @fromDate AND a.AttendanceDate <= @toDate${scope}
              GROUP BY s.ClassName`);
    return result.recordset;
  }
}

module.exports = AttendanceRepository;
