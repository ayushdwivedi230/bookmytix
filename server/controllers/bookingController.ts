import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { bookingService } from '../services/bookingService.js';
import { createBookingSchema } from '../validators/schemas.js';

export const bookingController = {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createBookingSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation error' });
        return;
      }
      const { show_id, seat_ids, lock_token } = parsed.data;
      const userId = req.user!.id;
      const result = await bookingService.createBooking(userId, show_id, seat_ids, lock_token);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const filter = (req.query.filter as 'upcoming' | 'past' | 'all') || 'all';
      const bookings = await bookingService.getUserBookings(userId, filter);
      res.json(bookings);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const bookingId = Number(req.params.id);
      const booking = await bookingService.getBookingById(bookingId, userId);
      res.json(booking);
    } catch (err) {
      next(err);
    }
  },

  async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const bookingId = Number(req.params.id);
      const { reason } = req.body || {};
      const result = await bookingService.cancelBooking(bookingId, userId, reason);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
