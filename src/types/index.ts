// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

export interface AuthState {
  token: string | null;
  user: User | null;
}

// ─── Movie (frontend static catalog) ─────────────────────────────────────────
export interface Movie {
  id: string;
  title: string;
  city: string;
  genre: string;
  language: string;
  duration: string;
  /** Certificate: 'U' | 'UA' | 'A' | 'PG-13' */
  certificate: string;
  /** Numeric rating 0-5 */
  rating: number;
  director: string;
  cast: string[];
  description: string;
  poster: string;
  banner: string;
  /** YouTube embed URL e.g. https://www.youtube.com/embed/{id}?rel=0 */
  trailer: string | null;
  availableTheatres: string[];
  showTimings: string[];
  formats: string[];
}

// ─── Event (API) ─────────────────────────────────────────────────────────────
export interface ApiEvent {
  id: number;
  title: string;
  category: string;
  location: string;
  date: string;
  image: string;
  description: string;
  price: number;
  theatres: string[];
  showTimings: string[];
}

// ─── Show ────────────────────────────────────────────────────────────────────
export interface Theatre {
  id: number;
  name: string;
  location: string;
}

export interface Show {
  id: number;
  startsAt: string;
  price: number;
  theatre: Theatre;
}

// ─── Seat ────────────────────────────────────────────────────────────────────
export type SeatStatus = 'available' | 'booked';

export interface Seat {
  id: number;
  seat_number: string;
  status: SeatStatus;
}

// ─── Booking ─────────────────────────────────────────────────────────────────
export interface Ticket {
  id: number;
  qr_code: string;
  seat_number: string;
}

export interface Booking {
  id: number;
  total_price: number;
  status: 'confirmed' | 'cancelled';
  created_at: string;
  event_title: string;
  event_date: string;
  event_location: string;
  theatre: string;
  show_time: string;
  tickets: Ticket[];
}

// ─── Admin ───────────────────────────────────────────────────────────────────
export interface AdminStats {
  events: number;
  bookings: number;
  revenue: number;
}

export interface AdminEvent {
  id: number;
  title: string;
  category: string;
  location: string;
  date: string;
  image: string;
  description: string;
  basePrice: string;
}

export interface AdminTheatre {
  id: number;
  name: string;
  location: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────
export interface ApiError {
  error: string;
}

// ─── Toast ───────────────────────────────────────────────────────────────────
export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}
