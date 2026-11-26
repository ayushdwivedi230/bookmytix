import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  numeric,
  timestamp,
  unique,
  index,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ─────────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum('role', ['user', 'admin', 'customer', 'cinema_manager']);
export const seatStatusEnum = pgEnum('seat_status', ['available', 'booked']);
export const seatCategoryEnum = pgEnum('seat_category', ['standard', 'premium', 'recliner']);
export const showStatusEnum = pgEnum('show_status', ['scheduled', 'selling', 'sold_out', 'cancelled']);
export const operatingStatusEnum = pgEnum('operating_status', ['active', 'maintenance', 'closed']);
export const bookingStatusEnum = pgEnum('booking_status', [
  'pending',
  'payment_pending',
  'confirmed',
  'failed',
  'cancelled',
  'refund_pending',
  'refunded',
  'expired',
]);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'completed', 'failed', 'refunded']);
export const notificationTypeEnum = pgEnum('notification_type', ['booking_confirmed', 'reminder', 'promo', 'general']);
export const movieStatusEnum = pgEnum('movie_status', ['now_showing', 'coming_soon', 'archived']);

// ─── Movies (Dedicated Catalog) ───────────────────────────────────────────────
export const movies = pgTable('movies', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description').notNull().default(''),
  poster: text('poster').notNull().default(''),
  backdrop: text('backdrop').notNull().default(''),
  trailerUrl: text('trailer_url').notNull().default(''),
  genre: text('genre').notNull().default('Action'),
  language: text('language').notNull().default('Hindi'),
  duration: text('duration').notNull().default('2h 15m'),
  releaseDate: timestamp('release_date', { withTimezone: true }).notNull().defaultNow(),
  certification: varchar('certification', { length: 10 }).notNull().default('UA'),
  cast: text('cast').notNull().default('[]'),
  crew: text('crew').notNull().default('[]'),
  rating: numeric('rating', { precision: 3, scale: 1 }).notNull().default('4.5'),
  voteCount: integer('vote_count').notNull().default(100),
  popularity: numeric('popularity', { precision: 10, scale: 2 }).notNull().default('100.0'),
  status: movieStatusEnum('status').notNull().default('now_showing'),
  formats: text('formats').notNull().default('["2D"]'),
  tmdbId: integer('tmdb_id'),
  imdbId: varchar('imdb_id', { length: 20 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_movies_slug').on(t.slug),
  index('idx_movies_status').on(t.status),
  index('idx_movies_genre').on(t.genre),
  index('idx_movies_language').on(t.language),
  index('idx_movies_rating').on(t.rating),
  index('idx_movies_release_date').on(t.releaseDate),
  index('idx_movies_popularity').on(t.popularity),
]);

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull().default('user'),
  phone: varchar('phone', { length: 50 }),
  preferredCity: varchar('preferred_city', { length: 100 }).notNull().default('Delhi'),
  preferredGenres: text('preferred_genres').notNull().default('["Action", "Thriller"]'),
  preferredLanguages: text('preferred_languages').notNull().default('["Hindi", "English"]'),
  notificationPreferences: text('notification_preferences').notNull().default('{"email":true,"sms":true,"promotional":false}'),
  isEmailVerified: boolean('is_email_verified').notNull().default(false),
  emailVerificationToken: varchar('email_verification_token', { length: 150 }),
  passwordResetToken: varchar('password_reset_token', { length: 150 }),
  passwordResetExpiresAt: timestamp('password_reset_expires_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  cinemaId: integer('cinema_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Events / Movies ──────────────────────────────────────────────────────────
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull().default('Movies'),
  location: text('location').notNull(),
  date: text('date').notNull(),
  image: text('image').notNull().default(''),
  banner: text('banner').notNull().default(''),
  trailer: text('trailer').notNull().default(''),
  description: text('description').notNull().default(''),
  duration: text('duration').notNull().default('2h 15m'),
  language: text('language').notNull().default('Hindi'),
  genre: text('genre').notNull().default('Action'),
  certificate: varchar('certificate', { length: 10 }).notNull().default('UA'),
  rating: numeric('rating', { precision: 2, scale: 1 }).notNull().default('4.5'),
  basePrice: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_events_category').on(t.category),
  index('idx_events_location').on(t.location),
]);

// ─── Theatres (Cinemas) ───────────────────────────────────────────────────────
export const theatres = pgTable('theatres', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  city: text('city').notNull().default(''),
  address: text('address').notNull().default(''),
  amenities: text('amenities').notNull().default('["4K Dolby Atmos", "Parking", "Food Court"]'),
  phone: varchar('phone', { length: 50 }).notNull().default('+91 22 6600 0000'),
  email: varchar('email', { length: 100 }).notNull().default('support@bookmytix.com'),
  landmark: text('landmark').notNull().default(''),
  operatingStatus: operatingStatusEnum('operating_status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_theatres_location').on(t.location),
  index('idx_theatres_city').on(t.city),
  index('idx_theatres_operating_status').on(t.operatingStatus),
]);

// ─── Screens ──────────────────────────────────────────────────────────────────
export const screens = pgTable('screens', {
  id: serial('id').primaryKey(),
  theatreId: integer('theatre_id').notNull().references(() => theatres.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  screenType: text('screen_type').notNull().default('Standard'),
  totalSeats: integer('total_seats').notNull().default(100),
  seatLayout: text('seat_layout').notNull().default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_screens_theatre_id').on(t.theatreId),
]);

// ─── Physical Seats ───────────────────────────────────────────────────────────
export const seats = pgTable('seats', {
  id: serial('id').primaryKey(),
  theatreId: integer('theatre_id').notNull().references(() => theatres.id, { onDelete: 'cascade' }),
  screenId: integer('screen_id').references(() => screens.id, { onDelete: 'cascade' }),
  row: varchar('row', { length: 5 }).notNull(),
  seatNumber: varchar('seat_number', { length: 10 }).notNull(),
  seatType: varchar('seat_type', { length: 20 }).notNull().default('normal'),
  seatCategory: seatCategoryEnum('seat_category').notNull().default('standard'),
  priceMultiplier: numeric('price_multiplier', { precision: 4, scale: 2 }).notNull().default('1.0'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('uq_screen_seat').on(t.screenId, t.row, t.seatNumber),
  index('idx_seats_screen_id').on(t.screenId),
]);

// ─── Shows ────────────────────────────────────────────────────────────────────
export const shows = pgTable('shows', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  movieId: integer('movie_id').references(() => movies.id, { onDelete: 'cascade' }),
  theatreId: integer('theatre_id').notNull().references(() => theatres.id, { onDelete: 'cascade' }),
  screenId: integer('screen_id').references(() => screens.id, { onDelete: 'set null' }),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  language: varchar('language', { length: 50 }).notNull().default('Hindi'),
  format: varchar('format', { length: 50 }).notNull().default('2D'),
  status: showStatusEnum('status').notNull().default('selling'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_shows_event_id').on(t.eventId),
  index('idx_shows_movie_id').on(t.movieId),
  index('idx_shows_theatre_id').on(t.theatreId),
  index('idx_shows_screen_id').on(t.screenId),
  index('idx_shows_starts_at').on(t.startsAt),
  index('idx_shows_status').on(t.status),
]);

// ─── Show Seats (Runtime seat instance per show) ──────────────────────────────
export const showSeats = pgTable('show_seats', {
  id: serial('id').primaryKey(),
  showId: integer('show_id').notNull().references(() => shows.id, { onDelete: 'cascade' }),
  seatNumber: varchar('seat_number', { length: 20 }).notNull(),
  row: varchar('row', { length: 5 }).notNull().default('A'),
  category: seatCategoryEnum('category').notNull().default('standard'),
  price: numeric('price', { precision: 10, scale: 2 }),
  status: seatStatusEnum('status').notNull().default('available'),
  bookingId: integer('booking_id'),
}, (t) => [
  unique('show_seats_show_id_seat_number_unique').on(t.showId, t.seatNumber),
  index('idx_show_seats_show_id').on(t.showId),
  index('idx_show_seats_booking_id').on(t.bookingId),
  index('idx_show_seats_status').on(t.status),
  index('idx_show_seats_category').on(t.category),
]);

// ─── Temporary Seat Locks (ACID Concurrency & Lock Expiry) ────────────────────
export const seatLocks = pgTable('seat_locks', {
  id: serial('id').primaryKey(),
  showId: integer('show_id').notNull().references(() => shows.id, { onDelete: 'cascade' }),
  showSeatId: integer('show_seat_id').notNull().references(() => showSeats.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lockToken: varchar('lock_token', { length: 100 }).notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (t) => [
  unique('uq_active_seat_lock').on(t.showId, t.showSeatId),
  index('idx_seat_locks_show_id').on(t.showId),
  index('idx_seat_locks_user_id').on(t.userId),
  index('idx_seat_locks_expires_at').on(t.expiresAt),
  index('idx_seat_locks_token').on(t.lockToken),
]);

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  bookingRef: varchar('booking_ref', { length: 60 }).unique(),
  userId: integer('user_id').notNull().references(() => users.id),
  showId: integer('show_id').notNull().references(() => shows.id),
  ticketSubtotal: numeric('ticket_subtotal', { precision: 10, scale: 2 }).notNull().default('0'),
  convenienceFee: numeric('convenience_fee', { precision: 10, scale: 2 }).notNull().default('0'),
  taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  foodTotal: numeric('food_total', { precision: 10, scale: 2 }).notNull().default('0'),
  discountAmount: numeric('discount_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  couponId: integer('coupon_id').references(() => coupons.id, { onDelete: 'set null' }),
  totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  status: bookingStatusEnum('status').notNull().default('payment_pending'),
  cancellationReason: text('cancellation_reason'),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  refundAmount: numeric('refund_amount', { precision: 10, scale: 2 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_bookings_user_id').on(t.userId),
  index('idx_bookings_show_id').on(t.showId),
  index('idx_bookings_created_at').on(t.createdAt),
  index('idx_bookings_booking_ref').on(t.bookingRef),
]);

// ─── Tickets / Booking Seats ──────────────────────────────────────────────────
export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  showSeatId: integer('show_seat_id').notNull().references(() => showSeats.id),
  ticketRef: varchar('ticket_ref', { length: 80 }).unique(),
  qrCode: text('qr_code').notNull(),
  qrToken: varchar('qr_token', { length: 120 }).unique(),
  isUsed: boolean('is_used').notNull().default(false),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_tickets_booking_id').on(t.bookingId),
  index('idx_tickets_show_seat_id').on(t.showSeatId),
  index('idx_tickets_ticket_ref').on(t.ticketRef),
  index('idx_tickets_qr_token').on(t.qrToken),
]);

// ─── Payments ─────────────────────────────────────────────────────────────────
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('INR'),
  provider: varchar('provider', { length: 50 }).notNull().default('razorpay'),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull().default('card'),
  orderId: varchar('order_id', { length: 100 }),
  signature: text('signature'),
  status: paymentStatusEnum('status').notNull().default('completed'),
  transactionId: varchar('transaction_id', { length: 100 }).notNull().unique(),
  refundId: varchar('refund_id', { length: 100 }),
  refundAmount: numeric('refund_amount', { precision: 10, scale: 2 }),
  idempotencyKey: varchar('idempotency_key', { length: 150 }).unique(),
  webhookProcessedAt: timestamp('webhook_processed_at', { withTimezone: true }),
  metadata: text('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_payments_booking_id').on(t.bookingId),
  index('idx_payments_user_id').on(t.userId),
  index('idx_payments_status').on(t.status),
  index('idx_payments_order_id').on(t.orderId),
  index('idx_payments_idempotency_key').on(t.idempotencyKey),
]);

// ─── Reviews ──────────────────────────────────────────────────────────────────
export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  eventId: integer('event_id').references(() => events.id, { onDelete: 'cascade' }),
  movieId: integer('movie_id').references(() => movies.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  comment: text('comment').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_reviews_event_id').on(t.eventId),
  index('idx_reviews_movie_id').on(t.movieId),
  index('idx_reviews_user_id').on(t.userId),
]);

// ─── Coupons ──────────────────────────────────────────────────────────────────
export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  description: text('description').notNull().default(''),
  discountType: varchar('discount_type', { length: 20 }).notNull().default('percentage'),
  discountPercent: integer('discount_percent').notNull().default(0),
  discountAmount: numeric('discount_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  maxDiscount: numeric('max_discount', { precision: 10, scale: 2 }).notNull().default('0'),
  minAmount: numeric('min_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  usageLimit: integer('usage_limit').notNull().default(1000),
  usedCount: integer('used_count').notNull().default(0),
  perUserLimit: integer('per_user_limit').notNull().default(1),
  validFrom: timestamp('valid_from', { withTimezone: true }).notNull().defaultNow(),
  validUntil: timestamp('valid_until', { withTimezone: true }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_coupons_code').on(t.code),
  index('idx_coupons_is_active').on(t.isActive),
]);

// ─── Food Items ───────────────────────────────────────────────────────────────
export const foodItems = pgTable('food_items', {
  id: serial('id').primaryKey(),
  theatreId: integer('theatre_id').references(() => theatres.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  category: varchar('category', { length: 50 }).notNull().default('Snacks'),
  imageUrl: text('image_url').notNull().default(''),
  isAvailable: boolean('is_available').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_food_items_theatre_id').on(t.theatreId),
  index('idx_food_items_category').on(t.category),
]);

// ─── Booking Food Items (Concessions) ─────────────────────────────────────────
export const bookingFoodItems = pgTable('booking_food_items', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  foodItemId: integer('food_item_id').notNull().references(() => foodItems.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
}, (t) => [
  index('idx_booking_food_booking_id').on(t.bookingId),
]);

// ─── Notifications ────────────────────────────────────────────────────
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: notificationTypeEnum('type').notNull().default('general'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_notifications_user_id').on(t.userId),
  index('idx_notifications_is_read').on(t.isRead),
]);

// ─── Audit Logs (Feature 7) ───────────────────────────────────────────────────
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  actorEmail: varchar('actor_email', { length: 255 }).notNull(),
  actorRole: varchar('actor_role', { length: 50 }).notNull().default('admin'),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }).notNull(),
  resourceId: varchar('resource_id', { length: 100 }).notNull(),
  details: text('details'),
  ipAddress: varchar('ip_address', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_audit_logs_user_id').on(t.userId),
  index('idx_audit_logs_action').on(t.action),
  index('idx_audit_logs_resource').on(t.resourceType, t.resourceId),
  index('idx_audit_logs_created_at').on(t.createdAt),
]);

// ─── Support Tickets (Feature 8) ──────────────────────────────────────────────
export const supportTickets = pgTable('support_tickets', {
  id: serial('id').primaryKey(),
  ticketRef: varchar('ticket_ref', { length: 50 }).notNull().unique(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bookingId: integer('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
  subject: text('subject').notNull(),
  category: varchar('category', { length: 50 }).notNull().default('booking_issue'),
  message: text('message').notNull(),
  status: varchar('status', { length: 30 }).notNull().default('open'),
  priority: varchar('priority', { length: 20 }).notNull().default('normal'),
  adminResponse: text('admin_response'),
  resolvedBy: integer('resolved_by').references(() => users.id, { onDelete: 'set null' }),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_support_tickets_user_id').on(t.userId),
  index('idx_support_tickets_booking_id').on(t.bookingId),
  index('idx_support_tickets_status').on(t.status),
  index('idx_support_tickets_ticket_ref').on(t.ticketRef),
]);

// ─── Relations ────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  reviews: many(reviews),
  notifications: many(notifications),
  payments: many(payments),
  seatLocks: many(seatLocks),
  auditLogs: many(auditLogs),
  supportTickets: many(supportTickets),
}));

export const moviesRelations = relations(movies, ({ many }) => ({
  shows: many(shows),
  reviews: many(reviews),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  shows: many(shows),
  reviews: many(reviews),
}));

export const theatresRelations = relations(theatres, ({ many }) => ({
  screens: many(screens),
  shows: many(shows),
  foodItems: many(foodItems),
}));

export const screensRelations = relations(screens, ({ one, many }) => ({
  theatre: one(theatres, { fields: [screens.theatreId], references: [theatres.id] }),
  seats: many(seats),
  shows: many(shows),
}));

export const showsRelations = relations(shows, ({ one, many }) => ({
  event: one(events, { fields: [shows.eventId], references: [events.id] }),
  movie: one(movies, { fields: [shows.movieId], references: [movies.id] }),
  theatre: one(theatres, { fields: [shows.theatreId], references: [theatres.id] }),
  screen: one(screens, { fields: [shows.screenId], references: [screens.id] }),
  seats: many(showSeats),
  bookings: many(bookings),
  locks: many(seatLocks),
}));

export const showSeatsRelations = relations(showSeats, ({ one }) => ({
  show: one(shows, { fields: [showSeats.showId], references: [shows.id] }),
  booking: one(bookings, { fields: [showSeats.bookingId], references: [bookings.id] }),
  lock: one(seatLocks, { fields: [showSeats.id], references: [seatLocks.showSeatId] }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, { fields: [bookings.userId], references: [users.id] }),
  show: one(shows, { fields: [bookings.showId], references: [shows.id] }),
  tickets: many(tickets),
  payments: many(payments),
  foodItems: many(bookingFoodItems),
  supportTickets: many(supportTickets),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  booking: one(bookings, { fields: [tickets.bookingId], references: [bookings.id] }),
  showSeat: one(showSeats, { fields: [tickets.showSeatId], references: [showSeats.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, { fields: [payments.bookingId], references: [bookings.id] }),
  user: one(users, { fields: [payments.userId], references: [users.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  event: one(events, { fields: [reviews.eventId], references: [events.id] }),
  movie: one(movies, { fields: [reviews.movieId], references: [movies.id] }),
}));

export const foodItemsRelations = relations(foodItems, ({ one, many }) => ({
  theatre: one(theatres, { fields: [foodItems.theatreId], references: [theatres.id] }),
  bookingFoodItems: many(bookingFoodItems),
}));

export const bookingFoodItemsRelations = relations(bookingFoodItems, ({ one }) => ({
  booking: one(bookings, { fields: [bookingFoodItems.bookingId], references: [bookings.id] }),
  foodItem: one(foodItems, { fields: [bookingFoodItems.foodItemId], references: [foodItems.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const seatLocksRelations = relations(seatLocks, ({ one }) => ({
  show: one(shows, { fields: [seatLocks.showId], references: [shows.id] }),
  showSeat: one(showSeats, { fields: [seatLocks.showSeatId], references: [showSeats.id] }),
  user: one(users, { fields: [seatLocks.userId], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one }) => ({
  user: one(users, { fields: [supportTickets.userId], references: [users.id] }),
  booking: one(bookings, { fields: [supportTickets.bookingId], references: [bookings.id] }),
  resolver: one(users, { fields: [supportTickets.resolvedBy], references: [users.id] }),
}));
