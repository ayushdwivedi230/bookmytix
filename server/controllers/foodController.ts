import type { Request, Response, NextFunction } from 'express';
import { foodService } from '../services/foodService.js';

export const foodController = {
  /**
   * GET /api/food-items
   * Returns concession catalog, optionally filtered by theatreId.
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const theatreId = req.query.theatreId ? Number(req.query.theatreId) : undefined;
      const items = await foodService.getFoodCatalog(theatreId);
      res.json(items);
    } catch (err) {
      next(err);
    }
  },
};
