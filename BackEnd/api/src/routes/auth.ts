import { Router } from 'express';
import { db } from '../services/database.js';
import { LoginSchema, RegisterSchema } from '../types/auth.js';
import { signAccess, signRefresh, verifyRefresh } from '../services/jwt.js';
import crypto from 'crypto';

const r = Router();

// CSRF protection for state-changing operations
const csrfProtection = (req: any, res: any, next: any) => {
  const token = req.headers['x-csrf-token'] || req.headers['X-CSRF-Token'];
  if (!token || typeof token !== 'string') {
    return res.status(403).json({ ok: false, error: { code: 'CSRF_REQUIRED', message: 'CSRF token required' } });
  }
  next();
};

r.post('/register', csrfProtection, async (req, res, next) => {
  try {
    const dto = RegisterSchema.parse(req.body);
    
    // Find school by slug
    const school = await db.query('SELECT id, status FROM schools WHERE slug = $1', [dto.school_slug]);
    if (!school.rows.length) {
      return res.status(404).json({ ok: false, error: 'School not found' });
    }
    
    const schoolId = school.rows[0].id;
    const schoolStatus = school.rows[0].status;
    
    if (!['active', 'trial'].includes(schoolStatus)) {
      return res.status(400).json({ ok: false, error: 'School not accepting registrations' });
    }
    
    // Create user
    const { rows } = await db.query(
      `INSERT INTO users (school_id, email, password_hash, full_name, role, status)
       VALUES ($1, $2, app.bcrypt($3), $4, 'parent', 'pending')
       RETURNING id, email, full_name`,
      [schoolId, dto.email, dto.password, dto.full_name]
    );
    
    res.json({ 
      ok: true, 
      user: rows[0], 
      message: 'Registration submitted. Awaiting school admin approval.' 
    });
  } catch (e: any) {
    if (e.code === '23505') {
      return res.status(400).json({ ok: false, error: 'Email already registered for this school' });
    }
    req.log?.error({ error: e.message }, 'Registration failed');
    next(e);
  }
});

r.post('/login', csrfProtection, async (req, res, next) => {
  try {
    const dto = LoginSchema.parse(req.body);
    
    // Check platform owner first
    const platformOwner = await db.query(
      'SELECT id, full_name, email FROM platform_owners WHERE email = $1 AND password_hash = crypt($2, password_hash)',
      [dto.email, dto.password]
    );
    
    if (platformOwner.rows.length > 0) {
      const user = platformOwner.rows[0];
      const payload = { sub: user.id, role: 'platform_owner', email: user.email };
      const access = signAccess(payload);
      const refresh = signRefresh({ ...payload, ver: 1 });
      return res.json({ ok: true, access, refresh, user: { ...user, role: 'platform_owner' } });
    }
    
    // Check school users
    const { rows } = await db.query(
      `SELECT u.id, u.full_name, u.email, u.school_id, u.role, s.status as school_status
       FROM users u
       JOIN schools s ON u.school_id = s.id
       WHERE u.email = $1 AND u.password_hash = crypt($2, u.password_hash) AND u.status = 'approved'
       LIMIT 1`,
      [dto.email, dto.password]
    );
    
    if (!rows.length) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials or not approved' });
    }
    
    const user = rows[0];
    const payload = { sub: user.id, role: user.role, school_id: user.school_id };
    const access = signAccess(payload);
    const refresh = signRefresh({ ...payload, ver: 1 });
    
    res.json({ 
      ok: true, 
      access, 
      refresh, 
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        school_id: user.school_id,
        school_status: user.school_status
      }
    });
  } catch (e: any) {
    req.log?.error({ error: e.message }, 'Login failed');
    next(e);
  }
});

r.post('/refresh', csrfProtection, async (req, res, next) => {
  try {
    const token = String(req.body?.refresh || '');
    if (!token) return res.status(400).json({ ok: false, error: 'Refresh token required' });
    
    const claims = verifyRefresh(token);
    const { rows } = await db.query(
      `select 1 from auth_refresh_tokens t where t.user_id=$1`,
      [claims.sub]
    );
    if (!rows.length) return res.status(401).json({ ok:false, error:'Refresh revoked' });
    const access = signAccess({ sub: claims.sub, role: claims.role, school_id: claims.school_id });
    res.json({ ok:true, access });
  } catch (e: any) {
    req.log?.warn({ error: e.name }, 'Refresh token validation failed');
    const refreshError = new Error('Invalid refresh token');
    refreshError.status = 401;
    refreshError.code = 'INVALID_REFRESH';
    next(refreshError);
  }
});

export default r;