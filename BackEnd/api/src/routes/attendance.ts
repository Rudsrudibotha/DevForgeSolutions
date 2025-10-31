import { Router } from 'express';
import { z } from 'zod';
import { Database } from '../services/database.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

const attendanceSchema = z.object({
  studentId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkIn: z.string().datetime().optional(),
  checkOut: z.string().datetime().optional(),
  method: z.string().optional(),
  notes: z.string().optional()
});

// Get attendance for date range
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { startDate, endDate, studentId } = req.query;
    
    let query = `
      SELECT sa.*, s.first_name, s.last_name, s.student_no
      FROM student_attendance sa
      JOIN students s ON sa.student_id = s.id
      WHERE sa.date >= $1 AND sa.date <= $2
    `;
    
    const params = [startDate || new Date().toISOString().split('T')[0], endDate || new Date().toISOString().split('T')[0]];
    
    if (studentId) {
      query += ' AND sa.student_id = $3';
      params.push(studentId as string);
    }
    
    query += ' ORDER BY sa.date DESC, s.first_name';

    const result = await Database.query(query, params, req.user!.schoolId);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Record attendance
router.post('/', authenticateToken, requireRole(['school_admin', 'staff']), async (req: AuthRequest, res, next) => {
  try {
    const data = attendanceSchema.parse(req.body);

    const result = await Database.query(
      `INSERT INTO student_attendance (school_id, student_id, date, check_in, check_out, method, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (school_id, student_id, date)
       DO UPDATE SET 
         check_in = EXCLUDED.check_in,
         check_out = EXCLUDED.check_out,
         method = EXCLUDED.method,
         notes = EXCLUDED.notes
       RETURNING *`,
      [
        req.user!.schoolId,
        data.studentId,
        data.date,
        data.checkIn || null,
        data.checkOut || null,
        data.method,
        data.notes
      ],
      req.user!.schoolId
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Bulk check-in
router.post('/bulk-checkin', authenticateToken, requireRole(['school_admin', 'staff']), async (req: AuthRequest, res, next) => {
  try {
    const { studentIds, date, method } = req.body;
    const checkInTime = new Date().toISOString();

    await Database.transaction(async (client) => {
      for (const studentId of studentIds) {
        await client.query(
          `INSERT INTO student_attendance (school_id, student_id, date, check_in, method)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (school_id, student_id, date)
           DO UPDATE SET check_in = EXCLUDED.check_in, method = EXCLUDED.method`,
          [req.user!.schoolId, studentId, date, checkInTime, method]
        );
      }
    }, req.user!.schoolId);

    res.json({ message: 'Bulk check-in completed', count: studentIds.length });
  } catch (error) {
    next(error);
  }
});

// Get attendance summary
router.get('/summary', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const result = await Database.query(
      `SELECT 
         COUNT(*) as total_students,
         COUNT(sa.id) as present_count,
         COUNT(*) - COUNT(sa.id) as absent_count,
         COUNT(CASE WHEN sa.late_minutes > 0 THEN 1 END) as late_count
       FROM students s
       LEFT JOIN student_attendance sa ON s.id = sa.student_id AND sa.date = $1
       WHERE s.deleted_at IS NULL`,
      [targetDate],
      req.user!.schoolId
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export { router as attendanceRouter };