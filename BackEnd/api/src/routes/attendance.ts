import { Router } from 'express';
import { z } from 'zod';
import { Database } from '../services/database.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

const csrfProtection = (req: any, res: any, next: any) => {
  const token = req.headers['x-csrf-token'];
  if (!token) return res.status(403).json({ ok: false, error: 'CSRF token required' });
  next();
};

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
    console.error('Attendance query error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// Record attendance
router.post('/', csrfProtection, authenticateToken, requireRole(['school_admin', 'staff']), async (req: AuthRequest, res, next) => {
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
    console.error('Record attendance error:', error);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

// Bulk check-in
router.post('/bulk-checkin', csrfProtection, authenticateToken, requireRole(['school_admin', 'staff']), async (req: AuthRequest, res, next) => {
  try {
    const { studentIds, date, method } = req.body;
    const checkInTime = new Date().toISOString();

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'Student IDs required' });
    }
    
    await Database.transaction(async (client) => {
      const promises = studentIds.map(studentId => 
        client.query(
          `INSERT INTO student_attendance (school_id, student_id, date, check_in, method)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (school_id, student_id, date)
           DO UPDATE SET check_in = EXCLUDED.check_in, method = EXCLUDED.method`,
          [req.user!.schoolId, studentId, date, checkInTime, method]
        )
      );
      await Promise.all(promises);
    }, req.user!.schoolId);

    res.json({ message: 'Bulk check-in completed', count: studentIds.length });
  } catch (error) {
    console.error('Bulk check-in error:', error);
    res.status(500).json({ error: 'Failed to complete bulk check-in' });
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
    console.error('Attendance summary error:', error);
    res.status(500).json({ error: 'Failed to get attendance summary' });
  }
});

export { router as attendanceRouter };