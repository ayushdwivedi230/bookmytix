/**
 * Idempotent seed script.
 * Run with: npm run db:seed
 *
 * Generates show dates relative to today so the demo never looks stale.
 */
import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, and } from 'drizzle-orm';
import * as schema from './schema.js';

const { users, events, theatres, shows, showSeats, bookings: _bookings, tickets: _tickets } = schema;

if (!process.env.DATABASE_URL) {
  throw new Error('[seed] DATABASE_URL is not set.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
const db = drizzle(pool, { schema });

// ─── Helpers ───────────────────────────────────────────────────────────────────
/** Returns a Date `daysFromNow` in the future at the given hour/minute UTC */
function futureDate(daysFromNow: number, hour = 18, minute = 0): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

function parseTime(timeStr: string, daysFromNow: number): Date {
  // Parses "06:30 PM" into a UTC Date
  const [timePart, meridiem] = timeStr.split(' ');
  let [h, m] = timePart.split(':').map(Number);
  if (meridiem === 'PM' && h !== 12) h += 12;
  if (meridiem === 'AM' && h === 12) h = 0;
  return futureDate(daysFromNow, h, m);
}

// ─── Event definitions ─────────────────────────────────────────────────────────
const EVENT_SEED = [
  {
    title: 'Pushpa 2',
    category: 'Movies',
    location: 'Hyderabad',
    daysFromNow: 75,
    basePrice: 499,
    image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=800&h=600',
    description: 'Blockbuster action with high-energy performances and premium Dolby screening options.',
    seatPrefix: 'M', numSeats: 20,
    theatres: [
      { name: 'PVR Hyderabad', location: 'Hyderabad', showTimings: ['11:30 AM', '02:15 PM', '06:00 PM', '09:30 PM'], daysOffset: 0 },
      { name: 'Cinepolis Hitec City', location: 'Hyderabad', showTimings: ['10:00 AM', '01:30 PM', '05:45 PM'], daysOffset: 1 },
      { name: 'INOX Gachibowli', location: 'Hyderabad', showTimings: ['12:00 PM', '03:30 PM', '07:00 PM'], daysOffset: 2 },
    ],
  },
  {
    title: 'Kalki 2898 AD',
    category: 'Movies',
    location: 'Mumbai',
    daysFromNow: 50,
    basePrice: 599,
    image: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&q=80&w=800&h=600',
    description: 'Immersive sci-fi spectacle with premium IMAX and 4DX screening availability.',
    seatPrefix: 'M', numSeats: 20,
    theatres: [
      { name: 'PVR Jio World', location: 'Mumbai', showTimings: ['10:00 AM', '01:30 PM', '04:45 PM', '08:15 PM'], daysOffset: 0 },
      { name: 'INOX Andheri', location: 'Mumbai', showTimings: ['11:00 AM', '02:45 PM', '07:00 PM'], daysOffset: 1 },
      { name: 'Cinepolis Infinity', location: 'Mumbai', showTimings: ['09:30 AM', '12:45 PM', '06:30 PM'], daysOffset: 2 },
    ],
  },
  {
    title: 'Stree 2',
    category: 'Movies',
    location: 'Delhi',
    daysFromNow: 40,
    basePrice: 399,
    image: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=800&h=600',
    description: 'A laugh-out-loud horror-comedy packed with laughs, thrills, and fan-favourite moments.',
    seatPrefix: 'M', numSeats: 20,
    theatres: [
      { name: 'PVR Plaza', location: 'Delhi', showTimings: ['12:00 PM', '03:30 PM', '07:00 PM', '10:15 PM'], daysOffset: 0 },
      { name: 'INOX City Centre', location: 'Delhi', showTimings: ['11:30 AM', '03:00 PM', '07:30 PM'], daysOffset: 1 },
      { name: 'Cinepolis Chanakyapuri', location: 'Delhi', showTimings: ['10:00 AM', '02:00 PM', '06:00 PM'], daysOffset: 2 },
    ],
  },
  {
    title: 'Aarohan',
    category: 'Movies',
    location: 'Mumbai',
    daysFromNow: 30,
    basePrice: 349,
    image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80',
    description: 'A moving contemporary drama with intimate storytelling and premium seating experience.',
    seatPrefix: 'M', numSeats: 24,
    theatres: [
      { name: 'PVR Icon', location: 'Mumbai', showTimings: ['11:15 AM', '02:00 PM', '05:30 PM', '09:00 PM'], daysOffset: 0 },
      { name: 'Cinepolis Skywalk', location: 'Mumbai', showTimings: ['10:30 AM', '01:45 PM', '05:00 PM'], daysOffset: 1 },
      { name: 'INOX Wadala', location: 'Mumbai', showTimings: ['12:00 PM', '03:15 PM', '07:00 PM'], daysOffset: 2 },
    ],
  },
  {
    title: 'Bhoomi 9',
    category: 'Movies',
    location: 'Delhi',
    daysFromNow: 25,
    basePrice: 329,
    image: 'https://images.unsplash.com/photo-1517602302552-471fe67acf66?auto=format&fit=crop&w=800&q=80',
    description: 'An edge-of-the-seat thriller with stylish visuals and multiple premium show slots.',
    seatPrefix: 'M', numSeats: 24,
    theatres: [
      { name: 'PVR Saket', location: 'Delhi', showTimings: ['10:30 AM', '01:45 PM', '04:30 PM', '08:45 PM'], daysOffset: 0 },
      { name: 'INOX DLF', location: 'Delhi', showTimings: ['11:00 AM', '02:30 PM', '06:30 PM'], daysOffset: 1 },
      { name: 'Cinepolis Gurugram', location: 'Gurugram', showTimings: ['10:00 AM', '01:00 PM', '05:00 PM'], daysOffset: 2 },
    ],
  },
  {
    title: 'Chasing Shadows',
    category: 'Movies',
    location: 'Bengaluru',
    daysFromNow: 20,
    basePrice: 379,
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80',
    description: 'A gripping crime drama with modern visuals and a cinematic surround sound experience.',
    seatPrefix: 'M', numSeats: 24,
    theatres: [
      { name: 'PVR Orion', location: 'Bengaluru', showTimings: ['11:00 AM', '02:30 PM', '06:15 PM', '09:45 PM'], daysOffset: 0 },
      { name: 'INOX NEXUS', location: 'Bengaluru', showTimings: ['10:00 AM', '01:30 PM', '05:30 PM'], daysOffset: 1 },
      { name: 'Cinepolis Mantri', location: 'Bengaluru', showTimings: ['09:30 AM', '12:45 PM', '04:00 PM'], daysOffset: 2 },
    ],
  },
  {
    title: 'Dance of Dust',
    category: 'Movies',
    location: 'Pune',
    daysFromNow: 35,
    basePrice: 319,
    image: 'https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?auto=format&fit=crop&w=800&q=80',
    description: 'A vibrant romance with warm storytelling and comfortable premium seating.',
    seatPrefix: 'M', numSeats: 24,
    theatres: [
      { name: 'PVR Phoenix', location: 'Pune', showTimings: ['12:15 PM', '03:45 PM', '07:15 PM', '10:30 PM'], daysOffset: 0 },
      { name: 'INOX Westend', location: 'Pune', showTimings: ['11:00 AM', '02:30 PM', '06:30 PM'], daysOffset: 1 },
      { name: 'Cinepolis Vimannagar', location: 'Pune', showTimings: ['10:00 AM', '01:15 PM', '05:00 PM'], daysOffset: 2 },
    ],
  },
  {
    title: 'Echoes of Jaipur',
    category: 'Movies',
    location: 'Jaipur',
    daysFromNow: 45,
    basePrice: 299,
    image: 'https://images.unsplash.com/photo-1516280030429-27679b7f7f6e?auto=format&fit=crop&w=800&q=80',
    description: 'A rich cultural drama with a compelling story arc and intimate auditorium feel.',
    seatPrefix: 'M', numSeats: 24,
    theatres: [
      { name: 'PVR Pink City', location: 'Jaipur', showTimings: ['10:45 AM', '01:15 PM', '05:00 PM', '08:30 PM'], daysOffset: 0 },
      { name: 'INOX World Trade Park', location: 'Jaipur', showTimings: ['11:30 AM', '03:00 PM', '07:00 PM'], daysOffset: 1 },
      { name: 'Cinepolis Mansarovar', location: 'Jaipur', showTimings: ['10:00 AM', '01:30 PM', '05:30 PM'], daysOffset: 2 },
    ],
  },
  {
    title: 'Sunburn Goa',
    category: 'Concerts',
    location: 'Goa',
    daysFromNow: 99,
    basePrice: 4999,
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800&h=600',
    description: 'A high-energy live concert experience with immersive lighting, premium seating, and beachside vibes.',
    seatPrefix: 'C', numSeats: 50,
    theatres: [
      { name: 'Beachfront Arena', location: 'Goa', showTimings: ['04:00 PM', '06:30 PM', '09:00 PM'], daysOffset: 0 },
      { name: 'Main Stage Deck', location: 'Goa', showTimings: ['05:00 PM', '08:00 PM'], daysOffset: 1 },
      { name: 'VIP Lounge Pavilion', location: 'Goa', showTimings: ['07:00 PM'], daysOffset: 2 },
    ],
  },
  {
    title: 'Diljit Live',
    category: 'Concerts',
    location: 'Chandigarh',
    daysFromNow: 60,
    basePrice: 2999,
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&q=80&w=800&h=600',
    description: 'A must-see live concert night featuring top-tier sound and premium hospitality zones.',
    seatPrefix: 'C', numSeats: 50,
    theatres: [
      { name: 'NOVA Arena', location: 'Chandigarh', showTimings: ['07:00 PM', '09:30 PM'], daysOffset: 0 },
      { name: 'Stadium Lounge', location: 'Chandigarh', showTimings: ['08:00 PM'], daysOffset: 1 },
      { name: 'Golden Circle', location: 'Chandigarh', showTimings: ['07:30 PM'], daysOffset: 2 },
    ],
  },
  {
    title: 'IPL Finals',
    category: 'Sports',
    location: 'Ahmedabad',
    daysFromNow: 250,
    basePrice: 1499,
    image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=800&h=600',
    description: 'The grand finale under floodlights with premium hospitality and world-class matchday energy.',
    seatPrefix: 'S', numSeats: 50,
    theatres: [
      { name: 'Narendra Modi Stadium', location: 'Ahmedabad', showTimings: ['07:30 PM'], daysOffset: 0 },
      { name: 'VIP Skybox', location: 'Ahmedabad', showTimings: ['07:30 PM'], daysOffset: 0 },
      { name: 'Club Lounge', location: 'Ahmedabad', showTimings: ['07:30 PM'], daysOffset: 0 },
    ],
  },
  {
    title: 'India vs Australia',
    category: 'Sports',
    location: 'Bengaluru',
    daysFromNow: 145,
    basePrice: 1999,
    image: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&q=80&w=800&h=600',
    description: 'A marquee cricket showdown with immersive stadium viewing and premium fan experiences.',
    seatPrefix: 'S', numSeats: 50,
    theatres: [
      { name: 'M Chinnaswamy', location: 'Bengaluru', showTimings: ['02:00 PM', '07:00 PM'], daysOffset: 0 },
      { name: 'Ridge Lounge', location: 'Bengaluru', showTimings: ['07:00 PM'], daysOffset: 1 },
      { name: 'Arena Club', location: 'Bengaluru', showTimings: ['02:00 PM'], daysOffset: 1 },
    ],
  },
  {
    title: 'Zakir Khan Live',
    category: 'Comedy',
    location: 'Pune',
    daysFromNow: 55,
    basePrice: 999,
    image: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&q=80&w=800&h=600',
    description: 'A sharp and witty stand-up show with front-row experiences and premium lounge seating.',
    seatPrefix: 'COM-', numSeats: 30,
    theatres: [
      { name: 'Balewadi Arena', location: 'Pune', showTimings: ['07:30 PM', '09:00 PM'], daysOffset: 0 },
      { name: 'Laugh Lounge', location: 'Pune', showTimings: ['08:00 PM'], daysOffset: 1 },
      { name: 'Main Hall', location: 'Pune', showTimings: ['07:00 PM'], daysOffset: 2 },
    ],
  },
  {
    title: 'Anubhav Singh Bassi Tour',
    category: 'Comedy',
    location: 'Jaipur',
    daysFromNow: 65,
    basePrice: 799,
    image: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&q=80&w=800&h=600',
    description: 'A hilarious live comedy night with curated premium seating and fast-moving entertainment.',
    seatPrefix: 'COM-', numSeats: 30,
    theatres: [
      { name: 'Jawahar Kala Kendra', location: 'Jaipur', showTimings: ['06:30 PM', '08:45 PM'], daysOffset: 0 },
      { name: 'Theatre Lounge', location: 'Jaipur', showTimings: ['07:30 PM'], daysOffset: 1 },
      { name: 'Studio Hall', location: 'Jaipur', showTimings: ['07:00 PM'], daysOffset: 2 },
    ],
  },
  {
    title: 'AI India Summit',
    category: 'Tech Events',
    location: 'Bengaluru',
    daysFromNow: 14,
    basePrice: 3999,
    image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80&w=800&h=600',
    description: 'A dynamic summit experience with premium access, networking zones, and on-site hospitality.',
    seatPrefix: 'T', numSeats: 50,
    theatres: [
      { name: 'The Forum', location: 'Bengaluru', showTimings: ['09:00 AM', '01:30 PM'], daysOffset: 0 },
      { name: 'Innovation Hall', location: 'Bengaluru', showTimings: ['10:00 AM', '02:00 PM'], daysOffset: 1 },
      { name: 'Tech Pavilion', location: 'Bengaluru', showTimings: ['09:30 AM', '01:00 PM'], daysOffset: 2 },
    ],
  },
];

// ─── Seed execution ────────────────────────────────────────────────────────────
async function seed() {
  console.log('[seed] Starting...');

  // 1. Admin user
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!existing) {
      const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12);
      await db.insert(users).values({ name: 'Admin', email, passwordHash: hash, role: 'admin' });
      console.log(`[seed] Admin created: ${email}`);
    } else {
      console.log(`[seed] Admin already exists: ${email}`);
    }
  }

  // 2. Events, theatres, shows, show_seats
  for (const evtDef of EVENT_SEED) {
    // Upsert event (idempotent: skip if title already exists)
    const existingEvent = await db.query.events.findFirst({
      where: eq(events.title, evtDef.title),
    });

    let eventId: number;
    if (existingEvent) {
      eventId = existingEvent.id;
      console.log(`[seed] Event already exists: "${evtDef.title}" (id=${eventId})`);
    } else {
      const [newEvent] = await db.insert(events).values({
        title: evtDef.title,
        category: evtDef.category,
        location: evtDef.location,
        date: futureDate(evtDef.daysFromNow).toISOString().split('T')[0],
        image: evtDef.image,
        description: evtDef.description,
        basePrice: String(evtDef.basePrice),
      }).returning({ id: events.id });
      eventId = newEvent.id;
      console.log(`[seed] Created event: "${evtDef.title}" (id=${eventId})`);
    }

    // Theatres and shows
    for (const th of evtDef.theatres) {
      // Upsert theatre
      let theatre = await db.query.theatres.findFirst({
        where: and(eq(theatres.name, th.name), eq(theatres.location, th.location)),
      });
      if (!theatre) {
        const [t] = await db.insert(theatres).values({ name: th.name, location: th.location }).returning();
        theatre = t;
      }

      // Shows per timing
      for (const timing of th.showTimings) {
        const startsAt = parseTime(timing, evtDef.daysFromNow + th.daysOffset);

        // Check if show already exists for this event/theatre/time
        const existingShow = await db.query.shows.findFirst({
          where: and(
            eq(shows.eventId, eventId),
            eq(shows.theatreId, theatre.id),
            eq(shows.startsAt, startsAt)
          ),
        });

        if (existingShow) continue;

        const [show] = await db.insert(shows).values({
          eventId,
          theatreId: theatre.id,
          startsAt,
          price: String(evtDef.basePrice),
        }).returning({ id: shows.id });

        // Auto-generate seats for this show
        const seatRows = [];
        for (let i = 1; i <= evtDef.numSeats; i++) {
          seatRows.push({
            showId: show.id,
            seatNumber: `${evtDef.seatPrefix}${i}`,
            status: 'available' as const,
          });
        }
        await db.insert(showSeats).values(seatRows);
        console.log(`[seed]   Show created: ${th.name} @ ${timing} (showId=${show.id}, ${evtDef.numSeats} seats)`);
      }
    }
  }

  console.log('[seed] Done.');
  await pool.end();
}

seed().catch(err => {
  console.error('[seed] Error:', err);
  process.exit(1);
});
