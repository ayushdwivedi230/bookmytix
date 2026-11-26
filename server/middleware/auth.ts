import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export type UserRole = 'user' | 'customer' | 'admin' | 'cinema_manager';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  cinemaId?: number | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/**
 * Validates the JWT Bearer token and attaches decoded user to req.user.
 */
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication token required' });
    return;
  }

  jwt.verify(token, env.JWT_SECRET, (err, decoded) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }
    req.user = decoded as AuthUser;
    next();
  });
};

/**
 * Role-Based Access Control middleware.
 * Verifies that the authenticated user possesses one of the allowed roles.
 * Normalizes 'user' and 'customer' as equivalent standard customer roles.
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userRole = (req.user.role || 'customer').toLowerCase();
    const normalizedUserRole = userRole === 'user' ? 'customer' : userRole;

    const normalizedAllowed = allowedRoles.map((r) =>
      r.toLowerCase() === 'user' ? 'customer' : r.toLowerCase(),
    );

    if (!normalizedAllowed.includes(normalizedUserRole)) {
      res.status(403).json({
        error: `Forbidden: Access requires ${allowedRoles.join(' or ')} privileges`,
      });
      return;
    }

    next();
  };
};

/**
 * Requires full administrator privileges.
 */
export const requireAdmin = requireRole('admin');

/**
 * Requires staff privileges (admin or cinema_manager).
 */
export const requireStaff = requireRole('admin', 'cinema_manager');
