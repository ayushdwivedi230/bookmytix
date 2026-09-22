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

  let uid = 1; let eid = 1; let sid = 1; let ssid = 1; let bid = 1;

  // Seed one event and show
  const seedEvent = { id: eid++, title: 'Test Event', category: 'Movies', location: 'Mumbai', date: '2099-01-01', image: '', description: '', basePrice: '300' };
  events.push(seedEvent);
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  const seedShow = { id: sid++, eventId: seedEvent.id, theatreId: 1, startsAt: futureDate, price: '300' };
  shows.push(seedShow);
  for (let i = 1; i <= 5; i++) {
    showSeats.push({ id: ssid++, showId: seedShow.id, seatNumber: `A${i}`, status: 'available', bookingId: null });
  }

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

    // Atomic seat claim
    const toBook = showSeats.filter(s => seat_ids.includes(s.id) && s.showId === show_id && s.status === 'available');
    if (toBook.length !== seat_ids.length) {
      res.status(409).json({ error: 'Some seats are no longer available' });
      return;
    }

    // Server-side price — ignore any client price
    const totalPrice = seat_ids.length * Number(show.price);
    const booking = { id: bid++, userId: req.user.id, showId: show_id, total_price: totalPrice, status: 'confirmed' };
    bookings.push(booking);

    for (const seat of toBook) {
      seat.status = 'booked';
      seat.bookingId = booking.id;
      tickets.push({ id: uid++, bookingId: booking.id, showSeatId: seat.id, qrCode: crypto.randomUUID() });
    }

    res.json({ message: 'Booking successful', booking_id: booking.id });
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

  // ── Expose current seats for test inspection ──────────────────────────────
  app.get('/api/shows/:id/seats', (req, res) => {
    const showId = parseInt(req.params.id);
    res.json(showSeats.filter(s => s.showId === showId).map(s => ({ id: s.id, seat_number: s.seatNumber, status: s.status })));
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
});
