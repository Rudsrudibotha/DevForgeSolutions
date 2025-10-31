import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export type JwtClaims = { sub: string; role: string; school_id: string };
export const signAccess = (c: JwtClaims) => {
  try {
    if (!env.JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET not configured');
    return jwt.sign(c, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
  } catch (e) {
    throw new Error('Failed to sign access token');
  }
};

export const signRefresh = (c: JwtClaims & { ver: number }) => {
  try {
    if (!env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET not configured');
    return jwt.sign(c, env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
  } catch (e) {
    throw new Error('Failed to sign refresh token');
  }
};

export const verifyAccess = (t: string) => {
  try {
    if (!env.JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET not configured');
    return jwt.verify(t, env.JWT_ACCESS_SECRET) as JwtClaims;
  } catch (e) {
    throw new Error('Invalid access token');
  }
};

export const verifyRefresh = (t: string) => {
  try {
    if (!env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET not configured');
    return jwt.verify(t, env.JWT_REFRESH_SECRET) as JwtClaims & { ver: number };
  } catch (e) {
    throw new Error('Invalid refresh token');
  }
};