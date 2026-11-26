import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const createEventSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  location: z.string().trim().min(1, 'Location is required'),
  date: z.string().min(1, 'Date is required'),
  price: z.number({ error: 'Price must be a number' }).positive('Price must be positive'),
  category: z.string().trim().optional().default('Movies'),
  image: z.string().url('Image must be a valid URL').optional().default(''),
  banner: z.string().url('Banner must be a valid URL').optional().default(''),
  trailer: z.string().optional().default(''),
  description: z.string().trim().optional().default(''),
  duration: z.string().optional().default('2h 15m'),
  language: z.string().optional().default('Hindi'),
  genre: z.string().optional().default('Action'),
  certificate: z.string().optional().default('UA'),
  rating: z.number().min(0).max(5).optional().default(4.5),
});

export const updateEventSchema = createEventSchema.partial();

export const createShowSchema = z.object({
  theatreId: z.number().int().positive('theatreId is required'),
  startsAt: z.string().min(1, 'startsAt (ISO datetime) is required'),
  price: z.number({ error: 'Price must be a number' }).positive(),
  numSeats: z.number().int().positive().optional().default(20),
  seatPrefix: z.string().optional().default('A'),
});

export const createBookingSchema = z.object({
  show_id: z.number({ error: 'show_id must be a number' }).int().positive(),
  seat_ids: z
    .array(z.number().int().positive())
    .min(1, 'At least one seat required')
    .max(10, 'Maximum 10 seats per booking')
    .refine((ids) => new Set(ids).size === ids.length, 'seat_ids must be unique'),
  lock_token: z.string().optional(),
});

export const lockSeatsSchema = z.object({
  seat_ids: z
    .array(z.number().int().positive())
    .min(1, 'At least one seat required')
    .max(10, 'Maximum 10 seats per lock')
    .refine((ids) => new Set(ids).size === ids.length, 'seat_ids must be unique'),
});

export const releaseSeatsSchema = z.object({
  lock_token: z.string().min(1, 'lock_token is required'),
  seat_ids: z.array(z.number().int().positive()).optional(),
});

export const createCinemaSchema = z.object({
  name: z.string().trim().min(2, 'Cinema name is required'),
  location: z.string().trim().min(2, 'Location is required'),
  city: z.string().trim().min(2, 'City is required'),
  address: z.string().trim().optional(),
  amenities: z.array(z.string()).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  landmark: z.string().optional(),
  operatingStatus: z.enum(['active', 'maintenance', 'closed']).optional().default('active'),
});

export const scheduleShowSchema = z.object({
  movieId: z.number().int().positive().optional(),
  eventId: z.number().int().positive().optional(),
  theatreId: z.number().int().positive('theatreId is required'),
  screenId: z.number().int().positive('screenId is required'),
  startsAt: z.string().min(1, 'startsAt is required'),
  endsAt: z.string().optional(),
  language: z.string().optional().default('Hindi'),
  format: z.string().optional().default('2D'),
  price: z.number().positive('price must be positive'),
  status: z.enum(['scheduled', 'selling', 'sold_out', 'cancelled']).optional().default('selling'),
});

export const createReviewSchema = z.object({
  eventId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().optional().default(''),
});

export const applyCouponSchema = z.object({
  code: z.string().trim().min(1, 'Coupon code is required'),
  amount: z.number().positive(),
});
