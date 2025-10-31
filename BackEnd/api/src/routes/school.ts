import { Router } from 'express';
import { db, setTenantContext } from '../services/database.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();

const csrfProtection = (req: any, res: any, next: any) => {
  const token = req.headers['x-csrf-token'] || req.headers['X-CSRF-Token'];
  if (!token) return res.status(403).json({ ok: false, error: 'CSRF token required' });
  next();
};

const requireSchoolAdmin = (req: any, res: any, next: any) => {
  if (!['school_admin', 'staff'].includes(req.user?.role)) {
    return res.status(403).json({ ok: false, error: 'School admin access required' });
  }
  next();
};

// Dashboard stats
r.get('/dashboard', requireAuth, requireSchoolAdmin, async (req, res, next) => {
  try {
    const client = await db.connect();
    try {
      await setTenantContext(client, req.user.school_id);
      
      const stats = await Promise.all([
        client.query('SELECT COUNT(*) as total FROM students WHERE deleted_at IS NULL'),
        client.query('SELECT COUNT(*) as present FROM student_attendance WHERE date = CURRENT_DATE'),
        client.query('SELECT COUNT(*) as pending FROM user_school_memberships WHERE status = $1', ['pending']),
        client.query('SELECT SUM(balance_cents) as revenue FROM invoices WHERE status = $1', ['paid'])
      ]);
      
      res.json({
        totalStudents: stats[0].rows[0].total,
        presentToday: stats[1].rows[0].present,
        pendingApprovals: stats[2].rows[0].pending,
        monthlyRevenue: stats[3].rows[0].revenue || 0
      });
    } finally {
      client.release();
    }
  } catch (e: any) {
    next(e);
  }
});

// Manage users
r.get('/users', requireAuth, requireSchoolAdmin, async (req, res, next) => {
  try {
    const client = await db.connect();
    try {
      await setTenantContext(client, req.user.school_id);
      const { rows } = await client.query(`
        SELECT u.id, u.full_name, u.email, usm.role, usm.status, usm.created_at
        FROM users u
        JOIN user_school_memberships usm ON u.id = usm.user_id
        WHERE usm.school_id = $1
        ORDER BY usm.created_at DESC
      `, [req.user.school_id]);
      res.json(rows);
    } finally {
      client.release();
    }
  } catch (e: any) {
    next(e);
  }
});

// Approve user
r.patch('/users/:id/approve', csrfProtection, requireAuth, requireSchoolAdmin, async (req, res, next) => {
  try {
    const client = await db.connect();
    try {
      await setTenantContext(client, req.user.school_id);
      await client.query(
        'UPDATE user_school_memberships SET status = $1 WHERE user_id = $2 AND school_id = $3',
        ['approved', req.params.id, req.user.school_id]
      );
      res.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (e: any) {
    next(e);
  }
});

export default r;