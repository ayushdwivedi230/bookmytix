import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import * as path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import crypto from 'crypto';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { db } from './server/db/index.js';
import { users, events, theatres, shows, showSeats, bookings, tickets } from './server/db/schema.js';

dotenv.config();

// ─── Startup checks ────────────────────────────────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET environment variable is not set. Refusing to start.');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
const BCRYPT_SALT_ROUNDS = 12;

// ─── Zod schemas ───────────────────────────────────────────────────────────────
const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const createEventSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  location: z.string().trim().min(1, 'Location is required'),
  date: z.string().min(1, 'Date is required'),
  price: z.number({ error: 'Price must be a number' }).positive('Price must be positive'),
  category: z.string().trim().optional().default('Movies'),
  image: z.string().url('Image must be a valid URL').optional().default(''),
  description: z.string().trim().optional().default(''),
});

const updateEventSchema = createEventSchema.partial();

const createShowSchema = z.object({
  theatreId: z.number().int().positive('theatreId is required'),
  startsAt: z.string().min(1, 'startsAt (ISO datetime) is required'),
  price: z.number({ error: 'Price must be a number' }).positive(),
  numSeats: z.number().int().positive().optional().default(20),
  seatPrefix: z.string().optional().default('A'),
});

const createBookingSchema = z.object({
  show_id: z.number({ error: 'show_id must be a number' }).int().positive(),
  seat_ids: z
    .array(z.number().int().positive())
    .min(1, 'At least one seat required')
    .max(10, 'Maximum 10 seats per booking')
    .refine(ids => new Set(ids).size === ids.length, 'seat_ids must be unique'),
});

// ─── Server ────────────────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com', 'https://*.unsplash.com'],
        frameSrc: ["'self'", 'https://www.youtube.com', 'https://youtube.com'],
        connectSrc: ["'self'"],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  }));
  app.use(express.json());
  app.use(express.static('public'));

  // Rate-limiting for auth routes (10 requests per 15 min per IP)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use('/api/auth', authLimiter);

  // ─── Authentication Middleware ─────────────────────────────────────────────
  const authenticateToken = (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    if (!token) {
      res.status(401).json({ error: 'Authentication token required' });
      return;
    }
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        res.status(403).json({ error: 'Invalid or expired token' });
        return;
      }
      req.user = user;
      next();
    });
  };

  const requireAdmin = (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    next();
  };

  // ─── Auth Routes ───────────────────────────────────────────────────────────
  app.post('/api/auth/register', async (req, res, next) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation error' });
        return;
      }
      const { name, email, password } = parsed.data;

      const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
      if (existing) {
        res.status(400).json({ error: 'Email already exists' });
        return;
      }

      const hash = bcrypt.hashSync(password, BCRYPT_SALT_ROUNDS);
      // Registration always creates role 'user' — admin only via seed/ADMIN_EMAIL env
      const [user] = await db.insert(users).values({ name, email, passwordHash: hash, role: 'user' }).returning({
        id: users.id, name: users.name, email: users.email, role: users.role,
      });

      const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
      res.json({ token, user });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation error' });
        return;
      }
      const { email, password } = parsed.data;

      const user = await db.query.users.findFirst({ where: eq(users.email, email) });
      if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, role: user.role },
        JWT_SECRET,
        { expiresIn: '12h' }
      );
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
      next(err);
    }
  });

  // ─── Event Routes ──────────────────────────────────────────────────────────
  app.get('/api/events', async (_req, res, next) => {
    try {
      const allEvents = await db.select().from(events);
      // Reshape to match what the frontend expects
      const shaped = allEvents.map(e => ({
        id: e.id,
        title: e.title,
        category: e.category,
        location: e.location,
        date: e.date,
        image: e.image,
        description: e.description,
        price: Number(e.basePrice),
        // Legacy fields the frontend still reads for theatre/timing display
        theatres: [],
        showTimings: [],
      }));
      res.json(shaped);
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/events/:id', async (req, res, next) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) { res.status(400).json({ error: 'Invalid event id' }); return; }

      const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
      if (!event) { res.status(404).json({ error: 'Event not found' }); return; }

      // Load shows to populate theatres and showTimings for backward compat
      const eventShows = await db
        .select({ theatre: theatres.name, startsAt: shows.startsAt })
        .from(shows)
        .innerJoin(theatres, eq(shows.theatreId, theatres.id))
        .where(eq(shows.eventId, eventId));

      const uniqueTheatres = [...new Set(eventShows.map(s => s.theatre))];
      const uniqueTimings = [...new Set(eventShows.map(s =>
        new Date(s.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      ))];

      res.json({
        id: event.id,
        title: event.title,
        category: event.category,
        location: event.location,
        date: event.date,
        image: event.image,
        description: event.description,
        price: Number(event.basePrice),
        theatres: uniqueTheatres,
        showTimings: uniqueTimings,
      });
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/events/:id/shows — list shows with theatre and datetime */
  app.get('/api/events/:id/shows', async (req, res, next) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) { res.status(400).json({ error: 'Invalid event id' }); return; }

      const eventShows = await db
        .select({
          showId: shows.id,
          startsAt: shows.startsAt,
          price: shows.price,
          theatreId: theatres.id,
          theatreName: theatres.name,
          theatreLocation: theatres.location,
        })
        .from(shows)
        .innerJoin(theatres, eq(shows.theatreId, theatres.id))
        .where(eq(shows.eventId, eventId))
        .orderBy(shows.startsAt);

      res.json(eventShows.map(s => ({
        id: s.showId,
        startsAt: s.startsAt,
        price: Number(s.price),
        theatre: { id: s.theatreId, name: s.theatreName, location: s.theatreLocation },
      })));
    } catch (err) {
      next(err);
    }
  });

  /** GET /api/shows/:id/seats — seat map for a specific show */
  app.get('/api/shows/:id/seats', async (req, res, next) => {
    try {
      const showId = parseInt(req.params.id);
      if (isNaN(showId)) { res.status(400).json({ error: 'Invalid show id' }); return; }

      const seats = await db
        .select({
          id: showSeats.id,
          seatNumber: showSeats.seatNumber,
          status: showSeats.status,
        })
        .from(showSeats)
        .where(eq(showSeats.showId, showId))
        .orderBy(showSeats.seatNumber);

      res.json(seats.map(s => ({
        id: s.id,
        seat_number: s.seatNumber,
        status: s.status,
      })));
    } catch (err) {
      next(err);
    }
  });

  /** Legacy: GET /api/events/:id/seats — redirects to first show's seats for backward compat */
  app.get('/api/events/:id/seats', async (req, res, next) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) { res.status(400).json({ error: 'Invalid event id' }); return; }

      const firstShow = await db.query.shows.findFirst({ where: eq(shows.eventId, eventId) });
      if (!firstShow) { res.json([]); return; }

      const seats = await db
        .select({ id: showSeats.id, seatNumber: showSeats.seatNumber, status: showSeats.status })
        .from(showSeats)
        .where(eq(showSeats.showId, firstShow.id))
        .orderBy(showSeats.seatNumber);

      res.json(seats.map(s => ({ id: s.id, seat_number: s.seatNumber, status: s.status })));
    } catch (err) {
      next(err);
    }
  });

  // ─── Admin event management ────────────────────────────────────────────────
  app.post('/api/events', authenticateToken as any, requireAdmin as any, async (req, res, next) => {
    try {
      const parsed = createEventSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation error' });
        return;
      }
      const { title, location, date, price, category, image, description } = parsed.data;

      const [event] = await db.insert(events).values({
        title, location, date, category, image, description, basePrice: String(price),
      }).returning({ id: events.id });

      res.status(201).json({ message: 'Event created', id: event.id });
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/events/:id', authenticateToken as any, requireAdmin as any, async (req, res, next) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) { res.status(400).json({ error: 'Invalid event id' }); return; }

      const parsed = updateEventSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation error' });
        return;
      }

      const { price, ...rest } = parsed.data;
      const updateData: Record<string, unknown> = { ...rest };
      if (price !== undefined) updateData.basePrice = String(price);

      await db.update(events).set(updateData).where(eq(events.id, eventId));
      res.json({ message: 'Event updated' });
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/events/:id', authenticateToken as any, requireAdmin as any, async (req, res, next) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) { res.status(400).json({ error: 'Invalid event id' }); return; }
      await db.delete(events).where(eq(events.id, eventId));
      res.json({ message: 'Event deleted' });
    } catch (err) {
      next(err);
    }
  });

  /** POST /api/events/:id/shows — create a show and auto-generate seats */
  app.post('/api/events/:id/shows', authenticateToken as any, requireAdmin as any, async (req, res, next) => {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) { res.status(400).json({ error: 'Invalid event id' }); return; }

      const parsed = createShowSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation error' });
        return;
      }
      const { theatreId, startsAt, price, numSeats, seatPrefix } = parsed.data;

      // Verify event and theatre exist
      const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
      if (!event) { res.status(404).json({ error: 'Event not found' }); return; }

      const theatre = await db.query.theatres.findFirst({ where: eq(theatres.id, theatreId) });
      if (!theatre) { res.status(404).json({ error: 'Theatre not found' }); return; }

      const [show] = await db.insert(shows).values({
        eventId,
        theatreId,
        startsAt: new Date(startsAt),
        price: String(price),
      }).returning({ id: shows.id });

      const seatRows = Array.from({ length: numSeats }, (_, i) => ({
        showId: show.id,
        seatNumber: `${seatPrefix}${i + 1}`,
        status: 'available' as const,
      }));
      await db.insert(showSeats).values(seatRows);

      res.status(201).json({ message: 'Show created', id: show.id, seats: numSeats });
    } catch (err) {
      next(err);
    }
  });

  // ─── Admin Stats ───────────────────────────────────────────────────────────
  app.get('/api/admin/stats', authenticateToken as any, requireAdmin as any, async (_req, res, next) => {
    try {
      const [eventCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(events);
      const [bookingCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(bookings);
      const [revenueResult] = await db.select({ total: sql<number>`COALESCE(SUM(total_price), 0)` }).from(bookings);

      res.json({
        events: eventCount.count,
        bookings: bookingCount.count,
        revenue: Number(revenueResult.total),
      });
    } catch (err) {
      next(err);
    }
  });

  // Admin: list all events
  app.get('/api/admin/events', authenticateToken as any, requireAdmin as any, async (_req, res, next) => {
    try {
      const allEvents = await db.select().from(events).orderBy(events.id);
      res.json(allEvents.map(e => ({ ...e, price: Number(e.basePrice) })));
    } catch (err) {
      next(err);
    }
  });

  // Admin: list all theatres
  app.get('/api/admin/theatres', authenticateToken as any, requireAdmin as any, async (_req, res, next) => {
    try {
      const allTheatres = await db.select().from(theatres).orderBy(theatres.id);
      res.json(allTheatres);
    } catch (err) {
      next(err);
    }
  });

  // ─── Booking Routes ────────────────────────────────────────────────────────
  /**
   * POST /api/bookings
   * Body: { show_id: number, seat_ids: number[] }
   *
   * Phase 3 correct logic:
   * 1. Validate seat_ids (non-empty, unique, max 10)
   * 2. Reject bookings for past shows
   * 3. Atomic UPDATE with RETURNING — 409 if any seat already booked
   * 4. Server-side price — client price is ignored
   * 5. qr_code = crypto.randomUUID()
   */
  app.post('/api/bookings', authenticateToken as any, async (req: any, res, next) => {
    try {
      const parsed = createBookingSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation error' });
        return;
      }
      const { show_id, seat_ids } = parsed.data;
      const userId = req.user.id;

      // Load show (includes price and startsAt)
      const show = await db.query.shows.findFirst({ where: eq(shows.id, show_id) });
      if (!show) { res.status(404).json({ error: 'Show not found' }); return; }

      // Reject past shows
      if (new Date(show.startsAt) < new Date()) {
        res.status(400).json({ error: 'Cannot book seats for a show that has already started' });
        return;
      }

      // Atomic seat claim — single UPDATE with RETURNING
      const bookedSeats = await db
        .update(showSeats)
        .set({ status: 'booked' })
        .where(
          and(
            eq(showSeats.showId, show_id),
            inArray(showSeats.id, seat_ids),
            eq(showSeats.status, 'available')
          )
        )
        .returning({ id: showSeats.id });

      if (bookedSeats.length !== seat_ids.length) {
        // Roll back the partial update
        if (bookedSeats.length > 0) {
          await db
            .update(showSeats)
            .set({ status: 'available' })
            .where(inArray(showSeats.id, bookedSeats.map(s => s.id)));
        }
        res.status(409).json({ error: 'Some seats are no longer available' });
        return;
      }

      // Server-side price computation
      const totalPrice = seat_ids.length * Number(show.price);

      // Create booking
      const [booking] = await db.insert(bookings).values({
        userId,
        showId: show_id,
        totalPrice: String(totalPrice),
        status: 'confirmed',
      }).returning({ id: bookings.id });

      // Update seat booking_id reference
      await db
        .update(showSeats)
        .set({ bookingId: booking.id })
        .where(inArray(showSeats.id, seat_ids));

      // Create tickets with unguessable QR codes
      const ticketRows = bookedSeats.map(seat => ({
        bookingId: booking.id,
        showSeatId: seat.id,
        qrCode: crypto.randomUUID(),
      }));
      await db.insert(tickets).values(ticketRows);

      res.json({ message: 'Booking successful', booking_id: booking.id });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/bookings', authenticateToken as any, async (req: any, res, next) => {
    try {
      const userBookings = await db
        .select({
          bookingId: bookings.id,
          totalPrice: bookings.totalPrice,
          status: bookings.status,
          createdAt: bookings.createdAt,
          showId: shows.id,
          startsAt: shows.startsAt,
          eventId: events.id,
          eventTitle: events.title,
          eventDate: events.date,
          eventLocation: events.location,
          theatreName: theatres.name,
        })
        .from(bookings)
        .innerJoin(shows, eq(bookings.showId, shows.id))
        .innerJoin(events, eq(shows.eventId, events.id))
        .innerJoin(theatres, eq(shows.theatreId, theatres.id))
        .where(eq(bookings.userId, req.user.id))
        .orderBy(bookings.createdAt);

      const result = await Promise.all(userBookings.map(async b => {
        const bookingTickets = await db
          .select({ id: tickets.id, qrCode: tickets.qrCode, seatNumber: showSeats.seatNumber })
          .from(tickets)
          .innerJoin(showSeats, eq(tickets.showSeatId, showSeats.id))
          .where(eq(tickets.bookingId, b.bookingId));

        const showTime = new Date(b.startsAt).toLocaleTimeString('en-US', {
          hour: '2-digit', minute: '2-digit', hour12: true,
        });

        return {
          id: b.bookingId,
          total_price: Number(b.totalPrice),
          status: b.status,
          created_at: b.createdAt,
          event_title: b.eventTitle,
          event_date: b.eventDate,
          event_location: b.eventLocation,
          theatre: b.theatreName,
          show_time: showTime,
          tickets: bookingTickets.map(t => ({
            id: t.id,
            qr_code: t.qrCode,
            seat_number: t.seatNumber,
          })),
        };
      }));

      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // ─── Central Error Handler ─────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[error]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  });

  // ─── Vite / Static serving ─────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
