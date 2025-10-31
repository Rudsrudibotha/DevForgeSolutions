import * as Sentry from "@sentry/node";

export function initSentry(dsn?: string) {
  try {
    if (dsn) {
      Sentry.init({ dsn, tracesSampleRate: 0.1 });
      console.log('Sentry initialized');
    }
  } catch (error) {
    console.warn('Failed to initialize Sentry:', error);
  }
}