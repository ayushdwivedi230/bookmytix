import { pgTable, serial, text, varchar, integer, numeric, timestamp, unique, pgEnum } from 'drizzle-orm/pg-core';

// ─── Enums ─────────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum('role', ['user', 'admin']);
export const seatStatusEnum = pgEnum('seat_status', ['available', 'booked']);
export const bookingStatusEnum = pgEnum('booking_status', ['confirmed', 'cancelled']);

// ─── Tables ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull().default('user'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull().default('Movies'),
  location: text('location').notNull(),
  date: text('date').notNull(),
  image: text('image').notNull().default(''),
  description: text('description').notNull().default(''),
  basePrice: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
});

export const theatres = pgTable('theatres', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location').notNull(),
});

export const shows = pgTable('shows', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  theatreId: integer('theatre_id').notNull().references(() => theatres.id, { onDelete: 'cascade' }),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
});

export const showSeats = pgTable('show_seats', {
  id: serial('id').primaryKey(),
  showId: integer('show_id').notNull().references(() => shows.id, { onDelete: 'cascade' }),
  seatNumber: varchar('seat_number', { length: 20 }).notNull(),
  status: seatStatusEnum('status').notNull().default('available'),
  bookingId: integer('booking_id'), // set when booked
}, (t) => [
  unique().on(t.showId, t.seatNumber),
]);

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  showId: integer('show_id').notNull().references(() => shows.id),
  totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  status: bookingStatusEnum('status').notNull().default('confirmed'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').notNull().references(() => bookings.id),
  showSeatId: integer('show_seat_id').notNull().references(() => showSeats.id),
  qrCode: text('qr_code').notNull(),
});
