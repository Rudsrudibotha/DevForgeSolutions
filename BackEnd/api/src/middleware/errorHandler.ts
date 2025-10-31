import type { NextFunction, Request, Response } from "express";
import * as Sentry from "@sentry/node";

/** Standard API error shape (no stack in prod) */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  if (!err) return;
  const status = Number(err?.status || err?.statusCode || 500);
  const code = err?.code || "INTERNAL_ERROR";

  // Log with sanitized structured data to prevent log injection
  const sanitize = (str: string) => str.replace(/[\r\n\t\x00-\x1f\x7f-\x9f]/g, " ").trim();
  
  req.log?.error({ 
    code: sanitize(String(code)).slice(0, 50), 
    status, 
    path: sanitize(req.path || "").slice(0, 200), 
    method: req.method,
    message: sanitize(String(err?.message || "")).slice(0, 200)
  }, "Request error occurred");

  // Send to Sentry with sanitized context
  try {
    if (Sentry.getCurrentHub().getClient()) {
      Sentry.withScope((scope) => {
        scope.setTag("route", sanitize(req.path || "").slice(0, 100) || "unknown");
        scope.setContext("request", {
          method: req.method,
          url: sanitize(req.originalUrl || "").slice(0, 200),
          id: sanitize(String((req as any).id || "")).slice(0, 50),
          user: sanitize(String((req as any).user?.sub || "")).slice(0, 50),
        });
        Sentry.captureException(err);
      });
    }
  } catch (sentryErr) {
    req.log?.warn("Failed to send error to Sentry");
  }

  if (res.headersSent) return;
  const isProd = process.env.NODE_ENV === "production";
  const payload = {
    ok: false,
    error: { code: sanitize(String(code)).slice(0, 50), message: isProd ? "Something went wrong" : sanitize(String(err?.message || err)).slice(0, 200) }
  };
  res.status(status).json(payload);
}

/** Wrap async route handlers to avoid unhandled rejections */
export const asyncHandler = <T extends (...args: any[]) => Promise<any>>(fn: T) =>
  (req: Request, res: Response, next: NextFunction) => void fn(req, res, next).catch(next);