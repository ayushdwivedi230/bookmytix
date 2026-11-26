import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  LifeBuoy,
  MessageSquare,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ticket,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  HelpCircle,
  ArrowLeft,
} from 'lucide-react';
import { supportApi, bookingsApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import type { SupportTicketItem, UserBookingItem } from '../types';

export const SupportPage: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const prefilledRef = searchParams.get('bookingRef') || '';

  // Form states
  const [subject, setSubject] = useState<string>('');
  const [category, setCategory] = useState<string>('booking_issue');
  const [priority, setPriority] = useState<string>('medium');
  const [selectedBookingId, setSelectedBookingId] = useState<number | undefined>(undefined);
  const [message, setMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Tickets list
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [loadingTickets, setLoadingTickets] = useState<boolean>(true);

  // User bookings (for association)
  const [bookings, setBookings] = useState<UserBookingItem[]>([]);

  useEffect(() => {
    if (!token) {
      navigate('/login?redirect=/support');
      return;
    }
    loadTickets();
    loadUserBookings();
  }, [token]);

  const loadTickets = async () => {
    if (!token) return;
    setLoadingTickets(true);
    try {
      const data = await supportApi.getMyTickets(token);
      setTickets(data);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to load tickets', 'error');
    } finally {
      setLoadingTickets(false);
    }
  };

  const loadUserBookings = async () => {
    if (!token) return;
    try {
      const list = await bookingsApi.list(token, 'all');
      setBookings(list);

      if (prefilledRef) {
        const found = list.find((b) => b.bookingRef === prefilledRef);
        if (found) {
          setSelectedBookingId(found.id);
          setSubject(`Assistance with booking ${found.bookingRef} (${(found as any).movieTitle || found.event_title || 'Reservation'})`);
        }
      }
    } catch {
      // optional
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!subject.trim() || !message.trim()) {
      toast('Please fill out all required fields', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const created = await supportApi.createTicket(
        {
          bookingId: selectedBookingId,
          subject: subject.trim(),
          category,
          priority,
          message: message.trim(),
        },
        token,
      );
      toast(`Support ticket ${created.ticketRef} submitted successfully!`, 'success');
      setSubject('');
      setMessage('');
      setSelectedBookingId(undefined);
      loadTickets();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to submit ticket', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090D] text-slate-100 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="rounded-3xl border border-white/10 bg-[#0F1118] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-transparent to-transparent pointer-events-none" />

          <div className="flex items-center gap-5 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-[#F84464] text-white flex items-center justify-center shadow-lg shadow-amber-500/20 border border-white/20">
              <LifeBuoy size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Customer Support Portal
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  24/7 Priority Desk
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Report booking problems, refund status inquiries, or get instant ticket resolution.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-[#161925] hover:bg-white/10 text-xs sm:text-sm font-semibold text-slate-300 transition-colors"
            >
              <ArrowLeft size={15} /> Back to Dashboard
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Submit Ticket Form */}
          <div className="lg:col-span-5 rounded-3xl border border-white/10 bg-[#0F1118] p-6 sm:p-8 space-y-6 shadow-xl">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare size={18} className="text-[#F84464]" /> Submit a Support Ticket
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Our support team will review and respond directly to your ticket.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Subject *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  placeholder="Brief summary of the issue"
                  className="w-full rounded-xl border border-white/10 bg-[#161925] px-4 py-2.5 text-sm text-white focus:border-[#F84464] focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#161925] px-3 py-2 text-xs text-white focus:border-[#F84464] focus:outline-none transition-colors"
                  >
                    <option value="booking_issue">Booking Issue</option>
                    <option value="payment_failure">Payment Failure</option>
                    <option value="cancellation_refund">Refund Inquiry</option>
                    <option value="seat_conflict">Seat / Hall Problem</option>
                    <option value="other">General Query</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#161925] px-3 py-2 text-xs text-white focus:border-[#F84464] focus:outline-none transition-colors"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Associated Booking (Optional)
                </label>
                <select
                  value={selectedBookingId || ''}
                  onChange={(e) => setSelectedBookingId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full rounded-xl border border-white/10 bg-[#161925] px-3 py-2 text-xs text-white focus:border-[#F84464] focus:outline-none transition-colors"
                >
                  <option value="">None / Not related to a specific booking</option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bookingRef} &bull; {(b as any).movieTitle || b.event_title || 'Reservation'} (₹{b.total_price})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Message Details *
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  placeholder="Describe your issue with as much detail as possible..."
                  className="w-full rounded-xl border border-white/10 bg-[#161925] p-3 text-sm text-white focus:border-[#F84464] focus:outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#F84464] hover:bg-[#e03355] text-white font-extrabold text-sm py-3 shadow-lg shadow-[#F84464]/25 transition-all disabled:opacity-50"
              >
                {submitting ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                Submit Ticket
              </button>
            </form>
          </div>

          {/* User's Ticket History */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock size={18} className="text-amber-400" /> Your Support Tickets
              </h2>
              <button
                onClick={loadTickets}
                disabled={loadingTickets}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <RefreshCw size={12} className={loadingTickets ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            {loadingTickets ? (
              <div className="py-20 text-center rounded-3xl border border-white/10 bg-[#0F1118]">
                <RefreshCw size={28} className="mx-auto text-slate-500 animate-spin" />
                <p className="text-xs text-slate-400 mt-2">Loading support tickets…</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-20 text-center rounded-3xl border border-white/10 bg-[#0F1118] p-8 space-y-3">
                <CheckCircle2 size={36} className="mx-auto text-emerald-400" />
                <h3 className="text-base font-bold text-white">No active issues</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  All your past bookings and transactions are running smoothly. If you ever need help, submit a ticket above.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((t) => {
                  const isResolved = t.status === 'resolved' || t.status === 'closed';
                  const dateStr = new Date(t.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={t.id}
                      className="rounded-3xl border border-white/10 bg-[#0F1118] p-6 space-y-4 shadow-xl hover:border-white/20 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#F84464]">
                              {t.ticketRef}
                            </span>
                            <span className="text-slate-600">&bull;</span>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              {t.category.replace('_', ' ')}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-white mt-1">{t.subject}</h3>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              isResolved
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                : t.status === 'in_progress'
                                ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                                : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                            }`}
                          >
                            {t.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 bg-[#161925] p-3.5 rounded-2xl border border-white/[0.06] whitespace-pre-line">
                        {t.message}
                      </p>

                      {/* Admin Response section */}
                      {t.adminResponse && (
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                            <ShieldCheck size={14} /> Official Support Resolution
                          </div>
                          <p className="text-xs text-slate-200 whitespace-pre-line pl-5">
                            {t.adminResponse}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-white/[0.06]">
                        <span>Submitted on {dateStr}</span>
                        {t.bookingId && (
                          <span className="text-slate-400 font-mono">
                            Associated Booking #{t.bookingId}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
