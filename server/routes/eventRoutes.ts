import { Router } from 'express';
import { eventController } from '../controllers/eventController.js';
import { showController } from '../controllers/showController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

export const eventRouter = Router();

// Public event routes
eventRouter.get('/', eventController.list);
eventRouter.get('/:id', eventController.getById);
eventRouter.get('/:id/shows', showController.getEventShows);
eventRouter.get('/:id/seats', showController.getLegacyEventSeats);

// Admin event management
eventRouter.post('/', authenticateToken as any, requireAdmin as any, eventController.create);
eventRouter.put('/:id', authenticateToken as any, requireAdmin as any, eventController.update);
eventRouter.delete('/:id', authenticateToken as any, requireAdmin as any, eventController.delete);
eventRouter.post('/:id/shows', authenticateToken as any, requireAdmin as any, showController.createShow);
