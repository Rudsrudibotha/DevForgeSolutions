import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from './config/env.js';

export function initRealtime(http: HttpServer) {
  const io = new Server(http, { cors: { origin: true, credentials: true } });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.toString()?.replace('Bearer ','') || '';
    try {
      const claims = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
      (socket as any).user = claims;
      socket.join(`school:${claims.school_id}`);
      next();
    } catch { next(new Error('Unauthorized')); }
  });

  io.on('connection', (s) => {
    const u = (s as any).user;
    s.on('attendance:update', (payload) => {
      io.to(`school:${u.school_id}`).emit('attendance:changed', payload);
    });
    s.on('notify:parent', (payload) => {
      io.to(`school:${u.school_id}`).emit('notification', payload);
    });
    s.on('contract:signed', (payload) => {
      io.to(`school:${u.school_id}`).emit('contract:status', payload);
    });
  });

  return io;
}