# BookMyTix

A portfolio-grade movie and event ticket booking application built with **React 19 + Vite + TypeScript** (frontend) and **Express + PostgreSQL + Drizzle ORM** (backend).

<!-- TODO: Add screenshots here -->
<!-- ![Home page](./screenshots/home.png) -->
<!-- ![Booking flow](./screenshots/booking.png) -->

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS v4, Framer Motion, React Router v7 |
| Backend | Node.js, Express 4, TypeScript (`tsx` for dev, `esbuild` for production) |
| Database | PostgreSQL (tested with [Neon](https://neon.tech)) |
| ORM | Drizzle ORM + Drizzle Kit |
| Auth | JWT (12 h expiry) + bcrypt (12 rounds) |
| Validation | Zod v4 (all request bodies) |
| Security | Helmet, express-rate-limit (10 req / 15 min on `/api/auth/*`) |
| Testing | Vitest 5 + Supertest |
| CI | GitHub Actions |

---

## Folder Structure

```
.
├── src/                   # React frontend (Vite SPA)
│   ├── App.tsx            # All pages and components
│   ├── components/        # SearchBar, Filter, MovieCard, MovieGrid
│   ├── data/movies.ts     # Static movie catalogue (70+ titles)
│   └── index.css
├── server/
│   ├── db/
│   │   ├── schema.ts      # Drizzle table definitions (7 tables)
│   │   ├── index.ts       # DB client (pg Pool + Drizzle, SSL in prod)
│   │   └── seed.ts        # Idempotent seed — all events, theatres, shows
│   └── tests/
│       └── api.test.ts    # 10 integration tests (no DB required)
├── server.ts              # Express server entry point
├── drizzle.config.ts      # Drizzle Kit configuration
├── vitest.config.ts
├── vite.config.ts
└── .github/workflows/ci.yml
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `users` | id, name, email (unique), password_hash, role, created_at |
| `events` | id, title, category, location, date, image, description, base_price |
| `theatres` | id, name, location |
| `shows` | id, event_id, theatre_id, starts_at, price |
| `show_seats` | id, show_id, seat_number, status (available/booked), booking_id — unique(show_id, seat_number) |
| `bookings` | id, user_id, show_id, total_price, status, created_at |
| `tickets` | id, booking_id, show_seat_id, qr_code (UUID) |

---

## API Routes

### Auth (rate-limited: 10 req / 15 min per IP)
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Create account (always role `user`) |
| POST | `/api/auth/login` | None | Login, returns JWT |

### Events
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/events` | None | List all events |
| GET | `/api/events/:id` | None | Event detail with theatre/timing info |
| GET | `/api/events/:id/shows` | None | Shows for an event (theatre + startsAt + price) |
| POST | `/api/events` | Admin | Create event |
| PUT | `/api/events/:id` | Admin | Update event fields |
| DELETE | `/api/events/:id` | Admin | Delete event (cascades shows + seats) |

### Shows & Seats
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/shows/:id/seats` | None | Seat map for a specific show |
| POST | `/api/events/:id/shows` | Admin | Create a show and auto-generate seats |

### Bookings
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/bookings` | Bearer | Book seats — atomic, server-side price, UUID QR |
| GET | `/api/bookings` | Bearer | User's booking history |

### Admin
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/stats` | Admin | SQL-aggregate stats (events, bookings, revenue) |
| GET | `/api/admin/events` | Admin | All events list |
| GET | `/api/admin/theatres` | Admin | All theatres list |

---

## Local Setup

### Prerequisites
- Node.js ≥ 20
- A PostgreSQL database (e.g. [Neon](https://neon.tech) free tier)

### 1. Clone and install
```bash
git clone https://github.com/your-username/bookmytix.git
cd bookmytix
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | **Yes** | Long random string. Generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string, e.g. `postgresql://user:pass@host/db?sslmode=require` |
| `ADMIN_EMAIL` | Optional | Email for the seeded admin account |
| `ADMIN_PASSWORD` | Optional | Password for the seeded admin account |
| `PORT` | Optional | Server port (default: 3000) |

### 3. Run database migrations
```bash
npm run db:generate   # Generate migration SQL from schema
npm run db:migrate    # Apply migrations to your database
```

### 4. Seed demo data
```bash
npm run db:seed       # Inserts all 15 events, theatres, shows, seats (idempotent)
```

### 5. Run locally
```bash
npm run dev           # Starts Express + Vite dev middleware on http://localhost:3000
```

### 6. Run tests
```bash
npm test              # 10 integration tests (no database needed)
```

### 7. Production build
```bash
npm run build         # Vite build + esbuild server bundle → dist/
npm start             # Serves the built app
```

---

## Deployment (Render)

1. Create a **Web Service** pointing to this repo.
2. Set **Build Command**: `npm ci && npm run build`
3. Set **Start Command**: `node dist/server.js`
4. Add environment variables in the Render dashboard: `JWT_SECRET`, `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `NODE_ENV=production`.
5. After first deploy, run `npm run db:migrate` and `npm run db:seed` locally against your production DATABASE_URL.

> **Note:** Render's free tier spins down after inactivity. The first request after a sleep may take ~30 seconds to respond.

---

## Known Limitations / Future Work

- **No payment processing** — the checkout step confirms immediately without a real payment gateway. A future version should integrate Razorpay or Stripe.
- **No email tickets** — booking confirmation is shown in-app only. Future work: send a PDF/HTML ticket to the user's email via SendGrid or Resend.
- **No seat hold / reservation timeout** — seats are marked `booked` only after payment confirmation. A production system should hold seats for ~10 minutes during checkout.
- **No cancellation flow** — bookings can't currently be cancelled by users. Admin can delete events (cascades everything).
- **Static movie catalogue** — the `/movies` page uses a hardcoded TypeScript file. A full implementation would serve movies from the database.
- **QR codes are UUIDs** — the `qr_code` field stores a `crypto.randomUUID()` which is displayed as a pseudo-QR. A real implementation would generate an actual scannable QR image.

---

## License

MIT — see [LICENSE](./LICENSE).
