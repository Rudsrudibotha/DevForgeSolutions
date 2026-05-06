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
      .query(`MERGE Attendance AS t
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

  async undoTime(attendanceId, schoolId, field, recordedBy) {
    const column = field === 'arrival' ? 'ArrivalTime' : 'DepartureTime';
    const pool = await getPool();
    const result = await pool.request()
      .input('attendanceId', sql.Int, attendanceId)
      .input('schoolId', sql.Int, schoolId)
      .input('recordedBy', sql.Int, recordedBy || null)
      .query(`UPDATE Attendance
              SET ${column} = NULL, RecordedBy = @recordedBy, UpdatedDate = GETDATE()
              OUTPUT INSERTED.*,
                CONVERT(VARCHAR(5), INSERTED.ArrivalTime, 108) AS ArrivalTimeDisplay,
                CONVERT(VARCHAR(5), INSERTED.DepartureTime, 108) AS DepartureTimeDisplay
              WHERE AttendanceID = @attendanceId AND SchoolID = @schoolId`);
    return result.recordset[0];
  }

  async getBySchoolAndDate(schoolId, date) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('date', sql.Date, date)
      .query(`SELECT a.*,
                CONVERT(VARCHAR(5), a.ArrivalTime, 108) AS ArrivalTimeDisplay,
                CONVERT(VARCHAR(5), a.DepartureTime, 108) AS DepartureTimeDisplay,
                s.FirstName, s.LastName, s.ClassName
              FROM Attendance a
              INNER JOIN Students s ON a.StudentID = s.StudentID
              WHERE a.SchoolID = @schoolId AND a.AttendanceDate = @date
              ORDER BY s.ClassName, s.LastName`);
    return result.recordset;
  }

  async getBySchoolAndRange(schoolId, fromDate, toDate) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('fromDate', sql.Date, fromDate)
      .input('toDate', sql.Date, toDate)
      .query(`SELECT a.*,
                CONVERT(VARCHAR(5), a.ArrivalTime, 108) AS ArrivalTimeDisplay,
                CONVERT(VARCHAR(5), a.DepartureTime, 108) AS DepartureTimeDisplay,
                s.FirstName, s.LastName, s.ClassName
              FROM Attendance a
              INNER JOIN Students s ON a.StudentID = s.StudentID
              WHERE a.SchoolID = @schoolId
                AND a.AttendanceDate >= @fromDate
                AND a.AttendanceDate <= @toDate
                AND a.AttendanceDate < CAST(GETDATE() AS DATE)
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

  async getSummaryBySchool(schoolId, fromDate, toDate) {
    const pool = await getPool();
    const result = await pool.request()
      .input('schoolId', sql.Int, schoolId)
      .input('fromDate', sql.Date, fromDate)
      .input('toDate', sql.Date, toDate)
      .query(`SELECT s.ClassName,
                SUM(CASE WHEN a.Status = 'Present' THEN 1 ELSE 0 END) AS PresentCount,
                SUM(CASE WHEN a.Status = 'Absent' THEN 1 ELSE 0 END) AS AbsentCount,
                COUNT(1) AS TotalRecords
              FROM Attendance a
              INNER JOIN Students s ON a.StudentID = s.StudentID
              WHERE a.SchoolID = @schoolId AND a.AttendanceDate >= @fromDate AND a.AttendanceDate <= @toDate
              GROUP BY s.ClassName`);
    return result.recordset;
  }
}

module.exports = AttendanceRepository;
