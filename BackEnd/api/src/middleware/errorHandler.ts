import type { NextFunction, Request, Response } from "express";
import * as Sentry from "@sentry/node";

/** Standard API error shape (no stack in prod) */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const status = Number(err?.status || err?.statusCode || 500);
  const code = err?.code || "INTERNAL_ERROR";

  // Log with sanitized structured data to prevent log injection
  req.log?.error({ 
    code, 
    status, 
    path: req.path?.replace(/[\r\n\t]/g, " ")?.slice(0, 200), 
    method: req.method,
    message: String(err?.message || "").replace(/[\r\n\t]/g, " ").slice(0, 500)
  }, "Request error occurred");

  // Send to Sentry with sanitized context
  try {
    if (Sentry.getCurrentHub().getClient()) {
      Sentry.withScope((scope) => {
        scope.setTag("route", req.path?.slice(0, 100) || "unknown");
        scope.setContext("request", {
          method: req.method,
          url: req.originalUrl?.slice(0, 200),
          id: (req as any).id,
          user: (req as any).user?.sub,
        });
        Sentry.captureException(err);
      });
    }
  } catch (sentryErr) {
    req.log?.warn("Failed to send error to Sentry");
  }

  const isProd = process.env.NODE_ENV === "production";
  const payload = {
    ok: false,
    error: { code, message: isProd ? "Something went wrong" : String(err?.message || err) }
  };
  res.status(status).json(payload);
}

/** Wrap async route handlers to avoid unhandled rejections */
export const asyncHandler = <T extends (...args: any[]) => Promise<any>>(fn: T) =>
  (req: Request, res: Response, next: NextFunction) => void fn(req, res, next).catch(next);