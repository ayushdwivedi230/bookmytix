import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, CheckCircle } from 'lucide-react';
import type { Show, Seat, Booking } from '../../types';
import { showsApi, bookingsApi, eventsApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { ErrorState } from '../ui/States';
import { TicketCard } from '../tickets/TicketCard';

type Step = 'show' | 'seats' | 'checkout' | 'confirmed';

interface BookingFlowProps {
  eventId: number;
  eventTitle: string;
  token: string | null;
}

function fmt(startsAt: string) {
  return new Date(startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function fmtDate(startsAt: string) {
  return new Date(startsAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Determine tier from seat position in grid */
function getSeatTier(index: number): { name: string; surcharge: number } {
  const row = Math.floor(index / 10);
  if (row < 2) return { name: 'VIP', surcharge: 200 };
  if (row < 4) return { name: 'Premium', surcharge: 100 };
  return { name: 'Executive', surcharge: 0 };
}

const STEPPER_STEPS: Array<{ key: Step; label: string }> = [
  { key: 'show', label: 'Show' },
  { key: 'seats', label: 'Seats' },
  { key: 'checkout', label: 'Checkout' },
  { key: 'confirmed', label: 'Confirmed' },
];

function Stepper({ current }: { current: Step }) {
  const idx = STEPPER_STEPS.findIndex(s => s.key === current);
  return (
    <nav aria-label="Booking steps" className="flex items-center gap-0 mb-6">
      {STEPPER_STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <span
                aria-current={active ? 'step' : undefined}
                className={[
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
                  done ? 'bg-[#F84464] border-[#F84464] text-white' :
                  active ? 'bg-white border-[#F84464] text-[#F84464]' :
                  'bg-white border-slate-200 text-slate-400',
                ].join(' ')}
              >
                {done ? <CheckCircle size={14} /> : i + 1}
              </span>
              <span className={`text-[10px] font-medium hidden sm:block ${active ? 'text-[#F84464]' : done ? 'text-slate-600' : 'text-slate-400'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPPER_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 transition-colors ${done ? 'bg-[#F84464]' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function BookingFlow({ eventId, eventTitle, token }: BookingFlowProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('show');
  const [shows, setShows] = useState<Show[]>([]);
  const [loadingShows, setLoadingShows] = useState(true);
  const [showsError, setShowsError] = useState(false);

  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [seatsError, setSeatsError] = useState(false);

  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [booking, setBooking] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Load shows
  const fetchShows = () => {
    setLoadingShows(true);
    setShowsError(false);
    eventsApi.shows(eventId)
      .then(data => { setShows(data); setLoadingShows(false); })
      .catch(() => { setShowsError(true); setLoadingShows(false); });
  };
  useEffect(() => { fetchShows(); }, [eventId]);

  // Load seats for selected show
  const fetchSeats = (showId: number) => {
    setLoadingSeats(true);
    setSeatsError(false);
    setSelectedSeatIds([]);
    showsApi.seats(showId)
      .then(data => { setSeats(data); setLoadingSeats(false); })
      .catch(() => { setSeatsError(true); setLoadingSeats(false); });
  };
  useEffect(() => {
    if (selectedShow) fetchSeats(selectedShow.id);
  }, [selectedShow?.id]);

  // Group shows by date then theatre
  const showsByDate = useMemo(() => {
    const map = new Map<string, Map<string, Show[]>>();
    for (const s of shows) {
      const date = fmtDate(s.startsAt);
      const theatre = s.theatre.name;
      if (!map.has(date)) map.set(date, new Map());
      const byTheatre = map.get(date)!;
      if (!byTheatre.has(theatre)) byTheatre.set(theatre, []);
      byTheatre.get(theatre)!.push(s);
    }
    return map;
  }, [shows]);

  // Price calcs — USE server show.price as authoritative base
  const showPrice = selectedShow?.price ?? 0;
  const tierSurcharge = selectedSeatIds.reduce((sum, id) => {
    const idx = seats.findIndex(s => s.id === id);
    return sum + (idx !== -1 ? getSeatTier(idx).surcharge : 0);
  }, 0);
  const convFee = selectedSeatIds.length * 40;
  const gst = Math.round((showPrice * selectedSeatIds.length + tierSurcharge + convFee) * 0.18);
  const grandTotal = showPrice * selectedSeatIds.length + tierSurcharge + convFee + gst;

  const toggleSeat = (seatId: number, status: string) => {
    if (status !== 'available') return;
    setSelectedSeatIds(prev =>
      prev.includes(seatId) ? prev.filter(id => id !== seatId) : [...prev, seatId],
    );
  };

  const handleBook = async () => {
    if (!token) { navigate('/login'); return; }
    if (!selectedShow || selectedSeatIds.length === 0) return;
    setBooking(true);
    try {
      const { booking_id } = await bookingsApi.create(selectedShow.id, selectedSeatIds, token);
      // Fetch just this booking
      const allBookings = await bookingsApi.list(token);
      const found = allBookings.find(b => b.id === booking_id) ?? allBookings[allBookings.length - 1];
      setConfirmedBooking(found);
      setStep('confirmed');
      toast('Booking confirmed! Your tickets are ready.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Booking failed';
      if (msg.includes('no longer available') || msg.includes('conflict') || msg.includes('409')) {
        toast('Those seats were just taken. Please choose different seats.', 'error');
        // Refresh seat availability
        if (selectedShow) fetchSeats(selectedShow.id);
        setStep('seats');
      } else {
        toast(msg, 'error');
      }
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#F84464]">Book tickets</p>
        <h3 className="text-xl font-semibold text-slate-900 mt-1">{eventTitle}</h3>
      </div>

      <Stepper current={step} />

      {/* ── Step: Show selection ── */}
      {step === 'show' && (
        <div className="space-y-6">
          {loadingShows ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : showsError ? (
            <ErrorState onRetry={fetchShows} />
          ) : shows.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No shows available for this event.</p>
          ) : (
            <div className="space-y-6">
              {[...showsByDate.entries()].map(([date, byTheatre]) => (
                <div key={date}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">{date}</p>
                  {[...byTheatre.entries()].map(([theatreName, theatreShows]) => (
                    <div key={theatreName} className="mb-4">
                      <p className="text-sm font-semibold text-slate-700 mb-2">{theatreName}</p>
                      <div className="flex flex-wrap gap-2">
                        {theatreShows.map(show => (
                          <button
                            key={show.id}
                            onClick={() => setSelectedShow(show)}
                            className={[
                              'rounded-xl border px-4 py-2 text-sm font-medium transition-all',
                              selectedShow?.id === show.id
                                ? 'border-[#F84464] bg-[#F84464] text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-[#F84464]/50 hover:bg-[#F84464]/5',
                            ].join(' ')}
                          >
                            {fmt(show.startsAt)}
                            <span className="ml-2 text-[11px] opacity-70">₹{show.price}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                  {selectedShow
                    ? `Selected: ${selectedShow.theatre.name} · ${fmt(selectedShow.startsAt)}`
                    : 'Select a showtime to continue'}
                </p>
                <Button
                  variant="primary"
                  disabled={!selectedShow}
                  onClick={() => { setStep('seats'); }}
                >
                  Continue to seats
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step: Seat selection ── */}
      {step === 'seats' && (
        <div className="space-y-6">
          {selectedShow && (
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
              <span className="font-semibold text-slate-700">{selectedShow.theatre.name}</span>
              <span className="font-semibold text-[#F84464]">₹{selectedShow.price} / seat</span>
            </div>
          )}

          {loadingSeats ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : seatsError ? (
            <ErrorState onRetry={() => selectedShow && fetchSeats(selectedShow.id)} />
          ) : seats.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No seats available for this show.</p>
          ) : (
            <div className="overflow-x-auto">
              {/* Screen */}
              <div className="mb-8 text-center">
                <div className="mx-auto h-1.5 w-4/5 max-w-sm rounded-t-full bg-gradient-to-r from-slate-200 via-slate-400 to-slate-200 shadow-lg" />
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Screen</p>
              </div>

              {/* Seat grid */}
              <div className="grid grid-cols-10 gap-1.5 justify-items-center mx-auto max-w-xl">
                {seats.map((seat, idx) => {
                  const selected = selectedSeatIds.includes(seat.id);
                  const booked = seat.status === 'booked';
                  const tier = getSeatTier(idx);
                  const tierColor = tier.name === 'VIP' ? 'amber' : tier.name === 'Premium' ? 'purple' : 'green';
                  let cls = '';
                  if (booked) cls = 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed';
                  else if (selected)
                    cls = `bg-${tierColor}-500 border-${tierColor}-500 text-white shadow-sm`;
                  else
                    cls = `bg-white border-${tierColor}-300 text-${tierColor}-700 hover:bg-${tierColor}-50 cursor-pointer`;
                  return (
                    <button
                      key={seat.id}
                      disabled={booked}
                      onClick={() => toggleSeat(seat.id, seat.status)}
                      title={booked ? 'Sold' : `${seat.seat_number} · ${tier.name}${tier.surcharge > 0 ? ` +₹${tier.surcharge}` : ''}`}
                      aria-label={`Seat ${seat.seat_number} — ${booked ? 'Sold' : tier.name}`}
                      aria-pressed={selected}
                      className={`w-7 h-7 rounded-md border text-[9px] font-bold flex items-center justify-center transition-all ${cls}`}
                    >
                      {seat.seat_number}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-4">
                {[
                  { label: 'VIP (+₹200)', color: 'bg-amber-400' },
                  { label: 'Premium (+₹100)', color: 'bg-purple-400' },
                  { label: 'Executive', color: 'bg-green-400' },
                  { label: 'Sold', color: 'bg-slate-300' },
                ].map(l => (
                  <span key={l.label} className="flex items-center gap-1.5">
                    <span className={`w-3 h-3 rounded ${l.color}`} aria-hidden />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <p className="text-sm text-slate-500">{selectedSeatIds.length} seat{selectedSeatIds.length !== 1 ? 's' : ''} selected</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep('show')}>Back</Button>
              <Button
                variant="primary"
                disabled={selectedSeatIds.length === 0}
                onClick={() => setStep('checkout')}
              >
                Review booking
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step: Checkout ── */}
      {step === 'checkout' && selectedShow && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Booking summary</p>
            <div className="space-y-2.5 text-sm text-slate-600">
              <Row label="Event" value={eventTitle} />
              <Row label="Theatre" value={selectedShow.theatre.name} />
              <Row label="Show time" value={`${fmtDate(selectedShow.startsAt)} · ${fmt(selectedShow.startsAt)}`} />
              <Row label="Seats" value={`${selectedSeatIds.length} seat${selectedSeatIds.length !== 1 ? 's' : ''}`} />
              <div className="border-t border-slate-200 pt-2.5 mt-2.5 space-y-2">
                <Row label={`Tickets × ${selectedSeatIds.length}`} value={`₹${showPrice * selectedSeatIds.length}`} />
                <Row label="Tier surcharge" value={`₹${tierSurcharge}`} />
                <Row label="Convenience fee" value={`₹${convFee}`} />
                <Row label="GST (18%)" value={`₹${gst}`} />
              </div>
              <div className="border-t border-slate-200 pt-2.5 mt-1 flex justify-between font-bold text-slate-900 text-base">
                <span>Grand total</span>
                <span>₹{grandTotal}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl p-3 border border-slate-100">
            <CreditCard size={14} className="text-[#F84464] shrink-0" />
            <span>Final price is computed by the server. No hidden charges after confirmation.</span>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setStep('seats')}>Back</Button>
            <Button
              variant="primary"
              loading={booking}
              onClick={handleBook}
              leftIcon={<CreditCard size={15} />}
              className="flex-1"
            >
              {booking ? 'Processing…' : 'Pay & Confirm'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step: Confirmed ── */}
      {step === 'confirmed' && confirmedBooking && (
        <div className="space-y-4">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
            <CheckCircle size={20} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Booking confirmed!</p>
              <p className="text-xs text-emerald-700 mt-0.5">Your e-ticket is ready. Show it at the venue entrance.</p>
            </div>
          </div>
          <TicketCard booking={confirmedBooking} />
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => navigate('/bookings')}>View all tickets</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Small helper for summary rows
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}
