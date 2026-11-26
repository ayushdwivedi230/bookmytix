import type {
  ApiEvent,
  ApiMovie,
  MovieDetailResponse,
  SearchSuggestion,
  MovieFilterOptions,
  ProviderAttribution,
  Show,
  ShowSeatsResponse,
  LockSeatsResponse,
  AdminStats,
  AdminEvent,
  AdminTheatre,
  User,
  UserProfile,
  AuditLogItem,
  SupportTicketItem,
  AdminAnalyticsReport,
  AdminBookingItem,
  AdminUserItem,
  HealthStatus,
  Theatre,
  FoodItem,
  Coupon,
  CouponValidationResult,
  OrderSummaryResponse,
  PaymentOrderResponse,
  VerifiedTicketResult,
  BookingDetailsResponse,
  UserBookingItem,
  RecommendationResult,
  DiscoveryResult,
  AssistantResponse,
  AssistantMessage,
} from '../types';

const API_BASE = '/api';

// ─── Auth helpers ─────────────────────────────────────────────────────────────
const clearStoredAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

const notifyAuthExpired = () => {
  window.dispatchEvent(new Event('auth:expired'));
};

// ─── Core fetcher ─────────────────────────────────────────────────────────────
async function request<T>(
  url: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await res.json().catch(() => ({}))
    : { error: await res.text().catch(() => 'Request failed') };

  if (!res.ok) {
    if (res.status === 401) {
      clearStoredAuth();
      notifyAuthExpired();
    }
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  }
  return data as T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string, preferredCity?: string) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, preferredCity }),
    }),
  logout: () =>
    request<{ message: string }>('/auth/logout', { method: 'POST' }),
  forgotPassword: (email: string) =>
    request<{ message: string; resetToken?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, newPassword: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),
  verifyEmail: (token: string) =>
    request<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  getProfile: (token: string) =>
    request<UserProfile>('/auth/profile', {}, token),
  updateProfile: (data: Partial<UserProfile>, token: string) =>
    request<UserProfile>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }, token),
  changePassword: (currentPassword: string, newPassword: string, token: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }, token),
};

// ─── Movies ───────────────────────────────────────────────────────────────────
export interface MovieQueryParams {
  status?: string;
  genre?: string;
  language?: string;
  format?: string;
  minRating?: number;
  city?: string;
  date?: string;
  search?: string;
  sort?: string;
  order?: string;
  page?: number;
  limit?: number;
}

export const moviesApi = {
  list: (params?: MovieQueryParams) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '' && v !== 'All' && v !== 'All Cities') {
          query.set(k, String(v));
        }
      });
    }
    const qs = query.toString();
    return request<{
      movies: ApiMovie[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/movies${qs ? `?${qs}` : ''}`);
  },
  get: (idOrSlug: string, city?: string) => {
    const qs = city && city !== 'All Cities' ? `?city=${encodeURIComponent(city)}` : '';
    return request<MovieDetailResponse>(`/movies/${idOrSlug}${qs}`);
  },
  suggestions: (q: string) =>
    request<{ suggestions: SearchSuggestion[] }>(`/movies/suggestions?q=${encodeURIComponent(q)}`),
  filters: (city?: string) => {
    const qs = city && city !== 'All Cities' ? `?city=${encodeURIComponent(city)}` : '';
    return request<MovieFilterOptions>(`/movies/filters${qs}`);
  },
  attribution: () => request<ProviderAttribution>('/movies/provider-attribution'),
  addReview: (idOrSlug: string, rating: number, comment: string, token: string) =>
    request<{ message: string; review: unknown }>(
      `/movies/${idOrSlug}/reviews`,
      {
        method: 'POST',
        body: JSON.stringify({ rating, comment }),
      },
      token,
    ),
};

// ─── Events ───────────────────────────────────────────────────────────────────
export const eventsApi = {
  list: () => request<ApiEvent[]>('/events'),
  get: (id: number) => request<ApiEvent>(`/events/${id}`),
  shows: (id: number) => request<Show[]>(`/events/${id}/shows`),
};

// ─── Cinemas ──────────────────────────────────────────────────────────────────
export const cinemasApi = {
  list: (params?: { city?: string; format?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.city && params.city !== 'All Cities' && params.city !== 'All') q.set('city', params.city);
    if (params?.format && params.format !== 'All Formats' && params.format !== 'All') q.set('format', params.format);
    if (params?.search) q.set('search', params.search);
    const qs = q.toString();
    return request<Theatre[]>(`/cinemas${qs ? `?${qs}` : ''}`);
  },
  get: (id: number) => request<Theatre & { upcomingShows: Show[] }>(`/cinemas/${id}`),
  screens: (id: number) =>
    request<Array<{ id: number; name: string; screenType: string; totalSeats: number }>>(
      `/cinemas/${id}/screens`,
    ),
};

// ─── Shows ────────────────────────────────────────────────────────────────────
export const showsApi = {
  list: (params?: {
    movieId?: number;
    theatreId?: number;
    city?: string;
    date?: string;
    format?: string;
    language?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.movieId) q.set('movieId', String(params.movieId));
    if (params?.theatreId) q.set('theatreId', String(params.theatreId));
    if (params?.city && params.city !== 'All Cities' && params.city !== 'All') q.set('city', params.city);
    if (params?.date) q.set('date', params.date);
    if (params?.format && params.format !== 'All Formats') q.set('format', params.format);
    if (params?.language && params.language !== 'All Languages') q.set('language', params.language);
    const qs = q.toString();
    return request<Show[]>(`/shows${qs ? `?${qs}` : ''}`);
  },

  seats: (showId: number, token?: string | null) =>
    request<ShowSeatsResponse>(`/shows/${showId}/seats`, {}, token),

  lockSeats: (showId: number, seatIds: number[], token: string) =>
    request<LockSeatsResponse>(
      `/shows/${showId}/lock-seats`,
      { method: 'POST', body: JSON.stringify({ seat_ids: seatIds }) },
      token,
    ),

  releaseSeats: (showId: number, lockToken: string, seatIds?: number[], token?: string | null) =>
    request<{ released: number }>(
      `/shows/${showId}/release-seats`,
      { method: 'POST', body: JSON.stringify({ lock_token: lockToken, seat_ids: seatIds }) },
      token,
    ),

  subscribeEvents: (showId: number, onEvent: (data: any) => void): (() => void) => {
    const es = new EventSource(`/api/shows/${showId}/seat-events`);
    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onEvent(parsed);
      } catch {
        // ignore heartbeat or invalid json
      }
    };
    return () => es.close();
  },
};

// ─── Food & Beverages ───────────────────────────────────────────────────────
export const foodApi = {
  list: (theatreId?: number) =>
    request<FoodItem[]>(`/food-items${theatreId ? `?theatreId=${theatreId}` : ''}`),
};

// ─── Coupons & Offers ─────────────────────────────────────────────────────────
export const couponApi = {
  list: () => request<Coupon[]>('/coupons'),
  validate: (code: string, orderAmount: number, token?: string | null) =>
    request<CouponValidationResult>(
      '/coupons/validate',
      { method: 'POST', body: JSON.stringify({ code, orderAmount }) },
      token,
    ),
};

// ─── Checkout & Order Summary ─────────────────────────────────────────────────
export const checkoutApi = {
  getSummary: (
    data: {
      showId: number;
      seatIds: number[];
      foodItems?: Array<{ foodItemId: number; quantity: number }>;
      couponCode?: string;
    },
    token?: string | null,
  ) =>
    request<OrderSummaryResponse>(
      '/checkout/summary',
      { method: 'POST', body: JSON.stringify(data) },
      token,
    ),
};

// ─── Payment Gateway (Razorpay Sandbox) ───────────────────────────────────────
export const paymentApi = {
  createOrder: (
    data: {
      showId: number;
      seatIds: number[];
      lockToken?: string;
      foodItems?: Array<{ foodItemId: number; quantity: number }>;
      couponCode?: string;
    },
    token: string,
  ) =>
    request<PaymentOrderResponse>(
      '/payments/create-order',
      { method: 'POST', body: JSON.stringify(data) },
      token,
    ),

  verify: (
    data: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
    token: string,
  ) =>
    request<{
      message: string;
      bookingId: number;
      bookingRef: string;
      tickets: Array<{ id: number; ticketRef: string; seatNumber: string; qrCode: string }>;
      status: string;
    }>(
      '/payments/verify',
      { method: 'POST', body: JSON.stringify(data) },
      token,
    ),
};

// ─── Digital Tickets & QR Verification ────────────────────────────────────────
export const ticketsApi = {
  verify: (token: string) =>
    request<VerifiedTicketResult>('/tickets/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  getBookingTickets: (bookingId: number, token: string) =>
    request<BookingDetailsResponse>(`/tickets/booking/${bookingId}`, {}, token),
};

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const bookingsApi = {
  create: (showId: number, seatIds: number[], token: string, lockToken?: string) =>
    request<{
      message: string;
      booking_id: number;
      booking_ref?: string;
      total_price?: number;
      tickets?: Array<{ id: number; seat_number: string; qr_code: string }>;
    }>(
      '/bookings',
      {
        method: 'POST',
        body: JSON.stringify({ show_id: showId, seat_ids: seatIds, lock_token: lockToken }),
      },
      token,
    ),
  list: (token: string, filter?: 'upcoming' | 'past' | 'all') =>
    request<UserBookingItem[]>(`/bookings${filter ? `?filter=${filter}` : ''}`, {}, token),
  get: (id: number, token: string) => request<UserBookingItem>(`/bookings/${id}`, {}, token),
  cancel: (id: number, reason: string | undefined, token: string) =>
    request<{
      message: string;
      bookingId: number;
      bookingRef: string;
      refundAmount: number;
      refundId: string;
      status: string;
      seatsReleased: string[];
    }>(
      `/bookings/${id}/cancel`,
      { method: 'POST', body: JSON.stringify({ reason }) },
      token,
    ),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminApi = {
  stats: (token: string) => request<AdminStats>('/admin/stats', {}, token),
  events: (token: string) => request<AdminEvent[]>('/admin/events', {}, token),
  theatres: (token: string) => request<AdminTheatre[]>('/admin/theatres', {}, token),
  createEvent: (
    body: {
      title: string;
      location: string;
      date: string;
      price: number;
      category?: string;
      image?: string;
      banner?: string;
      trailer?: string;
      description?: string;
    },
    token: string,
  ) =>
    request<{ message: string; id: number }>(
      '/events',
      { method: 'POST', body: JSON.stringify(body) },
      token,
    ),
  deleteEvent: (id: number, token: string) =>
    request<{ message: string }>(`/events/${id}`, { method: 'DELETE' }, token),

  // Movie content management
  movies: (params: { search?: string; status?: string; page?: number; limit?: number }, token: string) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.status && params.status !== 'All') query.set('status', params.status);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return request<{ movies: ApiMovie[]; total: number; page: number; limit: number }>(
      `/admin/movies${qs ? `?${qs}` : ''}`,
      {},
      token,
    );
  },
  getMovie: (id: number, token: string) => request<ApiMovie>(`/admin/movies/${id}`, {}, token),
  createMovie: (data: Partial<ApiMovie>, token: string) =>
    request<{ message: string; movie: ApiMovie }>(
      '/admin/movies',
      { method: 'POST', body: JSON.stringify(data) },
      token,
    ),
  updateMovie: (id: number, data: Partial<ApiMovie>, token: string) =>
    request<{ message: string; movie: ApiMovie }>(
      `/admin/movies/${id}`,
      { method: 'PUT', body: JSON.stringify(data) },
      token,
    ),
  updateMovieStatus: (id: number, status: string, token: string) =>
    request<{ message: string; movie: ApiMovie }>(
      `/admin/movies/${id}/status`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
      token,
    ),
  archiveMovie: (id: number, token: string) =>
    request<{ message: string }>(`/admin/movies/${id}`, { method: 'DELETE' }, token),
  deleteMoviePermanent: (id: number, token: string) =>
    request<{ message: string }>(`/admin/movies/${id}/permanent`, { method: 'DELETE' }, token),
  searchProvider: (q: string, token: string) =>
    request<{ results: Array<{ externalId: number; title: string; overview: string; posterUrl: string; releaseDate: string; rating: number }> }>(
      `/admin/movies/provider/search?q=${encodeURIComponent(q)}`,
      {},
      token,
    ),
  importProvider: (tmdbId: number, token: string) =>
    request<{ message: string; movie: ApiMovie }>(
      '/admin/movies/provider/import',
      { method: 'POST', body: JSON.stringify({ tmdbId }) },
      token,
    ),

  // ─── Analytics, RBAC, Bookings, Audit & Support ─────────────────────────
  analytics: (token: string) => request<AdminAnalyticsReport>('/admin/analytics', {}, token),

  bookings: (params?: { search?: string; status?: string; limit?: number }, token?: string) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status && params.status !== 'All') q.set('status', params.status);
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return request<AdminBookingItem[]>(`/admin/bookings${qs ? `?${qs}` : ''}`, {}, token);
  },
  getBooking: (id: number, token: string) => request<any>(`/admin/bookings/${id}`, {}, token),
  refundBooking: (id: number, reason: string | undefined, token: string) =>
    request<{ message: string; refundId: string; refundAmount: number }>(
      `/admin/bookings/${id}/refund`,
      { method: 'POST', body: JSON.stringify({ reason }) },
      token,
    ),

  users: (params?: { search?: string; role?: string }, token?: string) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.role && params.role !== 'All') q.set('role', params.role);
    const qs = q.toString();
    return request<AdminUserItem[]>(`/admin/users${qs ? `?${qs}` : ''}`, {}, token);
  },
  updateUserRole: (id: number, role: string, token: string) =>
    request<{ message: string; user: AdminUserItem }>(
      `/admin/users/${id}/role`,
      { method: 'PATCH', body: JSON.stringify({ role }) },
      token,
    ),
  toggleUserStatus: (id: number, token: string) =>
    request<{ message: string; user: AdminUserItem }>(
      `/admin/users/${id}/status`,
      { method: 'PATCH' },
      token,
    ),

  coupons: (token: string) => request<any[]>('/admin/coupons', {}, token),
  createCoupon: (data: any, token: string) =>
    request<any>('/admin/coupons', { method: 'POST', body: JSON.stringify(data) }, token),
  toggleCoupon: (id: number, token: string) =>
    request<any>(`/admin/coupons/${id}/toggle`, { method: 'PATCH' }, token),

  food: (token: string) => request<FoodItem[]>('/admin/food', {}, token),
  createFood: (data: any, token: string) =>
    request<FoodItem>('/admin/food', { method: 'POST', body: JSON.stringify(data) }, token),
  toggleFood: (id: number, token: string) =>
    request<FoodItem>(`/admin/food/${id}/toggle`, { method: 'PATCH' }, token),

  refunds: (token: string) => request<any[]>('/admin/refunds', {}, token),

  auditLogs: (
    params?: { action?: string; resourceType?: string; actorEmail?: string; limit?: number; offset?: number },
    token?: string,
  ) => {
    const q = new URLSearchParams();
    if (params?.action && params.action !== 'All') q.set('action', params.action);
    if (params?.resourceType && params.resourceType !== 'All') q.set('resourceType', params.resourceType);
    if (params?.actorEmail) q.set('actorEmail', params.actorEmail);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    const qs = q.toString();
    return request<{ logs: AuditLogItem[]; total: number }>(
      `/admin/audit-logs${qs ? `?${qs}` : ''}`,
      {},
      token,
    );
  },

  supportTickets: (
    params?: { status?: string; category?: string; priority?: string },
    token?: string,
  ) => {
    const q = new URLSearchParams();
    if (params?.status && params.status !== 'All') q.set('status', params.status);
    if (params?.category && params.category !== 'All') q.set('category', params.category);
    if (params?.priority && params.priority !== 'All') q.set('priority', params.priority);
    const qs = q.toString();
    return request<SupportTicketItem[]>(`/admin/support/tickets${qs ? `?${qs}` : ''}`, {}, token);
  },
  respondSupportTicket: (
    id: number,
    data: { status?: string; priority?: string; responseMessage?: string },
    token: string,
  ) =>
    request<SupportTicketItem>(
      `/admin/support/tickets/${id}`,
      { method: 'PATCH', body: JSON.stringify(data) },
      token,
    ),
};

// ─── Customer Support ─────────────────────────────────────────────────────────
export const supportApi = {
  createTicket: (
    data: { bookingId?: number; subject: string; message: string; category?: string; priority?: string },
    token: string,
  ) =>
    request<SupportTicketItem>(
      '/support/tickets',
      { method: 'POST', body: JSON.stringify(data) },
      token,
    ),
  getMyTickets: (token: string) =>
    request<SupportTicketItem[]>('/support/tickets', {}, token),
};

// ─── AI Services ─────────────────────────────────────────────────────────────
export const aiApi = {
  getRecommendations: (city?: string, limit: number = 8, token?: string | null) => {
    const q = new URLSearchParams();
    if (city && city !== 'All') q.set('city', city);
    if (limit) q.set('limit', String(limit));
    const qs = q.toString();
    return request<RecommendationResult>(`/ai/recommendations${qs ? `?${qs}` : ''}`, {}, token);
  },
  discover: (query: string, city?: string) => {
    const q = new URLSearchParams({ q: query });
    if (city && city !== 'All') q.set('city', city);
    return request<DiscoveryResult>(`/ai/discover?${q.toString()}`);
  },
  askAssistant: (question: string, history: AssistantMessage[] = []) =>
    request<AssistantResponse>('/ai/assistant', {
      method: 'POST',
      body: JSON.stringify({ question, history }),
    }),
  getQuickPrompts: () => request<{ prompts: string[] }>('/ai/quick-prompts'),
};

// ─── Health & Observability ───────────────────────────────────────────────────
export const healthApi = {
  health: () => request<HealthStatus>('/health'),
  ready: () => request<HealthStatus>('/ready'),
  metrics: () => request<any>('/health/metrics'),
};
