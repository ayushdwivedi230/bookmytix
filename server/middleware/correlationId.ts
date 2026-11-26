import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      startTime: number;
    }
  }
}

/**
 * Sanitizes headers and body data to prevent accidental leakage of secrets,
 * passwords, tokens, or payment card numbers into logs.
 */
export function sanitizeLogData(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeLogData);

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const k = key.toLowerCase();
    if (
      k.includes('password') ||
      k.includes('token') ||
      k.includes('secret') ||
      k.includes('authorization') ||
      k.includes('cardnumber') ||
      k.includes('cvv') ||
      k.includes('key')
    ) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeLogData(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = (req.headers['x-correlation-id'] || req.headers['x-request-id']) as string | undefined;
  const correlationId = incomingId && /^[a-zA-Z0-9-_]{8,64}$/.test(incomingId) ? incomingId : randomUUID();

  req.correlationId = correlationId;
  req.startTime = Date.now();

  res.setHeader('X-Correlation-ID', correlationId);
  res.setHeader('X-Request-ID', correlationId);

  // Hook into response finish event for access logging
  res.on('finish', () => {
    const durationMs = Date.now() - req.startTime;
    const statusCode = res.statusCode;

    const logData = {
      correlationId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode,
      durationMs,
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: req.ip || req.socket.remoteAddress,
    };

    if (statusCode >= 500) {
      logger.error(`HTTP ${req.method} ${req.originalUrl || req.url} ${statusCode} - ${durationMs}ms`, undefined, logData);
    } else if (statusCode >= 400) {
      logger.warn(`HTTP ${req.method} ${req.originalUrl || req.url} ${statusCode} - ${durationMs}ms`, logData);
    } else {
      logger.info(`HTTP ${req.method} ${req.originalUrl || req.url} ${statusCode} - ${durationMs}ms`, logData);
    }
  });

  next();
}
