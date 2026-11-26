import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { authenticateToken } from '../middleware/auth.js';

export const authRouter = Router();

// Public authentication routes (rate limited)
authRouter.post('/register', authRateLimiter, authController.register);
authRouter.post('/login', authRateLimiter, authController.login);
authRouter.post('/logout', authController.logout);
authRouter.post('/forgot-password', authRateLimiter, authController.forgotPassword);
authRouter.post('/reset-password', authRateLimiter, authController.resetPassword);
authRouter.post('/verify-email', authController.verifyEmail);

// Authenticated user profile routes
authRouter.get('/profile', authenticateToken as any, authController.getProfile as any);
authRouter.put('/profile', authenticateToken as any, authController.updateProfile as any);
authRouter.put('/change-password', authenticateToken as any, authController.changePassword as any);
