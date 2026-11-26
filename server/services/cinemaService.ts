import { eq, and, ilike, or, sql, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { theatres, screens, shows, movies } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';

export interface CinemaFilterParams {
  city?: string;
  format?: string;
  search?: string;
  operatingStatus?: 'active' | 'maintenance' | 'closed';
}

export interface CinemaScreenSummary {
  id: number;
  name: string;
  screenType: string;
  totalSeats: number;
}

export interface CinemaResponse {
  id: number;
  name: string;
  location: string;
  city: string;
  address: string;
  amenities: string[];
  phone: string;
  email: string;
  landmark: string;
  operatingStatus: string;
  screensCount: number;
  formats: string[];
  screens?: CinemaScreenSummary[];
}

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const cinemaService = {
  async listCinemas(params: CinemaFilterParams = {}): Promise<CinemaResponse[]> {
    const conditions = [];

    if (params.city && params.city !== 'All Cities' && params.city !== 'All') {
      conditions.push(ilike(theatres.city, `%${params.city}%`));
    }

    if (params.operatingStatus) {
      conditions.push(eq(theatres.operatingStatus, params.operatingStatus));
    }

    if (params.search) {
      const q = `%${params.search}%`;
      conditions.push(
        or(
          ilike(theatres.name, q),
          ilike(theatres.location, q),
          ilike(theatres.address, q),
          ilike(theatres.city, q),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const allTheatres = await db
      .select()
      .from(theatres)
      .where(whereClause)
      .orderBy(theatres.name);

    if (allTheatres.length === 0) {
      return [];
    }

    const theatreIds = allTheatres.map((t) => t.id);

    // Fetch screens for all theatres in one query
    const allScreens = await db
      .select({
        id: screens.id,
        theatreId: screens.theatreId,
        name: screens.name,
        screenType: screens.screenType,
        totalSeats: screens.totalSeats,
      })
      .from(screens)
      .where(inArray(screens.theatreId, theatreIds));

    const screensByTheatre = new Map<number, CinemaScreenSummary[]>();
    for (const sc of allScreens) {
      const list = screensByTheatre.get(sc.theatreId) || [];
      list.push(sc);
      screensByTheatre.set(sc.theatreId, list);
    }

    let result: CinemaResponse[] = allTheatres.map((t) => {
      const scList = screensByTheatre.get(t.id) || [];
      const formats = Array.from(new Set(scList.map((s) => s.screenType).filter(Boolean)));
      if (formats.length === 0) {
        formats.push('Standard');
      }

      return {
        id: t.id,
        name: t.name,
        location: t.location,
        city: t.city,
        address: t.address,
        amenities: safeParseJson<string[]>(t.amenities, [
          '4K Dolby Atmos',
          'Parking',
          'Food Court',
          'Recliner Seats',
        ]),
        phone: t.phone,
        email: t.email,
        landmark: t.landmark,
        operatingStatus: t.operatingStatus,
        screensCount: scList.length,
        formats,
        screens: scList,
      };
    });

    if (params.format && params.format !== 'All Formats' && params.format !== 'All') {
      result = result.filter((c) =>
        c.formats.some((f) => f.toLowerCase().includes(params.format!.toLowerCase())),
      );
    }

    return result;
  },

  async getCinemaById(id: number): Promise<CinemaResponse & { upcomingShows: any[] }> {
    const theatre = await db.query.theatres.findFirst({
      where: eq(theatres.id, id),
    });

    if (!theatre) {
      throw new AppError('Cinema not found', 404);
    }

    const screenList = await db
      .select()
      .from(screens)
      .where(eq(screens.theatreId, id))
      .orderBy(screens.name);

    const formats = Array.from(new Set(screenList.map((s) => s.screenType).filter(Boolean)));
    if (formats.length === 0) formats.push('Standard');

    // Fetch upcoming shows for this cinema
    const now = new Date();
    const showsList = await db
      .select({
        showId: shows.id,
        startsAt: shows.startsAt,
        endsAt: shows.endsAt,
        language: shows.language,
        format: shows.format,
        status: shows.status,
        price: shows.price,
        screenId: shows.screenId,
        screenName: screens.name,
        screenType: screens.screenType,
        movieId: movies.id,
        movieTitle: movies.title,
        moviePoster: movies.poster,
        movieGenre: movies.genre,
        movieDuration: movies.duration,
        certification: movies.certification,
      })
      .from(shows)
      .leftJoin(screens, eq(shows.screenId, screens.id))
      .leftJoin(movies, eq(shows.movieId, movies.id))
      .where(and(eq(shows.theatreId, id), sql`${shows.startsAt} >= ${now}`))
      .orderBy(shows.startsAt);

    return {
      id: theatre.id,
      name: theatre.name,
      location: theatre.location,
      city: theatre.city,
      address: theatre.address,
      amenities: safeParseJson<string[]>(theatre.amenities, [
        '4K Dolby Atmos',
        'Parking',
        'Food Court',
      ]),
      phone: theatre.phone,
      email: theatre.email,
      landmark: theatre.landmark,
      operatingStatus: theatre.operatingStatus,
      screensCount: screenList.length,
      formats,
      screens: screenList.map((s) => ({
        id: s.id,
        name: s.name,
        screenType: s.screenType,
        totalSeats: s.totalSeats,
      })),
      upcomingShows: showsList.map((s) => ({
        id: s.showId,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt ? s.endsAt.toISOString() : null,
        language: s.language,
        format: s.format,
        status: s.status,
        price: Number(s.price),
        screen: {
          id: s.screenId,
          name: s.screenName || 'Main Screen',
          type: s.screenType || 'Standard',
        },
        movie: s.movieId
          ? {
              id: s.movieId,
              title: s.movieTitle,
              poster: s.moviePoster,
              genre: s.movieGenre,
              duration: s.movieDuration,
              certification: s.certification,
            }
          : null,
      })),
    };
  },

  async createCinema(data: {
    name: string;
    location: string;
    city: string;
    address?: string;
    amenities?: string[];
    phone?: string;
    email?: string;
    landmark?: string;
    operatingStatus?: 'active' | 'maintenance' | 'closed';
  }): Promise<CinemaResponse> {
    const [theatre] = await db
      .insert(theatres)
      .values({
        name: data.name,
        location: data.location,
        city: data.city,
        address: data.address || data.location,
        amenities: JSON.stringify(
          data.amenities || ['4K Dolby Atmos', 'Parking', 'Food Court', 'Recliner Seats'],
        ),
        phone: data.phone || '+91 22 6600 0000',
        email: data.email || 'support@bookmytix.com',
        landmark: data.landmark || '',
        operatingStatus: data.operatingStatus || 'active',
      })
      .returning();

    // Automatically create a default standard screen
    const [screen] = await db
      .insert(screens)
      .values({
        theatreId: theatre.id,
        name: 'Screen 1',
        screenType: 'Standard',
        totalSeats: 60,
        seatLayout: JSON.stringify({
          rows: ['A', 'B', 'C', 'D', 'E'],
          cols: 12,
          tiers: {
            recliner: ['A'],
            premium: ['B', 'C'],
            standard: ['D', 'E'],
          },
        }),
      })
      .returning();

    return {
      id: theatre.id,
      name: theatre.name,
      location: theatre.location,
      city: theatre.city,
      address: theatre.address,
      amenities: safeParseJson<string[]>(theatre.amenities, []),
      phone: theatre.phone,
      email: theatre.email,
      landmark: theatre.landmark,
      operatingStatus: theatre.operatingStatus,
      screensCount: 1,
      formats: ['Standard'],
      screens: [
        {
          id: screen.id,
          name: screen.name,
          screenType: screen.screenType,
          totalSeats: screen.totalSeats,
        },
      ],
    };
  },

  async updateCinema(
    id: number,
    data: Partial<{
      name: string;
      location: string;
      city: string;
      address: string;
      amenities: string[];
      phone: string;
      email: string;
      landmark: string;
      operatingStatus: 'active' | 'maintenance' | 'closed';
    }>,
  ): Promise<CinemaResponse> {
    const updateValues: Record<string, unknown> = {};
    if (data.name !== undefined) updateValues.name = data.name;
    if (data.location !== undefined) updateValues.location = data.location;
    if (data.city !== undefined) updateValues.city = data.city;
    if (data.address !== undefined) updateValues.address = data.address;
    if (data.amenities !== undefined) updateValues.amenities = JSON.stringify(data.amenities);
    if (data.phone !== undefined) updateValues.phone = data.phone;
    if (data.email !== undefined) updateValues.email = data.email;
    if (data.landmark !== undefined) updateValues.landmark = data.landmark;
    if (data.operatingStatus !== undefined) updateValues.operatingStatus = data.operatingStatus;

    const [updated] = await db
      .update(theatres)
      .set(updateValues)
      .where(eq(theatres.id, id))
      .returning();

    if (!updated) {
      throw new AppError('Cinema not found', 404);
    }

    return this.getCinemaById(id);
  },
};
