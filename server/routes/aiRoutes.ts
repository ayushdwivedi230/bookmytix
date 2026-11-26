import { Router } from 'express';
import { aiController } from '../controllers/aiController.js';

export const aiRouter = Router();

aiRouter.get('/recommendations', aiController.getRecommendations);
aiRouter.get('/discover', aiController.discoverMovies);
aiRouter.post('/assistant', aiController.chatAssistant);
aiRouter.get('/quick-prompts', aiController.getQuickPrompts);
