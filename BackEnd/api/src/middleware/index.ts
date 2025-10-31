import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";

const ORIGIN_ALLOWLIST = (process.env.CORS_ALLOWLIST || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

export const security = [
  helmet(),
  cors({
    origin(origin, cb) {
      if (!origin || ORIGIN_ALLOWLIST.includes(origin)) return cb(null, true);
      return cb(new Error("CORS: origin not allowed"));
    },
    credentials: true
  }),
];

export const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  // Do not leak specifics
  message: { ok: false, error: { code: "RATE_LIMITED", message: "Too many requests" } }
});

/** Minimal 404 to avoid vague errors in scanners */
export function notFound(_req: Request, res: Response) {
  res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Route not found" } });
}

/** Guard to stop logging multi-line messages (CWE-117) */
export function sanitizeLogInput(input: string) {
  return (input || "").replace(/[\r\n\t]/g, " ").slice(0, 1000);
}

/** SSRF protection for outbound requests */
export function assertAllowedOutbound(urlStr: string) {
  try {
    const u = new URL(urlStr);
    const allow = (process.env.OUTBOUND_ALLOWLIST || "").split(",").map(s => s.trim()).filter(Boolean);
    
    // Block private/internal networks
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname.startsWith('192.168.') || u.hostname.startsWith('10.')) {
      throw Object.assign(new Error("Private network access denied"), { status: 400 });
    }
    
    if (allow.length > 0 && !allow.includes(u.hostname)) {
      throw Object.assign(new Error("Outbound host not allowed"), { status: 400 });
    }
  } catch (e) {
    if (e instanceof Error && 'status' in e) throw e;
    throw Object.assign(new Error("Invalid URL"), { status: 400 });
  }
}