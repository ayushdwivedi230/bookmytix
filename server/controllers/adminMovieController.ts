import type { Request, Response, NextFunction } from 'express';
import { adminMovieService } from '../services/adminMovieService.js';
import { AppError } from '../middleware/errorHandler.js';

export const adminMovieController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, status, page, limit } = req.query;
      const result = await adminMovieService.listAll(
        search as string,
        status as string,
        page ? Number(page) : 1,
        limit ? Number(limit) : 50,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) throw new AppError('Invalid movie ID', 400);
      const movie = await adminMovieService.getById(id);
      res.json(movie);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title } = req.body;
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        throw new AppError('Movie title is required', 400);
      }
      const movie = await adminMovieService.create(req.body);
      res.status(201).json({ message: 'Movie created successfully', movie });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) throw new AppError('Invalid movie ID', 400);
      const movie = await adminMovieService.update(id, req.body);
      res.json({ message: 'Movie updated successfully', movie });
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const { status } = req.body;
      if (!['now_showing', 'coming_soon', 'archived'].includes(status)) {
        throw new AppError('Invalid movie status', 400);
      }
      const movie = await adminMovieService.updateStatus(id, status);
      res.json({ message: 'Status updated', movie });
    } catch (err) {
      next(err);
    }
  },

  async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const result = await adminMovieService.archive(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const result = await adminMovieService.deletePermanently(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async searchProvider(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = (req.query.q as string) || '';
      const results = await adminMovieService.searchExternal(q);
      res.json({ results });
    } catch (err) {
      next(err);
    }
  },

  async importProvider(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tmdbId = Number(req.body.tmdbId);
      if (!tmdbId || isNaN(tmdbId)) {
        throw new AppError('Valid TMDB ID is required for import', 400);
      }
      const movie = await adminMovieService.importFromTMDB(tmdbId);
      res.status(201).json({ message: 'Movie imported successfully', movie });
    } catch (err) {
      next(err);
    }
  },
};
