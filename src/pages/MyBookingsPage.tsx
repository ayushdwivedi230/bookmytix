import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Printer,
  ShieldAlert,
  ArrowLeft,
  Search,
} from 'lucide-react';
import { bookingsApi, ticketsApi } from '../services/api';
import type { UserBookingItem, BookingDetailsResponse } from '../types';

export const MyBookingsPage: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [bookings, setBookings] = useState<UserBookingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Selected ticket modal
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [ticketDetails, setTicketDetails] = useState<BookingDetailsResponse | null>(null);
  const [_loadingTicket, setLoadingTicket] = useState<boolean>(false);

  // Cancellation modal
  const [cancellationBooking, setCancellationBooking] = useState<UserBookingItem | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>('Change of plans');
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string>('');

  useEffect(() => {
    const handleStorage = () => setToken(localStorage.getItem('token'));
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const loadBookings = () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    bookingsApi
      .list(token, filter)
      .then((data) => {
        setBookings(data);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load booking history');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadBookings();
  }, [token, filter]);

  const handleOpenTicketModal = async (bookingId: number) => {
    if (!token) return;
    setSelectedBookingId(bookingId);
    setLoadingTicket(true);
    try {
      const data = await ticketsApi.getBookingTickets(bookingId, token);
      setTicketDetails(data);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve ticket details');
    } finally {
      setLoadingTicket(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!token || !cancellationBooking) return;
    setCancelling(true);
    try {
      const res = await bookingsApi.cancel(cancellationBooking.id, cancellationReason, token);
      setCancelSuccessMsg(
        `Booking #${cancellationBooking.bookingRef} cancelled. Refund of ₹${res.refundAmount} initiated (Ref: ${res.refundId}).`,
      );
      setCancellationBooking(null);
      loadBookings();
    } catch (err: any) {
      setError(err.message || 'Cancellation failed');
    } finally {
      setCancelling(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-stone-900 border border-stone-800 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Login to View Your Tickets</h2>
          <p className="text-sm text-stone-400 mb-6">
            Please sign in to your BookMyTix account to access your digital passes and booking history.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Home & Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Ticket className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                My Bookings & Passes
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-stone-400 mt-1">
              View upcoming cinema passes, download digital QR tickets, or manage cancellations.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex p-1 bg-stone-900 border border-stone-800 rounded-xl">
            {(['upcoming', 'past', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition ${
                  filter === t
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                {t === 'upcoming' ? 'Upcoming Shows' : t === 'past' ? 'Past & Cancelled' : 'All Bookings'}
              </button>
            ))}
          </div>
        </div>

        {/* Global Alerts */}
        {cancelSuccessMsg && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              {cancelSuccessMsg}
            </span>
            <button
              onClick={() => setCancelSuccessMsg('')}
              className="text-stone-400 hover:text-white text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              {error}
            </span>
            <button
              onClick={() => setError('')}
              className="text-stone-400 hover:text-white text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Bookings List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-44 rounded-2xl bg-stone-900/60 border border-stone-800 animate-pulse"
              />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 bg-stone-900/30 rounded-2xl border border-stone-800 p-8">
            <Ticket className="w-12 h-12 text-stone-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">No {filter} bookings found</h3>
            <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
              You don't have any {filter} movie ticket reservations. Explore now showing blockbusters and book your seats!
            </p>
            <a
              href="/movies"
              className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs tracking-wide transition"
            >
              <Search className="w-4 h-4" />
              Explore Movies
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const isConfirmed = booking.status === 'confirmed';
              const isRefunded = booking.status === 'refunded' || booking.status === 'cancelled';

              return (
                <div
                  key={booking.id}
                  className="rounded-2xl bg-stone-900/80 border border-stone-800 p-5 sm:p-6 transition hover:border-stone-700 relative overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row gap-5 items-start">
                    {/* Poster */}
                    {booking.poster && (
                      <img
                        src={booking.poster}
                        alt={booking.event_title}
                        className="w-20 h-28 sm:w-24 sm:h-36 rounded-xl object-cover bg-stone-800 shrink-0 shadow-md"
                        loading="lazy"
                      />
                    )}

                    {/* Details */}
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            #{booking.bookingRef}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isConfirmed
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : isRefunded
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-stone-800 text-stone-400'
                            }`}
                          >
                            {booking.status}
                          </span>
                        </div>
                        <span className="text-xs text-stone-500">
                          Booked on {new Date(booking.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                        {booking.event_title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-stone-300">
                        <span className="flex items-center gap-1.5 text-stone-400">
                          <MapPin className="w-3.5 h-3.5 text-amber-400" />
                          {booking.theatre} • {booking.screen}
                        </span>
                        <span className="flex items-center gap-1.5 text-stone-400">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          {booking.event_date}
                        </span>
                        <span className="flex items-center gap-1.5 text-stone-400">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          {booking.show_time}
                        </span>
                      </div>

                      {/* Seats & Concessions */}
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-stone-500 font-medium">Seats:</span>
                        {booking.tickets.map((t) => (
                          <span
                            key={t.id}
                            className="px-2 py-0.5 rounded bg-stone-800 text-stone-200 text-xs font-mono font-semibold border border-stone-700"
                          >
                            {t.seat_number}
                          </span>
                        ))}

                        {booking.foodItems && booking.foodItems.length > 0 && (
                          <span className="text-xs text-stone-400 bg-stone-800/60 px-2 py-0.5 rounded border border-stone-700/60">
                            🍿 {booking.foodItems.map((f) => `${f.quantity}x ${f.name}`).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price & Actions */}
                    <div className="w-full md:w-48 shrink-0 flex flex-col justify-between items-start md:items-end pt-3 md:pt-0 border-t md:border-t-0 border-stone-800">
                      <div className="text-left md:text-right">
                        <span className="text-[11px] text-stone-500 block uppercase tracking-wider">
                          {isRefunded ? 'Refund Amount' : 'Total Paid'}
                        </span>
                        <span className="text-xl font-black text-amber-400 font-mono">
                          ₹{isRefunded && booking.refundAmount ? booking.refundAmount : booking.total_price}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap md:flex-col gap-2 w-full">
                        {isConfirmed && (
                          <button
                            onClick={() => handleOpenTicketModal(booking.id)}
                            className="flex-1 md:w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition shadow-md shadow-amber-500/10"
                          >
                            <Ticket className="w-3.5 h-3.5" />
                            <span>View QR Ticket</span>
                          </button>
                        )}

                        {booking.canCancel && (
                          <button
                            onClick={() => setCancellationBooking(booking)}
                            className="flex-1 md:w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-red-950/40 text-stone-300 hover:text-red-400 text-xs border border-stone-700 transition"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel Booking</span>
                          </button>
                        )}

                        {!booking.canCancel && isConfirmed && (
                          <span className="text-[10px] text-stone-500 text-center block">
                            Cancellation closed (under 2 hrs)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── DIGITAL TICKET & QR CODE MODAL ──────────────────────────────── */}
        {selectedBookingId && ticketDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-6 my-8">
              <div className="flex items-center justify-between pb-4 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                    QR
                  </div>
                  <h3 className="text-base font-bold text-white">Digital Admission Pass</h3>
                </div>
                <button
                  onClick={() => setSelectedBookingId(null)}
                  className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-5 space-y-6">
                {ticketDetails.tickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-5 rounded-xl bg-stone-950/80 border border-stone-800 flex flex-col sm:flex-row items-center gap-6"
                  >
                    {t.qrDataUrl ? (
                      <div className="p-2 bg-white rounded-xl shadow-md shrink-0">
                        <img
                          src={t.qrDataUrl}
                          alt={`QR Pass for ${t.seatNumber}`}
                          className="w-36 h-36 object-contain"
                        />
                      </div>
                    ) : null}

                    <div className="flex-1 text-center sm:text-left space-y-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {t.category} SEAT
                      </span>
                      <h4 className="text-lg font-bold text-white">{ticketDetails.show.movieTitle}</h4>
                      <p className="text-xs text-stone-400">{ticketDetails.show.theatreName} • {ticketDetails.show.screenName}</p>
                      <p className="text-xs text-stone-400">
                        {ticketDetails.show.formattedDate} at {ticketDetails.show.formattedTime}
                      </p>
                      <div className="pt-2 flex items-center justify-center sm:justify-start gap-4">
                        <div>
                          <span className="text-[10px] text-stone-500 uppercase block">Seat</span>
                          <span className="text-xl font-black text-amber-400">{t.seatNumber}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-500 uppercase block">Status</span>
                          <span className={`text-xs font-semibold ${t.isUsed ? 'text-red-400' : 'text-emerald-400'}`}>
                            {t.isUsed ? 'Already Admitted' : 'Valid for Entry'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-stone-800 flex justify-between items-center">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition"
                >
                  <Printer className="w-4 h-4" />
                  Print Pass
                </button>
                <button
                  onClick={() => setSelectedBookingId(null)}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── CANCELLATION & REFUND CONFIRMATION MODAL ────────────────────── */}
        {cancellationBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="relative w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Cancel Booking & Request Refund</h3>
                  <p className="text-xs text-stone-400">Ref: #{cancellationBooking.bookingRef}</p>
                </div>
              </div>

              <div className="space-y-3 text-xs bg-stone-950/60 p-4 rounded-xl border border-stone-800/80 mb-4">
                <div className="flex justify-between text-stone-300">
                  <span>Showtime</span>
                  <span className="text-white font-medium">
                    {cancellationBooking.event_date} ({cancellationBooking.show_time})
                  </span>
                </div>
                <div className="flex justify-between text-stone-300">
                  <span>Seats Released</span>
                  <span className="text-white font-mono font-semibold">
                    {cancellationBooking.tickets.map((t) => t.seat_number).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between text-stone-300">
                  <span>Ticket Subtotal</span>
                  <span className="font-mono text-white">₹{cancellationBooking.ticketSubtotal}</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>Cancellation Deduction (₹25/seat)</span>
                  <span className="font-mono">-₹{cancellationBooking.tickets.length * 25}</span>
                </div>
                <div className="pt-2 border-t border-stone-800 flex justify-between text-sm font-bold">
                  <span className="text-white">Estimated Refund</span>
                  <span className="font-mono text-emerald-400 font-black">
                    ₹{Math.max(0, cancellationBooking.ticketSubtotal - cancellationBooking.tickets.length * 25 + cancellationBooking.foodTotal)}
                  </span>
                </div>
              </div>

              <div className="mb-5">
                <label className="text-xs text-stone-300 block mb-1.5 font-medium">
                  Reason for Cancellation
                </label>
                <select
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Change of plans">Change of plans</option>
                  <option value="Booked wrong showtime or cinema">Booked wrong showtime or cinema</option>
                  <option value="Personal emergency">Personal emergency</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setCancellationBooking(null)}
                  disabled={cancelling}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition"
                >
                  Keep Booking
                </button>
                <button
                  onClick={handleCancelBooking}
                  disabled={cancelling}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs tracking-wide transition shadow-lg shadow-rose-600/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
