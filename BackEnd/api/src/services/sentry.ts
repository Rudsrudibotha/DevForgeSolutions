import * as Sentry from "@sentry/node";

export function initSentry(dsn?: string) {
  if (!dsn) return;
  
  try {
    Sentry.init({ 
      dsn, 
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV || 'development'
    });
    console.log('Sentry initialized successfully');
  } catch (error) {
    console.error('Sentry initialization failed:', error instanceof Error ? error.message : 'Unknown error');
  }
}