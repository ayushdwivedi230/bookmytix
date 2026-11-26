import { Router } from 'express';
import { supportController } from '../controllers/supportController.js';
import { authenticateToken } from '../middleware/auth.js';

export const supportRouter = Router();

supportRouter.use(authenticateToken as any);
supportRouter.post('/tickets', supportController.createTicket as any);
supportRouter.get('/tickets', supportController.getMyTickets as any);
