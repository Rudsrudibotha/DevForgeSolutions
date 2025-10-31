import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export type JwtClaims = { sub: string; role: string; school_id: string };
export const signAccess = (c: JwtClaims) =>
  jwt.sign(c, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
export const signRefresh = (c: JwtClaims & { ver: number }) =>
  jwt.sign(c, env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
export const verifyAccess = (t: string) => {
  try {
    return jwt.verify(t, env.JWT_ACCESS_SECRET) as JwtClaims;
  } catch (error) {
    throw new Error('Invalid access token');
  }
};
export const verifyRefresh = (t: string) => {
  try {
    return jwt.verify(t, env.JWT_REFRESH_SECRET) as JwtClaims & { ver: number };
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};