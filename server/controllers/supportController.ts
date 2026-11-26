import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { supportTicketService } from '../services/supportTicketService.js';

export const supportController = {
  /**
   * File a customer support inquiry or booking problem ticket.
   */
  async createTicket(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = await supportTicketService.createTicket(req.user!.id, req.body);
      res.status(201).json(ticket);
    } catch (err) {
      next(err);
    }
  },

  /**
   * List customer's filed support tickets.
   */
  async getMyTickets(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tickets = await supportTicketService.getUserTickets(req.user!.id);
      res.json(tickets);
    } catch (err) {
      next(err);
    }
  },
};
