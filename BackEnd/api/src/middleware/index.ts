import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import type { Request, Response, NextFunction } from 'express';
import { verifyAccess } from '../services/jwt.js';

try {
  var securityMiddleware = [helmet(), cors({ origin: true, credentials: true })];
} catch (error) {
  console.error('Security middleware initialization failed:', error);
  process.exit(1);
}

export { securityMiddleware };

export const rateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests' });
  }
});

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Token required' });
    }
    
    const claims = verifyAccess(token);
    (req as any).user = claims;
    return next();
  } catch (error) {
    console.error('Authentication failed:', error?.message || 'Unknown error');
    return res.status(401).json({ ok: false, error: 'Invalid token' });
  }
}

export function setTenantFromJwt(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    if (!user?.school_id) {
      return res.status(400).json({ error: 'School ID required' });
    }
    (req as any).school_id = user.school_id;
    next();
  } catch (error) {
    console.error('Tenant setup error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}