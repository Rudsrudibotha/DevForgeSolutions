import * as Sentry from "@sentry/node";

export function initSentry(dsn?: string) { 
  if (dsn) Sentry.init({ dsn, tracesSampleRate: 0.1 }); 
}