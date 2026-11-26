import { Router } from 'express';
import { couponController } from '../controllers/couponController.js';
import { authenticateToken } from '../middleware/auth.js';

export const couponRouter = Router();

couponRouter.get('/', couponController.list);
couponRouter.post('/validate', (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    (authenticateToken as any)(req, res, next);
  } else {
    next();
  }
}, couponController.validate);
