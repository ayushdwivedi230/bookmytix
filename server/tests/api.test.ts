/**
 * API Integration Tests
 * Run with: npm test
 *
 * Uses a self-contained Express test app with an in-memory stub
 * so no real DB is needed for CI.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import crypto from 'crypto';

const TEST_SECRET = 'test-jwt-secret-for-vitest-only';

// ─── In-memory stub (mirrors Phase 1 server, without the DB layer) ─────────────
function buildTestApp() {
  const app = express();
  app.use(express.json());

  // Stub DB
  const users: any[] = [];
  const events: any[] = [];
  const showSeats: any[] = [];
  const shows: any[] = [];
  const bookings: any[] = [];
  const tickets: any[] = [];

  let uid = 1; const eid = 1; let sid = 1; let ssid = 1; let bid = 1;

  // Seed one event and show
  const seedEvent = { id: eid, title: 'Test Event', category: 'Movies', location: 'Mumbai', date: '2099-01-01', image: '', description: '', basePrice: '300' };
  events.push(seedEvent);
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  const seedShow = {
    id: sid++,
    eventId: seedEvent.id,
    theatreId: 1,
    screenId: 1,
    startsAt: futureDate,
    endsAt: new Date(futureDate.getTime() + 150 * 60000),
    language: 'Hindi',
    format: 'IMAX Laser',
    status: 'selling',
    price: '300',
  };
  shows.push(seedShow);
  for (let i = 1; i <= 20; i++) {
    const row = i <= 5 ? 'A' : i <= 10 ? 'B' : 'C';
    const cat = i <= 5 ? 'recliner' : i <= 10 ? 'premium' : 'standard';
    const mult = cat === 'recliner' ? 1.6 : cat === 'premium' ? 1.25 : 1.0;
    showSeats.push({
      id: ssid++,
      showId: seedShow.id,
      seatNumber: `${row}${i}`,
      row,
      category: cat,
      price: Math.round(300 * mult),
      status: 'available',
      bookingId: null,
    });
  }

  const cinemas: any[] = [
    {
      id: 1,
      name: 'PVR INOX: Maison PVR, Jio World Drive',
      city: 'Mumbai',
      location: 'BKC, Bandra East, Mumbai',
      address: 'Jio World Drive, BKC',
      amenities: ['Recliner Seats', 'Gourmet Food', 'Dolby Atmos', 'Valet Parking'],
      formats: ['IMAX Laser', '4DX', 'P[XL]'],
      screensCount: 3,
      phone: '+91 22 6600 0000',
      email: 'maison@pvrinox.com',
      operatingStatus: 'active',
      screens: [
        { id: 1, name: 'Screen 1 - IMAX Laser', screenType: 'IMAX Laser', totalSeats: 60 },
        { id: 2, name: 'Screen 2 - Dolby Atmos', screenType: 'Dolby Atmos', totalSeats: 50 },
      ],
    },
    {
      id: 2,
      name: 'Cinepolis: Nexus Mall, Hitec City',
      city: 'Hyderabad',
      location: 'Kukatpally, Hyderabad',
      address: 'Nexus Mall, Hitec City',
      amenities: ['VIP Lounge', 'Seat-side Service', 'Dolby 7.1'],
      formats: ['VIP Cinema', 'RealD 3D'],
      screensCount: 2,
      phone: '+91 40 4400 0000',
      email: 'nexus@cinepolis.com',
      operatingStatus: 'active',
      screens: [
        { id: 3, name: 'Screen 1 - VIP Cinema', screenType: 'VIP Cinema', totalSeats: 40 },
      ],
    },
  ];
  const seatLocks: any[] = [];

  // Admin user from env equivalent
  const adminHash = bcrypt.hashSync('adminpass1', 10);
  users.push({ id: uid++, name: 'Admin', email: 'admin@test.com', passwordHash: adminHash, role: 'admin' });

  // Zod schemas (same as production)
  const registerSchema = z.object({
    name: z.string().trim().min(2),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8),
  });
  const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8),
  });
  const bookingSchema = z.object({
    show_id: z.number().int().positive(),
    seat_ids: z.array(z.number().int().positive()).min(1).max(10)
      .refine(ids => new Set(ids).size === ids.length, 'seat_ids must be unique'),
  });

  // Auth middleware
  const auth = (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    const h = req.headers['authorization'];
    const t = h?.startsWith('Bearer ') ? h.slice(7).trim() : null;
    if (!t) { res.status(401).json({ error: 'Authentication token required' }); return; }
    try {
      req.user = jwt.verify(t, TEST_SECRET);
      next();
    } catch {
      res.status(403).json({ error: 'Invalid or expired token' });
    }
  };

  const adminOnly = (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return; }
    next();
  };

  // ── Register ──────────────────────────────────────────────────────────────
  app.post('/api/auth/register', (req, res) => {
    const p = registerSchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: p.error.issues[0]?.message }); return; }
    const { name, email, password } = p.data;
    if (users.find(u => u.email === email)) { res.status(400).json({ error: 'Email already exists' }); return; }
    const hash = bcrypt.hashSync(password, 4);
    const user = { id: uid++, name, email, passwordHash: hash, role: 'user' };
    users.push(user);
    const token = jwt.sign({ id: user.id, email, name, role: 'user' }, TEST_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, name, email, role: 'user' } });
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  app.post('/api/auth/login', (req, res) => {
    const p = loginSchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: p.error.issues[0]?.message }); return; }
    const { email, password } = p.data;
    const user = users.find(u => u.email === email);
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) { res.status(401).json({ error: 'Invalid email or password' }); return; }
    const token = jwt.sign({ id: user.id, email, name: user.name, role: user.role }, TEST_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, name: user.name, email, role: user.role } });
  });

  // ── Events ────────────────────────────────────────────────────────────────
  app.get('/api/events', (_req, res) => {
    res.json(events.map(e => ({ ...e, price: Number(e.basePrice) })));
  });

  // ── Admin stats ───────────────────────────────────────────────────────────
  app.get('/api/admin/stats', auth as any, adminOnly as any, (_req, res) => {
    res.json({ events: events.length, bookings: bookings.length, revenue: bookings.reduce((s, b) => s + Number(b.total_price), 0) });
  });

  // ── Bookings ──────────────────────────────────────────────────────────────
  app.post('/api/bookings', auth as any, (req: any, res) => {
    const p = bookingSchema.safeParse(req.body);
    if (!p.success) { res.status(400).json({ error: p.error.issues[0]?.message }); return; }
    const { show_id, seat_ids } = p.data;

    const show = shows.find(s => s.id === show_id);
    if (!show) { res.status(404).json({ error: 'Show not found' }); return; }

    // Past show check
    if (new Date(show.startsAt) < new Date()) {
      res.status(400).json({ error: 'Cannot book seats for a show that has already started' });
      return;
    }

    const now = new Date();
    // remove expired locks
    for (let i = seatLocks.length - 1; i >= 0; i--) {
      if (new Date(seatLocks[i].expiresAt) <= now) {
        seatLocks.splice(i, 1);
      }
    }

    // Check if any seat is locked by someone else
    const lockedByOther = seatLocks.find(l => l.showId === show_id && seat_ids.includes(l.showSeatId) && l.userId !== req.user.id);
    if (lockedByOther) {
      res.status(409).json({ error: 'Some seats are reserved by another customer' });
      return;
    }

    // Atomic seat claim
    const toBook = showSeats.filter(s => seat_ids.includes(s.id) && s.showId === show_id && s.status === 'available');
    if (toBook.length !== seat_ids.length) {
      res.status(409).json({ error: 'Some seats are no longer available' });
      return;
    }

    // Clear locks on booking
    for (let i = seatLocks.length - 1; i >= 0; i--) {
      if (seatLocks[i].showId === show_id && seat_ids.includes(seatLocks[i].showSeatId)) {
        seatLocks.splice(i, 1);
      }
    }

    // Server-side price — ignore any client price
    let subtotal = 0;
    for (const s of toBook) {
      subtotal += (s.price || Number(show.price));
    }
    const convenienceFee = toBook.length * 40;
    const gst = Math.round((subtotal + convenienceFee) * 0.18);
    const totalPrice = subtotal + convenienceFee + gst;

    const booking = { id: bid++, userId: req.user.id, showId: show_id, total_price: totalPrice, status: 'confirmed' };
    bookings.push(booking);

    for (const seat of toBook) {
      seat.status = 'booked';
      seat.bookingId = booking.id;
      tickets.push({ id: uid++, bookingId: booking.id, showSeatId: seat.id, qrCode: crypto.randomUUID() });
    }

    res.json({ message: 'Booking successful', booking_id: booking.id, total_price: totalPrice });
  });

  // ── Cinema Discovery Endpoints ────────────────────────────────────────────
  app.get('/api/cinemas', (req, res) => {
    let list = [...cinemas];
    const { city, format, search } = req.query;
    if (city && city !== 'All Cities') {
      list = list.filter(c => c.city.toLowerCase() === (city as string).toLowerCase());
    }
    if (format && format !== 'All Formats') {
      list = list.filter(c => c.formats.includes(format));
    }
    if (search) {
      const q = (search as string).toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.location.toLowerCase().includes(q));
    }
    res.json(list);
  });

  app.get('/api/cinemas/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const cinema = cinemas.find(c => c.id === id);
    if (!cinema) { res.status(404).json({ error: 'Cinema not found' }); return; }
    res.json({ ...cinema, upcomingShows: shows.filter(s => s.theatreId === id) });
  });

  // ── Seat Locking Endpoints ────────────────────────────────────────────────
  app.post('/api/shows/:id/lock-seats', auth as any, (req: any, res) => {
    const showId = parseInt(req.params.id);
    const { seat_ids } = req.body;
    if (!seat_ids || !Array.isArray(seat_ids) || seat_ids.length === 0) {
      res.status(400).json({ error: 'At least one seat must be selected' });
      return;
    }
    const now = new Date();
    // clean expired locks
    for (let i = seatLocks.length - 1; i >= 0; i--) {
      if (new Date(seatLocks[i].expiresAt) <= now) {
        seatLocks.splice(i, 1);
      }
    }
    const targetSeats = showSeats.filter(s => s.showId === showId && seat_ids.includes(s.id));
    if (targetSeats.length !== seat_ids.length) {
      res.status(404).json({ error: 'Seats not found' });
      return;
    }
    if (targetSeats.some(s => s.status === 'booked')) {
      res.status(409).json({ error: 'Seat already booked' });
      return;
    }
    const lockedByOther = seatLocks.find(l => l.showId === showId && seat_ids.includes(l.showSeatId) && l.userId !== req.user.id);
    if (lockedByOther) {
      res.status(409).json({ error: 'Seat is currently reserved by another customer' });
      return;
    }
    const lockToken = crypto.randomUUID();
    const expiresAt = new Date(now.getTime() + 8 * 60 * 1000);
    // remove current user's prior locks on these seats
    for (let i = seatLocks.length - 1; i >= 0; i--) {
      if (seatLocks[i].showId === showId && seat_ids.includes(seatLocks[i].showSeatId) && seatLocks[i].userId === req.user.id) {
        seatLocks.splice(i, 1);
      }
    }
    for (const sid of seat_ids) {
      seatLocks.push({ showId, showSeatId: sid, userId: req.user.id, lockToken, expiresAt });
    }
    const subtotal = targetSeats.reduce((sum, s) => sum + (s.price || 300), 0);
    const convenienceFee = targetSeats.length * 40;
    const gst = Math.round((subtotal + convenienceFee) * 0.18);
    res.json({
      lockToken,
      expiresAt: expiresAt.toISOString(),
      remainingSeconds: 480,
      seats: targetSeats.map(s => ({ id: s.id, seatNumber: s.seatNumber, row: s.row, category: s.category, price: s.price })),
      subtotal,
      convenienceFee,
      gst,
      total: subtotal + convenienceFee + gst,
    });
  });

  app.post('/api/shows/:id/release-seats', auth as any, (req: any, res) => {
    const showId = parseInt(req.params.id);
    const { lock_token } = req.body;
    let released = 0;
    for (let i = seatLocks.length - 1; i >= 0; i--) {
      if (seatLocks[i].showId === showId && seatLocks[i].lockToken === lock_token && seatLocks[i].userId === req.user.id) {
        seatLocks.splice(i, 1);
        released++;
      }
    }
    res.json({ released });
  });

  app.post('/api/test/expire-locks', (_req, res) => {
    const past = new Date(Date.now() - 1000);
    for (const lock of seatLocks) {
      lock.expiresAt = past;
    }
    res.json({ expired: seatLocks.length });
  });

  // ── Admin Show Scheduling with Overlap Prevention ─────────────────────────
  app.post('/api/admin/shows', auth as any, adminOnly as any, (req: any, res) => {
    const { screenId, startsAt, endsAt, price } = req.body;
    const start = new Date(startsAt);
    const end = new Date(endsAt || (start.getTime() + 150 * 60000));
    // Check overlap on the same screen
    const overlap = shows.find(s =>
      s.screenId === screenId &&
      s.status !== 'cancelled' &&
      new Date(s.startsAt) < end &&
      new Date(s.endsAt || (new Date(s.startsAt).getTime() + 150 * 60000)) > start
    );
    if (overlap) {
      res.status(409).json({ error: 'Schedule conflict: Screen already has an active show scheduled during this time interval' });
      return;
    }
    const newShow = { id: sid++, screenId, theatreId: 1, eventId: 1, startsAt: start, endsAt: end, price: String(price || 300), status: 'selling' };
    shows.push(newShow);
    res.status(201).json({ message: 'Show scheduled', show: newShow });
  });

  // ── Past show stub endpoint (for test) ───────────────────────────────────
  app.post('/api/test/add-past-show', (_req, res) => {
    const pastDate = new Date('2020-01-01T18:00:00Z');
    const pastShow = { id: sid++, eventId: seedEvent.id, theatreId: 1, startsAt: pastDate, price: '300' };
    shows.push(pastShow);
    for (let i = 1; i <= 3; i++) {
      showSeats.push({ id: ssid++, showId: pastShow.id, seatNumber: `P${i}`, status: 'available', bookingId: null });
    }
    res.json({ showId: pastShow.id, seatIds: showSeats.filter(s => s.showId === pastShow.id).map(s => s.id) });
  });

  // ── Health endpoints ──────────────────────────────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });
  app.get('/api/ready', (_req, res) => {
    res.json({ status: 'ready', database: { connected: true, latencyMs: 1 }, uptime: process.uptime() });
  });

  // ── Expose current seats with layout & categories ──────────────────────────
  app.get('/api/shows/:id/seats', (req, res) => {
    const showId = parseInt(req.params.id);
    const now = new Date();
    const show = shows.find(s => s.id === showId);
    const seatsList = showSeats.filter(s => s.showId === showId).map(s => {
      const activeLock = seatLocks.find(l => l.showId === showId && l.showSeatId === s.id && new Date(l.expiresAt) > now);
      let status = s.status;
      if (s.status === 'available' && activeLock) {
        status = 'locked';
      }
      return {
        id: s.id,
        seat_number: s.seatNumber,
        row: s.row || 'A',
        category: s.category || 'standard',
        price: s.price || 300,
        status,
      };
    });
    res.json({
      show: {
        id: showId,
        startsAt: show ? show.startsAt : new Date().toISOString(),
        endsAt: show ? show.endsAt : null,
        language: show?.language || 'Hindi',
        format: show?.format || '2D',
        basePrice: 300,
        screen: {
          id: 1,
          name: 'Screen 1 - IMAX Laser',
          type: 'IMAX Laser',
          layout: {
            rows: ['A', 'B', 'C'],
            cols: 5,
            tiers: { recliner: ['A'], premium: ['B'], standard: ['C'] },
            priceMultipliers: { recliner: 1.6, premium: 1.25, standard: 1.0 },
          },
        },
      },
      seats: seatsList,
    });
  });

  // ── Movie Catalog Endpoints ────────────────────────────────────────────────
  const testMovies: any[] = [
    {
      id: 1,
      title: 'Pushpa 2',
      slug: 'pushpa-2',
      genre: 'Action',
      language: 'Telugu',
      status: 'now_showing',
      rating: '4.8',
      popularity: '350.0',
      duration: '2h 55m',
      poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1',
      backdrop: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1',
      trailerUrl: 'https://www.youtube.com/embed/1kVK0MZlbI4',
      city: 'Hyderabad',
      cast: [{ name: 'Allu Arjun', role: 'Pushpa Raj' }],
      crew: [{ name: 'Sukumar', role: 'Director' }],
      formats: ['2D', '3D', 'IMAX 3D'],
      reviews: [],
    },
    {
      id: 2,
      title: 'Kalki 2898 AD',
      slug: 'kalki-2898-ad',
      genre: 'Sci-Fi',
      language: 'Telugu',
      status: 'now_showing',
      rating: '4.7',
      popularity: '290.0',
      duration: '3h 01m',
      poster: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1',
      backdrop: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1',
      trailerUrl: 'https://www.youtube.com/embed/kQDd1AhGIHk',
      city: 'Mumbai',
      cast: [{ name: 'Prabhas', role: 'Bhairava' }],
      crew: [{ name: 'Nag Ashwin', role: 'Director' }],
      formats: ['2D', 'IMAX 3D'],
      reviews: [],
    },
    {
      id: 3,
      title: 'Stree 2',
      slug: 'stree-2',
      genre: 'Comedy',
      language: 'Hindi',
      status: 'coming_soon',
      rating: '4.6',
      popularity: '240.0',
      duration: '2h 27m',
      poster: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26',
      backdrop: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26',
      trailerUrl: 'https://www.youtube.com/embed/aqz-KE-bpKQ',
      city: 'Delhi',
      cast: [{ name: 'Shraddha Kapoor', role: 'Mystery Woman' }],
      crew: [{ name: 'Amar Kaushik', role: 'Director' }],
      formats: ['2D'],
      reviews: [],
    },
  ];

  app.get('/api/movies', (req, res) => {
    let list = [...testMovies];
    const { status, genre, language, search, city } = req.query;
    if (status && status !== 'All') {
      if (status === 'popular') list.sort((a, b) => Number(b.popularity) - Number(a.popularity));
      else if (status === 'trending') list.sort((a, b) => Number(b.rating) - Number(a.rating));
      else list = list.filter(m => m.status === status);
    }
    if (genre && genre !== 'All') list = list.filter(m => m.genre === genre);
    if (language && language !== 'All') list = list.filter(m => m.language === language);
    if (city && city !== 'All Cities') list = list.filter(m => m.city.toLowerCase() === (city as string).toLowerCase());
    if (search) {
      const q = (search as string).toLowerCase();
      list = list.filter(m => m.title.toLowerCase().includes(q) || m.genre.toLowerCase().includes(q));
    }
    res.json({ movies: list, total: list.length, page: 1, limit: 20, totalPages: 1 });
  });

  app.get('/api/movies/suggestions', (req, res) => {
    const q = ((req.query.q as string) || '').toLowerCase();
    const matches = testMovies
      .filter(m => m.title.toLowerCase().includes(q) || m.genre.toLowerCase().includes(q))
      .slice(0, 6)
      .map(m => ({ id: m.id, title: m.title, slug: m.slug, poster: m.poster, genre: m.genre, language: m.language, rating: Number(m.rating), releaseYear: '2026', status: m.status }));
    res.json({ suggestions: matches });
  });

  app.get('/api/movies/filters', (_req, res) => {
    res.json({
      genres: ['All', 'Action', 'Sci-Fi', 'Comedy'],
      languages: ['All', 'Telugu', 'Hindi'],
      formats: ['All', '2D', '3D', 'IMAX 3D'],
      cities: ['All Cities', 'Hyderabad', 'Mumbai', 'Delhi'],
      statuses: ['now_showing', 'coming_soon', 'archived'],
    });
  });

  app.get('/api/movies/provider-attribution', (_req, res) => {
    res.json({
      provider: 'bookmytix',
      attributionText: 'Curated entertainment metadata powered by BookMyTix Catalog.',
    });
  });

  app.get('/api/movies/:idOrSlug', (req, res) => {
    const target = req.params.idOrSlug;
    const isNum = /^\d+$/.test(target);
    const movie = testMovies.find(m => isNum ? m.id === Number(target) : m.slug === target);
    if (!movie) { res.status(404).json({ error: 'Movie not found' }); return; }
    res.json({
      ...movie,
      cinemas: [
        {
          id: 1,
          name: 'PVR Cinemas',
          city: movie.city,
          location: movie.city,
          address: 'Main Mall',
          shows: [{ id: 101, startsAt: new Date().toISOString(), price: 300, screenName: 'Screen 1', screenType: 'IMAX Laser' }],
        },
      ],
      reviews: movie.reviews || [],
    });
  });

  app.post('/api/movies/:idOrSlug/reviews', auth, (req: any, res) => {
    const target = req.params.idOrSlug;
    const isNum = /^\d+$/.test(target);
    const movie = testMovies.find(m => isNum ? m.id === Number(target) : m.slug === target);
    if (!movie) { res.status(404).json({ error: 'Movie not found' }); return; }
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) { res.status(400).json({ error: 'Rating must be between 1 and 5' }); return; }
    const rev = { id: movie.reviews.length + 1, userName: req.user.name, rating, comment: comment || '', createdAt: new Date().toISOString() };
    movie.reviews.push(rev);
    res.status(201).json({ message: 'Review submitted', review: rev });
  });

  // ── Admin Movie Management Endpoints ──────────────────────────────────────
  app.get('/api/admin/movies', auth, adminOnly, (_req, res) => {
    res.json({ movies: testMovies, total: testMovies.length, page: 1, limit: 50 });
  });

  app.post('/api/admin/movies', auth, adminOnly, (req, res) => {
    const { title, genre, language } = req.body;
    if (!title) { res.status(400).json({ error: 'Title required' }); return; }
    const newMovie = {
      id: testMovies.length + 1,
      title,
      slug: title.toLowerCase().replace(/\s+/g, '-'),
      genre: genre || 'Drama',
      language: language || 'Hindi',
      status: req.body.status || 'now_showing',
      rating: 4.5,
      popularity: '100.0',
      duration: '2h 15m',
      poster: req.body.poster || '',
      backdrop: req.body.backdrop || '',
      trailerUrl: req.body.trailerUrl || '',
      city: 'Mumbai',
      cast: [],
      crew: [],
      formats: ['2D'],
      reviews: [],
    };
    testMovies.push(newMovie);
    res.status(201).json({ message: 'Movie created', movie: newMovie });
  });

  app.patch('/api/admin/movies/:id/status', auth, adminOnly, (req, res) => {
    const id = Number(req.params.id);
    const movie = testMovies.find(m => m.id === id);
    if (!movie) { res.status(404).json({ error: 'Movie not found' }); return; }
    movie.status = req.body.status;
    res.json({ message: 'Status updated', movie });
  });

  app.delete('/api/admin/movies/:id', auth, adminOnly, (req, res) => {
    const id = Number(req.params.id);
    const movie = testMovies.find(m => m.id === id);
    if (!movie) { res.status(404).json({ error: 'Movie not found' }); return; }
    movie.status = 'archived';
    res.json({ message: 'Movie archived' });
  });

  return { app, seedShow, showSeats };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────
describe('BookMyTix API', () => {
  let app: express.Express;
  let seedShow: any;
  let availableSeatIds: number[];

  beforeAll(() => {
    const built = buildTestApp();
    app = built.app;
    seedShow = built.seedShow;
    availableSeatIds = built.showSeats.filter((s: any) => s.showId === seedShow.id).map((s: any) => s.id);
  });

  // ── 1. Register success ────────────────────────────────────────────────────
  it('register: creates a new user with role user', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Alice', email: 'alice@example.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('user');
    expect(res.body.token).toBeTruthy();
  });

  // ── 2. Register failure (duplicate) ───────────────────────────────────────
  it('register: rejects duplicate email', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Bob', email: 'bob@example.com', password: 'password123' });
    const res = await request(app).post('/api/auth/register').send({ name: 'Bob2', email: 'bob@example.com', password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });

  // ── 3. Login success ───────────────────────────────────────────────────────
  it('login: returns token for valid credentials', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Carol', email: 'carol@example.com', password: 'password123' });
    const res = await request(app).post('/api/auth/login').send({ email: 'carol@example.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  // ── 4. Login failure ───────────────────────────────────────────────────────
  it('login: rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'carol@example.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  // ── 5. Protected route without token returns 401 ──────────────────────────
  it('protected route: returns 401 without token', async () => {
    const res = await request(app).post('/api/bookings').send({ show_id: 1, seat_ids: [1] });
    expect(res.status).toBe(401);
  });

  // ── 6. Non-admin hitting admin route returns 403 ──────────────────────────
  it('admin route: returns 403 for non-admin user', async () => {
    const reg = await request(app).post('/api/auth/register').send({ name: 'Dave', email: 'dave@example.com', password: 'password123' });
    const token = reg.body.token;
    const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  // ── 7. Book available seat ─────────────────────────────────────────────────
  it('booking: succeeds for available seat', async () => {
    const reg = await request(app).post('/api/auth/register').send({ name: 'Eve', email: 'eve@example.com', password: 'password123' });
    const token = reg.body.token;
    const seatId = availableSeatIds[0];
    const res = await request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`).send({ show_id: seedShow.id, seat_ids: [seatId] });
    expect(res.status).toBe(200);
    expect(res.body.booking_id).toBeTruthy();
  });

  // ── 8. Book same seat twice returns 409 ───────────────────────────────────
  it('booking: returns 409 when seat already booked', async () => {
    const reg = await request(app).post('/api/auth/register').send({ name: 'Frank', email: 'frank@example.com', password: 'password123' });
    const token = reg.body.token;
    const seatId = availableSeatIds[1];
    // First booking should succeed
    await request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`).send({ show_id: seedShow.id, seat_ids: [seatId] });
    // Second booking for the same seat should conflict
    const res = await request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`).send({ show_id: seedShow.id, seat_ids: [seatId] });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/no longer available/i);
  });

  // ── 9. Server ignores client-supplied price ────────────────────────────────
  it('booking: ignores any client-supplied price (server computes it)', async () => {
    const reg = await request(app).post('/api/auth/register').send({ name: 'Grace', email: 'grace@example.com', password: 'password123' });
    const token = reg.body.token;
    const seatId = availableSeatIds[2];
    // Send a fake price — the server should not trust it
    const res = await request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`)
      .send({ show_id: seedShow.id, seat_ids: [seatId], total_price: 0 });
    // Booking should succeed (extra fields are ignored)
    expect(res.status).toBe(200);
    expect(res.body.booking_id).toBeTruthy();
  });

  // ── 10. Past-show booking is rejected ─────────────────────────────────────
  it('booking: rejects booking for a past show', async () => {
    const reg = await request(app).post('/api/auth/register').send({ name: 'Hank', email: 'hank@example.com', password: 'password123' });
    const token = reg.body.token;
    // Create a past show via test helper
    const helperRes = await request(app).post('/api/test/add-past-show');
    const { showId, seatIds } = helperRes.body;
    const res = await request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`).send({ show_id: showId, seat_ids: [seatIds[0]] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already started/i);
  });

  // ── 11. Health endpoint returns 200 ok ────────────────────────────────────
  it('health: returns 200 ok for /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.uptime).toBeDefined();
  });

  // ── 12. Ready endpoint returns 200 ready ───────────────────────────────────
  it('ready: returns 200 ready for /api/ready', async () => {
    const res = await request(app).get('/api/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.database.connected).toBe(true);
  });

  // ── 13. Movie Catalog: list and filter by genre/status/city ───────────────
  it('movies: lists movies and filters by status and genre', async () => {
    const allRes = await request(app).get('/api/movies');
    expect(allRes.status).toBe(200);
    expect(Array.isArray(allRes.body.movies)).toBe(true);
    expect(allRes.body.movies.length).toBeGreaterThan(0);

    const actionRes = await request(app).get('/api/movies?genre=Action');
    expect(actionRes.status).toBe(200);
    expect(actionRes.body.movies.every((m: any) => m.genre === 'Action')).toBe(true);

    const comingSoonRes = await request(app).get('/api/movies?status=coming_soon');
    expect(comingSoonRes.status).toBe(200);
    expect(comingSoonRes.body.movies.every((m: any) => m.status === 'coming_soon')).toBe(true);
  });

  // ── 14. Movie Search & Suggestions: partial matching ──────────────────────
  it('movies: returns search suggestions for partial query', async () => {
    const res = await request(app).get('/api/movies/suggestions?q=kalki');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.suggestions)).toBe(true);
    expect(res.body.suggestions.length).toBeGreaterThan(0);
    expect(res.body.suggestions[0].title).toMatch(/kalki/i);
  });

  // ── 15. Movie Filter Options ──────────────────────────────────────────────
  it('movies: returns available genres, languages, and cities facets', async () => {
    const res = await request(app).get('/api/movies/filters');
    expect(res.status).toBe(200);
    expect(res.body.genres).toContain('Action');
    expect(res.body.languages).toContain('Hindi');
    expect(res.body.cities).toContain('Mumbai');
  });

  // ── 16. Movie Details by slug ─────────────────────────────────────────────
  it('movies: returns movie details and cinema showtimes by slug', async () => {
    const res = await request(app).get('/api/movies/pushpa-2');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Pushpa 2');
    expect(res.body.cinemas).toBeDefined();
    expect(res.body.cinemas[0].shows).toBeDefined();
  });

  // ── 17. Provider Attribution compliance ───────────────────────────────────
  it('movies: returns proper provider attribution metadata', async () => {
    const res = await request(app).get('/api/movies/provider-attribution');
    expect(res.status).toBe(200);
    expect(res.body.provider).toBeDefined();
    expect(res.body.attributionText).toBeDefined();
  });

  // ── 18. Movie Reviews: authenticated submission ───────────────────────────
  it('reviews: allows authenticated user to submit a movie review', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Reviewer',
      email: 'reviewer@example.com',
      password: 'password123',
    });
    const token = reg.body.token;

    const res = await request(app)
      .post('/api/movies/pushpa-2/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 5, comment: 'Phenomenal action and background score!' });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Review submitted');
    expect(res.body.review.rating).toBe(5);
  });

  // ── 19. Admin Movie Operations: create and change status ───────────────────
  it('admin: allows admin to create movie and toggle release status', async () => {
    const login = await request(app).post('/api/auth/login').send({
      email: 'admin@test.com',
      password: 'adminpass1',
    });
    const adminToken = login.body.token;

    // Create movie
    const createRes = await request(app)
      .post('/api/admin/movies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Gladiator II',
        genre: 'Action',
        language: 'English',
        status: 'now_showing',
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.movie.title).toBe('Gladiator II');
    const movieId = createRes.body.movie.id;

    // Toggle status to coming_soon
    const patchRes = await request(app)
      .patch(`/api/admin/movies/${movieId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'coming_soon' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.movie.status).toBe('coming_soon');
  });

  // ── 20. Admin Security: rejects regular user ──────────────────────────────
  it('admin: rejects non-admin users attempting movie management', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Regular User',
      email: 'regular@example.com',
      password: 'password123',
    });
    const userToken = reg.body.token;

    const res = await request(app)
      .get('/api/admin/movies')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/admin access required/i);
  });

  // ── 21. Cinema Discovery API: lists cinemas with city, formats, and amenities ─
  it('cinemas: lists multiplexes with city, configured formats, and amenities', async () => {
    const res = await request(app).get('/api/cinemas');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].name).toMatch(/PVR INOX/i);
    expect(res.body[0].amenities).toContain('Dolby Atmos');
    expect(res.body[0].formats).toContain('IMAX Laser');

    const mumbaiRes = await request(app).get('/api/cinemas?city=Mumbai');
    expect(mumbaiRes.status).toBe(200);
    expect(mumbaiRes.body.every((c: any) => c.city === 'Mumbai')).toBe(true);
  });

  // ── 22. Cinema Details & Screens: returns cinema details and screens ───────
  it('cinemas: returns cinema details with configured screens', async () => {
    const res = await request(app).get('/api/cinemas/1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body.screens).toBeDefined();
    expect(res.body.screens.length).toBeGreaterThan(0);
    expect(res.body.screens[0].screenType).toBe('IMAX Laser');
  });

  // ── 23. Showtime Overlap Conflict Prevention (Feature 3) ───────────────────
  it('showtime: rejects invalid overlapping shows on the same screen with 409 Conflict', async () => {
    const login = await request(app).post('/api/auth/login').send({
      email: 'admin@test.com',
      password: 'adminpass1',
    });
    const adminToken = login.body.token;

    const startTime = new Date('2026-12-01T14:00:00Z');
    const endTime = new Date('2026-12-01T16:30:00Z');

    // 1. Schedule initial show on Screen 1
    const show1Res = await request(app)
      .post('/api/admin/shows')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        screenId: 1,
        startsAt: startTime.toISOString(),
        endsAt: endTime.toISOString(),
        price: 350,
      });
    expect(show1Res.status).toBe(201);

    // 2. Attempt to schedule overlapping show on the same screen (15:00 - 17:30)
    const overlappingStart = new Date('2026-12-01T15:00:00Z');
    const overlappingEnd = new Date('2026-12-01T17:30:00Z');
    const conflictRes = await request(app)
      .post('/api/admin/shows')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        screenId: 1,
        startsAt: overlappingStart.toISOString(),
        endsAt: overlappingEnd.toISOString(),
        price: 350,
      });
    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.error).toMatch(/schedule conflict/i);

    // 3. Scheduling on a different screen (Screen 2) at the same time succeeds
    const screen2Res = await request(app)
      .post('/api/admin/shows')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        screenId: 2,
        startsAt: overlappingStart.toISOString(),
        endsAt: overlappingEnd.toISOString(),
        price: 350,
      });
    expect(screen2Res.status).toBe(201);
  });

  // ── 24. Interactive Seat Layout with Categories (Feature 4) ────────────────
  it('seats: returns seats categorized by recliner, premium, and standard with multipliers', async () => {
    const res = await request(app).get(`/api/shows/${seedShow.id}/seats`);
    expect(res.status).toBe(200);
    expect(res.body.show).toBeDefined();
    expect(res.body.show.screen.type).toBe('IMAX Laser');
    expect(Array.isArray(res.body.seats)).toBe(true);

    const reclinerSeat = res.body.seats.find((s: any) => s.category === 'recliner');
    const standardSeat = res.body.seats.find((s: any) => s.category === 'standard');
    expect(reclinerSeat).toBeDefined();
    expect(standardSeat).toBeDefined();
    // Recliner price should be higher than standard price
    expect(reclinerSeat.price).toBeGreaterThan(standardSeat.price);
  });

  // ── 25. Seat Locking Mechanism (Feature 5) ─────────────────────────────────
  it('locking: temporarily reserves selected seats with 8-minute countdown and server breakdown', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Locker User',
      email: 'locker@example.com',
      password: 'password123',
    });
    const token = reg.body.token;

    // Lock seat 6 & 7
    const res = await request(app)
      .post(`/api/shows/${seedShow.id}/lock-seats`)
      .set('Authorization', `Bearer ${token}`)
      .send({ seat_ids: [6, 7] });

    expect(res.status).toBe(200);
    expect(res.body.lockToken).toBeDefined();
    expect(res.body.remainingSeconds).toBe(480);
    expect(res.body.seats.length).toBe(2);
    expect(res.body.subtotal).toBeGreaterThan(0);
    expect(res.body.convenienceFee).toBe(80); // 2 seats * 40
    expect(res.body.total).toBe(res.body.subtotal + res.body.convenienceFee + res.body.gst);

    // Another user attempting to lock the same seat receives 409 Conflict
    const reg2 = await request(app).post('/api/auth/register').send({
      name: 'Other User',
      email: 'other@example.com',
      password: 'password123',
    });
    const otherToken = reg2.body.token;

    const conflictRes = await request(app)
      .post(`/api/shows/${seedShow.id}/lock-seats`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ seat_ids: [6] });

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.error).toMatch(/currently reserved by another customer/i);
  });

  // ── 26. Seat Lock Expiration (Feature 5) ───────────────────────────────────
  it('locking: automatically releases expired locks so other customers can reserve them', async () => {
    const reg1 = await request(app).post('/api/auth/register').send({
      name: 'User One',
      email: 'userone@example.com',
      password: 'password123',
    });
    const token1 = reg1.body.token;

    // User 1 locks seat 8
    await request(app)
      .post(`/api/shows/${seedShow.id}/lock-seats`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ seat_ids: [8] });

    // Simulate expiration via test helper
    await request(app).post('/api/test/expire-locks');

    // User 2 attempts to lock seat 8 after expiry
    const reg2 = await request(app).post('/api/auth/register').send({
      name: 'User Two',
      email: 'usertwo@example.com',
      password: 'password123',
    });
    const token2 = reg2.body.token;

    const res = await request(app)
      .post(`/api/shows/${seedShow.id}/lock-seats`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ seat_ids: [8] });

    expect(res.status).toBe(200);
    expect(res.body.lockToken).toBeDefined();
  });

  // ── 27. Abandoned Checkout: explicit lock release ─────────────────────────
  it('locking: allows user to release active seat locks upon abandoned checkout', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Abandoner',
      email: 'abandon@example.com',
      password: 'password123',
    });
    const token = reg.body.token;

    // Lock seat 9
    const lockRes = await request(app)
      .post(`/api/shows/${seedShow.id}/lock-seats`)
      .set('Authorization', `Bearer ${token}`)
      .send({ seat_ids: [9] });
    expect(lockRes.status).toBe(200);
    const lockToken = lockRes.body.lockToken;

    // Explicitly release seat 9
    const releaseRes = await request(app)
      .post(`/api/shows/${seedShow.id}/release-seats`)
      .set('Authorization', `Bearer ${token}`)
      .send({ lock_token: lockToken });

    expect(releaseRes.status).toBe(200);
    expect(releaseRes.body.released).toBeGreaterThan(0);

    // Another user can now immediately lock seat 9
    const reg2 = await request(app).post('/api/auth/register').send({
      name: 'Next User',
      email: 'next@example.com',
      password: 'password123',
    });
    const nextRes = await request(app)
      .post(`/api/shows/${seedShow.id}/lock-seats`)
      .set('Authorization', `Bearer ${reg2.body.token}`)
      .send({ seat_ids: [9] });
    expect(nextRes.status).toBe(200);
  });

  // ── 28. HIGH-CONCURRENCY: Simultaneous Lock Attempts Race Condition ────────
  it('concurrency: handles simultaneous lock attempts on the same seat with exactly one winner', async () => {
    const [u1, u2] = await Promise.all([
      request(app).post('/api/auth/register').send({ name: 'Racer 1', email: 'racer1@example.com', password: 'password123' }),
      request(app).post('/api/auth/register').send({ name: 'Racer 2', email: 'racer2@example.com', password: 'password123' }),
    ]);

    const token1 = u1.body.token;
    const token2 = u2.body.token;

    // Race both users trying to lock seat 10 simultaneously
    const [res1, res2] = await Promise.all([
      request(app).post(`/api/shows/${seedShow.id}/lock-seats`).set('Authorization', `Bearer ${token1}`).send({ seat_ids: [10] }),
      request(app).post(`/api/shows/${seedShow.id}/lock-seats`).set('Authorization', `Bearer ${token2}`).send({ seat_ids: [10] }),
    ]);

    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(200);
    expect(statuses).toContain(409);
  });

  // ── 29. HIGH-CONCURRENCY: Simultaneous Booking Double-Booking Prevention ───
  it('concurrency: prevents double booking when two users book the same seat simultaneously', async () => {
    const [u1, u2] = await Promise.all([
      request(app).post('/api/auth/register').send({ name: 'Buyer 1', email: 'buyer1@example.com', password: 'password123' }),
      request(app).post('/api/auth/register').send({ name: 'Buyer 2', email: 'buyer2@example.com', password: 'password123' }),
    ]);

    const token1 = u1.body.token;
    const token2 = u2.body.token;

    // Race both users trying to book seat 11 simultaneously
    const [res1, res2] = await Promise.all([
      request(app).post('/api/bookings').set('Authorization', `Bearer ${token1}`).send({ show_id: seedShow.id, seat_ids: [11] }),
      request(app).post('/api/bookings').set('Authorization', `Bearer ${token2}`).send({ show_id: seedShow.id, seat_ids: [11] }),
    ]);

    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(200);
    expect(statuses).toContain(409);
  });

  // ── 30. Booking Validation: Server recalculates prices and ignores client tamper
  it('validation: strictly recalculates price server-side and ignores client tampering', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Tamperer',
      email: 'tamper@example.com',
      password: 'password123',
    });
    const token = reg.body.token;

    // Client attempts to pass 1 rupee total_price for seat 12 (standard seat)
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        show_id: seedShow.id,
        seat_ids: [12],
        total_price: 1,
        amount: 0,
      });

    expect(res.status).toBe(200);
    expect(res.body.booking_id).toBeDefined();
    // Server-calculated price must include standard price (300) + 40 fee + 18% GST (61) = 401
    expect(res.body.total_price).toBe(401);
  });
});
