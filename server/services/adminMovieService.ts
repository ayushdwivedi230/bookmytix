import { eq, desc, ilike, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { movies, events, shows } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { formatMovieRow, type MovieResponse } from './movieService.js';
import { movieDataProvider } from './movieProviderService.js';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface CreateMovieInput {
  title: string;
  slug?: string;
  description: string;
  poster: string;
  backdrop: string;
  trailerUrl: string;
  genre: string;
  language: string;
  duration: string;
  releaseDate?: string;
  certification?: string;
  cast?: Array<{ name: string; role: string; image?: string }>;
  crew?: Array<{ name: string; role: string }>;
  rating?: number;
  status?: 'now_showing' | 'coming_soon' | 'archived';
  formats?: string[];
  tmdbId?: number;
  imdbId?: string;
  basePrice?: number;
}

export const adminMovieService = {
  /**
   * List all movies (including archived) for admin management.
   */
  async listAll(query?: string, status?: string, page = 1, limit = 50): Promise<{
    movies: MovieResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const offset = (page - 1) * limit;
    const conditions = [];

    if (query && query.trim()) {
      const q = `%${query.trim()}%`;
      conditions.push(or(ilike(movies.title, q), ilike(movies.genre, q), ilike(movies.language, q)));
    }

    if (status && status !== 'All') {
      conditions.push(eq(movies.status, status as any));
    }

    const whereClause = conditions.length > 0 ? or(...conditions) : undefined;

    const [countRes] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(movies)
      .where(whereClause);
    const total = countRes?.count || 0;

    const rows = await db
      .select()
      .from(movies)
      .where(whereClause)
      .orderBy(desc(movies.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      movies: rows.map(formatMovieRow),
      total,
      page,
      limit,
    };
  },

  /**
   * Get single movie for editing.
   */
  async getById(id: number): Promise<MovieResponse> {
    const movie = await db.query.movies.findFirst({ where: eq(movies.id, id) });
    if (!movie) throw new AppError('Movie not found', 404);
    return formatMovieRow(movie);
  },

  /**
   * Create a new movie in the catalog (and sync with events table).
   */
  async create(input: CreateMovieInput): Promise<MovieResponse> {
    const baseSlug = input.slug || slugify(input.title);
    let finalSlug = baseSlug;

    // Ensure slug uniqueness
    const existing = await db.query.movies.findFirst({ where: eq(movies.slug, finalSlug) });
    if (existing) {
      finalSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    const releaseDate = input.releaseDate ? new Date(input.releaseDate) : new Date();

    const [newMovie] = await db
      .insert(movies)
      .values({
        title: input.title,
        slug: finalSlug,
        description: input.description || '',
        poster: input.poster || '',
        backdrop: input.backdrop || input.poster || '',
        trailerUrl: input.trailerUrl || '',
        genre: input.genre || 'Action',
        language: input.language || 'Hindi',
        duration: input.duration || '2h 15m',
        releaseDate,
        certification: input.certification || 'UA',
        cast: JSON.stringify(input.cast || []),
        crew: JSON.stringify(input.crew || []),
        rating: String(input.rating || 4.5),
        status: input.status || 'now_showing',
        formats: JSON.stringify(input.formats || ['2D', '3D']),
        tmdbId: input.tmdbId,
        imdbId: input.imdbId,
      })
      .returning();

    // Also register in events table for show booking compatibility
    try {
      await db.insert(events).values({
        title: newMovie.title,
        category: 'Movies',
        location: 'All India',
        date: releaseDate.toISOString().slice(0, 10),
        image: newMovie.poster,
        banner: newMovie.backdrop || newMovie.poster,
        trailer: newMovie.trailerUrl,
        description: newMovie.description,
        duration: newMovie.duration,
        language: newMovie.language,
        genre: newMovie.genre,
        certificate: newMovie.certification,
        rating: newMovie.rating,
        basePrice: String(input.basePrice || 250),
      });
    } catch {
      // Non-fatal if events table sync encounters duplicate
    }

    return formatMovieRow(newMovie);
  },

  /**
   * Update an existing movie.
   */
  async update(id: number, input: Partial<CreateMovieInput>): Promise<MovieResponse> {
    const movie = await db.query.movies.findFirst({ where: eq(movies.id, id) });
    if (!movie) throw new AppError('Movie not found', 404);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.slug !== undefined) updateData.slug = input.slug;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.poster !== undefined) updateData.poster = input.poster;
    if (input.backdrop !== undefined) updateData.backdrop = input.backdrop;
    if (input.trailerUrl !== undefined) updateData.trailerUrl = input.trailerUrl;
    if (input.genre !== undefined) updateData.genre = input.genre;
    if (input.language !== undefined) updateData.language = input.language;
    if (input.duration !== undefined) updateData.duration = input.duration;
    if (input.releaseDate !== undefined) updateData.releaseDate = new Date(input.releaseDate);
    if (input.certification !== undefined) updateData.certification = input.certification;
    if (input.cast !== undefined) updateData.cast = JSON.stringify(input.cast);
    if (input.crew !== undefined) updateData.crew = JSON.stringify(input.crew);
    if (input.rating !== undefined) updateData.rating = String(input.rating);
    if (input.status !== undefined) updateData.status = input.status;
    if (input.formats !== undefined) updateData.formats = JSON.stringify(input.formats);
    if (input.tmdbId !== undefined) updateData.tmdbId = input.tmdbId;
    if (input.imdbId !== undefined) updateData.imdbId = input.imdbId;

    const [updated] = await db.update(movies).set(updateData).where(eq(movies.id, id)).returning();

    // Synchronize updates with events table
    await db
      .update(events)
      .set({
        title: updated.title,
        image: updated.poster,
        banner: updated.backdrop || updated.poster,
        trailer: updated.trailerUrl,
        description: updated.description,
        duration: updated.duration,
        language: updated.language,
        genre: updated.genre,
        certificate: updated.certification,
        rating: updated.rating,
      })
      .where(eq(events.title, movie.title));

    return formatMovieRow(updated);
  },

  /**
   * Update release status ('now_showing' | 'coming_soon' | 'archived').
   */
  async updateStatus(id: number, status: 'now_showing' | 'coming_soon' | 'archived'): Promise<MovieResponse> {
    const [updated] = await db
      .update(movies)
      .set({ status, updatedAt: new Date() })
      .where(eq(movies.id, id))
      .returning();

    if (!updated) throw new AppError('Movie not found', 404);
    return formatMovieRow(updated);
  },

  /**
   * Archive or delete movie.
   */
  async archive(id: number): Promise<{ message: string }> {
    await db
      .update(movies)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(movies.id, id));
    return { message: 'Movie archived successfully' };
  },

  /**
   * Delete movie permanently.
   */
  async deletePermanently(id: number): Promise<{ message: string }> {
    await db.delete(shows).where(eq(shows.movieId, id));
    await db.delete(movies).where(eq(movies.id, id));
    return { message: 'Movie and associated shows deleted' };
  },

  /**
   * Search external provider (TMDB/OMDb).
   */
  async searchExternal(query: string) {
    return movieDataProvider.searchExternal(query);
  },

  /**
   * Import external movie from TMDB into the database.
   */
  async importFromTMDB(tmdbId: number): Promise<MovieResponse> {
    const details = await movieDataProvider.getExternalDetails(tmdbId);
    if (!details) {
      throw new AppError('Failed to fetch details from TMDB provider', 502);
    }

    // Check if already imported
    const existing = await db.query.movies.findFirst({ where: eq(movies.tmdbId, tmdbId) });
    if (existing) {
      return formatMovieRow(existing);
    }

    return this.create({
      title: details.title,
      description: details.overview,
      poster: details.posterUrl,
      backdrop: details.backdropUrl,
      trailerUrl: details.trailerUrl,
      genre: details.genre,
      language: details.language,
      duration: details.duration,
      releaseDate: details.releaseDate,
      certification: details.certification,
      cast: details.cast,
      crew: details.crew,
      rating: details.rating,
      status: 'now_showing',
      formats: details.formats,
      tmdbId: details.externalId as number,
    });
  },
};
