import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { couponService } from '../services/couponService.js';
import { AppError } from '../middleware/errorHandler.js';

export const couponController = {
  /**
   * GET /api/coupons
   * Lists active promotional offers.
   */
  async list(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const activeCoupons = await couponService.listActiveCoupons();
      res.json(activeCoupons);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/coupons/validate
   * Validates a promotional coupon code strictly on the server against order total and quotas.
   */
  async validate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, orderAmount } = req.body;
      const userId = req.user?.id;

      if (!code || typeof code !== 'string') {
        throw new AppError('Coupon code string is required', 400);
      }
      if (typeof orderAmount !== 'number' || orderAmount <= 0) {
        throw new AppError('Valid positive orderAmount is required', 400);
      }

      const result = await couponService.validateCoupon(code, orderAmount, userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
