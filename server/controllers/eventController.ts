import type { Request, Response, NextFunction } from 'express';
import { eventService } from '../services/eventService.js';
import { createEventSchema, updateEventSchema } from '../validators/schemas.js';

export const eventController = {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const events = await eventService.listAll();
      res.json(events);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid event id' });
        return;
      }
      const event = await eventService.getById(id);
      res.json(event);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createEventSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation error' });
        return;
      }
      const result = await eventService.create(parsed.data);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid event id' });
        return;
      }
      const parsed = updateEventSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation error' });
        return;
      }
      const result = await eventService.update(id, parsed.data);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid event id' });
        return;
      }
      const result = await eventService.delete(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
