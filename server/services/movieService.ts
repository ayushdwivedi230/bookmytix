import { eq, and, or, ilike, desc, asc, gte, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { movies, shows, theatres, reviews, users, type movies as MoviesTable } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';

export type MovieRow = typeof MoviesTable.$inferSelect;

export interface MovieListParams {
  status?: 'now_showing' | 'coming_soon' | 'popular' | 'trending' | 'recently_added' | 'archived';
  genre?: string;
  language?: string;
  format?: string;
  minRating?: number;
  city?: string;
  date?: string;
  search?: string;
  sort?: 'rating' | 'release_date' | 'popularity' | 'title';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface MovieResponse {
  id: number;
  title: string;
  slug: string;
  description: string;
  poster: string;
  backdrop: string;
  trailerUrl: string;
  genre: string;
  language: string;
  duration: string;
  releaseDate: string;
  certification: string;
  cast: Array<{ name: string; role: string; image?: string }>;
  crew: Array<{ name: string; role: string }>;
  rating: number;
  voteCount: number;
  popularity: number;
  status: 'now_showing' | 'coming_soon' | 'archived';
  formats: string[];
  tmdbId?: number | null;
  imdbId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MovieDetailWithCinemas extends MovieResponse {
  cinemas: Array<{
    id: number;
    name: string;
    city: string;
    location: string;
    address: string;
    shows: Array<{
      id: number;
      startsAt: string;
      price: number;
      screenName: string;
      screenType: string;
    }>;
  }>;
  reviews: Array<{
    id: number;
    userName: string;
    rating: number;
    comment: string;
    createdAt: string;
  }>;
}

export interface SearchSuggestion {
  id: number;
  title: string;
  slug: string;
  poster: string;
  genre: string;
  language: string;
  rating: number;
  releaseYear: string;
  status: string;
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function formatMovieRow(m: MovieRow): MovieResponse {
  const castList = safeJsonParse<Array<{ name: string; role: string; image?: string }>>(
    m.cast,
    [],
  );
  const crewList = safeJsonParse<Array<{ name: string; role: string }>>(
    m.crew,
    [],
  );
  const formatsList = safeJsonParse<string[]>(
    m.formats,
    ['2D'],
  );

  return {
    id: m.id,
    title: m.title,
    slug: m.slug,
    description: m.description,
    poster: m.poster,
    backdrop: m.backdrop,
    trailerUrl: m.trailerUrl,
    genre: m.genre,
    language: m.language,
    duration: m.duration,
    releaseDate: m.releaseDate ? new Date(m.releaseDate).toISOString().slice(0, 10) : '',
    certification: m.certification,
    cast: castList,
    crew: crewList,
    rating: Number(m.rating) || 4.5,
    voteCount: m.voteCount || 0,
    popularity: Number(m.popularity) || 100.0,
    status: m.status as 'now_showing' | 'coming_soon' | 'archived',
    formats: formatsList,
    tmdbId: m.tmdbId,
    imdbId: m.imdbId,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export const movieService = {
  /**
   * List and filter movies from the catalog with pagination and sorting.
   */
  async listMovies(params: MovieListParams): Promise<{
    movies: MovieResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions = [];

    // Filter by status or preset tab
    if (params.status) {
      if (params.status === 'now_showing' || params.status === 'coming_soon' || params.status === 'archived') {
        conditions.push(eq(movies.status, params.status));
      } else if (params.status === 'popular') {
        conditions.push(eq(movies.status, 'now_showing'));
      } else if (params.status === 'trending') {
        conditions.push(eq(movies.status, 'now_showing'));
      } else if (params.status === 'recently_added') {
        // any active movie
        conditions.push(or(eq(movies.status, 'now_showing'), eq(movies.status, 'coming_soon')));
      }
    } else {
      // Default: exclude archived
      conditions.push(or(eq(movies.status, 'now_showing'), eq(movies.status, 'coming_soon')));
    }

    // Genre filter
    if (params.genre && params.genre !== 'All') {
      conditions.push(ilike(movies.genre, `%${params.genre}%`));
    }

    // Language filter
    if (params.language && params.language !== 'All') {
      conditions.push(ilike(movies.language, `%${params.language}%`));
    }

    // Min rating
    if (params.minRating && Number(params.minRating) > 0) {
      conditions.push(gte(movies.rating, String(params.minRating)));
    }

    // Format filter
    if (params.format && params.format !== 'All') {
      conditions.push(ilike(movies.formats, `%${params.format}%`));
    }

    // Search query (title, genre, description, cast)
    if (params.search && params.search.trim()) {
      const q = `%${params.search.trim()}%`;
      conditions.push(
        or(
          ilike(movies.title, q),
          ilike(movies.genre, q),
          ilike(movies.description, q),
          ilike(movies.cast, q),
        ),
      );
    }

    // City filter: must have shows scheduled in that city
    if (params.city && params.city.trim() && params.city !== 'All Cities') {
      const cityPattern = `%${params.city.trim()}%`;
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${shows}
          INNER JOIN ${theatres} ON ${shows.theatreId} = ${theatres.id}
          WHERE ${shows.movieId} = ${movies.id}
          AND (${theatres.city} ILIKE ${cityPattern} OR ${theatres.location} ILIKE ${cityPattern})
        )`,
      );
    }

    // Date filter: must have shows on that date
    if (params.date && params.date.trim()) {
      const dayStart = new Date(`${params.date}T00:00:00Z`);
      const dayEnd = new Date(`${params.date}T23:59:59Z`);
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${shows}
          WHERE ${shows.movieId} = ${movies.id}
          AND ${shows.startsAt} >= ${dayStart} AND ${shows.startsAt} <= ${dayEnd}
        )`,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Sorting
    let orderByClause = desc(movies.popularity);
    if (params.status === 'trending') {
      orderByClause = desc(movies.voteCount);
    } else if (params.status === 'popular') {
      orderByClause = desc(movies.popularity);
    } else if (params.status === 'recently_added') {
      orderByClause = desc(movies.createdAt);
    } else if (params.sort === 'rating') {
      orderByClause = params.order === 'asc' ? asc(movies.rating) : desc(movies.rating);
    } else if (params.sort === 'release_date') {
      orderByClause = params.order === 'asc' ? asc(movies.releaseDate) : desc(movies.releaseDate);
    } else if (params.sort === 'title') {
      orderByClause = params.order === 'desc' ? desc(movies.title) : asc(movies.title);
    } else if (params.sort === 'popularity') {
      orderByClause = params.order === 'asc' ? asc(movies.popularity) : desc(movies.popularity);
    }

    // Total count
    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(movies)
      .where(whereClause);
    const total = countResult?.count || 0;

    // Fetch page rows
    const rows = await db
      .select()
      .from(movies)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    return {
      movies: rows.map(formatMovieRow),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },

  /**
   * Search suggestions for fast debounced autocompletion.
   */
  async getSuggestions(query: string): Promise<SearchSuggestion[]> {
    if (!query || query.trim().length === 0) return [];
    const q = `%${query.trim()}%`;

    const rows = await db
      .select({
        id: movies.id,
        title: movies.title,
        slug: movies.slug,
        poster: movies.poster,
        genre: movies.genre,
        language: movies.language,
        rating: movies.rating,
        releaseDate: movies.releaseDate,
        status: movies.status,
      })
      .from(movies)
      .where(
        and(
          or(ilike(movies.title, q), ilike(movies.genre, q)),
          or(eq(movies.status, 'now_showing'), eq(movies.status, 'coming_soon')),
        ),
      )
      .orderBy(desc(movies.popularity))
      .limit(6);

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      poster: r.poster,
      genre: r.genre,
      language: r.language,
      rating: Number(r.rating) || 4.5,
      releaseYear: r.releaseDate ? new Date(r.releaseDate).getFullYear().toString() : '',
      status: r.status,
    }));
  },

  /**
   * Get single movie details by numeric ID or slug with cinemas, showtimes, and reviews.
   */
  async getByIdOrSlug(idOrSlug: string, city?: string): Promise<MovieDetailWithCinemas> {
    const moviePrefixMatch = idOrSlug.match(/^movie[ -_](\d+)$/i);
    const numericId = moviePrefixMatch
      ? parseInt(moviePrefixMatch[1], 10)
      : /^\d+$/.test(idOrSlug)
        ? Number(idOrSlug)
        : null;

    let movie = await db.query.movies.findFirst({
      where: numericId ? eq(movies.id, numericId) : eq(movies.slug, idOrSlug),
    });

    if (!movie) {
      // Also try slugifying idOrSlug (e.g. "pushpa-2" or "Pushpa 2")
      const slugCandidate = idOrSlug
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      movie = await db.query.movies.findFirst({
        where: or(
          eq(movies.slug, slugCandidate),
          ilike(movies.title, `%${idOrSlug.replace(/[-_]/g, ' ')}%`),
        ),
      });
    }

    if (!movie) {
      throw new AppError('Movie not found', 404);
    }

    const formatted = formatMovieRow(movie);

    // Fetch cinemas & scheduled shows
    const showConditions = [eq(shows.movieId, movie.id)];
    if (city && city.trim() && city !== 'All Cities') {
      const cityPattern = `%${city.trim()}%`;
      showConditions.push(
        or(ilike(theatres.city, cityPattern), ilike(theatres.location, cityPattern)) as any,
      );
    }

    let showRows = await db
      .select({
        showId: shows.id,
        startsAt: shows.startsAt,
        price: shows.price,
        theatreId: theatres.id,
        theatreName: theatres.name,
        theatreCity: theatres.city,
        theatreLocation: theatres.location,
        theatreAddress: theatres.address,
      })
      .from(shows)
      .innerJoin(theatres, eq(shows.theatreId, theatres.id))
      .where(and(...showConditions))
      .orderBy(shows.startsAt);

    // Fallback: if city filter produced 0 shows, load available shows across all cinemas for this movie
    if (showRows.length === 0 && city && city.trim() && city !== 'All Cities') {
      showRows = await db
        .select({
          showId: shows.id,
          startsAt: shows.startsAt,
          price: shows.price,
          theatreId: theatres.id,
          theatreName: theatres.name,
          theatreCity: theatres.city,
          theatreLocation: theatres.location,
          theatreAddress: theatres.address,
        })
        .from(shows)
        .innerJoin(theatres, eq(shows.theatreId, theatres.id))
        .where(eq(shows.movieId, movie.id))
        .orderBy(shows.startsAt);
    }

    // Group shows by cinema
    const cinemaMap = new Map<number, {
      id: number;
      name: string;
      city: string;
      location: string;
      address: string;
      shows: Array<{ id: number; startsAt: string; price: number; screenName: string; screenType: string }>;
    }>();

    for (const row of showRows) {
      if (!cinemaMap.has(row.theatreId)) {
        cinemaMap.set(row.theatreId, {
          id: row.theatreId,
          name: row.theatreName,
          city: row.theatreCity,
          location: row.theatreLocation,
          address: row.theatreAddress,
          shows: [],
        });
      }
      cinemaMap.get(row.theatreId)!.shows.push({
        id: row.showId,
        startsAt: row.startsAt.toISOString(),
        price: Number(row.price),
        screenName: 'Screen 1',
        screenType: 'IMAX Laser',
      });
    }

    // Fetch reviews
    const reviewRows = await db
      .select({
        id: reviews.id,
        userName: users.name,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.movieId, movie.id))
      .orderBy(desc(reviews.createdAt))
      .limit(20);

    return {
      ...formatted,
      cinemas: Array.from(cinemaMap.values()),
      reviews: reviewRows.map((r) => ({
        id: r.id,
        userName: r.userName,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  },

  /**
   * Get distinct filter options directly from database records.
   */
  async getFilterOptions(_city?: string): Promise<{
    genres: string[];
    languages: string[];
    formats: string[];
    cities: string[];
    statuses: string[];
  }> {
    const allMovies = await db
      .select({
        genre: movies.genre,
        language: movies.language,
        formats: movies.formats,
        status: movies.status,
      })
      .from(movies)
      .where(or(eq(movies.status, 'now_showing'), eq(movies.status, 'coming_soon')));

    const genres = new Set<string>();
    const languages = new Set<string>();
    const formats = new Set<string>();
    const statuses = new Set<string>(['now_showing', 'coming_soon']);

    for (const m of allMovies) {
      if (m.genre) genres.add(m.genre);
      if (m.language) languages.add(m.language);
      try {
        const fmts: string[] = JSON.parse(m.formats || '["2D"]');
        fmts.forEach((f) => formats.add(f));
      } catch {
        formats.add('2D');
      }
    }

    const allTheatres = await db
      .select({ city: theatres.city, location: theatres.location })
      .from(theatres);

    const cities = new Set<string>();
    for (const t of allTheatres) {
      if (t.city) cities.add(t.city);
      else if (t.location) cities.add(t.location);
    }

    return {
      genres: ['All', ...Array.from(genres).sort()],
      languages: ['All', ...Array.from(languages).sort()],
      formats: ['All', ...Array.from(formats).sort()],
      cities: ['All Cities', ...Array.from(cities).sort()],
      statuses: Array.from(statuses),
    };
  },

  /**
   * Add a review for a movie.
   */
  async addReview(userId: number, movieId: number, rating: number, comment: string) {
    const movie = await db.query.movies.findFirst({ where: eq(movies.id, movieId) });
    if (!movie) throw new AppError('Movie not found', 404);

    const [created] = await db
      .insert(reviews)
      .values({
        userId,
        movieId,
        rating: Math.max(1, Math.min(5, rating)),
        comment: comment.trim(),
      })
      .returning();

    // Recalculate average rating
    const [avgRes] = await db
      .select({
        avg: sql<number>`ROUND(AVG(rating)::numeric, 1)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(reviews)
      .where(eq(reviews.movieId, movieId));

    if (avgRes?.avg) {
      await db
        .update(movies)
        .set({ rating: String(avgRes.avg), voteCount: (movie.voteCount || 0) + 1 })
        .where(eq(movies.id, movieId));
    }

    return created;
  },
};
