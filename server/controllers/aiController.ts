import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { recommendationService } from '../services/recommendationService.js';
import { aiDiscoveryService } from '../services/aiDiscoveryService.js';
import { aiAssistantService } from '../services/aiAssistantService.js';

function extractOptionalUserId(req: Request): number | undefined {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return undefined;
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: number };
    return decoded.id;
  } catch {
    return undefined;
  }
}

export const aiController = {
  /**
   * GET /api/ai/recommendations
   */
  async getRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = extractOptionalUserId(req);
      const city = (req.query.city as string) || undefined;
      const limit = req.query.limit ? Math.min(20, Math.max(1, Number(req.query.limit))) : 8;

      const result = await recommendationService.getRecommendations(userId, city, limit);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/ai/discover?q=...&city=...
   */
  async discoverMovies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = (req.query.q as string) || '';
      const city = (req.query.city as string) || undefined;

      const result = await aiDiscoveryService.discover(q, city);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/ai/assistant
   */
  async chatAssistant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { question, history } = req.body;
      if (!question || typeof question !== 'string') {
        res.status(400).json({ error: 'Question is required' });
        return;
      }

      const result = await aiAssistantService.answerQuestion(question, history || []);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/ai/quick-prompts
   */
  async getQuickPrompts(_req: Request, res: Response): Promise<void> {
    res.json({
      prompts: [
        'Suggest a thriller for tonight',
        'Find comedy movies in Hindi',
        'Movies under two hours',
        'Top rated action movies',
        'Family movies in Telugu',
        'Sci-Fi blockbusters with rating above 4.5',
      ],
    });
  },
};
