import type { ApiEvent, Show, Seat, Booking, AdminStats, AdminEvent, AdminTheatre, User } from '../types';

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
  register: (name: string, email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
};

// ─── Events ───────────────────────────────────────────────────────────────────
export const eventsApi = {
  list: () => request<ApiEvent[]>('/events'),
  get: (id: number) => request<ApiEvent>(`/events/${id}`),
  shows: (id: number) => request<Show[]>(`/events/${id}/shows`),
};

// ─── Shows ────────────────────────────────────────────────────────────────────
export const showsApi = {
  seats: (showId: number) => request<Seat[]>(`/shows/${showId}/seats`),
};

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const bookingsApi = {
  create: (showId: number, seatIds: number[], token: string) =>
    request<{ message: string; booking_id: number }>(
      '/bookings',
      { method: 'POST', body: JSON.stringify({ show_id: showId, seat_ids: seatIds }) },
      token,
    ),
  list: (token: string) => request<Booking[]>('/bookings', {}, token),
  get: (id: number, token: string) => request<Booking>(`/bookings/${id}`, {}, token),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminApi = {
  stats: (token: string) => request<AdminStats>('/admin/stats', {}, token),
  events: (token: string) => request<AdminEvent[]>('/admin/events', {}, token),
  theatres: (token: string) => request<AdminTheatre[]>('/admin/theatres', {}, token),
  createEvent: (
    body: { title: string; location: string; date: string; price: number; category?: string; image?: string; description?: string },
    token: string,
  ) =>
    request<{ message: string; id: number }>(
      '/events',
      { method: 'POST', body: JSON.stringify(body) },
      token,
    ),
  deleteEvent: (id: number, token: string) =>
    request<{ message: string }>(`/events/${id}`, { method: 'DELETE' }, token),
};
