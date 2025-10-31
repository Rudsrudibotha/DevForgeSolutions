import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

/** Require Bearer JWT in Authorization header */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : "";
    if (!token) return res.status(401).json({ ok: false, error: { code: "NO_TOKEN", message: "Unauthorized" } });

    if (!process.env.JWT_ACCESS_SECRET) {
      req.log?.error("JWT_ACCESS_SECRET not configured");
      return res.status(500).json({ ok: false, error: { code: "CONFIG_ERROR", message: "Server misconfigured" } });
    }

    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET) as any;
    (req as any).user = { sub: payload.sub, role: payload.role, school_id: payload.school_id };
    return next();
  } catch (e: any) {
    req.log?.warn({ code: "AUTH_FAIL", reason: e?.name || "unknown" }, "Authentication failed");
    return res.status(401).json({ ok: false, error: { code: "INVALID_TOKEN", message: "Unauthorized" } });
  }
}

/**
 * CSRF note:
 * If you use Authorization: Bearer (no cookies), CSRF is not applicable.
 * If you ever set refresh tokens in cookies, enable double-submit CSRF tokens and SameSite=strict.
 */