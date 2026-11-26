import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Ticket,
  DollarSign,
  Plus,
  AlertTriangle,
  Film,
  Download,
  Search,
  Edit2,
  Archive,
  Star,
  Users,
  ShieldCheck,
  ShoppingBag,
  Percent,
  LifeBuoy,
  History,
  Building2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import type {
  AdminStats,
  ApiMovie,
  AdminAnalyticsReport,
  AdminBookingItem,
  AdminUserItem,
  AuditLogItem,
  SupportTicketItem,
  FoodItem,
  Theatre,
} from '../types';
import { adminApi, cinemasApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';

function StatCard({
  icon,
  label,
  value,
  sublabel,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  color: string;
}) {
  return (
    <div className="bg-[#0F1118] rounded-2xl border border-white/10 p-5 shadow-lg flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate">{label}</p>
        <p className="text-2xl sm:text-3xl font-black text-white mt-0.5">{value}</p>
        {sublabel && <p className="text-[11px] text-slate-400 mt-1">{sublabel}</p>}
      </div>
    </div>
  );
}

export function AdminPage() {
  const { token, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<
    'analytics' | 'movies' | 'cinemas' | 'bookings' | 'users' | 'coupons' | 'food' | 'support' | 'audit'
  >('analytics');

  const [loading, setLoading] = useState(true);

  // Analytics & Stats
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalyticsReport | null>(null);

  // Movies
  const [moviesList, setMoviesList] = useState<ApiMovie[]>([]);
  const [movieSearch, setMovieSearch] = useState('');
  const [movieStatusFilter, setMovieStatusFilter] = useState('All');
  const [showMovieCreate, setShowMovieCreate] = useState(false);
  const [editingMovie, setEditingMovie] = useState<ApiMovie | null>(null);
  const [showTmdbImport, setShowTmdbImport] = useState(false);
  const [tmdbQuery, setTmdbQuery] = useState('');
  const [tmdbResults, setTmdbResults] = useState<
    Array<{
      externalId: number;
      title: string;
      overview: string;
      posterUrl: string;
      releaseDate: string;
      rating: number;
    }>
  >([]);
  const [searchingTmdb, setSearchingTmdb] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);

  const [movieForm, setMovieForm] = useState({
    title: '',
    slug: '',
    description: '',
    poster: '',
    backdrop: '',
    trailerUrl: '',
    genre: 'Action',
    language: 'Hindi',
    duration: '2h 15m',
    releaseDate: new Date().toISOString().slice(0, 10),
    certification: 'UA',
    status: 'now_showing' as 'now_showing' | 'coming_soon' | 'archived',
    rating: 4.5,
  });

  // Cinemas
  const [cinemas, setCinemas] = useState<Theatre[]>([]);

  // Bookings
  const [bookingsList, setBookingsList] = useState<AdminBookingItem[]>([]);
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('All');

  // Users & RBAC
  const [usersList, setUsersList] = useState<AdminUserItem[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');

  // Coupons
  const [couponsList, setCouponsList] = useState<any[]>([]);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountPercent: 15,
    discountAmount: 100,
    minAmount: 300,
    maxDiscount: 200,
    usageLimit: 500,
    perUserLimit: 2,
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  });

  // Food / Concessions
  const [foodList, setFoodList] = useState<FoodItem[]>([]);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [foodForm, setFoodForm] = useState({
    name: '',
    description: '',
    price: 150,
    category: 'Popcorn',
    imageUrl: '',
    isVegetarian: true,
  });

  // Support Tickets
  const [supportTickets, setSupportTickets] = useState<SupportTicketItem[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketItem | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyStatus, setReplyStatus] = useState<'open' | 'in_progress' | 'resolved' | 'closed'>('resolved');
  const [replying, setReplying] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditActionFilter, setAuditActionFilter] = useState('All');

  const loadData = async () => {
    if (!token || !isAdmin) return;
    setLoading(true);
    try {
      const [s, an, mRes] = await Promise.all([
        adminApi.stats(token).catch(() => null),
        adminApi.analytics(token).catch(() => null),
        adminApi.movies({ search: movieSearch, status: movieStatusFilter }, token).catch(() => ({ movies: [] })),
      ]);
      if (s) setStats(s);
      if (an) setAnalytics(an);
      if (mRes) setMoviesList(mRes.movies || []);
    } catch {
      toast('Failed to load admin dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, isAdmin, movieSearch, movieStatusFilter]);

  // Lazy tab data loaders
  useEffect(() => {
    if (!token) return;
    if (activeTab === 'cinemas') {
      cinemasApi.list().then(setCinemas).catch(() => {});
    } else if (activeTab === 'bookings') {
      adminApi.bookings({ search: bookingSearch, status: bookingStatusFilter }, token).then(setBookingsList).catch(() => {});
    } else if (activeTab === 'users') {
      adminApi.users({ search: userSearch, role: userRoleFilter }, token).then(setUsersList).catch(() => {});
    } else if (activeTab === 'coupons') {
      adminApi.coupons(token).then(setCouponsList).catch(() => {});
    } else if (activeTab === 'food') {
      adminApi.food(token).then(setFoodList).catch(() => {});
    } else if (activeTab === 'support') {
      adminApi.supportTickets({}, token).then(setSupportTickets).catch(() => {});
    } else if (activeTab === 'audit') {
      adminApi.auditLogs({ action: auditActionFilter }, token).then((res) => setAuditLogs(res.logs || [])).catch(() => {});
    }
  }, [activeTab, token, bookingSearch, bookingStatusFilter, userSearch, userRoleFilter, auditActionFilter]);

  if (!token) return <Navigate to="/login" replace />;

  if (token && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#08090D] flex items-center justify-center p-4">
        <div className="text-center max-w-sm p-8 bg-[#0F1118] rounded-2xl border border-white/10 shadow-2xl">
          <AlertTriangle size={40} className="mx-auto text-amber-400 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-sm text-slate-400 mb-6">
            Your account does not have administrator privileges.
          </p>
          <Button variant="primary" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // ─── Movie Handlers ────────────────────────────────────────────────────────
  const handleSaveMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      if (editingMovie) {
        await adminApi.updateMovie(editingMovie.id, movieForm, token);
        toast('Movie updated successfully', 'success');
      } else {
        await adminApi.createMovie(movieForm, token);
        toast('Movie created successfully', 'success');
      }
      setShowMovieCreate(false);
      setEditingMovie(null);
      loadData();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to save movie', 'error');
    }
  };

  const handleToggleStatus = async (movie: ApiMovie) => {
    if (!token) return;
    const nextStatus =
      movie.status === 'now_showing'
        ? 'coming_soon'
        : movie.status === 'coming_soon'
        ? 'archived'
        : 'now_showing';
    try {
      await adminApi.updateMovieStatus(movie.id, nextStatus, token);
      toast(`Status changed to ${nextStatus}`, 'success');
      loadData();
    } catch {
      toast('Failed to update status', 'error');
    }
  };

  const handleArchiveMovie = async (id: number) => {
    if (!token) return;
    try {
      await adminApi.archiveMovie(id, token);
      toast('Movie archived', 'success');
      loadData();
    } catch {
      toast('Failed to archive movie', 'error');
    }
  };

  const handleSearchTmdb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmdbQuery.trim() || !token) return;
    setSearchingTmdb(true);
    try {
      const res = await adminApi.searchProvider(tmdbQuery, token);
      setTmdbResults(res.results || []);
    } catch {
      toast('Provider search failed', 'error');
    } finally {
      setSearchingTmdb(false);
    }
  };

  const handleImportMovie = async (tmdbId: number) => {
    if (!token) return;
    setImportingId(tmdbId);
    try {
      await adminApi.importProvider(tmdbId, token);
      toast('Movie imported successfully into catalog!', 'success');
      setShowTmdbImport(false);
      loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Import failed', 'error');
    } finally {
      setImportingId(null);
    }
  };

  // ─── Booking Cancellation / Refund ─────────────────────────────────────────
  const handleAdminRefundBooking = async (bId: number) => {
    if (!token) return;
    const reason = window.prompt('Enter reason for administrative refund:', 'Customer support resolution');
    if (!reason) return;
    try {
      const res = await adminApi.refundBooking(bId, reason, token);
      toast(`Booking refunded! Refund Ref: ${res.refundId} (₹${res.refundAmount})`, 'success');
      adminApi.bookings({ search: bookingSearch, status: bookingStatusFilter }, token).then(setBookingsList);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Refund failed', 'error');
    }
  };

  // ─── RBAC Handlers ─────────────────────────────────────────────────────────
  const handleUpdateRole = async (userId: number, newRole: string) => {
    if (!token) return;
    try {
      await adminApi.updateUserRole(userId, newRole, token);
      toast(`User role updated to ${newRole}`, 'success');
      adminApi.users({ search: userSearch, role: userRoleFilter }, token).then(setUsersList);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Role update failed', 'error');
    }
  };

  const handleToggleUserStatus = async (userId: number) => {
    if (!token) return;
    try {
      const res = await adminApi.toggleUserStatus(userId, token);
      toast(res.message, 'success');
      adminApi.users({ search: userSearch, role: userRoleFilter }, token).then(setUsersList);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Status update failed', 'error');
    }
  };

  // ─── Coupon Handlers ───────────────────────────────────────────────────────
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await adminApi.createCoupon(couponForm, token);
      toast('Coupon created successfully', 'success');
      setShowCouponModal(false);
      adminApi.coupons(token).then(setCouponsList);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to create coupon', 'error');
    }
  };

  const handleToggleCoupon = async (cId: number) => {
    if (!token) return;
    try {
      await adminApi.toggleCoupon(cId, token);
      toast('Coupon status updated', 'success');
      adminApi.coupons(token).then(setCouponsList);
    } catch {
      toast('Failed to toggle coupon', 'error');
    }
  };

  // ─── Food Handlers ─────────────────────────────────────────────────────────
  const handleCreateFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await adminApi.createFood(foodForm, token);
      toast('Concession item added to catalog', 'success');
      setShowFoodModal(false);
      adminApi.food(token).then(setFoodList);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to add item', 'error');
    }
  };

  const handleToggleFood = async (fId: number) => {
    if (!token) return;
    try {
      await adminApi.toggleFood(fId, token);
      toast('Item availability toggled', 'success');
      adminApi.food(token).then(setFoodList);
    } catch {
      toast('Failed to toggle food item', 'error');
    }
  };

  // ─── Support Ticket Reply ──────────────────────────────────────────────────
  const handleReplyTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !token || !replyMessage.trim()) return;
    setReplying(true);
    try {
      await adminApi.respondSupportTicket(
        selectedTicket.id,
        {
          status: replyStatus,
          responseMessage: replyMessage.trim(),
        },
        token,
      );
      toast('Response delivered to customer ticket!', 'success');
      setSelectedTicket(null);
      setReplyMessage('');
      adminApi.supportTickets({}, token).then(setSupportTickets);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Reply failed', 'error');
    } finally {
      setReplying(false);
    }
  };

  const inputCls =
    'w-full rounded-xl border border-white/10 bg-[#161925] px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#F84464] focus:ring-1 focus:ring-[#F84464] transition-all';

  return (
    <div className="min-h-screen bg-[#08090D] text-slate-100 py-8 pt-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#F84464]">
                BookMyTix Administrative Operations
              </span>
              <span className="text-white/20">&bull;</span>
              <span className="text-[10px] font-semibold text-emerald-400">Live Production Database</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
              Command &amp; Control Center
            </h1>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowTmdbImport(true)}
              leftIcon={<Download size={14} />}
            >
              Import TMDB Movie
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingMovie(null);
                setMovieForm({
                  title: '',
                  slug: '',
                  description: '',
                  poster: '',
                  backdrop: '',
                  trailerUrl: '',
                  genre: 'Action',
                  language: 'Hindi',
                  duration: '2h 15m',
                  releaseDate: new Date().toISOString().slice(0, 10),
                  certification: 'UA',
                  status: 'now_showing',
                  rating: 4.5,
                });
                setShowMovieCreate(true);
              }}
              leftIcon={<Plus size={14} />}
            >
              Add Movie
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 border-b border-white/[0.08] pb-1 overflow-x-auto">
          {[
            { id: 'analytics', label: 'Overview & Analytics', icon: BarChart3 },
            { id: 'movies', label: `Movies (${moviesList.length})`, icon: Film },
            { id: 'cinemas', label: 'Cinemas & Screens', icon: Building2 },
            { id: 'bookings', label: 'Bookings & Refunds', icon: Ticket },
            { id: 'users', label: 'Users & RBAC', icon: Users },
            { id: 'coupons', label: 'Coupons & Offers', icon: Percent },
            { id: 'food', label: 'Concessions / F&B', icon: ShoppingBag },
            { id: 'support', label: 'Support Desk', icon: LifeBuoy },
            { id: 'audit', label: 'Audit Logs', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
                  active
                    ? 'bg-[#F84464] text-white shadow-lg shadow-[#F84464]/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* ─── TAB 1: OVERVIEW & REAL DB ANALYTICS ────────────────────────────── */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<DollarSign size={24} className="text-emerald-400" />}
                label="Gross Revenue"
                value={`₹${analytics?.overview?.totalRevenue?.toLocaleString('en-IN') || stats?.revenue || 0}`}
                sublabel="Real settled payments"
                color="bg-emerald-500/10 border border-emerald-500/20"
              />
              <StatCard
                icon={<Ticket size={24} className="text-[#F84464]" />}
                label="Total Bookings"
                value={String(analytics?.overview?.totalBookings || stats?.bookings || 0)}
                sublabel={`${analytics?.overview?.confirmedBookings || 0} confirmed reservations`}
                color="bg-[#F84464]/10 border border-[#F84464]/20"
              />
              <StatCard
                icon={<TrendingUp size={24} className="text-amber-400" />}
                label="Auditorium Occupancy"
                value={`${analytics?.overview?.occupancyRate || 0}%`}
                sublabel="Calculated across all show seats"
                color="bg-amber-500/10 border border-amber-500/20"
              />
              <StatCard
                icon={<Users size={24} className="text-indigo-400" />}
                label="Registered Users"
                value={String(usersList?.length || 0)}
                sublabel="Active platform accounts"
                color="bg-indigo-500/10 border border-indigo-500/20"
              />
            </div>

            {/* Popular Movies & Cinemas Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top Performing Movies */}
              <div className="rounded-3xl border border-white/10 bg-[#0F1118] p-6 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Film size={18} className="text-[#F84464]" /> Top Grossing Movies
                </h3>
                {analytics?.popularMovies && analytics.popularMovies.length > 0 ? (
                  <div className="divide-y divide-white/[0.06]">
                    {analytics.popularMovies.map((m, idx) => (
                      <div key={m.id} className="py-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-white text-sm">{m.title}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-emerald-400">₹{m.revenue.toLocaleString('en-IN')}</p>
                          <p className="text-[10px] text-slate-500">{m.ticketsSold} tickets sold</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">No movie booking metrics recorded yet</p>
                )}
              </div>

              {/* Top Multiplexes */}
              <div className="rounded-3xl border border-white/10 bg-[#0F1118] p-6 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 size={18} className="text-indigo-400" /> Top Theatres by Volume
                </h3>
                {analytics?.popularCinemas && analytics.popularCinemas.length > 0 ? (
                  <div className="divide-y divide-white/[0.06]">
                    {analytics.popularCinemas.map((c, idx) => (
                      <div key={c.id} className="py-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-white/10 text-white font-bold flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-white text-sm">{c.name}</p>
                            <p className="text-[10px] text-slate-500">{c.city}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-white">{c.ticketsSold} tickets</p>
                          <p className="text-[10px] text-emerald-400 font-bold">
                            ₹{c.revenue.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">No cinema metrics recorded yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: MOVIE CATALOG MANAGEMENT ───────────────────────────────── */}
        {activeTab === 'movies' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0F1118] border border-white/10">
              <div className="flex items-center bg-[#161925] border border-white/10 rounded-xl px-3 py-2 w-full sm:w-80">
                <Search size={15} className="text-slate-400 shrink-0" />
                <input
                  type="search"
                  placeholder="Filter movies by title, genre..."
                  value={movieSearch}
                  onChange={(e) => setMovieSearch(e.target.value)}
                  className="bg-transparent border-none outline-none ml-2 text-xs sm:text-sm text-white placeholder-slate-500 w-full"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Status:</span>
                {['All', 'now_showing', 'coming_soon', 'archived'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setMovieStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      movieStatusFilter === st
                        ? 'bg-white text-black font-extrabold'
                        : 'bg-[#161925] text-slate-400 hover:text-white'
                    }`}
                  >
                    {st === 'All' ? 'All' : st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#0F1118] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : moviesList.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-sm">
                  <Film size={36} className="mx-auto text-slate-600 mb-3" />
                  <p>No movies found. Add a movie or import from TMDB!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#0A0C13] text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/[0.08]">
                      <tr>
                        <th className="px-6 py-3.5">Poster &amp; Title</th>
                        <th className="px-6 py-3.5">Genre &amp; Lang</th>
                        <th className="px-6 py-3.5">Duration</th>
                        <th className="px-6 py-3.5">Rating</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {moviesList.map((m) => (
                        <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={m.poster}
                                alt=""
                                className="w-10 aspect-[2/3] object-cover rounded-md bg-slate-800 shrink-0 border border-white/10"
                              />
                              <div>
                                <p className="font-bold text-white text-sm leading-snug">{m.title}</p>
                                <p className="text-xs text-slate-500 font-mono">/{m.slug}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-300">
                            <span className="font-semibold text-white">{m.genre}</span> &bull; {m.language}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400 font-mono">{m.duration}</td>
                          <td className="px-6 py-4 text-xs">
                            <div className="flex items-center gap-1 text-amber-400 font-bold">
                              <Star size={12} fill="#F59E0B" />
                              <span>{Number(m.rating).toFixed(1)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleToggleStatus(m)}
                              title="Click to cycle status"
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                                m.status === 'now_showing'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : m.status === 'coming_soon'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {m.status.replace('_', ' ')}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingMovie(m);
                                  setMovieForm({
                                    title: m.title,
                                    slug: m.slug,
                                    description: m.description,
                                    poster: m.poster,
                                    backdrop: m.backdrop || '',
                                    trailerUrl: m.trailerUrl || '',
                                    genre: m.genre,
                                    language: m.language,
                                    duration: m.duration,
                                    releaseDate: m.releaseDate ? m.releaseDate.slice(0, 10) : '',
                                    certification: m.certification,
                                    status: m.status as any,
                                    rating: Number(m.rating) || 4.5,
                                  });
                                  setShowMovieCreate(true);
                                }}
                                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleArchiveMovie(m.id)}
                                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              >
                                <Archive size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 3: CINEMAS & SCREENS ───────────────────────────────────────── */}
        {activeTab === 'cinemas' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cinemas.map((c) => (
              <div
                key={c.id}
                className="rounded-3xl border border-white/10 bg-[#0F1118] p-6 space-y-4 shadow-xl"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#F84464]">
                      {c.city} Multiplex
                    </span>
                    <h3 className="text-base font-black text-white mt-0.5">{c.name}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Active
                  </span>
                </div>
                <p className="text-xs text-slate-400">{c.address || c.location}</p>
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/[0.08]">
                  {c.formats?.map((f) => (
                    <span
                      key={f}
                      className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── TAB 4: BOOKINGS & REFUNDS ──────────────────────────────────────── */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0F1118] border border-white/10">
              <div className="flex items-center bg-[#161925] border border-white/10 rounded-xl px-3 py-2 w-full sm:w-80">
                <Search size={15} className="text-slate-400 shrink-0" />
                <input
                  type="search"
                  placeholder="Search booking ref, user, movie..."
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                  className="bg-transparent border-none outline-none ml-2 text-xs sm:text-sm text-white placeholder-slate-500 w-full"
                />
              </div>

              <div className="flex items-center gap-2">
                {['All', 'confirmed', 'cancelled', 'refunded'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setBookingStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      bookingStatusFilter === st
                        ? 'bg-white text-black font-extrabold'
                        : 'bg-[#161925] text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#0F1118] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#0A0C13] text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/[0.08]">
                    <tr>
                      <th className="px-6 py-3.5">Booking Ref</th>
                      <th className="px-6 py-3.5">Customer</th>
                      <th className="px-6 py-3.5">Movie &amp; Cinema</th>
                      <th className="px-6 py-3.5">Seats</th>
                      <th className="px-6 py-3.5">Total Paid</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {bookingsList.map((b) => (
                      <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-mono text-xs font-bold text-white">
                          {b.bookingRef}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <p className="font-bold text-white">{b.userName}</p>
                          <p className="text-slate-500">{b.userEmail}</p>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <p className="font-bold text-white">{b.movieTitle}</p>
                          <p className="text-slate-500">{b.theatreName}</p>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-300">
                          {b.theatreCity || 'All Auditoriums'}
                        </td>
                        <td className="px-6 py-4 text-xs font-black text-white">₹{b.totalPrice}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              b.status === 'confirmed'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {b.status === 'confirmed' && (
                            <button
                              onClick={() => handleAdminRefundBooking(b.id)}
                              className="px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-colors"
                            >
                              Refund
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 5: USERS & RBAC ────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="bg-[#0F1118] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#0A0C13] text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/[0.08]">
                    <tr>
                      <th className="px-6 py-3.5">User</th>
                      <th className="px-6 py-3.5">Email</th>
                      <th className="px-6 py-3.5">Current Role</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Change Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-bold text-white">{u.name}</td>
                        <td className="px-6 py-4 text-xs text-slate-400">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/10 text-white">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleUserStatus(u.id)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              u.isActive !== false
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {u.isActive !== false ? 'Active' : 'Deactivated'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                            disabled={u.id === user?.id}
                            className="rounded-lg border border-white/10 bg-[#161925] px-2.5 py-1 text-xs text-white outline-none"
                          >
                            <option value="customer">customer</option>
                            <option value="cinema_manager">cinema_manager</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 6: COUPONS & OFFERS ────────────────────────────────────────── */}
        {activeTab === 'coupons' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Promotional Coupons</h2>
              <button
                onClick={() => setShowCouponModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F84464] text-xs font-bold text-white shadow-lg shadow-[#F84464]/20"
              >
                <Plus size={14} /> Add Coupon
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {couponsList.map((cp) => (
                <div
                  key={cp.id}
                  className="rounded-3xl border border-white/10 bg-[#0F1118] p-6 space-y-4 shadow-xl relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-base font-black text-amber-400">{cp.code}</span>
                      <p className="text-xs text-slate-400 mt-1">{cp.description}</p>
                    </div>
                    <button
                      onClick={() => handleToggleCoupon(cp.id)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        cp.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {cp.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                  <div className="text-xs text-slate-300 pt-2 border-t border-white/[0.08] space-y-1">
                    <p>
                      Discount:{' '}
                      <strong className="text-white">
                        {cp.discountType === 'percentage' ? `${cp.discountPercent}%` : `₹${cp.discountAmount}`}
                      </strong>
                    </p>
                    <p>
                      Min Order: <strong className="text-white">₹{cp.minAmount || 0}</strong>
                    </p>
                    <p>
                      Used: <strong className="text-white">{cp.usedCount || 0}</strong> / {cp.usageLimit || '∞'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 7: CONCESSIONS / F&B ───────────────────────────────────────── */}
        {activeTab === 'food' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Food &amp; Beverage Catalog</h2>
              <button
                onClick={() => setShowFoodModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F84464] text-xs font-bold text-white shadow-lg shadow-[#F84464]/20"
              >
                <Plus size={14} /> Add Item
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {foodList.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-white/10 bg-[#0F1118] p-5 space-y-3 shadow-xl"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500">{item.category}</span>
                      <h3 className="text-sm font-bold text-white">{item.name}</h3>
                    </div>
                    <button
                      onClick={() => handleToggleFood(item.id)}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        item.isAvailable ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {item.isAvailable ? 'In Stock' : 'Out'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">{item.description}</p>
                  <p className="text-base font-black text-amber-400">₹{item.price}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 8: CUSTOMER SUPPORT DESK ───────────────────────────────────── */}
        {activeTab === 'support' && (
          <div className="space-y-6">
            <div className="bg-[#0F1118] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#0A0C13] text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/[0.08]">
                    <tr>
                      <th className="px-6 py-3.5">Ticket Ref</th>
                      <th className="px-6 py-3.5">Customer</th>
                      <th className="px-6 py-3.5">Subject &amp; Category</th>
                      <th className="px-6 py-3.5">Priority</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {supportTickets.map((t) => (
                      <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-mono text-xs font-bold text-[#F84464]">
                          {t.ticketRef}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <p className="font-bold text-white">{t.userName || `User #${t.userId}`}</p>
                          <p className="text-slate-500">{t.userEmail}</p>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <p className="font-bold text-white">{t.subject}</p>
                          <p className="text-slate-500 uppercase text-[10px]">{t.category.replace('_', ' ')}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              t.priority === 'urgent'
                                ? 'bg-rose-500/20 text-rose-400'
                                : t.priority === 'high'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {t.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              t.status === 'resolved'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : t.status === 'in_progress'
                                ? 'bg-indigo-500/20 text-indigo-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {t.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedTicket(t);
                              setReplyStatus(t.status as any);
                              setReplyMessage(t.adminResponse || '');
                            }}
                            className="px-3 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold transition-colors"
                          >
                            Respond
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 9: AUDIT LOGS ──────────────────────────────────────────────── */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="bg-[#0F1118] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#0A0C13] text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/[0.08]">
                    <tr>
                      <th className="px-6 py-3.5">Timestamp</th>
                      <th className="px-6 py-3.5">Actor</th>
                      <th className="px-6 py-3.5">Action</th>
                      <th className="px-6 py-3.5">Resource</th>
                      <th className="px-6 py-3.5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors text-xs">
                        <td className="px-6 py-3.5 text-slate-400 font-mono">
                          {new Date(log.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-3.5 font-bold text-white">{log.actorEmail}</td>
                        <td className="px-6 py-3.5 font-mono text-[#F84464]">{log.action}</td>
                        <td className="px-6 py-3.5 text-slate-300">
                          {log.resourceType} #{log.resourceId}
                        </td>
                        <td className="px-6 py-3.5 text-slate-400 font-mono text-[11px] max-w-xs truncate">
                          {log.details || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: CREATE / EDIT MOVIE ──────────────────────────────────────── */}
      <Modal
        open={showMovieCreate}
        onClose={() => setShowMovieCreate(false)}
        title={editingMovie ? 'Edit Movie Details' : 'Add New Movie to Catalog'}
      >
        <form onSubmit={handleSaveMovie} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Movie Title
            </label>
            <input
              type="text"
              required
              className={inputCls}
              value={movieForm.title}
              onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Genre
              </label>
              <input
                type="text"
                required
                className={inputCls}
                value={movieForm.genre}
                onChange={(e) => setMovieForm({ ...movieForm, genre: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Language
              </label>
              <input
                type="text"
                required
                className={inputCls}
                value={movieForm.language}
                onChange={(e) => setMovieForm({ ...movieForm, language: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Duration
              </label>
              <input
                type="text"
                required
                placeholder="2h 15m"
                className={inputCls}
                value={movieForm.duration}
                onChange={(e) => setMovieForm({ ...movieForm, duration: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Certification
              </label>
              <input
                type="text"
                required
                placeholder="UA"
                className={inputCls}
                value={movieForm.certification}
                onChange={(e) => setMovieForm({ ...movieForm, certification: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Poster URL
            </label>
            <input
              type="url"
              required
              className={inputCls}
              value={movieForm.poster}
              onChange={(e) => setMovieForm({ ...movieForm, poster: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Description / Synopsis
            </label>
            <textarea
              rows={3}
              required
              className={inputCls}
              value={movieForm.description}
              onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" type="button" onClick={() => setShowMovieCreate(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingMovie ? 'Update Movie' : 'Create Movie'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL: TMDB SEARCH & IMPORT ─────────────────────────────────────── */}
      <Modal
        open={showTmdbImport}
        onClose={() => setShowTmdbImport(false)}
        title="Search & Import Verified Metadata"
      >
        <div className="space-y-4">
          <form onSubmit={handleSearchTmdb} className="flex gap-2">
            <input
              type="search"
              placeholder="Movie name (e.g. Inception, Dune)..."
              value={tmdbQuery}
              onChange={(e) => setTmdbQuery(e.target.value)}
              className={inputCls}
            />
            <Button variant="primary" type="submit" loading={searchingTmdb}>
              Search
            </Button>
          </form>

          <div className="max-h-96 overflow-y-auto space-y-3">
            {tmdbResults.map((r) => (
              <div
                key={r.externalId}
                className="flex items-center justify-between gap-4 p-3 rounded-xl border border-white/10 bg-[#161925]"
              >
                <div className="flex items-center gap-3">
                  {r.posterUrl && (
                    <img src={r.posterUrl} alt="" className="w-10 aspect-[2/3] object-cover rounded-md" />
                  )}
                  <div>
                    <p className="font-bold text-white text-sm">{r.title}</p>
                    <p className="text-[11px] text-slate-400">{r.releaseDate} &bull; Rating: {r.rating}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  loading={importingId === r.externalId}
                  onClick={() => handleImportMovie(r.externalId)}
                >
                  Import
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* ─── MODAL: CREATE COUPON ────────────────────────────────────────────── */}
      <Modal
        open={showCouponModal}
        onClose={() => setShowCouponModal(false)}
        title="Create Promotional Coupon"
      >
        <form onSubmit={handleCreateCoupon} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Coupon Code
            </label>
            <input
              type="text"
              required
              placeholder="FLAT100"
              className={inputCls}
              value={couponForm.code}
              onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Description
            </label>
            <input
              type="text"
              required
              placeholder="Flat ₹100 off on tickets"
              className={inputCls}
              value={couponForm.description}
              onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Discount Type
              </label>
              <select
                className={inputCls}
                value={couponForm.discountType}
                onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value as any })}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Value ({couponForm.discountType === 'percentage' ? '%' : '₹'})
              </label>
              <input
                type="number"
                required
                className={inputCls}
                value={couponForm.discountType === 'percentage' ? couponForm.discountPercent : couponForm.discountAmount}
                onChange={(e) =>
                  setCouponForm({
                    ...couponForm,
                    [couponForm.discountType === 'percentage' ? 'discountPercent' : 'discountAmount']: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" type="button" onClick={() => setShowCouponModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Coupon
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL: CREATE CONCESSION ITEM ───────────────────────────────────── */}
      <Modal
        open={showFoodModal}
        onClose={() => setShowFoodModal(false)}
        title="Add Food &amp; Beverage Item"
      >
        <form onSubmit={handleCreateFood} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Item Name
            </label>
            <input
              type="text"
              required
              placeholder="Large Caramel Popcorn"
              className={inputCls}
              value={foodForm.name}
              onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Category
              </label>
              <select
                className={inputCls}
                value={foodForm.category}
                onChange={(e) => setFoodForm({ ...foodForm, category: e.target.value })}
              >
                <option value="Popcorn">Popcorn</option>
                <option value="Drinks">Drinks</option>
                <option value="Snacks">Snacks</option>
                <option value="Combos">Combos</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Price (₹)
              </label>
              <input
                type="number"
                required
                className={inputCls}
                value={foodForm.price}
                onChange={(e) => setFoodForm({ ...foodForm, price: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Description
            </label>
            <input
              type="text"
              placeholder="Freshly popped corn tossed with sweet caramel"
              className={inputCls}
              value={foodForm.description}
              onChange={(e) => setFoodForm({ ...foodForm, description: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="ghost" type="button" onClick={() => setShowFoodModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Item
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL: RESPOND TO SUPPORT TICKET ────────────────────────────────── */}
      <Modal
        open={Boolean(selectedTicket)}
        onClose={() => setSelectedTicket(null)}
        title={`Support Ticket ${selectedTicket?.ticketRef}`}
      >
        {selectedTicket && (
          <form onSubmit={handleReplyTicket} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#161925] border border-white/10 space-y-1 text-xs">
              <p className="font-bold text-white text-sm">{selectedTicket.subject}</p>
              <p className="text-slate-300 whitespace-pre-line">{selectedTicket.message}</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Resolution Status
              </label>
              <select
                className={inputCls}
                value={replyStatus}
                onChange={(e) => setReplyStatus(e.target.value as any)}
              >
                <option value="open">open</option>
                <option value="in_progress">in_progress</option>
                <option value="resolved">resolved</option>
                <option value="closed">closed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Official Support Response
              </label>
              <textarea
                rows={4}
                required
                placeholder="Type your response to the customer..."
                className={inputCls}
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button variant="ghost" type="button" onClick={() => setSelectedTicket(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={replying}>
                Deliver Response
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
