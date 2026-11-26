import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { ticketService } from '../services/ticketService.js';
import { AppError } from '../middleware/errorHandler.js';

export const ticketController = {
  /**
   * POST /api/tickets/verify
   * Gate admission verification. Validates secure QR token, admits attendee, prevents double-scanning.
   */
  async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;
      const rawToken = token || req.params.token;

      if (!rawToken) {
        throw new AppError('Ticket verification token is required', 400);
      }

      const result = await ticketService.verifyTicket(rawToken);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/tickets/booking/:bookingId
   * Retrieves printable/downloadable digital tickets with high-res QR codes.
   */
  async getBookingTickets(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const bookingId = Number(req.params.bookingId);
      const userId = req.user?.id;

      if (!bookingId || isNaN(bookingId)) {
        throw new AppError('Valid bookingId is required', 400);
      }

      const ticketDetails = await ticketService.getBookingTickets(bookingId, userId);
      res.json(ticketDetails);
    } catch (err) {
      next(err);
    }
  },
};
