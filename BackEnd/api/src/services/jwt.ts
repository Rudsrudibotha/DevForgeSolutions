import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export type JwtClaims = { sub: string; role: string; school_id?: string };

const validateSecret = (secret: string | undefined, type: string): string => {
  if (!secret || secret.length < 32) {
    throw new Error(`${type} secret not properly configured`);
  }
  return secret;
};

export const signAccess = (c: JwtClaims): string => {
  const secret = validateSecret(env.JWT_ACCESS_SECRET, 'JWT_ACCESS');
  return jwt.sign(c, secret, { expiresIn: '15m', algorithm: 'HS256' });
};

export const signRefresh = (c: JwtClaims & { ver: number }): string => {
  const secret = validateSecret(env.JWT_REFRESH_SECRET, 'JWT_REFRESH');
  return jwt.sign(c, secret, { expiresIn: '30d', algorithm: 'HS256' });
};

export const verifyAccess = (t: string): JwtClaims => {
  if (!t || typeof t !== 'string') {
    throw new Error('Token required');
  }
  const secret = validateSecret(env.JWT_ACCESS_SECRET, 'JWT_ACCESS');
  return jwt.verify(t, secret, { algorithms: ['HS256'] }) as JwtClaims;
};

export const verifyRefresh = (t: string): JwtClaims & { ver: number } => {
  if (!t || typeof t !== 'string') {
    throw new Error('Token required');
  }
  const secret = validateSecret(env.JWT_REFRESH_SECRET, 'JWT_REFRESH');
  return jwt.verify(t, secret, { algorithms: ['HS256'] }) as JwtClaims & { ver: number };
};