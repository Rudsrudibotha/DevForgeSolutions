import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from './config/env.js';

export function initRealtime(httpServer: HttpServer) {
  try {
    const io = new Server(httpServer, { 
      cors: { origin: true, credentials: true },
      transports: ['websocket', 'polling']
    });

    io.use((socket, next) => {
      try {
        const authToken = socket.handshake.auth?.token || 
                         socket.handshake.headers.authorization?.toString()?.replace('Bearer ', '') || '';
        
        if (!authToken) {
          return next(new Error('Authentication token required'));
        }
        
        const userClaims = jwt.verify(authToken, env.JWT_ACCESS_SECRET) as any;
        (socket as any).user = userClaims;
        socket.join(`school:${userClaims.school_id}`);
        next();
      } catch (error) {
        console.error('Socket auth error:', error);
        next(new Error('Invalid authentication token'));
      }
    });

    io.on('connection', (socket) => {
      const user = (socket as any).user;
      console.log('User connected', { userId: user.sub?.substring(0, 8), schoolId: user.school_id?.substring(0, 8) });
      
      const eventHandlers = {
        'attendance:update': (payload: any) => {
          if (payload && typeof payload === 'object') {
            io.to(`school:${user.school_id}`).emit('attendance:changed', payload);
          }
        },
        'notify:parent': (payload: any) => {
          if (payload && typeof payload === 'object') {
            io.to(`school:${user.school_id}`).emit('notification', payload);
          }
        },
        'contract:signed': (payload: any) => {
          if (payload && typeof payload === 'object') {
            io.to(`school:${user.school_id}`).emit('contract:status', payload);
          }
        }
      };
      
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        socket.on(event, handler);
      });
      
      socket.on('disconnect', () => {
        console.log('User disconnected', { userId: user.sub?.substring(0, 8) });
      });
    });

    return io;
  } catch (error) {
    console.error('Failed to initialize realtime server:', error);
    throw error;
  }
}