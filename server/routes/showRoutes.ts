import { Router } from 'express';
import { showController } from '../controllers/showController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

export const showRouter = Router();

showRouter.get('/', showController.listShows);
showRouter.get('/:id/seats', showController.getShowSeats);
showRouter.get('/:id/seat-events', showController.streamSeatEvents);
showRouter.post('/:id/lock-seats', authenticateToken, showController.lockSeats);
showRouter.post('/:id/release-seats', authenticateToken, showController.releaseSeats);
showRouter.post('/', authenticateToken, requireAdmin, showController.createShow);
