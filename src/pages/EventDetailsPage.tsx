import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Play, ArrowLeft, ChevronLeft } from 'lucide-react';
import type { ApiEvent } from '../types';
import { eventsApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { BookingFlow } from '../components/booking/BookingFlow';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/States';
import { Modal } from '../components/ui/Modal';

const CATEGORY_ICONS: Record<string, string> = {
  'Music': '🎵', 'Sports': '🏟️', 'Comedy': '🎭', 'Tech Events': '💡', 'Concerts': '🎤', 'default': '🎪',
};

export function EventDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [event, setEvent] = useState<ApiEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [imgError, setImgError] = useState(false);

  const FALLBACK_IMG = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80';

  useEffect(() => {
    if (!id) return;
    eventsApi.get(Number(id))
      .then(data => { setEvent(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <Skeleton className="h-[420px] rounded-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    </div>
  );

  if (error || !event) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <ErrorState onRetry={() => { setError(false); setLoading(true); eventsApi.get(Number(id)).then(d => { setEvent(d); setLoading(false); }).catch(() => { setError(true); setLoading(false); }); }} />
    </div>
  );

  const icon = CATEGORY_ICONS[event.category] ?? CATEGORY_ICONS.default;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="relative h-[420px] lg:h-[520px] overflow-hidden bg-slate-900">
        <img
          src={imgError ? FALLBACK_IMG : (event.image || FALLBACK_IMG)}
          alt={event.title}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover opacity-50"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/10" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className="rounded-full bg-[#F84464] px-3 py-1 text-xs font-bold text-white">
                {icon} {event.category}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight max-w-3xl">
              {event.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-300">
              <span className="flex items-center gap-1.5"><Calendar size={14} className="text-[#F84464]" aria-hidden />{event.date}</span>
              <span className="flex items-center gap-1.5"><MapPin size={14} className="text-[#F84464]" aria-hidden />{event.location}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left: info */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-3">About the event</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{event.description || 'No description provided.'}</p>
            </section>

            {/* Theatres */}
            {event.theatres && event.theatres.length > 0 && (
              <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-3">Venues</h2>
                <ul className="space-y-2">
                  {event.theatres.map(t => (
                    <li key={t} className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin size={14} className="text-[#F84464] shrink-0" aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Right: booking card */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Ticket price</p>
                  <p className="text-2xl font-extrabold text-slate-900">₹{event.price}</p>
                </div>
                <span className="text-sm text-slate-500">onwards</span>
              </div>

              <div className="space-y-2 text-sm text-slate-600 mb-6">
                <div className="flex items-center gap-2"><Calendar size={14} className="text-[#F84464] shrink-0" />{event.date}</div>
                <div className="flex items-center gap-2"><MapPin size={14} className="text-[#F84464] shrink-0" />{event.location}</div>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => {
                  if (!token) { navigate('/login'); return; }
                  setShowBooking(true);
                }}
              >
                Book Tickets
              </Button>

              {!token && (
                <p className="text-center text-xs text-slate-400 mt-2">Sign in required to book</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Booking modal */}
      <Modal open={showBooking} onClose={() => setShowBooking(false)} maxWidth="max-w-2xl">
        <div className="p-6">
          <BookingFlow eventId={event.id} eventTitle={event.title} token={token} />
        </div>
      </Modal>
    </div>
  );
}
