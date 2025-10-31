import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export type JwtClaims = { sub: string; role: string; school_id: string };
export const signAccess = (c: JwtClaims) => {
  if (!env.JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET not configured');
  return jwt.sign(c, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
};

export const signRefresh = (c: JwtClaims & { ver: number }) => {
  if (!env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET not configured');
  return jwt.sign(c, env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
};

export const verifyAccess = (t: string) => {
  if (!env.JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET not configured');
  return jwt.verify(t, env.JWT_ACCESS_SECRET) as JwtClaims;
};

export const verifyRefresh = (t: string) => {
  if (!env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET not configured');
  return jwt.verify(t, env.JWT_REFRESH_SECRET) as JwtClaims & { ver: number };
};