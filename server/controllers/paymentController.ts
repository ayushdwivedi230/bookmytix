import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { paymentService } from '../services/paymentService.js';
import { AppError } from '../middleware/errorHandler.js';

export const paymentController = {
  /**
   * POST /api/payments/create-order
   * Validates summary on backend, creates booking in payment_pending state, generates Razorpay order.
   */
  async createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { showId, seatIds, lockToken, foodItems, couponCode } = req.body;

      if (!showId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
        throw new AppError('showId and non-empty seatIds array are required', 400);
      }

      const orderData = await paymentService.createPaymentOrder({
        userId,
        showId: Number(showId),
        seatIds: seatIds.map(Number),
        lockToken,
        foodItems,
        couponCode,
      });

      res.status(201).json(orderData);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/payments/verify
   * Verifies cryptographic HMAC-SHA256 signature, confirms booking, releases seat locks, issues tickets.
   */
  async verify(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new AppError(
          'Missing payment parameters: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required',
          400,
        );
      }

      const result = await paymentService.verifyPayment({
        userId,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/payments/webhook
   * Processes webhook events from Razorpay idempotently with HMAC verification.
   */
  async webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = (req.headers['x-razorpay-signature'] as string) || '';
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

      const result = await paymentService.handleWebhook(rawBody, signature);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
