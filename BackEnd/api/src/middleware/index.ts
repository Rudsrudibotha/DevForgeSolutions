import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import type { Request, Response, NextFunction } from 'express';
import { verifyAccess } from '../services/jwt.js';

export const secure = [helmet(), cors({ origin: true, credentials: true })];

export const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 600, // tune per endpoint if needed
  standardHeaders: true,
  legacyHeaders: false
});

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  try {
    const claims = verifyAccess(token);
    (req as any).user = claims;
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
}

export function setTenantFromJwt(req: Request, _res: Response, next: NextFunction) {
  const u = (req as any).user;
  if (!u?.school_id) return next();
  (req as any).school_id = u.school_id;
  next();
}