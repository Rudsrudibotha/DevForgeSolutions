import { Router } from 'express';
import { db } from '../services/database.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();

const requirePlatformOwner = (req: any, res: any, next: any) => {
  // Platform owners don't have school_id
  if (req.user?.school_id) {
    return res.status(403).json({ ok: false, error: 'Platform owner access required' });
  }
  next();
};

// Platform dashboard stats
r.get('/stats', requireAuth, requirePlatformOwner, async (req, res, next) => {
  try {
    const stats = await Promise.all([
      db.query('SELECT COUNT(*) as total FROM schools'),
      db.query('SELECT COUNT(*) as active FROM schools WHERE status = $1', ['active']),
      db.query('SELECT COUNT(*) as suspended FROM schools WHERE status = $1', ['suspended']),
      db.query('SELECT COUNT(*) as total_users FROM users'),
      db.query('SELECT SUM(max_students) as total_capacity FROM schools WHERE status = $1', ['active'])
    ]);

    res.json({
      totalSchools: stats[0].rows[0].total,
      activeSchools: stats[1].rows[0].active,
      suspendedSchools: stats[2].rows[0].suspended,
      totalUsers: stats[3].rows[0].total_users,
      totalCapacity: stats[4].rows[0].total_capacity || 0
    });
  } catch (e: any) {
    next(e);
  }
});

// Get all schools
r.get('/schools', requireAuth, requirePlatformOwner, async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT s.*, 
             COUNT(u.id) as user_count,
             COUNT(st.id) as student_count
      FROM schools s
      LEFT JOIN users u ON s.id = u.school_id AND u.status = 'approved'
      LEFT JOIN students st ON s.id = st.school_id AND st.deleted_at IS NULL
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    res.json(rows);
  } catch (e: any) {
    next(e);
  }
});

// Approve/suspend school
r.patch('/schools/:id/status', requireAuth, requirePlatformOwner, async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    
    if (!['active', 'suspended', 'cancelled'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Invalid status' });
    }

    const updates = ['status = $1'];
    const values = [status, req.params.id];
    
    if (status === 'suspended') {
      updates.push('suspended_at = NOW()', 'suspension_reason = $3');
      values.splice(2, 0, reason || 'Payment overdue');
    } else if (status === 'active') {
      updates.push('suspended_at = NULL', 'suspension_reason = NULL');
    }

    await db.query(
      `UPDATE schools SET ${updates.join(', ')} WHERE id = $${values.length}`,
      values
    );

    // Log action
    await db.query(
      `INSERT INTO audit_logs (school_id, user_id, action, resource_type, resource_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.params.id, req.user.sub, 'school_status_change', 'school', req.params.id, 
       JSON.stringify({ status, reason })]
    );

    res.json({ ok: true });
  } catch (e: any) {
    next(e);
  }
});

// Create new school
r.post('/schools', requireAuth, requirePlatformOwner, async (req, res, next) => {
  try {
    const { name, slug, contact_email, plan_type = 'basic' } = req.body;
    
    const { rows } = await db.query(
      `INSERT INTO schools (name, slug, contact_email, plan_type, status)
       VALUES ($1, $2, $3, $4, 'trial')
       RETURNING *`,
      [name, slug, contact_email, plan_type]
    );

    res.status(201).json(rows[0]);
  } catch (e: any) {
    if (e.code === '23505') { // Unique violation
      return res.status(400).json({ ok: false, error: 'School slug already exists' });
    }
    next(e);
  }
});

export default r;