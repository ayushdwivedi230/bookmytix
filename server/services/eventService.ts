import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { events, theatres, shows } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';

export interface EventDetailResponse {
  id: number;
  title: string;
  category: string;
  location: string;
  date: string;
  image: string;
  banner: string;
  trailer: string;
  description: string;
  duration: string;
  language: string;
  genre: string;
  certificate: string;
  rating: number;
  price: number;
  theatres: string[];
  showTimings: string[];
}

export const eventService = {
  async listAll(): Promise<EventDetailResponse[]> {
    const allEvents = await db.select().from(events).orderBy(events.id);
    return allEvents.map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      location: e.location,
      date: e.date,
      image: e.image,
      banner: e.banner || e.image,
      trailer: e.trailer,
      description: e.description,
      duration: e.duration,
      language: e.language,
      genre: e.genre,
      certificate: e.certificate,
      rating: Number(e.rating) || 4.5,
      price: Number(e.basePrice),
      theatres: [],
      showTimings: [],
    }));
  },

  async getById(id: number): Promise<EventDetailResponse> {
    const event = await db.query.events.findFirst({ where: eq(events.id, id) });
    if (!event) {
      throw new AppError('Event not found', 404);
    }

    const eventShows = await db
      .select({ theatre: theatres.name, startsAt: shows.startsAt })
      .from(shows)
      .innerJoin(theatres, eq(shows.theatreId, theatres.id))
      .where(eq(shows.eventId, id));

    const uniqueTheatres = [...new Set(eventShows.map((s) => s.theatre))];
    const uniqueTimings = [
      ...new Set(
        eventShows.map((s) =>
          new Date(s.startsAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }),
        ),
      ),
    ];

    return {
      id: event.id,
      title: event.title,
      category: event.category,
      location: event.location,
      date: event.date,
      image: event.image,
      banner: event.banner || event.image,
      trailer: event.trailer,
      description: event.description,
      duration: event.duration,
      language: event.language,
      genre: event.genre,
      certificate: event.certificate,
      rating: Number(event.rating) || 4.5,
      price: Number(event.basePrice),
      theatres: uniqueTheatres,
      showTimings: uniqueTimings,
    };
  },

  async create(data: {
    title: string;
    location: string;
    date: string;
    price: number;
    category?: string;
    image?: string;
    banner?: string;
    trailer?: string;
    description?: string;
    duration?: string;
    language?: string;
    genre?: string;
    certificate?: string;
    rating?: number;
  }): Promise<{ message: string; id: number }> {
    const [event] = await db
      .insert(events)
      .values({
        title: data.title,
        location: data.location,
        date: data.date,
        category: data.category || 'Movies',
        image: data.image || '',
        banner: data.banner || data.image || '',
        trailer: data.trailer || '',
        description: data.description || '',
        duration: data.duration || '2h 15m',
        language: data.language || 'Hindi',
        genre: data.genre || 'Action',
        certificate: data.certificate || 'UA',
        rating: String(data.rating || 4.5),
        basePrice: String(data.price),
      })
      .returning({ id: events.id });

    return { message: 'Event created', id: event.id };
  },

  async update(id: number, data: Partial<{
    title: string;
    location: string;
    date: string;
    price: number;
    category?: string;
    image?: string;
    banner?: string;
    trailer?: string;
    description?: string;
    duration?: string;
    language?: string;
    genre?: string;
    certificate?: string;
    rating?: number;
  }>): Promise<{ message: string }> {
    const { price, rating, ...rest } = data;
    const updateData: Record<string, unknown> = { ...rest };
    if (price !== undefined) updateData.basePrice = String(price);
    if (rating !== undefined) updateData.rating = String(rating);

    await db.update(events).set(updateData).where(eq(events.id, id));
    return { message: 'Event updated' };
  },

  async delete(id: number): Promise<{ message: string }> {
    await db.delete(events).where(eq(events.id, id));
    return { message: 'Event deleted' };
  },
};
