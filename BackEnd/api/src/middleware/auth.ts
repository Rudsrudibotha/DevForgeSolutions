import { Request, Response, NextFunction } from 'express';
import { db, setTenant } from '../services/database.js';
import { verifyAccess, JwtClaims } from '../services/jwt.js';

export interface AuthRequest extends Request {
  user?: JwtClaims & { email: string };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = verifyAccess(token);
    
    // Verify user still exists and has access to school
    const client = await db.connect();
    try {
      await setTenant(client, decoded.school_id);
      const result = await client.query(
        `SELECT u.email FROM users u
         JOIN user_school_memberships usm ON u.id = usm.user_id
         WHERE u.id = $1 AND usm.school_id = $2 AND usm.status = 'approved'`,
        [decoded.sub, decoded.school_id]
      );
      
      if (result.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }

      req.user = {
        ...decoded,
        email: result.rows[0].email
      };

      next();
    } finally {
      client.release();
    }


  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};