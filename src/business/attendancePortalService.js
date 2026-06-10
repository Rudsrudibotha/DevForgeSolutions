'use strict';

// Attendance portal service. Scoped to school via req.schoolDb.
// Designed for the highest-frequency action in the app: a teacher
// marking the whole class at 8am.

const { sql } = require('../data/db');

const ALLOWED_STATUSES = ['Present', 'Absent', 'Late', 'Excused'];

class AttendancePortalService {
  constructor() {}

  // Get the attendance sheet for a class on a date. Returns one row per
  // student in the class, with their attendance status (or null if not
  // yet recorded). Used by the take-attendance screen.
  async getClassSheet({ schoolDb, classId, date }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(classId) || classId <= 0) return null;
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('classPortalService requires a scoped schoolId');
    const safeDate = parseDate(date) || new Date().toISOString().slice(0, 10);

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('classId', sql.Int, classId);
    request.input('date', sql.Date, safeDate);
    const text = `
      SELECT
        s.StudentID, s.FirstName, s.LastName,
        a.AttendanceID, a.Status, a.ArrivalTime, a.Notes
      FROM Students s
      LEFT JOIN Attendance a
        ON a.StudentID = s.StudentID
        AND a.AttendanceDate = @date
      WHERE s.SchoolID = @schoolId
        AND s.ClassID = @classId
        AND s.IsDeleted = 0
      ORDER BY s.LastName, s.FirstName
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return { date: safeDate, rows: result.recordset };
  }

  // Whole-school register for one date: every active learner with their
  // attendance status (null = not captured), filterable by class and
  // status. Powers the /sms/attendance overview.
  async getSchoolRegister({ schoolDb, date, classId, status }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('attendancePortalService requires a scoped schoolId');
    const safeDate = parseDate(date) || new Date().toISOString().slice(0, 10);

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('date', sql.Date, safeDate);
    let classFilter = '';
    if (Number.isInteger(Number(classId)) && Number(classId) > 0) {
      request.input('classId', sql.Int, Number(classId));
      classFilter = 'AND s.ClassID = @classId';
    }
    const text = `
      SELECT
        s.StudentID, s.FirstName, s.LastName, s.ClassID,
        c.ClassName,
        a.AttendanceID, a.Status, a.ArrivalTime, a.Notes
      FROM Students s
      LEFT JOIN Classes c
        ON c.ClassID = s.ClassID
        AND c.SchoolID = @schoolId
      LEFT JOIN Attendance a
        ON a.StudentID = s.StudentID
        AND a.AttendanceDate = @date
        AND a.SchoolID = @schoolId
      WHERE s.SchoolID = @schoolId
        AND s.IsDeleted = 0
        AND ISNULL(s.IsActive, 1) = 1
        ${classFilter}
      ORDER BY c.ClassName, s.LastName, s.FirstName
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);

    let rows = result.recordset;
    const wanted = String(status || '').trim();
    if (wanted === 'NotCaptured') rows = rows.filter(r => !r.Status);
    else if (ALLOWED_STATUSES.includes(wanted)) rows = rows.filter(r => r.Status === wanted);

    const counts = { Present: 0, Absent: 0, Late: 0, Excused: 0, NotCaptured: 0, total: result.recordset.length };
    for (const r of result.recordset) {
      if (!r.Status) counts.NotCaptured++;
      else if (counts[r.Status] !== undefined) counts[r.Status]++;
    }
    return { date: safeDate, rows, counts };
  }

  // Record attendance for many students in a single transaction.
  // data: [{ studentId, status, notes?, arrivalTime? }, ...]
  // existing rows for the same (student, date) are updated; new rows are
  // inserted. Idempotent: a teacher can save the sheet multiple times.
  async recordBulk({ schoolDb, classId, date, records, actor }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Array.isArray(records) || records.length === 0) return { updated: 0, inserted: 0 };
    if (!Number.isInteger(classId) || classId <= 0) throw new Error('classId required');
    const sid = schoolDb.schoolId;
    if (sid == null) throw new Error('recordBulk requires a scoped schoolId');
    const safeDate = parseDate(date) || new Date().toISOString().slice(0, 10);

    // Validate status values up front
    for (const r of records) {
      if (!ALLOWED_STATUSES.includes(r.status)) {
        throw new Error(`Invalid status: ${r.status}`);
      }
    }

    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    let inserted = 0;
    let updated = 0;
    try {
      for (const r of records) {
        if (!Number.isInteger(r.studentId) || r.studentId <= 0) continue;
        // Upsert: try update first, insert if no row updated
        const updateReq = new sql.Request(tx);
        updateReq.input('schoolId', sql.Int, sid);
        updateReq.input('studentId', sql.Int, r.studentId);
        updateReq.input('classId', sql.Int, classId);
        updateReq.input('date', sql.Date, safeDate);
        updateReq.input('status', sql.NVarChar, r.status);
        updateReq.input('notes', sql.NVarChar, r.notes || null);
        updateReq.input('arrival', sql.NVarChar, r.arrivalTime || null);
        updateReq.input('recordedBy', sql.Int, actor && actor.id ? Number(actor.id) : null);
        const updateText = `
          UPDATE Attendance SET
            Status = @status,
            Notes = @notes,
            ArrivalTime = @arrival,
            RecordedBy = COALESCE(@recordedBy, RecordedBy),
            UpdatedDate = GETDATE()
          WHERE SchoolID = @schoolId AND StudentID = @studentId AND AttendanceDate = @date
        `;
        schoolDb.guardTableScope(updateText);
        const updateResult = await updateReq.query(updateText);
        if (updateResult.rowsAffected && updateResult.rowsAffected[0] > 0) {
          updated += 1;
          continue;
        }

        const insertReq = new sql.Request(tx);
        insertReq.input('schoolId', sql.Int, sid);
        insertReq.input('studentId', sql.Int, r.studentId);
        insertReq.input('classId', sql.Int, classId);
        insertReq.input('date', sql.Date, safeDate);
        insertReq.input('status', sql.NVarChar, r.status);
        insertReq.input('notes', sql.NVarChar, r.notes || null);
        insertReq.input('arrival', sql.NVarChar, r.arrivalTime || null);
        insertReq.input('recordedBy', sql.Int, actor && actor.id ? Number(actor.id) : null);
        const insertText = `
          INSERT INTO Attendance
            (SchoolID, StudentID, ClassID, AttendanceDate, Status, Notes, ArrivalTime, RecordedBy)
          VALUES
            (@schoolId, @studentId, @classId, @date, @status, @notes, @arrival, @recordedBy)
        `;
        schoolDb.guardTableScope(insertText);
        await insertReq.query(insertText);
        inserted += 1;
      }
      await tx.commit();
      return { inserted, updated };
    } catch (err) {
      try { await tx.rollback(); } catch (_) {}
      throw err;
    }
  }

  // History for a single student (used on the student detail page).
  async getStudentHistory({ schoolDb, studentId, days }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(studentId) || studentId <= 0) return [];
    const sid = schoolDb.schoolId;
    const safeDays = Math.min(365, Math.max(1, Number(days) || 30));

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('studentId', sql.Int, studentId);
    request.input('days', sql.Int, safeDays);
    const text = `
      SELECT AttendanceID, AttendanceDate, Status, ArrivalTime, Notes
      FROM Attendance
      WHERE SchoolID = @schoolId
        AND StudentID = @studentId
        AND AttendanceDate >= DATEADD(DAY, -@days, CAST(GETDATE() AS DATE))
      ORDER BY AttendanceDate DESC
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    return result.recordset;
  }

  // Class summary for a date range. Used by the class detail "attendance" KPI.
  async getClassSummary({ schoolDb, classId, days }) {
    if (!schoolDb) throw new Error('schoolDb is required');
    if (!Number.isInteger(classId) || classId <= 0) return null;
    const sid = schoolDb.schoolId;
    const safeDays = Math.min(365, Math.max(1, Number(days) || 30));

    const request = await schoolDb.request();
    request.input('schoolId', sql.Int, sid);
    request.input('classId', sql.Int, classId);
    request.input('days', sql.Int, safeDays);
    const text = `
      SELECT
        Status,
        COUNT(*) AS Total
      FROM Attendance
      WHERE SchoolID = @schoolId
        AND ClassID = @classId
        AND AttendanceDate >= DATEADD(DAY, -@days, CAST(GETDATE() AS DATE))
      GROUP BY Status
    `;
    schoolDb.guardTableScope(text);
    const result = await request.query(text);
    const totals = { Present: 0, Absent: 0, Late: 0, Excused: 0 };
    for (const r of result.recordset) {
      totals[r.Status] = Number(r.Total);
    }
    const total = Object.values(totals).reduce((s, n) => s + n, 0);
    return { days: safeDays, totals, total };
  }
}

function parseDate(s) {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

module.exports = AttendancePortalService;
