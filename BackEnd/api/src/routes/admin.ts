import { Router } from 'express';
import { db } from '../services/database.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();

const csrfProtection = (req: any, res: any, next: any) => {
  const token = req.headers['x-csrf-token'] || req.headers['X-CSRF-Token'];
  if (!token) return res.status(403).json({ ok: false, error: 'CSRF token required' });
  next();
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ ok: false, error: 'Admin access required' });
  next();
};

// Get all schools
r.get('/schools', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT s.*, COUNT(u.id) as user_count, 
             COUNT(CASE WHEN usm.status = 'pending' THEN 1 END) as pending_users
      FROM schools s
      LEFT JOIN user_school_memberships usm ON s.id = usm.school_id
      LEFT JOIN users u ON usm.user_id = u.id
      GROUP BY s.id ORDER BY s.created_at DESC
    `);
    res.json(rows);
  } catch (e: any) {
    next(e);
  }
});

// Approve/reject school registration
r.patch('/schools/:id/status', csrfProtection, requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Invalid status' });
    }
    
    await db.query('UPDATE schools SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ ok: true });
  } catch (e: any) {
    next(e);
  }
});

// Get system stats
r.get('/stats', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const stats = await Promise.all([
      db.query('SELECT COUNT(*) as total_schools FROM schools'),
      db.query('SELECT COUNT(*) as active_schools FROM schools WHERE status = $1', ['approved']),
      db.query('SELECT COUNT(*) as total_users FROM users'),
      db.query('SELECT COUNT(*) as pending_approvals FROM user_school_memberships WHERE status = $1', ['pending'])
    ]);
    
    res.json({
      totalSchools: stats[0].rows[0].total_schools,
      activeSchools: stats[1].rows[0].active_schools,
      totalUsers: stats[2].rows[0].total_users,
      pendingApprovals: stats[3].rows[0].pending_approvals
    });
  } catch (e: any) {
    next(e);
  }
});

export default r;