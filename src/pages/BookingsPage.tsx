import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Ticket } from 'lucide-react';
import type { Booking } from '../types';
import { bookingsApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { TicketCard } from '../components/tickets/TicketCard';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/States';
import { Button } from '../components/ui/Button';

export function BookingsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    if (!token) return;
    setLoading(true);
    setError(false);
    bookingsApi
      .list(token)
      .then((data) => {
        setBookings(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, [token]);

  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[#08090D] text-slate-100 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#F84464] mb-1">
              <Ticket size={14} />
              <span>Digital Passes</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              My Bookings &amp; Tickets
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Access your scannable QR e-tickets and reservation receipts
            </p>
          </div>
          <Button variant="primary" onClick={() => navigate('/movies')}>
            Book More Movies
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-3xl border border-white/10 bg-[#0F1118] overflow-hidden flex flex-col md:flex-row"
              >
                <div className="flex-1 p-6 space-y-3">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-7 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <Skeleton className="w-full md:w-56 md:shrink-0 h-48" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState onRetry={load} />
        ) : bookings.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#0F1118] p-10 text-center shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-[#F84464]/10 text-[#F84464] border border-[#F84464]/20 flex items-center justify-center mx-auto mb-4">
              <Ticket size={32} />
            </div>
            <h3 className="text-xl font-extrabold text-white">No Tickets Booked Yet</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              You haven't made any reservations. Discover the latest blockbuster movies and pick your favorite seats.
            </p>
            <div className="mt-6">
              <Button variant="primary" onClick={() => navigate('/movies')}>
                Explore Movies Now
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {[...bookings].reverse().map((b) => (
              <TicketCard key={b.id} booking={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
