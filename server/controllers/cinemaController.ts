import type { Request, Response, NextFunction } from 'express';
import { cinemaService } from '../services/cinemaService.js';
import { screenService } from '../services/screenService.js';
import { createCinemaSchema } from '../validators/schemas.js';

export const cinemaController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { city, format, search, operatingStatus } = req.query;
      const cinemas = await cinemaService.listCinemas({
        city: city ? String(city) : undefined,
        format: format ? String(format) : undefined,
        search: search ? String(search) : undefined,
        operatingStatus: operatingStatus as any,
      });
      res.json(cinemas);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid cinema id' });
        return;
      }
      const cinema = await cinemaService.getCinemaById(id);
      res.json(cinema);
    } catch (err) {
      next(err);
    }
  },

  async listScreens(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid cinema id' });
        return;
      }
      const screens = await screenService.listScreensByTheatre(id);
      res.json(screens);
    } catch (err) {
      next(err);
    }
  },

  async getScreenLayout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const screenId = parseInt(req.params.screenId, 10);
      if (isNaN(screenId)) {
        res.status(400).json({ error: 'Invalid screen id' });
        return;
      }
      const layout = await screenService.getScreenLayout(screenId);
      res.json(layout);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createCinemaSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation error' });
        return;
      }
      const cinema = await cinemaService.createCinema(parsed.data);
      res.status(201).json(cinema);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid cinema id' });
        return;
      }
      const cinema = await cinemaService.updateCinema(id, req.body);
      res.json(cinema);
    } catch (err) {
      next(err);
    }
  },

  async createScreen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const theatreId = parseInt(req.params.id, 10);
      if (isNaN(theatreId)) {
        res.status(400).json({ error: 'Invalid cinema id' });
        return;
      }
      const screen = await screenService.createScreen(theatreId, req.body);
      res.status(201).json(screen);
    } catch (err) {
      next(err);
    }
  },
};
