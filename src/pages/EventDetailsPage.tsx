import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, ChevronLeft, Sparkles, ShieldCheck } from 'lucide-react';
import type { ApiEvent } from '../types';
import { eventsApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { BookingFlow } from '../components/booking/BookingFlow';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/States';
import { Modal } from '../components/ui/Modal';

const CATEGORY_ICONS: Record<string, string> = {
  Music: '🎵',
  Sports: '🏟️',
  Comedy: '🎭',
  'Tech Events': '💡',
  Concerts: '🎤',
  default: '🎪',
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

  const FALLBACK_IMG =
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80';

  useEffect(() => {
    if (!id) return;
    eventsApi
      .get(Number(id))
      .then((data) => {
        setEvent(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08090D] pb-16">
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
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#08090D] flex items-center justify-center p-4">
        <ErrorState
          onRetry={() => {
            setError(false);
            setLoading(true);
            eventsApi
              .get(Number(id))
              .then((d) => {
                setEvent(d);
                setLoading(false);
              })
              .catch(() => {
                setError(true);
                setLoading(false);
              });
          }}
        />
      </div>
    );
  }

  const icon = CATEGORY_ICONS[event.category] ?? CATEGORY_ICONS.default;

  return (
    <div className="min-h-screen bg-[#08090D] text-slate-100">
      {/* Hero Banner */}
      <div className="relative h-[420px] lg:h-[520px] overflow-hidden bg-black">
        <img
          src={imgError ? FALLBACK_IMG : event.image || FALLBACK_IMG}
          alt={event.title}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover opacity-45"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08090D] via-[#08090D]/60 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 flex items-center gap-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-white/10 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className="rounded-full bg-[#F84464] px-3 py-1 text-xs font-bold text-white shadow-md">
                {icon} {event.category}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight max-w-3xl">
              {event.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-300">
              <span className="flex items-center gap-1.5">
                <Calendar size={15} className="text-[#F84464]" aria-hidden />
                {event.date}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={15} className="text-[#F84464]" aria-hidden />
                {event.location}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white mb-2">Event Overview</h2>
              <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
                {event.description || 'Join us for this exciting live event experience. Secure your verified digital tickets on BookMyTix.'}
              </p>
            </div>
          </div>

          {/* Booking card */}
          <div>
            <div className="rounded-2xl border border-white/10 bg-[#0F1118] p-6 shadow-xl space-y-5 sticky top-24">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Starting from
                </span>
                <p className="text-3xl font-black text-white mt-1">
                  ₹{event.price || 499}
                </p>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => {
                  if (!token) {
                    navigate('/login');
                  } else {
                    setShowBooking(true);
                  }
                }}
              >
                Book Passes Now
              </Button>

              <div className="border-t border-white/[0.08] pt-4 space-y-2 text-xs text-slate-400">
                <p className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-400" /> 100% Buyer Guarantee
                </p>
                <p className="flex items-center gap-2">
                  <Sparkles size={14} className="text-[#F84464]" /> Instant Scannable QR Code
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking flow modal */}
      {showBooking && (
        <Modal
          open={showBooking}
          onClose={() => setShowBooking(false)}
          title={`Book: ${event.title}`}
          maxWidth="max-w-2xl"
        >
          <BookingFlow
            eventId={event.id}
            eventTitle={event.title}
            token={token}
          />
        </Modal>
      )}
    </div>
  );
}
