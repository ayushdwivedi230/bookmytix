import express from 'express';
import { createServer as createViteServer } from 'vite';
import * as path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

// In-Memory Database
const db = {
  users: [] as any[],
  events: [] as any[],
  seats: [] as any[],
  bookings: [] as any[],
  tickets: [] as any[]
};

let userIds = 1;
let eventIds = 1;
let seatIds = 1;
let bookingIds = 1;
let ticketIds = 1;

// Seed initial data
const createSeedEvent = (title: string, location: string, date: string, price: number, seatPrefix: string, numSeats: number, category: string, image: string) => {
  const eventId = eventIds++;
  db.events.push({ id: eventId, title, location, date, price, category, image });
  for (let i = 1; i <= numSeats; i++) {
    db.seats.push({ id: seatIds++, event_id: eventId, seat_number: `${seatPrefix}${i}`, status: 'available' });
  }
};

createSeedEvent('Pushpa 2', 'Hyderabad', '2026-12-05', 499, 'M', 20, 'Movies', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=800&h=600');
createSeedEvent('Kalki 2898 AD', 'Mumbai', '2026-09-15', 599, 'M', 20, 'Movies', 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&q=80&w=800&h=600');
createSeedEvent('Stree 2', 'Delhi', '2026-10-31', 399, 'M', 20, 'Movies', 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=800&h=600');
createSeedEvent('Sunburn Goa', 'Goa', '2026-12-28', 4999, 'C', 50, 'Concerts', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800&h=600');
createSeedEvent('Diljit Live', 'Chandigarh', '2026-11-20', 2999, 'C', 50, 'Concerts', '/diljit.png');
createSeedEvent('IPL Finals', 'Ahmedabad', '2026-05-29', 1499, 'S', 50, 'Sports', 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=800&h=600');
createSeedEvent('India vs Australia', 'Bengaluru', '2026-02-15', 1999, 'S', 50, 'Sports', 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&q=80&w=800&h=600');
createSeedEvent('Zakir Khan Live', 'Pune', '2026-08-10', 999, 'COM-', 30, 'Comedy', 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&q=80&w=800&h=600');
createSeedEvent('Anubhav Singh Bassi Tour', 'Jaipur', '2026-07-22', 799, 'COM-', 30, 'Comedy', 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&q=80&w=800&h=600');
createSeedEvent('AI India Summit', 'Bengaluru', '2026-09-05', 3999, 'T', 50, 'Tech Events', 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80&w=800&h=600');

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Authentication Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // API Routes
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    if (db.users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hash = bcrypt.hashSync(password, 8);
    const id = userIds++;
    db.users.push({ id, name, email, password: hash });

    const token = jwt.sign({ id, email, name }, JWT_SECRET);
    res.json({ token, user: { id, name, email } });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.users.find(u => u.email === email);

    if (!user) return res.status(400).json({ error: 'User not found' });
    if (!bcrypt.compareSync(password, user.password)) return res.status(403).json({ error: 'Incorrect password' });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  });

  app.get('/api/events', (req, res) => {
    res.json(db.events);
  });

  app.get('/api/events/:id', (req, res) => {
    const event = db.events.find(e => e.id === parseInt(req.params.id));
    if (!event) return res.status(404).json({ error: 'Not found' });
    res.json(event);
  });

  app.get('/api/events/:id/seats', (req, res) => {
    const seats = db.seats.filter(s => s.event_id === parseInt(req.params.id));
    res.json(seats);
  });

  app.post('/api/events', authenticateToken, (req: any, res) => {
    const { title, location, date, price, num_seats } = req.body;
    const num = parseInt(num_seats) || 20;

    const eventId = eventIds++;
    db.events.push({ id: eventId, title, location, date, price: parseFloat(price) });

    for (let i = 1; i <= num; i++) {
      db.seats.push({ id: seatIds++, event_id: eventId, seat_number: `A${i}`, status: 'available' });
    }

    res.json({ message: 'Event created', id: eventId });
  });

  app.get('/api/admin/stats', authenticateToken, (req: any, res) => {
    const stats = {
      events: db.events.length,
      bookings: db.bookings.length,
      revenue: db.bookings.reduce((sum, b) => sum + b.total_price, 0)
    };
    res.json(stats);
  });

  app.post('/api/bookings', authenticateToken, (req: any, res) => {
    const { event_id, seat_ids, total_price } = req.body;
    const user_id = req.user.id;

    // Check seat availability
    const seatsToBook = db.seats.filter(s => seat_ids.includes(s.id));
    if (seatsToBook.length !== seat_ids.length || seatsToBook.some(s => s.status !== 'available')) {
      return res.status(400).json({ error: 'Seats unavailable' });
    }

    const bookingId = bookingIds++;
    db.bookings.push({ id: bookingId, user_id, event_id, total_price, status: 'confirmed' });

    for (const seat of seatsToBook) {
      seat.status = 'booked';
      const qr_code = `QR-${bookingId}-${seat.id}-${Date.now()}`;
      db.tickets.push({ id: ticketIds++, booking_id: bookingId, qr_code, seat_id: seat.id });
    }

    res.json({ message: 'Booking successful', booking_id: bookingId });
  });

  app.get('/api/bookings', authenticateToken, (req: any, res) => {
    const userBookings = db.bookings.filter(b => b.user_id === req.user.id);

    const result = userBookings.map(b => {
      const event = db.events.find(e => e.id === b.event_id) || {} as any;
      const bTickets = db.tickets.filter(t => t.booking_id === b.id).map(t => {
        const seat = db.seats.find(s => s.id === t.seat_id) || {} as any;
        return { ...t, seat_number: seat.seat_number };
      });
      return {
        ...b,
        event_title: event.title,
        event_date: event.date,
        event_location: event.location,
        tickets: bTickets
      };
    });

    res.json(result);
  });

  // Vite middleware processing
  if (process.env.NODE_ENV !== "production") {
    // In dev mode, use Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve dist folder
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
