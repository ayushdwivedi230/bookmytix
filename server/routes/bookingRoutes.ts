import { Router } from 'express';
import { bookingController } from '../controllers/bookingController.js';
import { authenticateToken } from '../middleware/auth.js';

export const bookingRouter = Router();

bookingRouter.use(authenticateToken as any);
bookingRouter.post('/', bookingController.create);
bookingRouter.get('/', bookingController.list);
bookingRouter.get('/:id', bookingController.getById);
bookingRouter.post('/:id/cancel', bookingController.cancel);
