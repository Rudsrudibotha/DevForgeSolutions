import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from './config/env.js';

export function initRealtime(httpServer: HttpServer) {
  const io = new Server(httpServer, { cors: { origin: true, credentials: true } });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.toString()?.replace('Bearer ','') || '';
    try {
      const claims = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
      (socket as any).user = claims;
      socket.join(`school:${claims.school_id}`);
      next();
    } catch { next(new Error('Unauthorized')); }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user;
    socket.on('attendance:update', (payload) => {
      io.to(`school:${user.school_id}`).emit('attendance:changed', payload);
    });
    socket.on('notify:parent', (payload) => {
      io.to(`school:${user.school_id}`).emit('notification', payload);
    });
    socket.on('contract:signed', (payload) => {
      io.to(`school:${user.school_id}`).emit('contract:status', payload);
    });
  });

  return io;
}