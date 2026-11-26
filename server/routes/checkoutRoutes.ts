import { Router } from 'express';
import { checkoutController } from '../controllers/checkoutController.js';
import { authenticateToken } from '../middleware/auth.js';

export const checkoutRouter = Router();

// Order Summary calculation (optional auth to personalize coupons if logged in)
checkoutRouter.post('/summary', (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    (authenticateToken as any)(req, res, next);
  } else {
    next();
  }
}, checkoutController.getSummary);
