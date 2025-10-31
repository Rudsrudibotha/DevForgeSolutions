import { Router } from 'express';
import { db } from '../services/database.js';
import { requireAuth } from '../middleware/auth.js';
import type { TenantRequest } from '../middleware/tenant.js';

const r = Router();

// Get school billing info (accessible even when suspended)
r.get('/status', requireAuth, async (req: TenantRequest, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT name, status, suspended_at, suspension_reason, plan_type, max_students, max_staff
       FROM schools WHERE id = $1`,
      [req.user?.school_id]
    );

    if (!rows.length) {
      return res.status(404).json({ ok: false, error: 'School not found' });
    }

    const school = rows[0];
    
    // Get usage stats
    const usage = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM students WHERE school_id = $1 AND deleted_at IS NULL', [req.user?.school_id]),
      db.query('SELECT COUNT(*) as count FROM users WHERE school_id = $1 AND status = $2', [req.user?.school_id, 'approved'])
    ]);

    res.json({
      ...school,
      usage: {
        students: usage[0].rows[0].count,
        staff: usage[1].rows[0].count
      }
    });
  } catch (e: any) {
    next(e);
  }
});

// Simulate payment (in real app, integrate with payment provider)
r.post('/pay', requireAuth, async (req: TenantRequest, res, next) => {
  try {
    const { amount, method = 'card' } = req.body;
    
    if (!amount || amount < 100) {
      return res.status(400).json({ ok: false, error: 'Invalid payment amount' });
    }

    // In real implementation, process payment with provider
    // For demo, just reactivate the school
    await db.query(
      `UPDATE schools 
       SET status = 'active', suspended_at = NULL, suspension_reason = NULL
       WHERE id = $1`,
      [req.user?.school_id]
    );

    // Log payment
    await db.query(
      `INSERT INTO audit_logs (school_id, user_id, action, resource_type, details)
       VALUES ($1, $2, 'payment_processed', 'billing', $3)`,
      [req.user?.school_id, req.user?.sub, JSON.stringify({ amount, method })]
    );

    res.json({ ok: true, message: 'Payment processed successfully' });
  } catch (e: any) {
    next(e);
  }
});

export default r;