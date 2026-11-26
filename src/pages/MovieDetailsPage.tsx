import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Star,
  Clock,
  Play,
  Film,
  ChevronLeft,
  ShieldCheck,
  MapPin,
  Calendar,
  Share2,
  Check,
  Sparkles,
  X,
  MessageSquare,
  Send,
  User as UserIcon,
} from 'lucide-react';
import type { MovieDetailResponse, Booking } from '../types';
import { movies as staticMovies } from '../data/movies';
import { useAuth } from '../hooks/useAuth';
import { moviesApi, showsApi, bookingsApi } from '../services/api';
import { Button } from '../components/ui/Button';
import { SeatMapModal } from '../components/booking/SeatMapModal';
import { useToast } from '../hooks/useToast';

const BANNER_FALLBACK =
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1600&q=80';
const POSTER_FALLBACK =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80';

function getDatePills() {
  const pills = [];
  const today = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const label =
      i === 0
        ? 'Today'
        : i === 1
        ? 'Tomorrow'
        : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    const value = d.toISOString().slice(0, 10);
    pills.push({
      label,
      value,
      dayNum: d.getDate(),
      month: d.toLocaleDateString('en-IN', { month: 'short' }),
      weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }),
    });
  }
  return pills;
}

type AvailSlot = 'available' | 'filling' | 'sold';
function getSlotStatus(timing: string, dateIdx: number, theatreIdx: number): AvailSlot {
  const hash = (timing.charCodeAt(0) + dateIdx * 5 + theatreIdx * 11) % 6;
  if (hash === 0) return 'sold';
  if (hash === 1 || hash === 2) return 'filling';
  return 'available';
}

export function MovieDetailsPage({ selectedCity = 'Mumbai' }: { selectedCity?: string }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { toast } = useToast();

  const [backendMovie, setBackendMovie] = useState<MovieDetailResponse | null>(null);
  const [loadingBackend, setLoadingBackend] = useState(true);

  const [bannerError, setBannerError] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [copied, setCopied] = useState(false);

  // Review Form
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Date selection
  const datePills = useMemo(() => getDatePills(), []);
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState<string>('All');

  // Seat map modal
  const [seatModal, setSeatModal] = useState<{
    open: boolean;
    theatre: string;
    time: string;
    showId?: number;
  }>({ open: false, theatre: '', time: '' });

  const [realBooking, setRealBooking] = useState<Booking | null>(null);

  // Fetch movie details from backend API
  useEffect(() => {
    if (!id) return;
    setLoadingBackend(true);
    moviesApi
      .get(id, selectedCity)
      .then((data) => {
        setBackendMovie(data);
        setLoadingBackend(false);
      })
      .catch(() => {
        setLoadingBackend(false);
      });
  }, [id, selectedCity]);

  // Fallback static movie
  const staticMatch = useMemo(() => {
    const normId = (id || '').toLowerCase().trim();
    const slugified = normId.replace(/\s+/g, '-');
    return staticMovies.find(
      (m) =>
        m.id.toLowerCase() === normId ||
        m.id.toLowerCase() === slugified ||
        m.title.toLowerCase().replace(/\s+/g, '-') === slugified,
    );
  }, [id]);

  // Unified movie entity
  const movie = useMemo(() => {
    if (backendMovie) {
      return {
        id: String(backendMovie.id),
        title: backendMovie.title,
        slug: backendMovie.slug,
        description: backendMovie.description,
        poster: backendMovie.poster,
        banner: backendMovie.backdrop || backendMovie.poster,
        trailer: backendMovie.trailerUrl || null,
        genre: backendMovie.genre,
        language: backendMovie.language,
        duration: backendMovie.duration,
        certificate: backendMovie.certification,
        rating: backendMovie.rating,
        votes: backendMovie.voteCount,
        releaseDate: backendMovie.releaseDate,
        director: backendMovie.crew?.find((c) => c.role === 'Director')?.name || 'Director',
        cast: backendMovie.cast?.map((c) => c.name) || [],
        castDetails: backendMovie.cast || [],
        crewDetails: backendMovie.crew || [],
        formats: backendMovie.formats || ['2D', '3D', 'IMAX 3D'],
        availableTheatres: backendMovie.cinemas?.map((c) => c.name) || ['PVR Cinemas', 'INOX', 'Cinepolis'],
        showTimings: ['10:30 AM', '02:00 PM', '06:15 PM', '09:30 PM'],
        cinemas: backendMovie.cinemas || [],
        reviews: backendMovie.reviews || [],
      };
    }

    if (staticMatch) {
      return {
        ...staticMatch,
        slug: staticMatch.title.toLowerCase().replace(/\s+/g, '-'),
        castDetails: staticMatch.cast.map(
          (name): { name: string; role: string; image?: string } => ({
            name,
            role: 'Lead Cast',
          }),
        ),
        crewDetails: [{ name: staticMatch.director, role: 'Director' }],
        cinemas: [],
        reviews: [],
      };
    }

    return null;
  }, [backendMovie, staticMatch]);

  if (!movie && !loadingBackend) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08090D] px-4">
        <div className="text-center p-8 rounded-2xl bg-[#0F1118] border border-white/10 max-w-md">
          <Film size={48} className="mx-auto text-slate-500 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Movie Not Found</h2>
          <p className="text-sm text-slate-400 mb-6">
            The requested title is not currently available in our theatrical catalog.
          </p>
          <Button variant="primary" onClick={() => navigate('/movies')}>
            Browse All Movies
          </Button>
        </div>
      </div>
    );
  }

  if (!movie) return null;

  const selectedDate = datePills[selectedDateIdx];

  const openSeatModal = (theatreName: string, timeStr: string, showId?: number) => {
    if (!token) {
      navigate('/login');
      return;
    }
    setRealBooking(null);
    setSeatModal({ open: true, theatre: theatreName, time: timeStr, showId });
  };

  const handleConfirm = async (seatLabels: string[], _total: number) => {
    if (!token) return;
    try {
      if (seatModal.showId) {
        const data = await showsApi.seats(seatModal.showId);
        const seatData = Array.isArray(data) ? data : data.seats;
        const seatIds = (seatData as any[])
          .filter((s) => {
            const num = s.seat_number || s.seatNumber || '';
            return seatLabels.some((l) => num === l || l.startsWith(num));
          })
          .map((s) => s.id);

        const targetIds =
          seatIds.length > 0
            ? seatIds
            : (seatData as any[]).filter((s) => s.status === 'available').slice(0, seatLabels.length).map((s) => s.id);

        const { booking_id } = await bookingsApi.create(seatModal.showId, targetIds, token);
        const all = await bookingsApi.list(token);
        const found = all.find((b) => b.id === booking_id) ?? all[all.length - 1];
        setRealBooking(found);
      }
    } catch {
      // Fallback handled by SeatMapModal
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      navigate('/login');
      return;
    }
    if (!userComment.trim()) return;

    setSubmittingReview(true);
    try {
      await moviesApi.addReview(id!, userRating, userComment, token);
      toast('Review submitted! Thank you.', 'success');
      setUserComment('');
      // Refresh movie
      const updated = await moviesApi.get(id!, selectedCity);
      setBackendMovie(updated);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to submit review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090D] text-slate-100">
      {/* ── 1. Hero Cinematic Backdrop Banner ── */}
      <div className="relative h-[440px] sm:h-[540px] lg:h-[600px] overflow-hidden bg-black">
        <img
          src={bannerError ? BANNER_FALLBACK : movie.banner || BANNER_FALLBACK}
          alt={movie.title}
          onError={() => setBannerError(true)}
          className="w-full h-full object-cover opacity-35 scale-105 filter blur-[1px]"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08090D] via-[#08090D]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08090D] via-transparent to-[#08090D]/80" />

        {/* Back navigation & Share */}
        <div className="absolute top-6 left-0 right-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              <ChevronLeft size={16} /> Back
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              {copied ? <Check size={16} className="text-emerald-400" /> : <Share2 size={16} />}
              <span>{copied ? 'Link Copied!' : 'Share Movie'}</span>
            </button>
          </div>
        </div>

        {/* Floating Hero Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 pb-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6 sm:gap-8">
              {/* Poster Card */}
              <div className="relative shrink-0 w-36 sm:w-48 lg:w-56 aspect-[2/3] rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-[#0F1118] group">
                <img
                  src={posterError ? POSTER_FALLBACK : movie.poster || POSTER_FALLBACK}
                  alt={movie.title}
                  onError={() => setPosterError(true)}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute top-2.5 left-2.5 rounded-md bg-black/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-black tracking-wider text-white border border-white/20">
                  {movie.certificate}
                </span>
                {movie.trailer && (
                  <button
                    onClick={() => setShowTrailer(true)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity duration-300 text-white font-bold text-xs"
                    aria-label="Play trailer"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#F84464] flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                      <Play size={20} fill="white" className="ml-1" />
                    </div>
                    <span>Watch Trailer</span>
                  </button>
                )}
              </div>

              {/* Metadata */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#F84464]/20 text-[#F84464] text-xs font-bold border border-[#F84464]/30">
                    {movie.genre}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 text-xs font-medium border border-white/10">
                    {movie.language}
                  </span>
                  {movie.formats.map((fmt) => (
                    <span
                      key={fmt}
                      className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 text-[10px] font-bold border border-indigo-500/30"
                    >
                      {fmt}
                    </span>
                  ))}
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight mb-3">
                  {movie.title}
                </h1>

                {/* Rating & Stats Bar */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-300 mb-4">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <Star size={18} fill="#F59E0B" />
                    <span className="text-white text-base font-extrabold">{movie.rating.toFixed(1)}</span>
                    <span className="text-slate-400 text-xs font-normal">
                      / 10 ({((movie.votes ?? 15400)).toLocaleString()} votes)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Clock size={16} className="text-[#F84464]" />
                    <span>{movie.duration}</span>
                  </div>
                  {movie.releaseDate && (
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Calendar size={16} className="text-[#F84464]" />
                      <span>
                        Release:{' '}
                        {new Date(movie.releaseDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <a href="#showtimes">
                    <Button variant="primary" size="lg">
                      Book Tickets
                    </Button>
                  </a>
                  {movie.trailer && (
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={() => setShowTrailer(true)}
                      leftIcon={<Play size={16} fill="white" />}
                    >
                      Watch Trailer
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Movie Synopsis & Cast Section ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-b border-white/[0.06]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="text-lg font-bold text-white mb-2">About the Movie</h2>
              <p className="text-slate-300 leading-relaxed text-sm sm:text-base">{movie.description}</p>
            </div>

            {/* Cast with Roles */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
                Starring Cast
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {movie.castDetails.slice(0, 8).map((actor, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#0F1118] border border-white/10"
                  >
                    {actor.image ? (
                      <img
                        src={actor.image}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#161925] border border-white/10 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                        {actor.name[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{actor.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{actor.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Director & Crew */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">
                Direction &amp; Production
              </h3>
              <div className="flex flex-wrap gap-2">
                {movie.crewDetails.map((member, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-[#0F1118] border border-white/10 text-xs text-slate-300"
                  >
                    <strong className="text-white">{member.name}</strong> ({member.role})
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Guarantee Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0F1118] p-5 h-fit space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">BookMyTix Verified</h4>
                <p className="text-xs text-slate-400">Guaranteed real cinema seat reservation</p>
              </div>
            </div>
            <div className="border-t border-white/[0.06] pt-3 text-xs text-slate-400 space-y-2">
              <p className="flex items-center gap-2">
                <Sparkles size={13} className="text-[#F84464]" /> Instant Scannable QR Gate Pass
              </p>
              <p className="flex items-center gap-2">
                <Sparkles size={13} className="text-[#F84464]" /> Free Cancellation up to 2h before show
              </p>
              <p className="flex items-center gap-2">
                <Sparkles size={13} className="text-[#F84464]" /> Concessions vouchers available at checkout
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Date Selection & Showtimes Section ── */}
      <section id="showtimes" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white tracking-tight mb-2">
            Select Date &amp; Theatres in {selectedCity}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Pick your preferred screening time to reserve luxury seats
          </p>
        </div>

        {/* Date Selector Pills */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-3 mb-8">
          {datePills.map((pill, idx) => {
            const isSelected = idx === selectedDateIdx;
            return (
              <button
                key={pill.value}
                onClick={() => setSelectedDateIdx(idx)}
                className={`flex flex-col items-center justify-center min-w-[76px] py-3 px-4 rounded-2xl border transition-all duration-200 ${
                  isSelected
                    ? 'bg-[#F84464] border-[#F84464] text-white shadow-lg shadow-[#F84464]/30'
                    : 'bg-[#0F1118] border-white/10 text-slate-400 hover:border-white/25 hover:text-white'
                }`}
              >
                <span className="text-[11px] font-bold uppercase tracking-wider">{pill.weekday}</span>
                <span className="text-xl font-extrabold my-0.5">{pill.dayNum}</span>
                <span className="text-[10px] font-medium">{pill.month}</span>
              </button>
            );
          })}
        </div>

        {/* Format Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2">
            Screen Format:
          </span>
          {['All', ...movie.formats].map((fmt) => (
            <button
              key={fmt}
              onClick={() => setSelectedFormat(fmt)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                selectedFormat === fmt
                  ? 'bg-white text-black'
                  : 'bg-[#161925] text-slate-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>

        {/* Cinemas & Timings */}
        <div className="space-y-4">
          {movie.cinemas.length > 0 ? (
            movie.cinemas.map((cinema) => (
              <div
                key={cinema.id}
                className="rounded-2xl border border-white/[0.08] bg-[#0F1118] p-5 sm:p-6 transition-all hover:border-white/15"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/[0.06]">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[#F84464] flex items-center justify-center shrink-0 mt-0.5">
                      <Film size={20} />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white">{cinema.name}</h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <MapPin size={12} className="text-slate-400" />
                        <span>{cinema.location || cinema.city} &bull; M-Ticket &bull; F&amp;B Service</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Available
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400" /> Filling Fast
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {cinema.shows.map((show) => {
                    const timeStr = new Date(show.startsAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    });
                    return (
                      <button
                        key={show.id}
                        onClick={() => openSeatModal(cinema.name, timeStr, show.id)}
                        className="flex flex-col items-center justify-center px-4 py-2.5 rounded-xl border border-white/10 bg-[#161925] text-slate-200 hover:border-[#F84464] hover:bg-[#F84464]/10 hover:text-[#F84464] transition-all hover:scale-105"
                      >
                        <span className="text-sm font-black">{timeStr}</span>
                        <span className="text-[9px] font-semibold text-emerald-400 mt-0.5">
                          {show.screenType || 'IMAX'} &bull; ₹{show.price}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            movie.availableTheatres.map((theatreName, tIdx) => (
              <div
                key={theatreName}
                className="rounded-2xl border border-white/[0.08] bg-[#0F1118] p-5 sm:p-6 transition-all hover:border-white/15"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/[0.06]">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[#F84464] flex items-center justify-center shrink-0 mt-0.5">
                      <Film size={20} />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white">{theatreName}</h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <MapPin size={12} className="text-slate-400" />
                        <span>Multiple luxury screens · M-Ticket Available</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {movie.showTimings.map((time) => {
                    const status = getSlotStatus(time, selectedDateIdx, tIdx);
                    const isSold = status === 'sold';
                    const isFilling = status === 'filling';

                    return (
                      <button
                        key={time}
                        disabled={isSold}
                        onClick={() => openSeatModal(theatreName, time)}
                        className={`flex flex-col items-center justify-center px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                          isSold
                            ? 'border-white/[0.05] bg-white/[0.02] text-slate-600 line-through cursor-not-allowed'
                            : isFilling
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:border-amber-400 hover:scale-105'
                            : 'border-white/10 bg-[#161925] text-slate-200 hover:border-[#F84464] hover:bg-[#F84464]/10 hover:text-[#F84464] hover:scale-105'
                        }`}
                      >
                        <span className="text-sm font-black">{time}</span>
                        <span
                          className={`text-[9px] font-semibold mt-0.5 ${
                            isSold ? 'text-slate-600' : isFilling ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {isSold ? 'Sold Out' : isFilling ? 'Filling Fast' : 'Available'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── 4. User Reviews & Ratings Section ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-white/[0.08]">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#F84464] mb-1.5">
              <MessageSquare size={14} />
              <span>Audience Feedback</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Movie Reviews &amp; Ratings</h2>
          </div>

          {/* Add Review Form */}
          {token && (
            <form
              onSubmit={handleSubmitReview}
              className="w-full md:max-w-md bg-[#0F1118] border border-white/10 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Leave your review</span>
                {/* Star rating selector */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setUserRating(star)}
                      className="p-0.5 hover:scale-110 transition-transform"
                    >
                      <Star
                        size={16}
                        fill={star <= userRating ? '#F59E0B' : 'transparent'}
                        className={star <= userRating ? 'text-amber-400' : 'text-slate-600'}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={2}
                required
                value={userComment}
                onChange={(e) => setUserComment(e.target.value)}
                placeholder="Share your thoughts on the performances, music, direction..."
                className="w-full rounded-xl border border-white/10 bg-[#161925] p-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#F84464]"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submittingReview}
                  rightIcon={<Send size={12} />}
                >
                  {submittingReview ? 'Posting…' : 'Post Review'}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Reviews List */}
        {movie.reviews.length === 0 ? (
          <div className="text-center py-10 rounded-2xl bg-[#0F1118] border border-white/[0.08] text-slate-400 text-xs">
            No audience reviews yet. Be the first to share your thoughts after watching!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {movie.reviews.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-2xl bg-[#0F1118] border border-white/10 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <UserIcon size={12} className="text-[#F84464]" />
                      {r.userName}
                    </span>
                    <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                      <Star size={11} fill="#F59E0B" />
                      <span>{r.rating}.0 / 5</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{r.comment}</p>
                </div>
                <span className="text-[10px] text-slate-500">
                  {new Date(r.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 5. Trailer Modal ── */}
      {showTrailer && movie.trailer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden bg-black border border-white/20 shadow-2xl">
            <button
              onClick={() => setShowTrailer(false)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/70 border border-white/20 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors"
              aria-label="Close trailer"
            >
              <X size={18} />
            </button>
            <div className="aspect-video w-full">
              <iframe
                src={`${movie.trailer}?autoplay=1&rel=0`}
                title={`${movie.title} Trailer`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Seat Map Modal ── */}
      {seatModal.open && (
        <SeatMapModal
          isOpen={seatModal.open}
          onClose={() => setSeatModal({ open: false, theatre: '', time: '' })}
          movieTitle={movie.title}
          moviePoster={movie.poster}
          language={movie.language}
          formats={movie.formats}
          theatre={seatModal.theatre}
          showTime={seatModal.time}
          selectedDate={selectedDate.value}
          showId={seatModal.showId}
          realBooking={realBooking}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
