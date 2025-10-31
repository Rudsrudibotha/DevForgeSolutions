import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";

export function initRealtime(http: HttpServer) {
  try {
    if (!http) throw new Error('HTTP server required');
    const io = new Server(http, { cors: { origin: (origin, cb) => cb(null, true), credentials: true } });

  io.use((socket, next) => {
    try {
      if (!process.env.JWT_ACCESS_SECRET) {
        return next(new Error("SERVER_CONFIG_ERROR"));
      }
      
      const raw = String(socket.handshake.auth?.token || socket.handshake.headers.authorization || "");
      const token = raw.startsWith("Bearer ") ? raw.slice(7) : raw;
      
      if (!token) {
        return next(new Error("NO_TOKEN"));
      }
      
      const claims = jwt.verify(token, process.env.JWT_ACCESS_SECRET) as any;
      (socket as any).user = { sub: claims.sub, role: claims.role, school_id: claims.school_id };
      socket.join(`school:${claims.school_id}`);
      return next();
    } catch (e: any) {
      // Log error without exposing details
      console.error("Socket auth failed:", e.name);
      return next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (s) => {
    const u = (s as any).user;
    // Payload size guard and sanitization
    function safeEmit(room: string, event: string, payload: unknown) {
      try {
        if (!room || !event) return;
        const serialized = JSON.stringify(payload);
        if (serialized.length > 50_000) {
          console.warn("Payload too large, dropping emit");
          return;
        }
        io.to(room).emit(event, payload);
      } catch (err) {
        console.error("Failed to emit event:", err instanceof Error ? err.message : "unknown");
      }
    }

    if (!u?.school_id) return s.disconnect();
    s.on("attendance:update", (p) => safeEmit(`school:${u.school_id}`, "attendance:changed", p));
    s.on("notify:parent",  (p) => safeEmit(`school:${u.school_id}`, "notification", p));
    s.on("contract:signed", (p) => safeEmit(`school:${u.school_id}`, "contract:status", p));
  });

    return io;
  } catch (e) {
    console.error('Failed to initialize realtime:', e);
    throw e;
  }
}