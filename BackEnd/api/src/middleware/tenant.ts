import type { Request, Response, NextFunction } from 'express';
import { db } from '../services/database.js';

export interface TenantRequest extends Request {
  user?: {
    sub: string;
    role: string;
    school_id: string;
  };
  schoolId?: string;
}

export async function setTenantContext(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.school_id) {
      return res.status(400).json({ ok: false, error: 'No school context' });
    }

    // Check school status
    const { rows } = await db.query(
      'SELECT status FROM schools WHERE id = $1',
      [req.user.school_id]
    );

    if (!rows.length) {
      return res.status(404).json({ ok: false, error: 'School not found' });
    }

    const school = rows[0];
    
    // Block access for suspended schools (except billing endpoints)
    if (school.status === 'suspended' && !req.path.includes('/billing')) {
      return res.status(403).json({ 
        ok: false, 
        error: 'School suspended', 
        redirect: '/billing' 
      });
    }

    // Set tenant context for RLS
    const client = await db.connect();
    try {
      await client.query('SELECT app.set_school($1)', [req.user.school_id]);
      req.schoolId = req.user.school_id;
      next();
    } finally {
      client.release();
    }
  } catch (e: any) {
    next(e);
  }
}

export function requireRole(roles: string[]) {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, error: 'Insufficient permissions' });
    }
    next();
  };
}