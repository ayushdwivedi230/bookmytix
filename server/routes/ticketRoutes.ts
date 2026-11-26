import { Router } from 'express';
import { ticketController } from '../controllers/ticketController.js';
import { authenticateToken } from '../middleware/auth.js';

export const ticketRouter = Router();

// Gate Verification endpoint (Public or scanner app)
ticketRouter.post('/verify', ticketController.verify);
ticketRouter.get('/verify/:token', ticketController.verify);

// Ticket details with high-res QR codes (Authenticated)
ticketRouter.get('/booking/:bookingId', authenticateToken as any, ticketController.getBookingTickets);
