// ─── Auth ─────────────────────────────────────────────────────────────────────
export type UserRole = 'user' | 'customer' | 'admin' | 'cinema_manager';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  preferredCity?: string;
  isEmailVerified?: boolean;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  preferredCity: string;
  preferredGenres: string[];
  preferredLanguages: string[];
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    promotional: boolean;
  };
  isEmailVerified: boolean;
  createdAt: string;
  stats: {
    totalBookings: number;
    activeBookings: number;
  };
}

export interface AuthState {
  token: string | null;
  user: User | null;
}

// ─── Movie (Backend API entity) ──────────────────────────────────────────────
export interface ApiMovie {
  id: number;
  title: string;
  slug: string;
  description: string;
  poster: string;
  backdrop: string;
  trailerUrl: string;
  genre: string;
  language: string;
  duration: string;
  releaseDate: string;
  certification: string;
  cast: Array<{ name: string; role: string; image?: string }>;
  crew: Array<{ name: string; role: string }>;
  rating: number;
  voteCount: number;
  popularity: number;
  status: 'now_showing' | 'coming_soon' | 'archived';
  formats: string[];
  tmdbId?: number | null;
  imdbId?: string | null;
}

export interface MovieDetailResponse extends ApiMovie {
  cinemas: Array<{
    id: number;
    name: string;
    city: string;
    location: string;
    address: string;
    shows: Array<{
      id: number;
      startsAt: string;
      price: number;
      screenName: string;
      screenType: string;
    }>;
  }>;
  reviews: Array<{
    id: number;
    userName: string;
    rating: number;
    comment: string;
    createdAt: string;
  }>;
}

export interface SearchSuggestion {
  id: number;
  title: string;
  slug: string;
  poster: string;
  genre: string;
  language: string;
  rating: number;
  releaseYear: string;
  status: string;
}

export interface MovieFilterOptions {
  genres: string[];
  languages: string[];
  formats: string[];
  cities: string[];
  statuses: string[];
}

export interface ProviderAttribution {
  provider: 'tmdb' | 'omdb' | 'bookmytix';
  attributionText: string;
  logoUrl?: string;
  termsUrl?: string;
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
  votes?: number;
  releaseDate?: string;
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
  banner?: string;
  trailer?: string;
  description: string;
  duration?: string;
  language?: string;
  genre?: string;
  certificate?: string;
  rating?: number;
  price: number;
  theatres: string[];
  showTimings: string[];
}

// ─── Show & Cinema ────────────────────────────────────────────────────────────
export interface Theatre {
  id: number;
  name: string;
  location: string;
  city?: string;
  address?: string;
  amenities?: string[];
  phone?: string;
  email?: string;
  landmark?: string;
  operatingStatus?: string;
  screensCount?: number;
  formats?: string[];
  screens?: Array<{
    id: number;
    name: string;
    screenType: string;
    totalSeats: number;
  }>;
}

export interface ScreenLayout {
  rows: string[];
  cols: number;
  tiers: {
    recliner?: string[];
    premium?: string[];
    standard?: string[];
  };
  priceMultipliers: {
    recliner: number;
    premium: number;
    standard: number;
  };
}

export interface Show {
  id: number;
  startsAt: string;
  endsAt?: string | null;
  language?: string;
  format?: string;
  status?: string;
  price: number;
  theatre: Theatre;
  screen?: {
    id: number | null;
    name: string;
    screenType: string;
  };
}

// ─── Seat ────────────────────────────────────────────────────────────────────
export type SeatStatus = 'available' | 'locked' | 'locked_by_you' | 'booked';
export type SeatCategory = 'standard' | 'premium' | 'recliner';

export interface Seat {
  id: number;
  seat_number: string;
  seatNumber?: string;
  row?: string;
  category?: SeatCategory;
  price?: number;
  status: SeatStatus;
  lockExpiresAt?: string | null;
  remainingSeconds?: number;
}

export interface ShowSeatsResponse {
  show: {
    id: number;
    startsAt: string;
    endsAt: string | null;
    language: string;
    format: string;
    basePrice: number;
    screen: {
      id: number | null;
      name: string;
      type: string;
      layout: ScreenLayout;
    };
  };
  seats: Seat[];
}

export interface LockSeatsResponse {
  lockToken: string;
  expiresAt: string;
  remainingSeconds: number;
  seats: Array<{
    id: number;
    seatNumber: string;
    row: string;
    category: string;
    price: number;
  }>;
  subtotal: number;
  convenienceFee: number;
  gst: number;
  total: number;
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
  status:
    | 'pending'
    | 'payment_pending'
    | 'confirmed'
    | 'failed'
    | 'cancelled'
    | 'refund_pending'
    | 'refunded'
    | 'expired'
    | string;
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
  banner?: string;
  trailer?: string;
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

export interface HealthStatus {
  status: string;
  uptime: number;
  timestamp: string;
  database?: {
    connected: boolean;
    latencyMs?: number;
    error?: string;
  };
}

// ─── Toast ───────────────────────────────────────────────────────────────────
export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

// ─── FinTech & Checkout ───────────────────────────────────────────────────────
export interface FoodItem {
  id: number;
  theatreId: number | null;
  name: string;
  description: string;
  price: number;
  category: 'Popcorn' | 'Drinks' | 'Snacks' | 'Combos' | string;
  imageUrl: string;
  isAvailable: boolean;
}

export interface SelectedFoodItem {
  foodItemId: number;
  quantity: number;
}

export interface ValidatedFoodLineItem {
  foodItemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Coupon {
  id: number;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountPercent: number;
  discountAmount: number;
  maxDiscount: number;
  minAmount: number;
  validUntil: string;
}

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  couponId: number;
  discountType: 'percentage' | 'fixed';
  discountAmount: number;
  description: string;
  finalAmount: number;
}

export interface OrderSummaryResponse {
  show: {
    id: number;
    title: string;
    poster: string;
    theatre: string;
    screen: string;
    startsAt: string;
    formattedDate: string;
    formattedTime: string;
    language: string;
    format: string;
  };
  seats: Array<{
    id: number;
    seatNumber: string;
    row: string;
    category: string;
    price: number;
  }>;
  foodItems: ValidatedFoodLineItem[];
  pricing: {
    ticketSubtotal: number;
    convenienceFee: number;
    taxAmount: number;
    foodTotal: number;
    discountAmount: number;
    finalPayable: number;
    currency: string;
  };
  coupon?: {
    code: string;
    description: string;
    discountAmount: number;
  };
}

export interface PaymentOrderResponse {
  bookingId: number;
  bookingRef: string;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  summary: OrderSummaryResponse;
  expiresAt: string;
}

export interface VerifiedTicketResult {
  valid: boolean;
  message: string;
  admittedAt?: string;
  ticket?: {
    id: number;
    ticketRef: string;
    seatNumber: string;
    row: string;
    category: string;
    isUsed: boolean;
    usedAt: string | null;
  };
  booking?: {
    id: number;
    bookingRef: string;
    customerName: string;
    customerEmail: string;
    totalAmount: number;
    status: string;
  };
  show?: {
    movieTitle: string;
    theatreName: string;
    screenName: string;
    showTime: string;
    showDate: string;
  };
}

export interface BookingDetailsResponse {
  booking: {
    id: number;
    bookingRef: string;
    status: string;
    totalPrice: number;
    ticketSubtotal: number;
    convenienceFee: number;
    taxAmount: number;
    foodTotal: number;
    discountAmount: number;
    createdAt: string;
  };
  customer: {
    name: string;
    email: string;
  };
  show: {
    movieTitle: string;
    poster: string;
    theatreName: string;
    theatreAddress: string;
    screenName: string;
    startsAt: string;
    formattedDate: string;
    formattedTime: string;
    language: string;
    format: string;
  };
  tickets: Array<{
    id: number;
    ticketRef: string;
    seatNumber: string;
    row: string;
    category: string;
    price: number;
    isUsed: boolean;
    usedAt: string | null;
    qrToken: string;
    qrDataUrl: string;
  }>;
}

export interface UserBookingItem extends Booking {
  bookingRef: string;
  ticketSubtotal: number;
  convenienceFee: number;
  taxAmount: number;
  foodTotal: number;
  discountAmount: number;
  refundAmount?: number;
  poster?: string;
  screen: string;
  canCancel: boolean;
  hoursUntilShow: number;
  foodItems?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  tickets: Array<{
    id: number;
    ticketRef?: string;
    qr_code: string;
    seat_number: string;
    category?: string;
    isUsed?: boolean;
  }>;
}

// ─── RBAC, Audit & Support Types ──────────────────────────────────────────────
export interface AuditLogItem {
  id: number;
  userId: number | null;
  actorEmail: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface SupportTicketItem {
  id: number;
  ticketRef: string;
  userId: number;
  userName?: string;
  userEmail?: string;
  bookingId?: number | null;
  bookingRef?: string | null;
  subject: string;
  category: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  adminResponse?: string | null;
  resolvedBy?: number | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAnalyticsReport {
  overview: {
    totalBookings: number;
    totalRevenue: number;
    confirmedBookings: number;
    failedBookings: number;
    cancelledBookings: number;
    averageOrderValue: number;
    occupancyRate: number;
  };
  payments: {
    successfulCount: number;
    successfulAmount: number;
    failedCount: number;
    refundedCount: number;
    refundedAmount: number;
  };
  popularMovies: Array<{
    id: number;
    title: string;
    ticketsSold: number;
    revenue: number;
  }>;
  popularCinemas: Array<{
    id: number;
    name: string;
    city: string;
    ticketsSold: number;
    revenue: number;
  }>;
  trends: Array<{
    date: string;
    bookings: number;
    revenue: number;
  }>;
  coupons: {
    totalRedemptions: number;
    totalDiscountGiven: number;
    popularCoupons: Array<{
      code: string;
      usedCount: number;
      discountType: string;
    }>;
  };
}

export interface AdminBookingItem {
  id: number;
  bookingRef: string;
  userId: number;
  userName: string;
  userEmail: string;
  showId: number;
  movieTitle: string;
  theatreName: string;
  theatreCity: string;
  startsAt: string;
  totalPrice: number;
  status: string;
  cancellationReason?: string | null;
  refundAmount?: number | null;
  createdAt: string;
}

export interface AdminUserItem {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  preferredCity: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

// ─── AI Systems ─────────────────────────────────────────────────────────────
export interface MovieRecommendation {
  movie: Movie;
  score: number;
  explanation: string;
  reasonType: 'booking_history' | 'preference_match' | 'popularity' | 'trending_in_city';
  matchedGenres: string[];
}

export interface RecommendationResult {
  recommendations: MovieRecommendation[];
  strategy: 'hybrid_personalized' | 'preference_driven' | 'popularity_fallback';
  userProfile?: {
    preferredCity?: string;
    preferredGenres?: string[];
    preferredLanguages?: string[];
    totalBookings?: number;
  };
}

export interface DiscoveryFilter {
  query: string;
  genre?: string;
  language?: string;
  maxDurationMinutes?: number;
  minRating?: number;
  status?: 'now_showing' | 'coming_soon';
  city?: string;
  timeIntent?: 'tonight' | 'weekend' | 'today' | 'anytime';
  format?: string;
  confidence: number;
  detectedIntent: string;
}

export interface DiscoveryResult {
  query: string;
  parsedFilter: DiscoveryFilter;
  matchesCount: number;
  movies: Movie[];
  usedProvider: 'deterministic_nlp' | 'gemini_llm';
  explanation: string;
}

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantResponse {
  answer: string;
  sources: string[];
  disclaimer: string;
  suggestedFollowUps: string[];
  relatedLinks?: Array<{ label: string; url: string }>;
  isAiGenerated: boolean;
}

