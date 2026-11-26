import { eq, and, ne, sql, gte, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { events, theatres, screens, shows, showSeats, movies } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { DEFAULT_LAYOUT, ScreenLayoutConfig } from './screenService.js';

export interface ShowResponse {
  id: number;
  startsAt: Date;
  endsAt?: Date | null;
  language?: string;
  format?: string;
  status?: string;
  price: number;
  theatre: {
    id: number;
    name: string;
    location: string;
    city?: string;
  };
  screen?: {
    id: number | null;
    name: string;
    screenType: string;
  };
  movie?: {
    id: number;
    title: string;
    poster: string;
    duration: string;
    certification: string;
  } | null;
}

export interface SeatResponse {
  id: number;
  seat_number: string;
  row?: string;
  category?: string;
  price?: number;
  status: 'available' | 'booked';
}

export interface ListShowsParams {
  movieId?: number;
  theatreId?: number;
  city?: string;
  date?: string;
  format?: string;
  language?: string;
}

export const showService = {
  /**
   * Enforces business rule: Prevent invalid overlapping shows on the same screen.
   */
  async checkScreenOverlap(
    screenId: number,
    startsAt: Date,
    endsAt: Date,
    excludeShowId?: number,
  ): Promise<void> {
    const conditions = [
      eq(shows.screenId, screenId),
      ne(shows.status, 'cancelled'),
      sql`${shows.startsAt} < ${endsAt}`,
      sql`COALESCE(${shows.endsAt}, ${shows.startsAt} + interval '150 minutes') > ${startsAt}`,
    ];

    if (excludeShowId) {
      conditions.push(ne(shows.id, excludeShowId));
    }

    const overlap = await db.query.shows.findFirst({
      where: and(...conditions),
    });

    if (overlap) {
      const overlapStart = overlap.startsAt.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const overlapEnd = (
        overlap.endsAt || new Date(overlap.startsAt.getTime() + 150 * 60000)
      ).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

      throw new AppError(
        `Schedule conflict: Screen already has an active show scheduled between ${overlapStart} and ${overlapEnd}`,
        409,
      );
    }
  },

  async getShowsByEvent(eventId: number): Promise<ShowResponse[]> {
    const eventShows = await db
      .select({
        showId: shows.id,
        startsAt: shows.startsAt,
        endsAt: shows.endsAt,
        language: shows.language,
        format: shows.format,
        status: shows.status,
        price: shows.price,
        theatreId: theatres.id,
        theatreName: theatres.name,
        theatreLocation: theatres.location,
        theatreCity: theatres.city,
        screenId: screens.id,
        screenName: screens.name,
        screenType: screens.screenType,
      })
      .from(shows)
      .innerJoin(theatres, eq(shows.theatreId, theatres.id))
      .leftJoin(screens, eq(shows.screenId, screens.id))
      .where(eq(shows.eventId, eventId))
      .orderBy(shows.startsAt);

    return eventShows.map((s) => ({
      id: s.showId,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      language: s.language,
      format: s.format,
      status: s.status,
      price: Number(s.price),
      theatre: {
        id: s.theatreId,
        name: s.theatreName,
        location: s.theatreLocation,
        city: s.theatreCity,
      },
      screen: s.screenId
        ? {
            id: s.screenId,
            name: s.screenName || 'Screen 1',
            screenType: s.screenType || 'Standard',
          }
        : undefined,
    }));
  },

  async listShows(params: ListShowsParams = {}): Promise<ShowResponse[]> {
    const conditions = [];

    if (params.movieId) {
      conditions.push(eq(shows.movieId, params.movieId));
    }
    if (params.theatreId) {
      conditions.push(eq(shows.theatreId, params.theatreId));
    }
    if (params.city && params.city !== 'All Cities' && params.city !== 'All') {
      conditions.push(eq(theatres.city, params.city));
    }
    if (params.format && params.format !== 'All Formats' && params.format !== 'All') {
      conditions.push(eq(shows.format, params.format));
    }
    if (params.language && params.language !== 'All Languages' && params.language !== 'All') {
      conditions.push(eq(shows.language, params.language));
    }
    if (params.date) {
      const dayStart = new Date(params.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(params.date);
      dayEnd.setHours(23, 59, 59, 999);
      conditions.push(and(gte(shows.startsAt, dayStart), lte(shows.startsAt, dayEnd)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const showRows = await db
      .select({
        showId: shows.id,
        startsAt: shows.startsAt,
        endsAt: shows.endsAt,
        language: shows.language,
        format: shows.format,
        status: shows.status,
        price: shows.price,
        theatreId: theatres.id,
        theatreName: theatres.name,
        theatreLocation: theatres.location,
        theatreCity: theatres.city,
        screenId: screens.id,
        screenName: screens.name,
        screenType: screens.screenType,
        movieId: movies.id,
        movieTitle: movies.title,
        moviePoster: movies.poster,
        movieDuration: movies.duration,
        certification: movies.certification,
      })
      .from(shows)
      .innerJoin(theatres, eq(shows.theatreId, theatres.id))
      .leftJoin(screens, eq(shows.screenId, screens.id))
      .leftJoin(movies, eq(shows.movieId, movies.id))
      .where(whereClause)
      .orderBy(shows.startsAt);

    return showRows.map((s) => ({
      id: s.showId,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      language: s.language,
      format: s.format,
      status: s.status,
      price: Number(s.price),
      theatre: {
        id: s.theatreId,
        name: s.theatreName,
        location: s.theatreLocation,
        city: s.theatreCity,
      },
      screen: s.screenId
        ? {
            id: s.screenId,
            name: s.screenName || 'Screen 1',
            screenType: s.screenType || 'Standard',
          }
        : undefined,
      movie: s.movieId
        ? {
            id: s.movieId,
            title: s.movieTitle,
            poster: s.moviePoster,
            duration: s.movieDuration,
            certification: s.certification,
          }
        : null,
    }));
  },

  async getShowSeats(showId: number): Promise<SeatResponse[]> {
    const seatsList = await db
      .select({
        id: showSeats.id,
        seatNumber: showSeats.seatNumber,
        row: showSeats.row,
        category: showSeats.category,
        price: showSeats.price,
        status: showSeats.status,
      })
      .from(showSeats)
      .where(eq(showSeats.showId, showId))
      .orderBy(showSeats.seatNumber);

    return seatsList.map((s) => ({
      id: s.id,
      seat_number: s.seatNumber,
      row: s.row,
      category: s.category,
      price: s.price ? Number(s.price) : undefined,
      status: s.status,
    }));
  },

  async getLegacyEventSeats(eventId: number): Promise<SeatResponse[]> {
    const firstShow = await db.query.shows.findFirst({ where: eq(shows.eventId, eventId) });
    if (!firstShow) return [];
    return this.getShowSeats(firstShow.id);
  },

  async createShow(
    eventIdOrMovieId: number,
    theatreId: number,
    startsAtStr: string,
    price: number,
    numSeats = 60,
    seatPrefix = 'A',
    options?: {
      movieId?: number;
      screenId?: number;
      endsAt?: string;
      language?: string;
      format?: string;
      status?: 'scheduled' | 'selling' | 'sold_out' | 'cancelled';
    },
  ): Promise<{ message: string; id: number; seats: number }> {
    const startsAt = new Date(startsAtStr);
    const endsAt = options?.endsAt
      ? new Date(options.endsAt)
      : new Date(startsAt.getTime() + 150 * 60000); // 2h 30m default

    const theatre = await db.query.theatres.findFirst({ where: eq(theatres.id, theatreId) });
    if (!theatre) throw new AppError('Cinema not found', 404);

    // Resolve or find screen
    let targetScreenId = options?.screenId;
    let targetScreen;

    if (targetScreenId) {
      targetScreen = await db.query.screens.findFirst({
        where: and(eq(screens.id, targetScreenId), eq(screens.theatreId, theatreId)),
      });
      if (!targetScreen) {
        throw new AppError('Specified screen does not belong to this cinema', 400);
      }
    } else {
      targetScreen = await db.query.screens.findFirst({
        where: eq(screens.theatreId, theatreId),
      });
      if (!targetScreen) {
        const [sc] = await db
          .insert(screens)
          .values({
            theatreId,
            name: 'Screen 1',
            screenType: options?.format || 'Standard',
            totalSeats: numSeats,
            seatLayout: JSON.stringify(DEFAULT_LAYOUT),
          })
          .returning();
        targetScreen = sc;
      }
      targetScreenId = targetScreen.id;
    }

    // CHECK OVERLAP ON THIS SCREEN
    await this.checkScreenOverlap(targetScreenId, startsAt, endsAt);

    // Resolve event and movie
    let resolvedEventId = eventIdOrMovieId;
    let resolvedMovieId = options?.movieId;

    if (!resolvedMovieId) {
      const movieMatch = await db.query.movies.findFirst({
        where: eq(movies.id, eventIdOrMovieId),
      });
      if (movieMatch) {
        resolvedMovieId = movieMatch.id;
      }
    }

    const eventMatch = await db.query.events.findFirst({
      where: eq(events.id, resolvedEventId),
    });
    if (!eventMatch) {
      const [anyEvent] = await db.select({ id: events.id }).from(events).limit(1);
      if (anyEvent) {
        resolvedEventId = anyEvent.id;
      }
    }

    const [show] = await db
      .insert(shows)
      .values({
        eventId: resolvedEventId,
        movieId: resolvedMovieId,
        theatreId,
        screenId: targetScreenId,
        startsAt,
        endsAt,
        language: options?.language || 'Hindi',
        format: options?.format || targetScreen?.screenType || '2D',
        status: options?.status || 'selling',
        price: String(price),
      })
      .returning({ id: shows.id });

    // Seed runtime seats based on physical screen layout if configured
    let layout: ScreenLayoutConfig = DEFAULT_LAYOUT;
    try {
      const parsed = JSON.parse(targetScreen?.seatLayout || '{}');
      if (parsed.rows && parsed.cols) layout = parsed;
    } catch {
      layout = DEFAULT_LAYOUT;
    }

    const seatRows = [];
    if (layout.rows && layout.cols) {
      for (const r of layout.rows) {
        const cat: 'recliner' | 'premium' | 'standard' = layout.tiers.recliner?.includes(r)
          ? 'recliner'
          : layout.tiers.premium?.includes(r)
          ? 'premium'
          : 'standard';

        const mult = layout.priceMultipliers[cat] || 1.0;
        const seatPrice = Math.round(price * mult);

        for (let c = 1; c <= layout.cols; c++) {
          seatRows.push({
            showId: show.id,
            seatNumber: `${r}${c}`,
            row: r,
            category: cat,
            price: String(seatPrice),
            status: 'available' as const,
          });
        }
      }
    } else {
      for (let i = 1; i <= numSeats; i++) {
        seatRows.push({
          showId: show.id,
          seatNumber: `${seatPrefix}${i}`,
          row: seatPrefix,
          category: 'standard' as const,
          price: String(price),
          status: 'available' as const,
        });
      }
    }

    await db.insert(showSeats).values(seatRows);

    return { message: 'Show created', id: show.id, seats: seatRows.length };
  },
};
