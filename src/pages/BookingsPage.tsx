import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Ticket } from 'lucide-react';
import type { Booking } from '../types';
import { bookingsApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { TicketCard } from '../components/tickets/TicketCard';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
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
    bookingsApi.list(token)
      .then(data => { setBookings(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => { load(); }, [token]);

  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Tickets</h1>
            <p className="text-sm text-slate-500 mt-0.5">Your confirmed bookings and e-tickets</p>
          </div>
          <Button variant="primary" onClick={() => navigate('/')}>Book more</Button>
        </div>

        {loading ? (
          <div className="space-y-6">
            {[1, 2].map(i => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col md:flex-row" aria-hidden>
                <div className="flex-1 p-6 space-y-3">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-7 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <Skeleton className="w-full md:w-48 md:shrink-0 h-48" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState onRetry={load} />
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <EmptyState
              icon={<Ticket size={48} />}
              title="No tickets yet"
              description="You haven't booked any tickets. Explore movies and events to get started."
              action={{ label: 'Explore events', onClick: () => navigate('/') }}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {[...bookings].reverse().map(b => (
              <TicketCard key={b.id} booking={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
