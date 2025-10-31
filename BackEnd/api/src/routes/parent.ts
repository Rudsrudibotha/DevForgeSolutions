import { Router } from 'express';
import { db, setTenantContext } from '../services/database.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();

const requireParent = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'parent') {
    return res.status(403).json({ ok: false, error: 'Parent access required' });
  }
  next();
};

// Get children
r.get('/children', requireAuth, requireParent, async (req, res, next) => {
  try {
    const client = await db.connect();
    try {
      await setTenantContext(client, req.user.school_id);
      const { rows } = await client.query(`
        SELECT s.id, s.student_no, s.first_name, s.last_name, s.grade, s.class_group
        FROM students s
        JOIN student_guardians sg ON s.id = sg.student_id
        JOIN guardians g ON sg.guardian_id = g.id
        WHERE g.user_id = $1 AND s.deleted_at IS NULL
      `, [req.user.sub]);
      res.json(rows);
    } finally {
      client.release();
    }
  } catch (e: any) {
    next(e);
  }
});

// Get child attendance
r.get('/children/:id/attendance', requireAuth, requireParent, async (req, res, next) => {
  try {
    const client = await db.connect();
    try {
      await setTenantContext(client, req.user.school_id);
      const { rows } = await client.query(`
        SELECT sa.date, sa.check_in, sa.check_out, sa.notes
        FROM student_attendance sa
        JOIN students s ON sa.student_id = s.id
        JOIN student_guardians sg ON s.id = sg.student_id
        JOIN guardians g ON sg.guardian_id = g.id
        WHERE g.user_id = $1 AND s.id = $2
        ORDER BY sa.date DESC LIMIT 30
      `, [req.user.sub, req.params.id]);
      res.json(rows);
    } finally {
      client.release();
    }
  } catch (e: any) {
    next(e);
  }
});

// Get invoices
r.get('/invoices', requireAuth, requireParent, async (req, res, next) => {
  try {
    const client = await db.connect();
    try {
      await setTenantContext(client, req.user.school_id);
      const { rows } = await client.query(`
        SELECT i.id, i.issue_date, i.due_date, i.balance_cents, i.status,
               s.first_name, s.last_name
        FROM invoices i
        JOIN students s ON i.student_id = s.id
        JOIN student_guardians sg ON s.id = sg.student_id
        JOIN guardians g ON sg.guardian_id = g.id
        WHERE g.user_id = $1
        ORDER BY i.issue_date DESC
      `, [req.user.sub]);
      res.json(rows);
    } finally {
      client.release();
    }
  } catch (e: any) {
    next(e);
  }
});

export default r;