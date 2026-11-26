import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService.js';
import { registerSchema, loginSchema } from '../validators/schemas.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation error' });
        return;
      }
      const { name, email, password } = parsed.data;
      const preferredCity = (req.body.preferredCity as string) || 'Delhi';
      const result = await authService.register(name, email, password, preferredCity);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation error' });
        return;
      }
      const { email, password } = parsed.data;
      const result = await authService.login(email, password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async logout(_req: Request, res: Response): Promise<void> {
    // Client discards JWT / session; standard stateless acknowledgement
    res.json({ message: 'Logged out successfully' });
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      if (!email || !String(email).trim()) {
        res.status(400).json({ error: 'Valid email address is required' });
        return;
      }
      const result = await authService.forgotPassword(String(email));
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        res.status(400).json({ error: 'Token and new password are required' });
        return;
      }
      const result = await authService.resetPassword(String(token), String(newPassword));
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;
      if (!token) {
        res.status(400).json({ error: 'Verification token is required' });
        return;
      }
      const result = await authService.verifyEmail(String(token));
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await authService.getProfile(req.user!.id);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await authService.updateProfile(req.user!.id, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'Current password and new password are required' });
        return;
      }
      const result = await authService.changePassword(
        req.user!.id,
        String(currentPassword),
        String(newPassword),
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
