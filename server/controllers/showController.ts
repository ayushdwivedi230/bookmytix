import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { showService } from '../services/showService.js';
import { seatLockService } from '../services/seatLockService.js';
import { seatEventService } from '../services/seatEventService.js';
import { createShowSchema, lockSeatsSchema, releaseSeatsSchema } from '../validators/schemas.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

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

export const showController = {
  async listShows(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { movieId, theatreId, city, date, format, language } = req.query;
      const shows = await showService.listShows({
        movieId: movieId ? parseInt(String(movieId), 10) : undefined,
        theatreId: theatreId ? parseInt(String(theatreId), 10) : undefined,
        city: city ? String(city) : undefined,
        date: date ? String(date) : undefined,
        format: format ? String(format) : undefined,
        language: language ? String(language) : undefined,
      });
      res.json(shows);
    } catch (err) {
      next(err);
    }
  },

  async getEventShows(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = parseInt(req.params.id, 10);
      if (isNaN(eventId)) {
        res.status(400).json({ error: 'Invalid event id' });
        return;
      }
      const shows = await showService.getShowsByEvent(eventId);
      res.json(shows);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Returns runtime seat layout and real-time availability/lock status for a show.
   */
  async getShowSeats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const showId = parseInt(req.params.id, 10);
      if (isNaN(showId)) {
        res.status(400).json({ error: 'Invalid show id' });
        return;
      }
      const currentUserId = extractOptionalUserId(req);
      const data = await seatLockService.getShowSeatsWithStatus(showId, currentUserId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getLegacyEventSeats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = parseInt(req.params.id, 10);
      if (isNaN(eventId)) {
        res.status(400).json({ error: 'Invalid event id' });
        return;
      }
      const seats = await showService.getLegacyEventSeats(eventId);
      res.json(seats);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Locks candidate seats for an authenticated user with an 8-minute expiry.
   */
  async lockSeats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const showId = parseInt(req.params.id, 10);
      if (isNaN(showId)) {
        res.status(400).json({ error: 'Invalid show id' });
        return;
      }

      const parsed = lockSeatsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation error' });
        return;
      }

      const userId = req.user!.id;
      const result = await seatLockService.lockSeats(showId, parsed.data.seat_ids, userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Releases candidate seats locked by the current user.
   */
  async releaseSeats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const showId = parseInt(req.params.id, 10);
      if (isNaN(showId)) {
        res.status(400).json({ error: 'Invalid show id' });
        return;
      }

      const parsed = releaseSeatsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation error' });
        return;
      }

      const userId = req.user!.id;
      const result = await seatLockService.releaseSeats(
        showId,
        parsed.data.lock_token,
        userId,
        parsed.data.seat_ids,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Server-Sent Events (SSE) stream for live seat locking/booking updates.
   */
  async streamSeatEvents(req: Request, res: Response): Promise<void> {
    const showId = parseInt(req.params.id, 10);
    if (isNaN(showId)) {
      res.status(400).json({ error: 'Invalid show id' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', showId })}\n\n`);

    // Keep-alive heartbeat every 25 seconds
    const interval = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 25000);

    const unsubscribe = seatEventService.subscribe(showId, (payload) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    });

    req.on('close', () => {
      clearInterval(interval);
      unsubscribe();
    });
  },

  async createShow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = parseInt(req.params.id, 10);
      if (isNaN(eventId)) {
        res.status(400).json({ error: 'Invalid event id' });
        return;
      }

      const parsed = createShowSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation error' });
        return;
      }

      const { theatreId, startsAt, price, numSeats, seatPrefix } = parsed.data;
      const result = await showService.createShow(
        eventId,
        theatreId,
        startsAt,
        price,
        numSeats,
        seatPrefix,
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
};
