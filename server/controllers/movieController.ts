import type { Request, Response, NextFunction } from 'express';
import { movieService } from '../services/movieService.js';
import { movieDataProvider } from '../services/movieProviderService.js';
import { AppError } from '../middleware/errorHandler.js';

export const movieController = {
  /**
   * GET /api/movies
   * Query params: status, genre, language, format, minRating, city, date, search, sort, page, limit
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        status,
        genre,
        language,
        format,
        minRating,
        city,
        date,
        search,
        sort,
        order,
        page,
        limit,
      } = req.query;

      const result = await movieService.listMovies({
        status: status as any,
        genre: genre as string,
        language: language as string,
        format: format as string,
        minRating: minRating ? Number(minRating) : undefined,
        city: city as string,
        date: date as string,
        search: search as string,
        sort: sort as any,
        order: order as any,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/movies/suggestions?q=...
   */
  async suggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = (req.query.q as string) || '';
      const suggestions = await movieService.getSuggestions(q);
      res.json({ suggestions });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/movies/filters?city=...
   */
  async filters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const city = req.query.city as string | undefined;
      const filterOptions = await movieService.getFilterOptions(city);
      res.json(filterOptions);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/movies/provider-attribution
   */
  async attribution(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const attribution = movieDataProvider.getAttribution();
      res.json(attribution);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/movies/:idOrSlug?city=...
   */
  async getByIdOrSlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { idOrSlug } = req.params;
      const city = req.query.city as string | undefined;
      const movie = await movieService.getByIdOrSlug(idOrSlug, city);
      res.json(movie);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/movies/:idOrSlug/reviews
   */
  async addReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user) throw new AppError('Unauthorized', 401);

      const { idOrSlug } = req.params;
      const { rating, comment } = req.body;

      if (!rating || Number(rating) < 1 || Number(rating) > 5) {
        throw new AppError('Rating must be between 1 and 5', 400);
      }

      const movie = await movieService.getByIdOrSlug(idOrSlug);
      const review = await movieService.addReview(
        user.id,
        movie.id,
        Number(rating),
        comment || '',
      );

      res.status(201).json({ message: 'Review submitted', review });
    } catch (err) {
      next(err);
    }
  },
};
