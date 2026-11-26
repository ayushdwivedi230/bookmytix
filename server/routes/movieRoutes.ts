import { Router } from 'express';
import { movieController } from '../controllers/movieController.js';
import { authenticateToken } from '../middleware/auth.js';

export const movieRouter = Router();

// Public movie discovery routes
movieRouter.get('/', movieController.list);
movieRouter.get('/suggestions', movieController.suggestions);
movieRouter.get('/filters', movieController.filters);
movieRouter.get('/provider-attribution', movieController.attribution);
movieRouter.get('/:idOrSlug', movieController.getByIdOrSlug);

// Authenticated movie interaction
movieRouter.post('/:idOrSlug/reviews', authenticateToken as any, movieController.addReview);
