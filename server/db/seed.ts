/**
 * Idempotent seed script.
 * Run with: npm run db:seed
 *
 * Populates events, movies, theatres, screens, shows, seats, food items, and coupons.
 */
import dotenv from 'dotenv';
dotenv.config({ override: true });

import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, and } from 'drizzle-orm';
import * as schema from './schema.js';

const { users, events, movies, theatres, screens, shows, showSeats, foodItems, coupons } = schema;

if (!process.env.DATABASE_URL) {
  throw new Error('[seed] DATABASE_URL is not set.');
}

const connectionString = process.env.DATABASE_URL;
const useSsl =
  connectionString.includes('sslmode=require') ||
  connectionString.includes('neon.tech') ||
  process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});
const db = drizzle(pool, { schema });

// ─── Helpers ───────────────────────────────────────────────────────────────────
function futureDate(daysFromNow: number, hour = 18, minute = 0): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

function parseTime(timeStr: string, daysFromNow: number): Date {
  const [timePart, meridiem] = timeStr.split(' ');
  const [hStr, mStr] = timePart.split(':');
  let h = Number(hStr);
  const m = Number(mStr);
  if (meridiem === 'PM' && h !== 12) h += 12;
  if (meridiem === 'AM' && h === 12) h = 0;
  return futureDate(daysFromNow, h, m);
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── Event definitions ─────────────────────────────────────────────────────────
const EVENT_SEED = [
  {
    title: 'Pushpa 2',
    category: 'Movies',
    location: 'Hyderabad',
    daysFromNow: 0,
    basePrice: 499,
    image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=800&h=600',
    banner: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1600&q=80',
    trailer: 'https://www.youtube.com/embed/1kVK0MZlbI4?rel=0&modestbranding=1',
    description: 'Blockbuster action with high-energy performances and premium Dolby screening options.',
    duration: '2h 55m',
    language: 'Telugu',
    genre: 'Action',
    certificate: 'UA',
    rating: '4.8',
    seatPrefix: 'M',
    numSeats: 20,
    theatres: [
      { name: 'PVR Hyderabad', location: 'Hyderabad', showTimings: ['11:30 AM', '02:15 PM', '06:00 PM', '09:30 PM'], daysOffset: 0 },
      { name: 'Cinepolis Hitec City', location: 'Hyderabad', showTimings: ['10:00 AM', '01:30 PM', '05:45 PM'], daysOffset: 0 },
      { name: 'INOX Gachibowli', location: 'Hyderabad', showTimings: ['12:00 PM', '03:30 PM', '07:00 PM'], daysOffset: 1 },
      { name: 'PVR Plaza', location: 'Delhi', showTimings: ['11:00 AM', '02:30 PM', '06:15 PM', '09:45 PM'], daysOffset: 0 },
      { name: 'Cinepolis DLF', location: 'Delhi', showTimings: ['10:30 AM', '01:45 PM', '05:30 PM'], daysOffset: 0 },
    ],
  },
  {
    title: 'Kalki 2898 AD',
    category: 'Movies',
    location: 'Mumbai',
    daysFromNow: 0,
    basePrice: 599,
    image: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&q=80&w=800&h=600',
    banner: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1600&q=80',
    trailer: 'https://www.youtube.com/embed/kQDd1AhGIHk?rel=0&modestbranding=1',
    description: 'Immersive sci-fi spectacle with premium IMAX and 4DX screening availability.',
    duration: '3h 01m',
    language: 'Telugu',
    genre: 'Sci-Fi',
    certificate: 'UA',
    rating: '4.7',
    seatPrefix: 'M',
    numSeats: 20,
    theatres: [
      { name: 'PVR Jio World', location: 'Mumbai', showTimings: ['10:00 AM', '01:30 PM', '04:45 PM', '08:15 PM'], daysOffset: 0 },
      { name: 'INOX Andheri', location: 'Mumbai', showTimings: ['11:00 AM', '02:45 PM', '07:00 PM'], daysOffset: 0 },
      { name: 'Cinepolis Infinity', location: 'Mumbai', showTimings: ['09:30 AM', '12:45 PM', '06:30 PM'], daysOffset: 1 },
    ],
  },
  {
    title: 'Stree 2',
    category: 'Movies',
    location: 'Delhi',
    daysFromNow: 0,
    basePrice: 399,
    image: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=800&h=600',
    banner: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1600&q=80',
    trailer: 'https://www.youtube.com/embed/KVnheGhrRAw?rel=0&modestbranding=1',
    description: 'A laugh-out-loud horror-comedy packed with laughs, thrills, and fan-favourite moments.',
    duration: '2h 27m',
    language: 'Hindi',
    genre: 'Comedy',
    certificate: 'UA',
    rating: '4.6',
    seatPrefix: 'M',
    numSeats: 20,
    theatres: [
      { name: 'PVR Plaza', location: 'Delhi', showTimings: ['12:00 PM', '03:30 PM', '07:00 PM', '10:15 PM'], daysOffset: 0 },
      { name: 'INOX City Centre', location: 'Delhi', showTimings: ['11:30 AM', '03:00 PM', '07:30 PM'], daysOffset: 0 },
      { name: 'Cinepolis Chanakyapuri', location: 'Delhi', showTimings: ['10:00 AM', '02:00 PM', '06:00 PM'], daysOffset: 1 },
    ],
  },
  {
    title: 'Aarohan',
    category: 'Movies',
    location: 'Mumbai',
    daysFromNow: 0,
    basePrice: 349,
    image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80',
    banner: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1600&q=80',
    trailer: 'https://www.youtube.com/embed/ScMzIvxBSi4?rel=0&modestbranding=1',
    description: 'A moving contemporary drama with intimate storytelling and premium seating experience.',
    duration: '2h 18m',
    language: 'Hindi',
    genre: 'Drama',
    certificate: 'U',
    rating: '4.4',
    seatPrefix: 'M',
    numSeats: 24,
    theatres: [
      { name: 'PVR Icon', location: 'Mumbai', showTimings: ['11:15 AM', '02:00 PM', '05:30 PM', '09:00 PM'], daysOffset: 0 },
      { name: 'Cinepolis Skywalk', location: 'Mumbai', showTimings: ['10:30 AM', '01:45 PM', '05:00 PM'], daysOffset: 0 },
      { name: 'INOX Wadala', location: 'Mumbai', showTimings: ['12:00 PM', '03:15 PM', '07:00 PM'], daysOffset: 1 },
    ],
  },
  {
    title: 'Bhoomi 9',
    category: 'Movies',
    location: 'Delhi',
    daysFromNow: 0,
    basePrice: 329,
    image: 'https://images.unsplash.com/photo-1517602302552-471fe67acf66?auto=format&fit=crop&w=800&q=80',
    banner: 'https://images.unsplash.com/photo-1517602302552-471fe67acf66?auto=format&fit=crop&w=1600&q=80',
    trailer: 'https://www.youtube.com/embed/uVdV-lxR7h8?rel=0&modestbranding=1',
    description: 'An edge-of-the-seat thriller with stylish visuals and multiple premium show slots.',
    duration: '2h 12m',
    language: 'Hindi',
    genre: 'Thriller',
    certificate: 'UA',
    rating: '4.3',
    seatPrefix: 'M',
    numSeats: 24,
    theatres: [
      { name: 'PVR Saket', location: 'Delhi', showTimings: ['10:30 AM', '01:45 PM', '04:30 PM', '08:45 PM'], daysOffset: 0 },
      { name: 'INOX DLF', location: 'Delhi', showTimings: ['11:00 AM', '02:30 PM', '06:30 PM'], daysOffset: 0 },
      { name: 'Cinepolis Gurugram', location: 'Gurugram', showTimings: ['10:00 AM', '01:00 PM', '05:00 PM'], daysOffset: 1 },
    ],
  },
  {
    title: 'Chasing Shadows',
    category: 'Movies',
    location: 'Bengaluru',
    daysFromNow: 0,
    basePrice: 379,
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80',
    banner: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1600&q=80',
    trailer: 'https://www.youtube.com/embed/aqz-KE-bpKQ?rel=0&modestbranding=1',
    description: 'A gripping crime drama with modern visuals and a cinematic surround sound experience.',
    duration: '2h 25m',
    language: 'Kannada',
    genre: 'Crime',
    certificate: 'A',
    rating: '4.5',
    seatPrefix: 'M',
    numSeats: 24,
    theatres: [
      { name: 'PVR Orion', location: 'Bengaluru', showTimings: ['11:00 AM', '02:30 PM', '06:15 PM', '09:45 PM'], daysOffset: 0 },
      { name: 'INOX NEXUS', location: 'Bengaluru', showTimings: ['10:00 AM', '01:30 PM', '05:30 PM'], daysOffset: 0 },
      { name: 'Cinepolis Mantri', location: 'Bengaluru', showTimings: ['09:30 AM', '12:45 PM', '04:00 PM'], daysOffset: 1 },
    ],
  },
  {
    title: 'Dance of Dust',
    category: 'Movies',
    location: 'Pune',
    daysFromNow: 0,
    basePrice: 319,
    image: 'https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?auto=format&fit=crop&w=800&q=80',
    banner: 'https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?auto=format&fit=crop&w=1600&q=80',
    trailer: 'https://www.youtube.com/embed/9bZkp7q19f0?rel=0&modestbranding=1',
    description: 'A vibrant romance with warm storytelling and comfortable premium seating.',
    duration: '2h 05m',
    language: 'Marathi',
    genre: 'Romance',
    certificate: 'U',
    rating: '4.2',
    seatPrefix: 'M',
    numSeats: 24,
    theatres: [
      { name: 'PVR Phoenix', location: 'Pune', showTimings: ['12:15 PM', '03:45 PM', '07:15 PM', '10:30 PM'], daysOffset: 0 },
      { name: 'INOX Westend', location: 'Pune', showTimings: ['11:00 AM', '02:30 PM', '06:30 PM'], daysOffset: 0 },
      { name: 'Cinepolis Vimannagar', location: 'Pune', showTimings: ['10:00 AM', '01:15 PM', '05:00 PM'], daysOffset: 1 },
    ],
  },
  {
    title: 'Echoes of Jaipur',
    category: 'Movies',
    location: 'Jaipur',
    daysFromNow: 0,
    basePrice: 299,
    image: 'https://images.unsplash.com/photo-1516280030429-27679b7f7f6e?auto=format&fit=crop&w=800&q=80',
    banner: 'https://images.unsplash.com/photo-1516280030429-27679b7f7f6e?auto=format&fit=crop&w=1600&q=80',
    trailer: 'https://www.youtube.com/embed/2Vv-BfVoq4g?rel=0&modestbranding=1',
    description: 'A rich cultural drama with a compelling story arc and intimate auditorium feel.',
    duration: '2h 10m',
    language: 'Hindi',
    genre: 'Drama',
    certificate: 'U',
    rating: '4.3',
    seatPrefix: 'M',
    numSeats: 24,
    theatres: [
      { name: 'PVR Pink City', location: 'Jaipur', showTimings: ['10:45 AM', '01:15 PM', '05:00 PM', '08:30 PM'], daysOffset: 0 },
      { name: 'INOX World Trade Park', location: 'Jaipur', showTimings: ['11:30 AM', '03:00 PM', '07:00 PM'], daysOffset: 0 },
      { name: 'Cinepolis Mansarovar', location: 'Jaipur', showTimings: ['10:00 AM', '01:30 PM', '05:30 PM'], daysOffset: 1 },
    ],
  },
  {
    title: 'Sunburn Goa',
    category: 'Concerts',
    location: 'Goa',
    daysFromNow: 99,
    basePrice: 4999,
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800&h=600',
    banner: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1600&q=80',
    trailer: 'https://www.youtube.com/embed/X_fVnkCGbhE?rel=0&modestbranding=1',
    description: 'A high-energy live concert experience with immersive lighting, premium seating, and beachside vibes.',
    duration: '3 Days',
    language: 'English',
    genre: 'Music Festival',
    certificate: '16+',
    rating: '4.9',
    seatPrefix: 'C',
    numSeats: 50,
    theatres: [
      { name: 'Beachfront Arena', location: 'Goa', showTimings: ['04:00 PM', '06:30 PM', '09:00 PM'], daysOffset: 0 },
      { name: 'Main Stage Deck', location: 'Goa', showTimings: ['05:00 PM', '08:00 PM'], daysOffset: 1 },
    ],
  },
  {
    title: 'Diljit Live',
    category: 'Concerts',
    location: 'Chandigarh',
    daysFromNow: 60,
    basePrice: 2999,
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&q=80&w=800&h=600',
    banner: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1600&q=80',
    trailer: 'https://www.youtube.com/embed/Upa41vS-qU8?rel=0&modestbranding=1',
    description: 'A must-see live concert night featuring top-tier sound and premium hospitality zones.',
    duration: '3h 00m',
    language: 'Punjabi',
    genre: 'Concert',
    certificate: 'U',
    rating: '4.9',
    seatPrefix: 'C',
    numSeats: 50,
    theatres: [
      { name: 'NOVA Arena', location: 'Chandigarh', showTimings: ['07:00 PM', '09:30 PM'], daysOffset: 0 },
    ],
  },
  {
    title: 'IPL Finals',
    category: 'Sports',
    location: 'Ahmedabad',
    daysFromNow: 250,
    basePrice: 1499,
    image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=800&h=600',
    banner: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1600&q=80',
    trailer: 'https://www.youtube.com/embed/a4G8zz37hQQ?rel=0&modestbranding=1',
    description: 'The grand finale under floodlights with premium hospitality and world-class matchday energy.',
    duration: '4h 00m',
    language: 'Hindi',
    genre: 'Cricket',
    certificate: 'U',
    rating: '4.9',
    seatPrefix: 'S',
    numSeats: 50,
    theatres: [
      { name: 'Narendra Modi Stadium', location: 'Ahmedabad', showTimings: ['07:30 PM'], daysOffset: 0 },
    ],
  },
];

async function seed() {
  console.log('[seed] Starting...');

  // 1. Explicit Admin user (only if explicitly set in environment)
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!existing) {
      const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12);
      await db.insert(users).values({ name: 'Admin', email, passwordHash: hash, role: 'admin' });
      console.log(`[seed] Admin created from explicit environment configuration: ${email}`);
    } else {
      console.log(`[seed] Admin already exists: ${email}`);
    }
  }

  // 2. Events, theatres, screens, shows, show_seats
  for (const evtDef of EVENT_SEED) {
    const existingEvent = await db.query.events.findFirst({
      where: eq(events.title, evtDef.title),
    });

    let eventId: number;
    let movieId: number | undefined;

    if (evtDef.category === 'Movies') {
      const slug = slugify(evtDef.title);
      const isComingSoon = evtDef.daysFromNow > 40;
      const status = isComingSoon ? 'coming_soon' : 'now_showing';
      const releaseDate = futureDate(evtDef.daysFromNow);

      const existingMovie = await db.query.movies.findFirst({
        where: eq(movies.slug, slug),
      });

      const sampleCast = [
        { name: 'Lead Performer', role: 'Main Character' },
        { name: 'Co-Star', role: 'Supporting Role' },
        { name: 'Ensemble Actor', role: 'Key Character' },
      ];
      const sampleCrew = [
        { name: 'Director Name', role: 'Director' },
        { name: 'Producer Name', role: 'Producer' },
      ];

      if (existingMovie) {
        movieId = existingMovie.id;
        await db
          .update(movies)
          .set({
            title: evtDef.title,
            description: evtDef.description,
            poster: evtDef.image,
            backdrop: evtDef.banner,
            trailerUrl: evtDef.trailer,
            genre: evtDef.genre,
            language: evtDef.language,
            duration: evtDef.duration,
            certification: evtDef.certificate,
            rating: evtDef.rating,
            status,
            formats: JSON.stringify(['2D', '3D', 'IMAX 3D']),
            cast: JSON.stringify(sampleCast),
            crew: JSON.stringify(sampleCrew),
          })
          .where(eq(movies.id, movieId));
        console.log(`[seed] Movie updated: "${evtDef.title}" (id=${movieId}, slug=${slug})`);
      } else {
        const [newMovie] = await db
          .insert(movies)
          .values({
            title: evtDef.title,
            slug,
            description: evtDef.description,
            poster: evtDef.image,
            backdrop: evtDef.banner,
            trailerUrl: evtDef.trailer,
            genre: evtDef.genre,
            language: evtDef.language,
            duration: evtDef.duration,
            releaseDate,
            certification: evtDef.certificate,
            rating: evtDef.rating,
            voteCount: 15000 + evtDef.daysFromNow * 300,
            popularity: String(250.0 + evtDef.daysFromNow * 2),
            status,
            formats: JSON.stringify(['2D', '3D', 'IMAX 3D']),
            cast: JSON.stringify(sampleCast),
            crew: JSON.stringify(sampleCrew),
          })
          .returning({ id: movies.id });
        movieId = newMovie.id;
        console.log(`[seed] Created movie: "${evtDef.title}" (id=${movieId}, slug=${slug})`);
      }
    }

    if (existingEvent) {
      eventId = existingEvent.id;
      // Update with banner and trailer if missing
      await db
        .update(events)
        .set({
          banner: evtDef.banner,
          trailer: evtDef.trailer,
          duration: evtDef.duration,
          language: evtDef.language,
          genre: evtDef.genre,
          certificate: evtDef.certificate,
          rating: evtDef.rating,
        })
        .where(eq(events.id, eventId));
      console.log(`[seed] Event updated: "${evtDef.title}" (id=${eventId})`);
    } else {
      const [newEvent] = await db
        .insert(events)
        .values({
          title: evtDef.title,
          category: evtDef.category,
          location: evtDef.location,
          date: futureDate(evtDef.daysFromNow).toISOString().split('T')[0],
          image: evtDef.image,
          banner: evtDef.banner,
          trailer: evtDef.trailer,
          description: evtDef.description,
          duration: evtDef.duration,
          language: evtDef.language,
          genre: evtDef.genre,
          certificate: evtDef.certificate,
          rating: evtDef.rating,
          basePrice: String(evtDef.basePrice),
        })
        .returning({ id: events.id });
      eventId = newEvent.id;
      console.log(`[seed] Created event: "${evtDef.title}" (id=${eventId})`);
    }

    // Theatres and screens
    for (const th of evtDef.theatres) {
      let theatre = await db.query.theatres.findFirst({
        where: and(eq(theatres.name, th.name), eq(theatres.location, th.location)),
      });
      if (!theatre) {
        const [t] = await db
          .insert(theatres)
          .values({ name: th.name, location: th.location, city: th.location })
          .returning();
        theatre = t;
      }

      // Ensure default screen exists
      let screen = await db.query.screens.findFirst({
        where: and(eq(screens.theatreId, theatre.id), eq(screens.name, 'Screen 1')),
      });
      if (!screen) {
        const [sc] = await db
          .insert(screens)
          .values({ theatreId: theatre.id, name: 'Screen 1', screenType: 'IMAX', totalSeats: evtDef.numSeats })
          .returning();
        screen = sc;
      }

      // Shows per timing
      for (const timing of th.showTimings) {
        const startsAt = parseTime(timing, evtDef.daysFromNow + th.daysOffset);

        const existingShow = await db.query.shows.findFirst({
          where: and(
            eq(shows.eventId, eventId),
            eq(shows.theatreId, theatre.id),
            eq(shows.startsAt, startsAt),
          ),
        });

        if (existingShow) continue;

        const [show] = await db
          .insert(shows)
          .values({
            eventId,
            movieId,
            theatreId: theatre.id,
            screenId: screen.id,
            startsAt,
            price: String(evtDef.basePrice),
          })
          .returning({ id: shows.id });

        const seatRows = [];
        const defaultSeatTiers: Array<{
          row: string;
          category: 'recliner' | 'premium' | 'standard';
          mult: number;
        }> = [
          { row: 'A', category: 'recliner', mult: 1.6 },
          { row: 'B', category: 'recliner', mult: 1.6 },
          { row: 'C', category: 'premium', mult: 1.25 },
          { row: 'D', category: 'premium', mult: 1.25 },
          { row: 'E', category: 'premium', mult: 1.25 },
          { row: 'F', category: 'standard', mult: 1.0 },
          { row: 'G', category: 'standard', mult: 1.0 },
          { row: 'H', category: 'standard', mult: 1.0 },
        ];
        for (const { row, category, mult } of defaultSeatTiers) {
          for (let col = 1; col <= 12; col++) {
            seatRows.push({
              showId: show.id,
              seatNumber: `${row}${col}`,
              row,
              category,
              price: String(Math.round(evtDef.basePrice * mult)),
              status: 'available' as const,
            });
          }
        }
        await db.insert(showSeats).values(seatRows);
      }
    }
  }

  // 3. Seed food items
  const sampleFoods = [
    { name: 'Caramel Popcorn (L)', description: 'Freshly popped jumbo corn with rich caramel glaze', price: '290', category: 'Snacks' },
    { name: 'Salted Popcorn (M)', description: 'Classic salted hot popcorn', price: '240', category: 'Snacks' },
    { name: 'Nachos with Salsa & Cheese', description: 'Crispy corn tortilla chips with warm cheese dip', price: '260', category: 'Snacks' },
    { name: 'Pepsi / 7UP (500ml)', description: 'Ice cold carbonated beverage', price: '180', category: 'Beverages' },
    { name: 'Movie Duo Combo', description: '2 Medium Popcorn + 2 Cold Drinks + 1 Nachos', price: '650', category: 'Combos' },
  ];

  for (const f of sampleFoods) {
    const existing = await db.query.foodItems.findFirst({ where: eq(foodItems.name, f.name) });
    if (!existing) {
      await db.insert(foodItems).values({
        name: f.name,
        description: f.description,
        price: f.price,
        category: f.category,
        isAvailable: true,
      });
    }
  }

  // 4. Seed sample coupons
  const sampleCoupons = [
    { code: 'BOOKMYTIX50', discountPercent: 20, maxDiscount: '100', minAmount: '300' },
    { code: 'WEEKENDVIP', discountPercent: 15, maxDiscount: '150', minAmount: '500' },
  ];

  for (const c of sampleCoupons) {
    const existing = await db.query.coupons.findFirst({ where: eq(coupons.code, c.code) });
    if (!existing) {
      const validUntil = new Date();
      validUntil.setFullYear(validUntil.getFullYear() + 2);
      await db.insert(coupons).values({
        code: c.code,
        discountPercent: c.discountPercent,
        maxDiscount: c.maxDiscount,
        minAmount: c.minAmount,
        validUntil,
        isActive: true,
      });
    }
  }

  console.log('[seed] Done.');
  await pool.end();
}

seed().catch((err) => {
  console.error('[seed] Error:', err);
  process.exit(1);
});
