import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errorId = Date.now().toString(36);
  console.error(`[${errorId}] Error on ${req.method} ${req.path}:`, {
    message: error.message,
    stack: error.stack,
    code: error.code
  });

  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
    });
  }

  const DB_ERRORS = {
    '23505': { status: 409, message: 'Resource already exists' },
    '23503': { status: 400, message: 'Referenced resource not found' },
    '23502': { status: 400, message: 'Required field missing' }
  };

  const dbError = DB_ERRORS[error.code as keyof typeof DB_ERRORS];
  if (dbError) {
    return res.status(dbError.status).json({ error: dbError.message });
  }

  res.status(500).json({
    error: 'Internal server error',
    errorId,
    ...(process.env.NODE_ENV === 'development' && { message: error.message })
  });
};