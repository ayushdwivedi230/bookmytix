import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  User as UserIcon,
  Ticket,
  Settings,
  Lock,
  Bell,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  Calendar,
  Clock,
  ArrowRight,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  LogOut,
  RefreshCw,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { authApi, bookingsApi, ticketsApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import type { UserProfile, UserBookingItem, BookingDetailsResponse } from '../types';

const GENRES_LIST = [
  'Action',
  'Comedy',
  'Drama',
  'Sci-Fi',
  'Thriller',
  'Romance',
  'Horror',
  'Animation',
  'Crime',
  'Adventure',
];

const LANGUAGES_LIST = [
  'Hindi',
  'English',
  'Telugu',
  'Tamil',
  'Malayalam',
  'Kannada',
  'Marathi',
  'Bengali',
];

const CITIES_LIST = [
  'Mumbai',
  'Delhi',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Pune',
  'Kolkata',
  'Jaipur',
  'Ahmedabad',
  'Chandigarh',
];

export const DashboardPage: React.FC = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const activeTab = searchParams.get('tab') || 'bookings';
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [updatingProfile, setUpdatingProfile] = useState<boolean>(false);

  // Profile Form
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [preferredCity, setPreferredCity] = useState<string>('');
  const [preferredGenres, setPreferredGenres] = useState<string[]>([]);
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>([]);
  const [emailBooking, setEmailBooking] = useState<boolean>(true);
  const [smsAlerts, setSmsAlerts] = useState<boolean>(false);
  const [promoOffers, setPromoOffers] = useState<boolean>(true);

  // Change Password Form
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [changingPassword, setChangingPassword] = useState<boolean>(false);

  // Bookings state
  const [bookingFilter, setBookingFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [bookings, setBookings] = useState<UserBookingItem[]>([]);
  const [loadingBookings, setLoadingBookings] = useState<boolean>(true);

  // Digital Ticket Modal
  const [selectedTicket, setSelectedTicket] = useState<BookingDetailsResponse | null>(null);
  const [loadingTicket, setLoadingTicket] = useState<boolean>(false);

  // Cancellation Modal
  const [cancellingBooking, setCancellingBooking] = useState<UserBookingItem | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Change of plans');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      navigate('/login?redirect=/dashboard');
      return;
    }
    loadProfileData();
    loadBookingsData();
  }, [token]);

  const loadProfileData = async () => {
    if (!token) return;
    setLoadingProfile(true);
    try {
      const data = await authApi.getProfile(token);
      setProfile(data);
      setName(data.name || '');
      setPhone(data.phone || '');
      setPreferredCity(data.preferredCity || '');
      setPreferredGenres(data.preferredGenres || []);
      setPreferredLanguages(data.preferredLanguages || []);
      if (data.notificationPreferences) {
        setEmailBooking(data.notificationPreferences.email ?? true);
        setSmsAlerts(data.notificationPreferences.sms ?? false);
        setPromoOffers(data.notificationPreferences.promotional ?? true);
      }
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to load profile', 'error');
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadBookingsData = async () => {
    if (!token) return;
    setLoadingBookings(true);
    try {
      const data = await bookingsApi.list(token, bookingFilter);
      setBookings(data);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to load bookings', 'error');
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadBookingsData();
    }
  }, [bookingFilter]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setUpdatingProfile(true);
    try {
      const updated = await authApi.updateProfile(
        {
          name,
          phone,
          preferredCity,
          preferredGenres,
          preferredLanguages,
          notificationPreferences: {
            email: emailBooking,
            sms: smsAlerts,
            promotional: promoOffers,
          },
        },
        token,
      );
      setProfile(updated);
      await loadProfileData();
      toast('Profile preferences updated successfully!', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Update failed', 'error');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (newPassword.length < 8) {
      toast('New password must be at least 8 characters long', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('New passwords do not match', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword, token);
      toast('Password changed successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Password change failed', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleOpenTicket = async (bookingId: number) => {
    if (!token) return;
    setLoadingTicket(true);
    try {
      const details = await ticketsApi.getBookingTickets(bookingId, token);
      setSelectedTicket(details);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to load ticket pass', 'error');
    } finally {
      setLoadingTicket(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancellingBooking || !token) return;
    setIsCancelling(true);
    try {
      const res = await bookingsApi.cancel(cancellingBooking.id, cancelReason, token);
      toast(`Booking cancelled! Refund of ₹${res.refundAmount} initiated.`, 'success');
      setCancellingBooking(null);
      loadBookingsData();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Cancellation failed', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const toggleGenre = (genre: string) => {
    setPreferredGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  };

  const toggleLanguage = (lang: string) => {
    setPreferredLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  };

  return (
    <div className="min-h-screen bg-[#08090D] text-slate-100 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header Card */}
        <div className="rounded-3xl border border-white/10 bg-[#0F1118] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#F84464]/10 via-transparent to-transparent pointer-events-none" />

          <div className="flex items-center gap-5 relative z-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#F84464] to-amber-500 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg shadow-[#F84464]/20 border border-white/20">
              {profile?.name?.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {profile?.name || user?.name || 'Account'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-[#F84464] border border-rose-500/30">
                  {profile?.role || user?.role || 'Customer'}
                </span>
                {profile?.isEmailVerified ? (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck size={12} /> Email Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Pending Verification
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <Mail size={13} className="text-slate-400" /> {profile?.email || user?.email}
                </span>
                {profile?.phone && (
                  <span className="flex items-center gap-1 text-slate-400">
                    &bull; <Phone size={13} /> {profile.phone}
                  </span>
                )}
                {profile?.preferredCity && (
                  <span className="flex items-center gap-1 text-slate-400">
                    &bull; <MapPin size={13} className="text-[#F84464]" /> {profile.preferredCity}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            {(user?.role === 'admin' || user?.role === 'cinema_manager') && (
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 text-xs sm:text-sm font-bold transition-all shadow-md shadow-purple-500/10"
              >
                <Sparkles size={16} /> Admin Center
              </button>
            )}
            <button
              onClick={() => navigate('/support')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-[#161925] hover:bg-white/10 text-xs sm:text-sm font-semibold text-slate-300 transition-colors"
            >
              <HelpCircle size={16} /> Support
            </button>
            <button
              onClick={logout}
              title="Sign Out"
              className="w-10 h-10 rounded-xl border border-white/10 bg-[#161925] hover:bg-rose-500/20 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1 overflow-x-auto">
          {[
            { id: 'bookings', label: 'My Bookings & Passes', icon: Ticket },
            { id: 'profile', label: 'Profile & Preferences', icon: UserIcon },
            { id: 'security', label: 'Security & Password', icon: Lock },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all border shrink-0 ${
                  active
                    ? 'bg-[#F84464] border-[#F84464] text-white shadow-lg shadow-[#F84464]/25'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* ─── TAB 1: BOOKINGS & PASSES ──────────────────────────────────────── */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {(['upcoming', 'past', 'all'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setBookingFilter(mode)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition-all border ${
                      bookingFilter === mode
                        ? 'bg-white/10 border-white/20 text-white'
                        : 'border-transparent text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {mode} Bookings
                  </button>
                ))}
              </div>
              <button
                onClick={loadBookingsData}
                disabled={loadingBookings}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white self-end transition-colors"
              >
                <RefreshCw size={13} className={loadingBookings ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            {loadingBookings ? (
              <div className="py-24 text-center space-y-3">
                <RefreshCw size={32} className="mx-auto text-slate-500 animate-spin" />
                <p className="text-sm text-slate-400 font-semibold">Loading your reservations…</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="py-20 text-center rounded-3xl border border-white/[0.08] bg-[#0F1118] p-8 max-w-lg mx-auto space-y-4">
                <Ticket size={48} className="mx-auto text-slate-600" />
                <h3 className="text-lg font-bold text-white">No {bookingFilter} bookings found</h3>
                <p className="text-xs text-slate-400">
                  Ready for a movie night? Explore now showing blockbusters and secure your preferred seats.
                </p>
                <button
                  onClick={() => navigate('/movies')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F84464] hover:bg-[#e03355] text-white text-xs sm:text-sm font-bold shadow-lg shadow-[#F84464]/25 transition-all"
                >
                  Browse Movies <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bookings.map((b) => {
                  const isConfirmed = b.status === 'confirmed';
                  const isCancelled = b.status === 'cancelled' || b.status === 'refunded';
                  const showDate = b.event_date || (b.created_at ? new Date(b.created_at).toLocaleDateString('en-IN') : '');
                  const showTime = b.show_time || '';

                  return (
                    <div
                      key={b.id}
                      className="rounded-3xl border border-white/10 bg-[#0F1118] p-5 sm:p-6 flex flex-col justify-between shadow-xl hover:border-white/20 transition-all group"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-mono font-bold text-slate-500 tracking-wider">
                              {b.bookingRef || `BMT-${b.id}`}
                            </span>
                            <h3 className="text-base sm:text-lg font-black text-white truncate mt-0.5">
                              {b.event_title || 'Movie Booking'}
                            </h3>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
                              isConfirmed
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                : isCancelled
                                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-300">
                          <div className="flex items-center gap-2">
                            <MapPin size={13} className="text-[#F84464] shrink-0" />
                            <span className="truncate">
                              {b.theatre || 'Cinema Multiplex'} &bull; {b.screen || 'Main Screen'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar size={13} className="text-slate-400 shrink-0" />
                            <span>
                              {showDate} &bull; {showTime}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {b.tickets?.map((ticket) => (
                            <span
                              key={ticket.id || ticket.seat_number}
                              className="px-2 py-0.5 rounded-lg bg-white/[0.06] border border-white/10 text-[11px] font-bold text-slate-200"
                            >
                              {ticket.seat_number}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-500">Paid Amount</p>
                          <p className="text-sm font-extrabold text-white">₹{b.total_price}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isConfirmed && (
                            <>
                              <button
                                onClick={() => handleOpenTicket(b.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
                              >
                                <QrCode size={13} /> View Pass
                              </button>
                              <button
                                onClick={() => setCancellingBooking(b)}
                                className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors px-2 py-1"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => navigate(`/support?bookingRef=${b.bookingRef}`)}
                            title="Report Issue"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-white/5 transition-colors"
                          >
                            <HelpCircle size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: PROFILE & PREFERENCES ──────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Basic Info Form */}
              <div className="rounded-3xl border border-white/10 bg-[#0F1118] p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">Personal Information</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Update your account details and preferred entertainment city.
                  </p>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full rounded-xl border border-white/10 bg-[#161925] px-4 py-2.5 text-sm text-white focus:border-[#F84464] focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full rounded-xl border border-white/10 bg-[#161925] px-4 py-2.5 text-sm text-white focus:border-[#F84464] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Preferred City
                    </label>
                    <select
                      value={preferredCity}
                      onChange={(e) => setPreferredCity(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#161925] px-4 py-2.5 text-sm text-white focus:border-[#F84464] focus:outline-none transition-colors"
                    >
                      <option value="">Select city</option>
                      {CITIES_LIST.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Genres */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Favorite Movie Genres
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {GENRES_LIST.map((genre) => {
                        const selected = preferredGenres.includes(genre);
                        return (
                          <button
                            type="button"
                            key={genre}
                            onClick={() => toggleGenre(genre)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                              selected
                                ? 'bg-[#F84464] border-[#F84464] text-white shadow-md shadow-[#F84464]/20'
                                : 'border-white/10 bg-[#161925] text-slate-400 hover:text-white hover:border-white/20'
                            }`}
                          >
                            {genre}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Languages */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Preferred Languages
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGES_LIST.map((lang) => {
                        const selected = preferredLanguages.includes(lang);
                        return (
                          <button
                            type="button"
                            key={lang}
                            onClick={() => toggleLanguage(lang)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                              selected
                                ? 'bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                                : 'border-white/10 bg-[#161925] text-slate-400 hover:text-white hover:border-white/20'
                            }`}
                          >
                            {lang}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notifications */}
                  <div className="pt-2 border-t border-white/[0.08] space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Notification Preferences
                    </label>
                    <div className="space-y-2.5">
                      <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={emailBooking}
                          onChange={(e) => setEmailBooking(e.target.checked)}
                          className="w-4 h-4 rounded text-[#F84464] bg-[#161925] border-white/20 focus:ring-0"
                        />
                        <span>Email booking confirmations and digital gate passes</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={smsAlerts}
                          onChange={(e) => setSmsAlerts(e.target.checked)}
                          className="w-4 h-4 rounded text-[#F84464] bg-[#161925] border-white/20 focus:ring-0"
                        />
                        <span>SMS showtime reminders &amp; seat updates</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={promoOffers}
                          onChange={(e) => setPromoOffers(e.target.checked)}
                          className="w-4 h-4 rounded text-[#F84464] bg-[#161925] border-white/20 focus:ring-0"
                        />
                        <span>Exclusive promotional discounts and weekend premiere alerts</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={updatingProfile}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#F84464] hover:bg-[#e03355] text-white font-extrabold text-sm shadow-lg shadow-[#F84464]/25 transition-all disabled:opacity-50"
                  >
                    {updatingProfile ? <RefreshCw size={15} className="animate-spin" /> : null}
                    Save Profile Changes
                  </button>
                </form>
              </div>
            </div>

            {/* Side summary card */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-[#0F1118] p-6 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-400" /> Account Security
                </h3>
                <div className="space-y-3 text-xs text-slate-400">
                  <div className="flex justify-between py-2 border-b border-white/[0.06]">
                    <span>User ID</span>
                    <span className="font-mono text-slate-200">#{profile?.id || user?.id}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/[0.06]">
                    <span>Account Role</span>
                    <span className="font-bold text-white uppercase">{profile?.role || user?.role}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/[0.06]">
                    <span>Verified Email</span>
                    <span className="text-emerald-400 font-bold">
                      {profile?.isEmailVerified ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span>Member Since</span>
                    <span className="text-slate-200">2026</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: SECURITY & PASSWORD ────────────────────────────────────── */}
        {activeTab === 'security' && (
          <div className="max-w-2xl rounded-3xl border border-white/10 bg-[#0F1118] p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Change Account Password</h2>
              <p className="text-xs text-slate-400 mt-1">
                Protect your bookings and saved credentials with a strong, distinct password.
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Enter current password"
                  className="w-full rounded-xl border border-white/10 bg-[#161925] px-4 py-2.5 text-sm text-white focus:border-[#F84464] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-xl border border-white/10 bg-[#161925] px-4 py-2.5 text-sm text-white focus:border-[#F84464] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-type new password"
                  className="w-full rounded-xl border border-white/10 bg-[#161925] px-4 py-2.5 text-sm text-white focus:border-[#F84464] focus:outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#F84464] hover:bg-[#e03355] text-white font-extrabold text-sm shadow-lg shadow-[#F84464]/25 transition-all disabled:opacity-50"
              >
                {changingPassword ? <RefreshCw size={15} className="animate-spin" /> : null}
                Update Password
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ─── DIGITAL TICKET PASS MODAL ─────────────────────────────────────── */}
      {selectedTicket && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0F1118] p-6 sm:p-8 space-y-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#F84464]">
                  Digital Gate Pass
                </span>
                <h3 className="text-xl font-black text-white">{selectedTicket.show.movieTitle}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedTicket.show.theatreName} &bull; {selectedTicket.show.screenName || 'Screen 1'}
                </p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              >
                &times;
              </button>
            </div>

            {/* Passes List */}
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {selectedTicket.tickets.map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-white/10 bg-[#161925] p-4 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Seat</span>
                    <p className="text-2xl font-black text-amber-400">{t.seatNumber}</p>
                    <p className="text-[10px] font-mono text-slate-400">{t.ticketRef}</p>
                  </div>
                  <div className="p-2 bg-white rounded-xl shrink-0 shadow-md">
                    <img
                      src={t.qrDataUrl}
                      alt={`QR code for seat ${t.seatNumber}`}
                      className="w-24 h-24 object-contain"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/[0.08]">
              <span>Ref: {selectedTicket.booking.bookingRef}</span>
              <span className="text-emerald-400 font-bold">Entry Confirmed</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── CANCELLATION CONFIRMATION MODAL ─────────────────────────────────── */}
      {cancellingBooking && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0F1118] p-6 space-y-5 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                Cancel Reservation
              </span>
              <h3 className="text-lg font-bold text-white mt-1">
                Cancel booking {cancellingBooking.bookingRef}?
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Seats will be released immediately and a refund of ₹{cancellingBooking.total_price} will be processed.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                Reason for cancellation
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#161925] px-4 py-2 text-xs text-white focus:outline-none"
              >
                <option value="Change of plans">Change of plans</option>
                <option value="Booked by mistake">Booked by mistake</option>
                <option value="Showtime conflict">Showtime conflict</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setCancellingBooking(null)}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={isCancelling}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-colors disabled:opacity-50"
              >
                {isCancelling ? 'Processing…' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
