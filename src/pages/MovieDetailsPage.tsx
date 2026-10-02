import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Star, Clock, Globe, Play, Users, Film, ChevronLeft, ShieldCheck,
  ChevronRight, Ticket, MapPin, Calendar,
} from 'lucide-react';
import type { Movie } from '../types';
import { movies } from '../data/movies';
import { useAuth } from '../hooks/useAuth';
import { eventsApi, showsApi, bookingsApi } from '../services/api';
import { Button } from '../components/ui/Button';
import { SeatMapModal } from '../components/booking/SeatMapModal';
import type { ApiEvent, Show, Booking } from '../types';

const BANNER_FALLBACK = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1600&q=80';
const POSTER_FALLBACK  = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80';

// ─── Date utilities ────────────────────────────────────────────────────────────
function getDatePills() {
  const pills = [];
  const today = new Date();
  for (let i = 0; i < 5; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    const value = d.toISOString().slice(0, 10);
    pills.push({ label, value, dayNum: d.getDate(), month: d.toLocaleDateString('en-IN', { month: 'short' }), weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }) });
  }
  return pills;
}

// ─── Showtime slot styling ─────────────────────────────────────────────────────
type AvailSlot = 'available' | 'filling' | 'sold';
function slotAvail(timing: string, dateIdx: number, theatreIdx: number): AvailSlot {
  // Deterministic pseudo-availability for demo
  const hash = (timing.charCodeAt(0) + dateIdx * 3 + theatreIdx * 7) % 5;
  if (hash === 0) return 'sold';
  if (hash <= 1) return 'filling';
  return 'available';
}

const AVAIL_STYLES: Record<AvailSlot, string> = {
  available: 'border-slate-300 text-slate-700 hover:border-[#F84464] hover:bg-[#F84464]/5 hover:text-[#F84464] cursor-pointer',
  filling:   'border-amber-300 text-amber-700 bg-amber-50 hover:border-amber-400 cursor-pointer',
  sold:      'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed line-through',
};

// ─── Component ────────────────────────────────────────────────────────────────
export function MovieDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const movie: Movie | undefined = movies.find((m) => m.id === id);

  const [bannerError, setBannerError]   = useState(false);
  const [posterError, setPosterError]   = useState(false);
  const [showTrailer, setShowTrailer]   = useState(false);

  // Date selection
  const datePills = useMemo(() => getDatePills(), []);
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);

  // Show timings from movie data (static) or API
  const [linkedEvent, setLinkedEvent] = useState<ApiEvent | null>(null);
  const [apiShows, setApiShows]       = useState<Show[]>([]);

  // Seat map modal state
  const [seatModal, setSeatModal] = useState<{
    open: boolean;
    theatre: string;
    time: string;
    show?: Show | null;
  }>({ open: false, theatre: '', time: '' });

  const [realBooking, setRealBooking] = useState<Booking | null>(null);

  // Try to find linked backend event
  useEffect(() => {
    if (!movie) return;
    eventsApi.list().then((events) => {
      const match = events.find((e) => e.title.toLowerCase() === movie.title.toLowerCase());
      setLinkedEvent(match ?? null);
    }).catch(() => {});
  }, [movie?.title]);

  // Load API shows when linked event found
  useEffect(() => {
    if (!linkedEvent) return;
    eventsApi.shows(linkedEvent.id).then(setApiShows).catch(() => {});
  }, [linkedEvent?.id]);

  if (!movie) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Film size={48} className="mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Movie not found</h2>
        <Button variant="primary" className="mt-4" onClick={() => navigate('/movies')}>Browse movies</Button>
      </div>
    </div>
  );

  // Build showtime grid from static movie data (always shown)
  const theatres    = movie.availableTheatres;
  const timings     = movie.showTimings;
  const selectedDate = datePills[selectedDateIdx];

  // Find API shows for selected theatre + timing (if linked event exists)
  const findApiShow = (theatre: string, timing: string): Show | undefined =>
    apiShows.find(
      (s) =>
        s.theatre.name === theatre &&
        new Date(s.startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) === timing,
    );

  const openSeatModal = (theatre: string, time: string) => {
    if (!token) { navigate('/login'); return; }
    const show = findApiShow(theatre, time);
    setRealBooking(null);
    setSeatModal({ open: true, theatre, time, show });
  };

  const handleConfirm = async (seatLabels: string[], _total: number) => {
    if (!seatModal.show || !token) return;
    // Find seat IDs from API seats
    const seatData = await showsApi.seats(seatModal.show.id);
    const seatIds  = seatData
      .filter((s) => seatLabels.some((l) => s.seat_number === l || l.startsWith(s.seat_number)))
      .map((s) => s.id);
    if (seatIds.length === 0) {
      // fallback: use first N available seats
      const available = seatData.filter((s) => s.status === 'available').slice(0, seatLabels.length);
      const ids = available.map((s) => s.id);
      const { booking_id } = await bookingsApi.create(seatModal.show.id, ids, token);
      const all = await bookingsApi.list(token);
      const found = all.find((b) => b.id === booking_id) ?? all[all.length - 1];
      setRealBooking(found);
    } else {
      const { booking_id } = await bookingsApi.create(seatModal.show.id, seatIds, token);
      const all = await bookingsApi.list(token);
      const found = all.find((b) => b.id === booking_id) ?? all[all.length - 1];
      setRealBooking(found);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Cinematic hero banner ── */}
      <div className="relative h-[400px] sm:h-[500px] overflow-hidden bg-slate-900">
        <img
          src={bannerError ? BANNER_FALLBACK : movie.banner}
          alt=""
          role="presentation"
          onError={() => setBannerError(true)}
          className="w-full h-full object-cover opacity-40"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-4 sm:left-6 flex items-center gap-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-10 pb-8">
          <div className="max-w-7xl mx-auto flex items-end gap-6">
            {/* Poster */}
            <div className="hidden sm:block w-36 lg:w-44 shrink-0 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl">
              <img
                src={posterError ? POSTER_FALLBACK : movie.poster}
                alt={`${movie.title} poster`}
                onError={() => setPosterError(true)}
                className="w-full aspect-[2/3] object-cover"
              />
            </div>

            <div className="pb-1">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="rounded-full bg-white/10 border border-white/20 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white">{movie.genre}</span>
                <span className="rounded-full bg-white/10 border border-white/20 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white flex items-center gap-1">
                  <ShieldCheck size={10} /> {movie.certificate}
                </span>
                {movie.formats.map((f) => (
                  <span key={f} className="rounded-full bg-[#F84464]/90 px-3 py-1 text-xs font-bold text-white">{f}</span>
                ))}
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-3">{movie.title}</h1>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-300">
                <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Star size={14} fill="currentColor" aria-hidden /> {movie.rating.toFixed(1)}
                  <span className="text-slate-400 font-normal">/ 5</span>
                </span>
                <span className="flex items-center gap-1.5"><Globe size={14} aria-hidden />{movie.language}</span>
                <span className="flex items-center gap-1.5"><Clock size={14} aria-hidden />{movie.duration}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* ── Left: synopsis + cast + trailer + showtimes ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Synopsis */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-3">Synopsis</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{movie.description}</p>
            </section>

            {/* Cast & Crew */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Cast &amp; Crew</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Director</p>
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Film size={14} className="text-[#F84464]" aria-hidden /> {movie.director}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Language</p>
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Globe size={14} className="text-[#F84464]" aria-hidden /> {movie.language}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Cast</p>
                <div className="flex flex-wrap gap-2">
                  {movie.cast.map((actor) => (
                    <span key={actor} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      <Users size={10} aria-hidden /> {actor}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Showtimes & Booking ── */}
            <section id="showtimes" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Section header */}
              <div className="px-6 pt-6 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Ticket size={18} className="text-[#F84464]" />
                    Book Tickets
                  </h2>
                  {!token && (
                    <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                      <button onClick={() => navigate('/login')} className="text-[#F84464] font-semibold hover:underline">Sign in</button> to book
                    </span>
                  )}
                </div>

                {/* Date pills */}
                <div className="flex gap-2 mt-4 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                  {datePills.map((pill, idx) => (
                    <button
                      key={pill.value}
                      id={`date-pill-${idx}`}
                      onClick={() => setSelectedDateIdx(idx)}
                      className={[
                        'shrink-0 flex flex-col items-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all min-w-[72px]',
                        selectedDateIdx === idx
                          ? 'border-[#F84464] bg-[#F84464] text-white shadow-lg shadow-[#F84464]/25'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                      ].join(' ')}
                    >
                      <span className="text-xs font-medium opacity-80">{idx === 0 ? 'Today' : idx === 1 ? 'Tmrw' : pill.weekday}</span>
                      <span className="text-base font-bold leading-tight">{pill.dayNum}</span>
                      <span className="text-[10px] font-medium opacity-70">{pill.month}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theatre list */}
              <div className="divide-y divide-slate-50">
                {theatres.map((theatre, tIdx) => (
                  <div key={theatre} className="px-6 py-5">
                    {/* Theatre info */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{theatre}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <MapPin size={11} className="text-slate-400" />
                          <span className="text-xs text-slate-400">{movie.city}</span>
                          <span className="text-slate-300">·</span>
                          {movie.formats.map((f) => (
                            <span key={f} className="text-[10px] font-bold text-slate-500 border border-slate-200 rounded px-1.5 py-0.5">{f}</span>
                          ))}
                        </div>
                      </div>
                      <button className="text-slate-400 hover:text-slate-600 transition-colors">
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    {/* Time slots */}
                    <div className="flex flex-wrap gap-2">
                      {timings.map((timing) => {
                        const avail = slotAvail(timing, selectedDateIdx, tIdx);
                        return (
                          <button
                            key={timing}
                            disabled={avail === 'sold'}
                            onClick={() => avail !== 'sold' && openSeatModal(theatre, timing)}
                            className={[
                              'rounded-xl border px-4 py-2 text-sm font-semibold transition-all',
                              AVAIL_STYLES[avail],
                            ].join(' ')}
                            title={avail === 'sold' ? 'Housefull' : avail === 'filling' ? 'Filling fast!' : 'Available'}
                          >
                            {timing}
                            {avail === 'filling' && (
                              <span className="ml-1.5 text-[9px] font-bold uppercase text-amber-600">Fast</span>
                            )}
                            {avail === 'sold' && (
                              <span className="ml-1.5 text-[9px] font-bold uppercase">Full</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Availability legend */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm border border-slate-300 bg-white" />Available</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm border border-amber-300 bg-amber-50" />Filling fast</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm border border-slate-200 bg-slate-100" />Housefull</span>
              </div>
            </section>

            {/* Trailer */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Trailer</h2>
              {movie.trailer ? (
                showTrailer ? (
                  <div className="aspect-video w-full overflow-hidden rounded-xl">
                    <iframe
                      src={movie.trailer + '&autoplay=1'}
                      title={`${movie.title} official trailer`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setShowTrailer(true)}
                    className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900 group"
                    aria-label={`Play ${movie.title} trailer`}
                  >
                    <img
                      src={bannerError ? BANNER_FALLBACK : movie.banner}
                      alt=""
                      role="presentation"
                      className="w-full h-full object-cover opacity-60 transition-opacity group-hover:opacity-40"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl transition-transform group-hover:scale-110">
                        <Play size={24} className="text-[#F84464] ml-1" fill="currentColor" />
                      </span>
                    </div>
                    <p className="absolute bottom-4 left-0 right-0 text-center text-sm font-semibold text-white/80">Click to play official trailer</p>
                  </button>
                )
              ) : (
                <div className="aspect-video w-full rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center gap-2">
                  <Play size={32} className="text-slate-300" />
                  <p className="text-sm text-slate-400 font-medium">No trailer available for this movie</p>
                </div>
              )}
            </section>
          </div>

          {/* ── Right sidebar ── */}
          <div className="space-y-4">
            {/* Quick book CTA */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm sticky top-20">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Starting from</p>
              <p className="text-3xl font-extrabold text-slate-900 mb-1">₹180</p>
              <p className="text-xs text-slate-400 mb-5">+ taxes &amp; convenience fee</p>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => {
                  document.getElementById('showtimes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                <Ticket size={16} className="mr-1" />
                Book Tickets
              </Button>
              <p className="mt-3 text-center text-xs text-slate-400 flex items-center justify-center gap-1">
                <Calendar size={11} /> {selectedDate.label} · {theatres.length} theatres
              </p>
            </div>

            {/* Movie info */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-sm">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Movie Info</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Genre',       value: movie.genre },
                  { label: 'Language',    value: movie.language },
                  { label: 'Duration',    value: movie.duration },
                  { label: 'Certificate', value: movie.certificate },
                  { label: 'Rating',      value: `★ ${movie.rating.toFixed(1)} / 5` },
                  { label: 'Format',      value: movie.formats.join(', ') },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center border-b border-slate-50 pb-2 last:border-none last:pb-0">
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide">{label}</span>
                    <span className="text-slate-700 font-semibold text-xs">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Seat Map Modal ── */}
      <SeatMapModal
        open={seatModal.open}
        onClose={() => setSeatModal((s) => ({ ...s, open: false }))}
        movieTitle={movie.title}
        moviePoster={posterError ? POSTER_FALLBACK : movie.poster}
        language={movie.language}
        formats={movie.formats}
        theatre={seatModal.theatre}
        date={selectedDate.label}
        time={seatModal.time}
        realBooking={realBooking}
        onNavigateBookings={() => navigate('/bookings')}
        onConfirm={seatModal.show ? handleConfirm : undefined}
      />
    </div>
  );
}
