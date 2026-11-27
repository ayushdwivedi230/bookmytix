import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error(`${req.method} ${req.url} error: ${err.message}`, err, {
    method: req.method,
    url: req.url,
  });

  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    res.status(400).json({
      error: firstIssue?.message || 'Validation error',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Handle PostgreSQL specific errors
  const errCode = (err as any).code;
  if (errCode === '23505') {
    res.status(409).json({ error: 'A record with these details already exists.' });
    return;
  }

  if (errCode === 'ECONNREFUSED' || err.message?.includes('connect ECONNREFUSED')) {
    res.status(503).json({
      error: 'Database connection failed. If deployed on Vercel, please check that DATABASE_URL is set in your Vercel Environment Variables.',
    });
    return;
  }

  const errorMessage =
    process.env.NODE_ENV === 'production' && !err.message?.includes('database') && !err.message?.includes('Connection')
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(500).json({ error: errorMessage });
}
