import { Router } from 'express';
import { cinemaController } from '../controllers/cinemaController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

export const cinemaRouter = Router();

cinemaRouter.get('/', cinemaController.list);
cinemaRouter.get('/:id', cinemaController.getById);
cinemaRouter.get('/:id/screens', cinemaController.listScreens);
cinemaRouter.get('/screens/:screenId/layout', cinemaController.getScreenLayout);
cinemaRouter.post('/', authenticateToken, requireAdmin, cinemaController.create);
cinemaRouter.put('/:id', authenticateToken, requireAdmin, cinemaController.update);
cinemaRouter.post('/:id/screens', authenticateToken, requireAdmin, cinemaController.createScreen);
