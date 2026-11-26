import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  MonitorPlay,
  Info,
  CreditCard,
  CheckCircle,
  Share2,
  ArrowRight,
  Download,
  Lock,
  Clock,
  RefreshCw,
} from 'lucide-react';
import QRCode from 'qrcode';
import type { Booking, Seat, ScreenLayout, ShowSeatsResponse } from '../../types';
import { showsApi, bookingsApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { CheckoutModal } from '../checkout/CheckoutModal';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_SEATS = 10;
const CONVENIENCE_FEE_PER_SEAT = 40;
const GST_RATE = 0.18;

function generateDefaultSeats(basePrice: number = 250): Seat[] {
  const seats: Seat[] = [];
  const rows: Array<{
    row: string;
    category: 'recliner' | 'premium' | 'standard';
    mult: number;
  }> = [
    { row: 'A', category: 'recliner', mult: 1.6 },
    { row: 'B', category: 'recliner', mult: 1.6 },
    { row: 'C', category: 'premium', mult: 1.25 },
    { row: 'D', category: 'premium', mult: 1.25 },
    { row: 'E', category: 'premium', mult: 1.25 },
    { row: 'F', category: 'standard', mult: 1.0 },
    { row: 'G', category: 'standard', mult: 1.0 },
    { row: 'H', category: 'standard', mult: 1.0 },
  ];
  let idCounter = 1000;
  for (const { row, category, mult } of rows) {
    const rowIdx = row.charCodeAt(0) - 65;
    for (let col = 1; col <= 12; col++) {
      idCounter++;
      const isBooked = (rowIdx * 5 + col * 3) % 7 === 0 || (col === 6 && rowIdx % 2 === 0);
      seats.push({
        id: idCounter,
        seat_number: `${row}${col}`,
        row,
        category,
        price: Math.round(basePrice * mult),
        status: isBooked ? 'booked' : 'available',
      });
    }
  }
  return seats;
}

interface CategoryStyle {
  label: string;
  color: string;
  bgSelected: string;
  bgAvail: string;
  bgLocked: string;
  bgBooked: string;
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  recliner: {
    label: 'VIP Recliner',
    color: '#F59E0B',
    bgSelected:
      'bg-amber-500 border-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/30 scale-105',
    bgAvail:
      'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/25 hover:border-amber-400 cursor-pointer',
    bgLocked: 'bg-amber-950/40 border-amber-700/40 text-amber-500/50 cursor-not-allowed',
    bgBooked: 'bg-white/[0.03] border-white/[0.06] text-slate-600 cursor-not-allowed',
  },
  premium: {
    label: 'Prime / Premium',
    color: '#818CF8',
    bgSelected:
      'bg-indigo-500 border-indigo-400 text-white font-black shadow-lg shadow-indigo-500/30 scale-105',
    bgAvail:
      'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 hover:border-indigo-400 cursor-pointer',
    bgLocked: 'bg-indigo-950/40 border-indigo-700/40 text-indigo-500/50 cursor-not-allowed',
    bgBooked: 'bg-white/[0.03] border-white/[0.06] text-slate-600 cursor-not-allowed',
  },
  standard: {
    label: 'Classic / Standard',
    color: '#34D399',
    bgSelected:
      'bg-emerald-500 border-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/30 scale-105',
    bgAvail:
      'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-400 cursor-pointer',
    bgLocked: 'bg-emerald-950/40 border-emerald-700/40 text-emerald-500/50 cursor-not-allowed',
    bgBooked: 'bg-white/[0.03] border-white/[0.06] text-slate-600 cursor-not-allowed',
  },
};

// ─── QR Canvas Component ──────────────────────────────────────────────────────
function QRCanvas({ value, size = 130 }: { value: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(ref.current, value, {
      width: size,
      margin: 1,
      color: { dark: '#08090D', light: '#ffffff' },
    }).catch(() => {});
  }, [value, size]);
  return <canvas ref={ref} className="rounded-xl shadow-md" aria-label={`QR Code ${value}`} />;
}

// ─── Local Confirm Data ───────────────────────────────────────────────────────
interface LocalConfirm {
  movieTitle: string;
  moviePoster: string;
  language: string;
  formats: string[];
  theatre: string;
  date: string;
  time: string;
  seats: string[];
  total: number;
}

// ─── Confirmation Ticket (Dark Cinematic E-Ticket) ─────────────────────────────
function ConfirmationTicket({
  booking,
  localConfirm,
  onViewBookings,
  onClose,
}: {
  booking?: Booking | null;
  localConfirm?: LocalConfirm | null;
  onViewBookings: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [dlState, setDlState] = useState<'idle' | 'loading' | 'done'>('idle');

  const title = booking?.event_title ?? localConfirm?.movieTitle ?? 'Movie Ticket';
  const theatre = booking?.theatre ?? localConfirm?.theatre ?? 'Cinema Hall';
  const date = booking?.event_date ?? localConfirm?.date ?? '';
  const time = booking?.show_time ?? localConfirm?.time ?? '';
  const total = booking?.total_price ?? localConfirm?.total ?? 0;
  const bookingRef = booking ? `BMT-${booking.id}` : 'BMT-DEMO-001';
  const qrValue = booking?.tickets?.[0]?.qr_code ?? `BOOKMYTIX-${bookingRef}`;
  const poster = localConfirm?.moviePoster ?? '';
  const language = localConfirm?.language ?? 'Hindi';
  const formats = localConfirm?.formats ?? ['2D'];

  const seatLabels = booking
    ? booking.tickets.map((t) => t.seat_number).join(', ')
    : localConfirm?.seats.join(', ') ?? '';
  const seatCount = booking ? booking.tickets.length : localConfirm?.seats.length ?? 0;

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    setDlState('loading');
    try {
      const ticketText = `=== BOOKMYTIX E-TICKET ===\nRef: ${bookingRef}\nMovie: ${title}\nTheatre: ${theatre}\nDate: ${date}\nTime: ${time}\nSeats: ${seatLabels}\nTotal Paid: ₹${total}\nStatus: Confirmed\nQR Token: ${qrValue}\n=========================`;
      const blob = new Blob([ticketText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BookMyTix_${bookingRef}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      setDlState('done');
      setTimeout(() => setDlState('idle'), 2000);
    } catch {
      setDlState('idle');
    }
  };

  return (
    <div className="flex flex-col gap-6 py-2 text-slate-100">
      {/* Success banner */}
      <div className="flex items-center gap-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 px-5 py-4">
        <span className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <CheckCircle size={22} />
        </span>
        <div>
          <p className="font-extrabold text-white text-base">Booking Confirmed!</p>
          <p className="text-xs text-emerald-300 mt-0.5">Your e-ticket &amp; QR entry are ready.</p>
        </div>
        <span className="ml-auto font-mono text-xs sm:text-sm font-bold text-emerald-400 shrink-0 bg-emerald-500/15 px-3 py-1 rounded-lg border border-emerald-500/20">
          {bookingRef}
        </span>
      </div>

      {/* Ticket Card */}
      <div className="flex flex-col sm:flex-row rounded-2xl border border-white/10 bg-[#12141F] overflow-hidden shadow-2xl">
        <div className="flex-1 p-6">
          <div className="flex items-start gap-4 mb-5">
            {poster && (
              <img
                src={poster}
                alt={title}
                className="w-14 sm:w-16 aspect-[2/3] object-cover rounded-xl shrink-0 shadow-lg border border-white/10"
              />
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#F84464] mb-1">
                Verified E-Ticket · BookMyTix
              </p>
              <h3 className="text-lg sm:text-xl font-extrabold text-white leading-tight">{title}</h3>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {language && (
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                    {language}
                  </span>
                )}
                {formats.map((f) => (
                  <span
                    key={f}
                    className="rounded-md bg-[#F84464]/20 border border-[#F84464]/30 px-2 py-0.5 text-[10px] font-bold text-[#F84464]"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5 border-t border-white/[0.08] pt-4 text-sm">
            {[
              { label: 'Date', value: date },
              { label: 'Show Time', value: time },
              { label: 'Theatre', value: theatre },
              { label: `Seats (${seatCount})`, value: seatLabels, accent: true },
              { label: 'Total Paid', value: `₹${total}` },
              { label: 'Booking Ref', value: bookingRef, mono: true },
            ].map(({ label, value, accent, mono }) => (
              <div key={label}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                  {label}
                </p>
                <p
                  className={
                    accent
                      ? 'font-extrabold text-[#F84464]'
                      : mono
                      ? 'font-mono font-bold text-slate-200 text-xs'
                      : 'font-semibold text-white'
                  }
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Perforated divider */}
        <div className="relative flex sm:flex-col items-center justify-center h-6 sm:h-auto sm:w-6 bg-[#12141F]">
          <div className="absolute left-0 -translate-x-1/2 sm:left-1/2 sm:top-0 sm:-translate-x-1/2 sm:-translate-y-1/2 w-4 h-4 rounded-full bg-[#0F1118] border border-white/10" />
          <div className="w-[90%] sm:w-px h-px sm:h-[90%] border-t sm:border-l border-dashed border-white/20" />
          <div className="absolute right-0 translate-x-1/2 sm:right-auto sm:left-1/2 sm:bottom-0 sm:-translate-x-1/2 sm:translate-y-1/2 w-4 h-4 rounded-full bg-[#0F1118] border border-white/10" />
        </div>

        {/* QR Stub */}
        <div className="w-full sm:w-48 bg-[#181B29] flex flex-col items-center justify-center gap-3 py-6 px-4 border-t sm:border-t-0 sm:border-l border-white/10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Digital Gate Pass
          </p>
          <div className="p-2 bg-white rounded-2xl shadow-inner">
            <QRCanvas value={qrValue} size={118} />
          </div>
          <p className="font-mono text-xs font-bold text-white">{bookingRef}</p>
          <p className="text-[9px] text-slate-400 uppercase tracking-wider">Scan at Entrance</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#161925] px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Share2 size={15} /> {copied ? 'Copied!' : 'Share'}
        </button>
        <button
          onClick={handleDownload}
          disabled={dlState === 'loading'}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#161925] px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
        >
          {dlState === 'done' ? (
            <CheckCircle size={15} className="text-emerald-400" />
          ) : (
            <Download size={15} />
          )}
          {dlState === 'loading' ? 'Generating…' : dlState === 'done' ? 'Downloaded!' : 'Download Pass'}
        </button>
        <button
          onClick={onViewBookings}
          className="ml-auto flex items-center gap-1.5 rounded-xl bg-[#F84464] px-5 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-[#e03355] transition-all shadow-lg shadow-[#F84464]/25"
        >
          View in My Tickets <ArrowRight size={15} />
        </button>
      </div>
      <button
        onClick={onClose}
        className="text-center text-xs text-slate-400 hover:text-white transition-colors mt-1"
      >
        Close and return to movie details
      </button>
    </div>
  );
}

// ─── Main SeatMapModal Component ──────────────────────────────────────────────
export interface SeatMapModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  movieTitle: string;
  moviePoster: string;
  language: string;
  formats: string[];
  theatre: string;
  date?: string;
  selectedDate?: string;
  time?: string;
  showTime?: string;
  showId?: number;
  realBooking?: Booking | null;
  onNavigateBookings?: () => void;
  onConfirm?: (seatLabels: string[], total: number) => Promise<void>;
}

export function SeatMapModal({
  open,
  isOpen,
  onClose,
  movieTitle,
  moviePoster,
  language,
  formats,
  theatre,
  date,
  selectedDate,
  time,
  showTime,
  showId,
  realBooking,
  onNavigateBookings,
  onConfirm,
}: SeatMapModalProps) {
  const isModalOpen = open ?? isOpen ?? false;
  const bookingDate = date ?? selectedDate ?? '';
  const bookingTime = time ?? showTime ?? '';

  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { toast } = useToast();

  // Real-time backend seat state
  const [realSeats, setRealSeats] = useState<Seat[]>([]);
  const [_screenLayout, setScreenLayout] = useState<ScreenLayout | null>(null);
  const [screenName, setScreenName] = useState<string>('Main Auditorium');
  const [screenType, setScreenType] = useState<string>('Standard');
  const [basePrice, setBasePrice] = useState<number>(250);
  const [loadingSeats, setLoadingSeats] = useState(false);

  // Selected seat IDs
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);

  // Seat Locking state
  const [lockToken, setLockToken] = useState<string | null>(null);
  const [_lockExpiresAt, setLockExpiresAt] = useState<Date | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isLocking, setIsLocking] = useState(false);

  // Booking completion state
  const [confirmed, setConfirmed] = useState(false);
  const [paying, setPaying] = useState(false);
  const [localConfirm, setLocalConfirm] = useState<LocalConfirm | null>(null);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Load seats from backend
  const loadShowSeats = useCallback(async () => {
    if (!showId) {
      setRealSeats(generateDefaultSeats(basePrice));
      return;
    }
    setLoadingSeats(true);
    try {
      const data = await showsApi.seats(showId, token);
      if ('seats' in data && Array.isArray((data as ShowSeatsResponse).seats)) {
        const fullResp = data as ShowSeatsResponse;
        if (fullResp.seats && fullResp.seats.length > 0) {
          const normalized: Seat[] = (fullResp.seats as any[]).map((s) => {
            const num = String(s.seat_number || s.seatNumber || `${s.row || 'A'}${s.id}`);
            return {
              ...s,
              seat_number: num,
              seatNumber: num,
              row: s.row || (num ? num.charAt(0) : 'A'),
            };
          });
          setRealSeats(normalized);
          setScreenLayout(fullResp.show.screen.layout);
          setScreenName(fullResp.show.screen.name);
          setScreenType(fullResp.show.screen.type);
          setBasePrice(fullResp.show.basePrice);

          // Check if user holds any locked_by_you seats
          const myLocked = normalized.filter((s) => s.status === 'locked_by_you');
          if (myLocked.length > 0 && myLocked[0].remainingSeconds) {
            setSelectedSeatIds(myLocked.map((s) => s.id));
            setRemainingSeconds(myLocked[0].remainingSeconds);
          }
        } else {
          setRealSeats(generateDefaultSeats(fullResp.show?.basePrice || basePrice));
        }
      } else if (Array.isArray(data) && data.length > 0) {
        const normalized: Seat[] = (data as any[]).map((s) => {
          const num = String(s.seat_number || s.seatNumber || `${s.row || 'A'}${s.id}`);
          return {
            ...s,
            seat_number: num,
            seatNumber: num,
            row: s.row || (num ? num.charAt(0) : 'A'),
          };
        });
        setRealSeats(normalized);
      } else {
        setRealSeats(generateDefaultSeats(basePrice));
      }
    } catch {
      setRealSeats(generateDefaultSeats(basePrice));
    } finally {
      setLoadingSeats(false);
    }
  }, [showId, token, basePrice]);

  // Initial load when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setSelectedSeatIds([]);
      setLockToken(null);
      setLockExpiresAt(null);
      setRemainingSeconds(0);
      setConfirmed(false);
      setLocalConfirm(null);
      setCreatedBooking(null);
      if (showId) {
        loadShowSeats();
      } else {
        setRealSeats(generateDefaultSeats(basePrice));
      }
    }
  }, [isModalOpen, showId, loadShowSeats, basePrice]);

  // Real-Time Event Subscription (SSE)
  useEffect(() => {
    if (!isModalOpen || !showId) return;

    const unsubscribe = showsApi.subscribeEvents(showId, (event) => {
      if (event.type === 'seat_locked') {
        const lockedIds = new Set(event.seatIds as number[]);
        setRealSeats((prev) =>
          prev.map((s) =>
            lockedIds.has(s.id)
              ? {
                  ...s,
                  status:
                    user && event.userId === user.id ? 'locked_by_you' : ('locked' as const),
                  lockExpiresAt: event.expiresAt,
                }
              : s,
          ),
        );

        // If someone else locked one of our currently selected seats
        if (user && event.userId !== user.id) {
          setSelectedSeatIds((prev) => {
            const conflicts = prev.filter((id) => lockedIds.has(id));
            if (conflicts.length > 0) {
              toast('One or more of your chosen seats was just reserved by another customer.', 'warning');
              return prev.filter((id) => !lockedIds.has(id));
            }
            return prev;
          });
        }
      } else if (event.type === 'seat_released') {
        const releasedIds = new Set(event.seatIds as number[]);
        setRealSeats((prev) =>
          prev.map((s) =>
            releasedIds.has(s.id) && s.status !== 'booked'
              ? { ...s, status: 'available' as const, lockExpiresAt: null }
              : s,
          ),
        );
      } else if (event.type === 'seat_booked') {
        const bookedIds = new Set(event.seatIds as number[]);
        setRealSeats((prev) =>
          prev.map((s) =>
            bookedIds.has(s.id)
              ? { ...s, status: 'booked' as const, lockExpiresAt: null }
              : s,
          ),
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isModalOpen, showId, user, toast]);

  // Timer countdown for active seat lock
  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast('Your seat reservation lock has expired. Please select your seats again.', 'warning');
          setSelectedSeatIds([]);
          setLockToken(null);
          loadShowSeats();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds, loadShowSeats, toast]);

  // Abandoned Checkout: Release lock on unmount or modal close
  useEffect(() => {
    return () => {
      if (showId && lockToken && token) {
        showsApi.releaseSeats(showId, lockToken, undefined, token).catch(() => {});
      }
    };
  }, [showId, lockToken, token]);

  // Handle ESC key
  useEffect(() => {
    if (!isModalOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isModalOpen, onClose]);

  // Lock background scroll
  useEffect(() => {
    document.body.style.overflow = isModalOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  // Seat toggle selection
  const handleToggleSeat = (seat: Seat) => {
    if (seat.status === 'booked' || seat.status === 'locked') return;

    setSelectedSeatIds((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter((id) => id !== seat.id);
      } else {
        if (prev.length >= MAX_SEATS) {
          toast(`Maximum ${MAX_SEATS} seats allowed per reservation`, 'warning');
          return prev;
        }
        return [...prev, seat.id];
      }
    });
  };

  // Active seat list: use realSeats if available, otherwise generateDefaultSeats
  const activeSeats = useMemo(() => {
    const raw = realSeats.length > 0 ? realSeats : generateDefaultSeats(basePrice);
    return raw.map((s: any) => {
      const num = String(s.seat_number || s.seatNumber || `${s.row || 'A'}${s.id}`);
      return {
        ...s,
        seat_number: num,
        seatNumber: num,
        row: s.row || (num ? num.charAt(0) : 'A'),
      };
    });
  }, [realSeats, basePrice]);

  // Selected seat objects
  const selectedSeats = useMemo(() => {
    return activeSeats.filter((s) => selectedSeatIds.includes(s.id));
  }, [activeSeats, selectedSeatIds]);

  // Price calculations
  const subtotal = useMemo(() => {
    return selectedSeats.reduce((sum, s) => sum + (s.price || basePrice), 0);
  }, [selectedSeats, basePrice]);

  const convFee = selectedSeats.length * CONVENIENCE_FEE_PER_SEAT;
  const gst = Math.round((subtotal + convFee) * GST_RATE);
  const total = subtotal + convFee + gst;

  // Step 1: Lock Seats & Open Checkout
  const handleLockSeats = async () => {
    if (!token) {
      toast('Please sign in to reserve seats', 'warning');
      navigate('/login');
      return;
    }
    if (selectedSeatIds.length === 0) return;

    if (showId) {
      setIsLocking(true);
      try {
        const lockRes = await showsApi.lockSeats(showId, selectedSeatIds, token);
        setLockToken(lockRes.lockToken);
        setLockExpiresAt(new Date(lockRes.expiresAt));
        setRemainingSeconds(lockRes.remainingSeconds);
        toast(`${selectedSeats.length} seat(s) reserved for 8 minutes!`, 'success');
        setIsCheckoutOpen(true);
      } catch (err: unknown) {
        toast(err instanceof Error ? err.message : 'Failed to reserve seats', 'error');
        loadShowSeats();
      } finally {
        setIsLocking(false);
      }
    } else {
      handlePay();
    }
  };

  // Step 2: Pay & Confirm -> Opens FinTech Checkout with F&B and Coupons
  const handlePay = async () => {
    if (selectedSeatIds.length === 0) return;
    if (!token) {
      navigate('/login');
      return;
    }

    if (showId) {
      setIsCheckoutOpen(true);
      return;
    }

    setPaying(true);
    try {
      if (onConfirm) {
        await onConfirm(selectedSeats.map((s) => s.seat_number), total);
        setConfirmed(true);
      } else {
        setLocalConfirm({
          movieTitle,
          moviePoster,
          language,
          formats,
          theatre,
          date: bookingDate,
          time: bookingTime,
          seats: selectedSeats.map((s) => s.seat_number),
          total,
        });
        setConfirmed(true);
      }
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Booking transaction failed', 'error');
      loadShowSeats();
    } finally {
      setPaying(false);
    }
  };

  const handleGoToBookings = () => {
    if (onNavigateBookings) {
      onNavigateBookings();
    } else {
      onClose();
      navigate('/bookings');
    }
  };

  // Group seats by row
  const rows = useMemo(() => {
    const rowMap = new Map<string, Seat[]>();
    for (const s of activeSeats) {
      const seatNum = String(s.seat_number || (s as any).seatNumber || '');
      const r = s.row || (seatNum ? seatNum.charAt(0) : 'A');
      const list = rowMap.get(r) || [];
      list.push(s);
      rowMap.set(r, list);
    }
    return Array.from(rowMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [activeSeats]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Seat Selection Modal"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity"
      />

      {/* Auditorium Container */}
      <div
        className="relative z-10 w-full sm:max-w-4xl bg-[#0F1118] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[95dvh] overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] shrink-0 bg-[#0B0D14]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#F84464]">
                {confirmed ? 'Booking Confirmed' : `${screenName} (${screenType})`}
              </span>
              <span className="text-white/20">·</span>
              <span className="text-[10px] font-semibold text-slate-400">{theatre}</span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-white leading-tight">
              {movieTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {bookingDate} · {bookingTime}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!confirmed && (
              <button
                onClick={loadShowSeats}
                disabled={loadingSeats}
                title="Refresh seat availability"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={loadingSeats ? 'animate-spin' : ''} />
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Lock Expiry Countdown Banner */}
        {remainingSeconds > 0 && !confirmed && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2 font-semibold">
              <Clock size={15} className="animate-pulse text-amber-400" />
              <span>
                Seats held for you! Complete payment within{' '}
                <strong className="font-mono font-black text-white">
                  {formatTimer(remainingSeconds)}
                </strong>
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80">
              Lock Active
            </span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5">
          {confirmed ? (
            <ConfirmationTicket
              booking={createdBooking || realBooking}
              localConfirm={localConfirm}
              onViewBookings={handleGoToBookings}
              onClose={onClose}
            />
          ) : (
            <div className="space-y-6">
              {/* Curved Screen Visualization */}
              <div className="flex flex-col items-center gap-2 pt-2">
                <div className="w-full max-w-lg mx-auto relative">
                  <div className="h-2.5 rounded-t-[100%] bg-gradient-to-r from-transparent via-[#F84464] to-transparent shadow-[0_0_25px_#F84464]" />
                  <div className="h-6 bg-gradient-to-b from-[#F84464]/10 to-transparent" />
                </div>
                <div className="flex items-center gap-2">
                  <MonitorPlay size={13} className="text-[#F84464]" />
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                    ALL EYES THIS WAY · SCREEN
                  </p>
                </div>
              </div>

              {/* Seating Grid */}
              {loadingSeats && realSeats.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <RefreshCw size={28} className="mx-auto text-slate-500 animate-spin" />
                  <p className="text-xs text-slate-400 font-semibold">
                    Connecting to live auditorium reservation stream…
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-w-xl mx-auto w-full overflow-x-auto pb-2">
                  {rows.map(([rowLabel, rowSeatList]) => {
                    const rowCat = rowSeatList[0]?.category || 'standard';
                    const catStyle = CATEGORY_STYLES[rowCat] || CATEGORY_STYLES.standard;

                    return (
                      <div key={rowLabel} className="flex items-center justify-center gap-1.5 min-w-max">
                        {/* Row Identifier */}
                        <span className="w-6 text-[11px] font-bold text-slate-400 text-center shrink-0">
                          {rowLabel}
                        </span>

                        {/* Seats in row */}
                        <div className="flex items-center gap-1.5">
                          {rowSeatList.map((seat) => {
                            const isSelected = selectedSeatIds.includes(seat.id);
                            const isBooked = seat.status === 'booked';
                            const isLockedByOther =
                              seat.status === 'locked' && !isSelected;
                            const isLockedByMe =
                              seat.status === 'locked_by_you' || (isSelected && lockToken);

                            const seatNum = String(seat.seat_number || (seat as any).seatNumber || `${seat.id}`);
                            const seatDisplay = seatNum.replace(/^[A-Za-z]+/, '') || seatNum;

                            let btnStyle = catStyle.bgAvail;
                            let title = `${seatNum} · ₹${seat.price} (${catStyle.label})`;

                            if (isBooked) {
                              btnStyle = catStyle.bgBooked;
                              title = `${seatNum} · Sold out`;
                            } else if (isLockedByOther) {
                              btnStyle = catStyle.bgLocked;
                              title = `${seatNum} · Temporarily held by another user`;
                            } else if (isSelected || isLockedByMe) {
                              btnStyle = catStyle.bgSelected;
                            }

                            return (
                              <button
                                key={seat.id}
                                disabled={isBooked || isLockedByOther}
                                onClick={() => handleToggleSeat(seat)}
                                title={title}
                                aria-label={title}
                                aria-pressed={isSelected}
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border text-[10px] font-bold flex items-center justify-center transition-all select-none relative ${btnStyle}`}
                              >
                                {isBooked ? (
                                  <X size={12} className="text-slate-600" />
                                ) : isLockedByOther ? (
                                  <Lock size={11} className="text-amber-500" />
                                ) : (
                                  seatDisplay
                                )}
                              </button>
                            );
                          })}
                        </div>

                        <span className="w-6 text-[11px] font-bold text-slate-500 text-center shrink-0">
                          {rowLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Category Pricing & Legend */}
              <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 pt-4 border-t border-white/[0.08] text-xs max-w-xl mx-auto w-full">
                {Object.entries(CATEGORY_STYLES).map(([catKey, style]) => {
                  const sampleSeat = realSeats.find((s) => s.category === catKey);
                  const priceLabel = sampleSeat
                    ? `₹${sampleSeat.price}`
                    : catKey === 'recliner'
                    ? `₹${Math.round(basePrice * 1.6)}`
                    : catKey === 'premium'
                    ? `₹${Math.round(basePrice * 1.25)}`
                    : `₹${basePrice}`;

                  return (
                    <div key={catKey} className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-md border"
                        style={{
                          borderColor: style.color,
                          backgroundColor: `${style.color}33`,
                        }}
                      />
                      <span className="font-bold text-slate-200">{style.label}</span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {priceLabel}
                      </span>
                    </div>
                  );
                })}

                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-amber-950/60 border border-amber-600/50 flex items-center justify-center">
                    <Lock size={9} className="text-amber-400" />
                  </span>
                  <span className="text-slate-400">Locked / In Progress</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-md bg-white/[0.04] border border-white/10 flex items-center justify-center">
                    <X size={9} className="text-slate-500" />
                  </span>
                  <span className="text-slate-400">Booked</span>
                </div>
              </div>

              {/* Selection Limit Alert */}
              {selectedSeatIds.length >= MAX_SEATS && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/25 px-4 py-2.5 text-xs text-amber-300 max-w-lg mx-auto w-full">
                  <Info size={14} className="shrink-0" />
                  <span>Maximum of {MAX_SEATS} seats allowed per booking.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        {!confirmed && (
          <div className="shrink-0 border-t border-white/[0.08] bg-[#0A0C13] px-6 py-4">
            {selectedSeatIds.length === 0 ? (
              <p className="text-center text-xs text-slate-400 font-medium py-1">
                Select your preferred auditorium seats above to proceed
              </p>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      {selectedSeats.length} Seat{selectedSeats.length !== 1 ? 's' : ''}:
                    </p>
                    <span className="text-[#F84464] font-extrabold text-sm truncate">
                      {selectedSeats.map((s) => s.seat_number).join(', ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Subtotal ₹{subtotal} + Fee ₹{convFee} + GST ₹{gst} ={' '}
                    <strong className="text-white font-bold">Total ₹{total}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  {showId ? (
                    !lockToken ? (
                      <button
                        onClick={handleLockSeats}
                        disabled={isLocking}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-3 text-xs sm:text-sm font-extrabold shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isLocking ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            <span>Reserving Seats…</span>
                          </>
                        ) : (
                          <>
                            <Lock size={14} />
                            <span>Lock Seats &amp; Checkout</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsCheckoutOpen(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-[#F84464] hover:bg-[#e03355] text-white px-6 py-3 text-xs sm:text-sm font-extrabold shadow-lg shadow-[#F84464]/30 active:scale-95 transition-all cursor-pointer"
                      >
                        <CreditCard size={15} />
                        <span>Proceed to Checkout (₹{total})</span>
                      </button>
                    )
                  ) : (
                    <button
                      onClick={handlePay}
                      disabled={paying}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-[#F84464] hover:bg-[#e03355] text-white px-6 py-3 text-xs sm:text-sm font-extrabold shadow-lg shadow-[#F84464]/30 active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
                    >
                      {paying ? (
                        <>
                          <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          <span>Issuing Tickets…</span>
                        </>
                      ) : (
                        <>
                          <CreditCard size={15} />
                          <span>Confirm &amp; Pay ₹{total}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isCheckoutOpen && showId && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          showId={showId}
          seatIds={selectedSeatIds}
          lockToken={lockToken || undefined}
          token={token || ''}
          onSuccess={async (bookingId) => {
            setIsCheckoutOpen(false);
            if (token) {
              const all = await bookingsApi.list(token).catch(() => []);
              const found = all.find((b) => b.id === bookingId) ?? null;
              if (found) {
                setCreatedBooking({
                  id: found.id,
                  total_price: found.total_price,
                  status: found.status as 'confirmed',
                  created_at: found.created_at,
                  event_title: found.event_title,
                  event_date: found.event_date,
                  event_location: found.event_location,
                  theatre: found.theatre,
                  show_time: found.show_time,
                  tickets: found.tickets.map((t) => ({
                    id: t.id,
                    seat_number: t.seat_number,
                    qr_code: t.qr_code,
                  })),
                });
              }
            }
            setConfirmed(true);
            loadShowSeats();
          }}
        />
      )}
    </div>
  );
}
