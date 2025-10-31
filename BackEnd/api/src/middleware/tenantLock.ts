import type { Request, Response, NextFunction } from 'express';
import { db } from '../services/database.js';

const ALLOWED_SUSPENDED_PATHS = ['/auth', '/billing', '/health'];

export async function enforceTenantLock(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    
    // Skip for platform owners and allowed paths
    if (!user?.school_id || ALLOWED_SUSPENDED_PATHS.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Check school status
    const { rows } = await db.query(
      'SELECT status FROM schools WHERE id = $1',
      [user.school_id]
    );

    if (!rows.length) {
      return res.status(404).json({ ok: false, error: 'School not found' });
    }

    const schoolStatus = rows[0].status;

    // Block suspended schools
    if (schoolStatus === 'suspended') {
      return res.status(403).json({ 
        ok: false, 
        error: 'Account suspended', 
        redirect: '/billing',
        message: 'Your school account is suspended. Please visit the billing page to reactivate.'
      });
    }

    // Show warning for past_due
    if (schoolStatus === 'past_due') {
      res.setHeader('X-Account-Warning', 'Payment overdue - account may be suspended soon');
    }

    next();
  } catch (e: any) {
    next(e);
  }
}