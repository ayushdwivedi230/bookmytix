import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { checkoutService } from '../services/checkoutService.js';
import { AppError } from '../middleware/errorHandler.js';

export const checkoutController = {
  /**
   * POST /api/checkout/summary
   * Provides complete server-calculated order breakdown including tickets, convenience fee, taxes, F&B, discounts.
   */
  async getSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { showId, seatIds, foodItems, couponCode } = req.body;
      const userId = req.user?.id;

      if (!showId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
        throw new AppError('showId and non-empty seatIds array are required', 400);
      }

      const summary = await checkoutService.calculateSummary({
        showId: Number(showId),
        seatIds: seatIds.map(Number),
        foodItems,
        couponCode,
        userId,
      });

      res.json(summary);
    } catch (err) {
      next(err);
    }
  },
};
