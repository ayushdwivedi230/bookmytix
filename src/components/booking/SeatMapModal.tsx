import { useState, useEffect, useMemo, useRef } from 'react';
import { X, MonitorPlay, Info, CreditCard, CheckCircle, Share2, ArrowRight, Download } from 'lucide-react';
import QRCode from 'qrcode';
import type { Booking } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_SEATS = 10;
const CONVENIENCE_FEE = 40; // per seat

interface SeatTier {
  label: string;
  rows: string[];
  price: number;
  color: string;
  bgSelected: string;
  bgAvail: string;
}

const TIERS: SeatTier[] = [
  {
    label: 'VIP / Recliner',
    rows: ['A', 'B'],
    price: 350,
    color: '#F59E0B',
    bgSelected: 'bg-amber-500 border-amber-500 text-white shadow-md',
    bgAvail: 'bg-amber-50 border-amber-400 text-amber-700 hover:bg-amber-100 cursor-pointer',
  },
  {
    label: 'Executive',
    rows: ['C', 'D', 'E'],
    price: 250,
    color: '#818CF8',
    bgSelected: 'bg-indigo-500 border-indigo-500 text-white shadow-md',
    bgAvail: 'bg-indigo-50 border-indigo-400 text-indigo-700 hover:bg-indigo-100 cursor-pointer',
  },
  {
    label: 'Normal',
    rows: ['F', 'G', 'H'],
    price: 180,
    color: '#34D399',
    bgSelected: 'bg-emerald-500 border-emerald-500 text-white shadow-md',
    bgAvail: 'bg-emerald-50 border-emerald-400 text-emerald-700 hover:bg-emerald-100 cursor-pointer',
  },
];

function getTier(row: string): SeatTier {
  return TIERS.find((t) => t.rows.includes(row)) ?? TIERS[TIERS.length - 1];
}

function isPreBooked(row: string, col: number): boolean {
  const rowIdx = row.charCodeAt(0) - 65;
  return (rowIdx * 7 + col * 3) % 5 === 0;
}

interface SeatData {
  id: string;
  row: string;
  col: number;
  label: string;
  booked: boolean;
}

function generateSeats(): SeatData[] {
  const seats: SeatData[] = [];
  const COLS = 12;
  for (const tier of TIERS) {
    for (const row of tier.rows) {
      for (let col = 1; col <= COLS; col++) {
        seats.push({ id: `${row}${col}`, row, col, label: `${row}${col}`, booked: isPreBooked(row, col) });
      }
    }
  }
  return seats;
}

// ─── QR Canvas ────────────────────────────────────────────────────────────────
function QRCanvas({ value, size = 140 }: { value: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(ref.current, value, { width: size, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } }).catch(() => {});
  }, [value, size]);
  return <canvas ref={ref} className="rounded-lg" aria-label={`QR ${value}`} />;
}

// ─── Local confirm type ───────────────────────────────────────────────────────
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

// ─── Confirmation Ticket ──────────────────────────────────────────────────────
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
  const [bookingRef] = useState(`BMX-${Math.floor(Math.random() * 90000 + 10000)}`);
  const qrValue = booking ? (booking.tickets?.[0]?.qr_code || `BMX-${booking.id}`) : `BMX-LOCAL-${Date.now()}`;

  const title = booking?.event_title ?? localConfirm?.movieTitle ?? '';
  const theatre = booking?.theatre ?? localConfirm?.theatre ?? '';
  const date = booking?.event_date ?? localConfirm?.date ?? '';
  const time = booking?.show_time ?? localConfirm?.time ?? '';
  const seats = booking?.tickets?.map((t) => t.seat_number).join(', ') ?? localConfirm?.seats.join(', ') ?? '';
  const total = booking?.total_price ?? localConfirm?.total ?? 0;
  const poster = localConfirm?.moviePoster ?? '';
  const language = localConfirm?.language ?? '';
  const formats = localConfirm?.formats ?? [];
  const seatCount = booking?.tickets?.length ?? localConfirm?.seats.length ?? 0;

  const [copied, setCopied] = useState(false);
  const [dlState, setDlState] = useState<'idle' | 'loading' | 'done'>('idle');

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`I just booked tickets for "${title}" at BookMyTix! Ref: ${bookingRef}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

  const handleDownload = async () => {
    setDlState('loading');
    try {
      const qrDataUrl = await QRCode.toDataURL(qrValue, { width: 240, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } });
      const formatsHtml = formats.map((f) => `<span>${f}</span>`).join('');
      const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>BookMyTix — ${bookingRef}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
body{font-family:Inter,system-ui,sans-serif;background:#f1f5f9;display:flex;align-items:flex-start;justify-content:center;padding:48px 20px;min-height:100vh;margin:0}
.ticket{background:#fff;border-radius:20px;box-shadow:0 8px 40px rgba(0,0,0,.14);max-width:620px;width:100%;display:flex;overflow:hidden}
.main{flex:1;padding:32px}.stub{width:200px;background:#f8fafc;border-left:2px dashed #e2e8f0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:32px 20px}
.badge{background:#F84464;color:#fff;border-radius:999px;padding:3px 14px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;display:inline-block;margin-bottom:18px}
h1{font-size:22px;font-weight:900;color:#0f172a;margin:0 0 6px}.meta{font-size:12px;color:#64748b;margin-bottom:24px}.meta span{margin-right:10px}
hr{border:none;border-top:1px solid #f1f5f9;margin:16px 0}.row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px}
.lbl{color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}.val{font-weight:700;color:#0f172a}
.seats-val{color:#F84464;font-weight:800}.total{font-size:16px;font-weight:900;color:#0f172a}
.ref{font-family:monospace;font-weight:700;color:#0f172a;font-size:13px}.scan{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em}
</style></head><body><div class="ticket"><div class="main">
<span class="badge">Confirmed</span><h1>${title}</h1><p class="meta"><span>${language}</span>${formatsHtml}</p><hr/>
<div class="row"><span class="lbl">Date & Time</span><span class="val">${date} · ${time}</span></div>
<div class="row"><span class="lbl">Theatre</span><span class="val">${theatre}</span></div>
<div class="row"><span class="lbl">Seats</span><span class="val seats-val">${seats}</span></div><hr/>
<div class="row"><span class="lbl">Booking ID</span><span class="val">${bookingRef}</span></div>
<div class="row"><span class="lbl">Total Paid</span><span class="val total">₹${total}</span></div>
</div><div class="stub"><p class="lbl">Gate Stub</p><img src="${qrDataUrl}" width="160" height="160" alt="QR Code" style="border-radius:10px"/><p class="ref">${bookingRef}</p><p class="scan">Scan at entry</p></div></div></body></html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `bookmytix-${bookingRef}.html`; a.click();
      URL.revokeObjectURL(url);
      setDlState('done');
      setTimeout(() => setDlState('idle'), 2000);
    } catch { setDlState('idle'); }
  };

  return (
    <div className="flex flex-col gap-5 py-2">
      {/* Success banner */}
      <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4">
        <span className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
          <CheckCircle size={20} className="text-emerald-600" />
        </span>
        <div>
          <p className="font-bold text-emerald-800 text-sm">Booking Confirmed!</p>
          <p className="text-xs text-emerald-600 mt-0.5">Your e-tickets are ready to use at the venue.</p>
        </div>
        <span className="ml-auto font-mono text-sm font-bold text-emerald-700 shrink-0">{bookingRef}</span>
      </div>

      {/* Ticket */}
      <div className="flex flex-col sm:flex-row rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="flex-1 p-6">
          <div className="flex items-start gap-4 mb-5">
            {poster && (
              <img src={poster} alt={title} className="w-14 aspect-[2/3] object-cover rounded-lg shrink-0 shadow-sm" />
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">E-Ticket · BookMyTix</p>
              <h3 className="text-lg font-extrabold text-slate-900 leading-tight">{title}</h3>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {language && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{language}</span>}
                {formats.map((f) => <span key={f} className="rounded-md bg-[#F84464]/10 px-2 py-0.5 text-[10px] font-bold text-[#F84464]">{f}</span>)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
            {[
              { label: 'Date', value: date },
              { label: 'Show Time', value: time },
              { label: 'Theatre', value: theatre },
              { label: `Seats (${seatCount})`, value: seats, accent: true },
              { label: 'Total Paid', value: `₹${total}` },
              { label: 'Booking ID', value: bookingRef, mono: true },
            ].map(({ label, value, accent, mono }) => (
              <div key={label}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
                <p className={accent ? 'font-extrabold text-[#F84464]' : mono ? 'font-mono font-bold text-slate-700 text-xs' : 'font-semibold text-slate-800'}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Dashed divider */}
        <div className="relative flex sm:flex-col items-center justify-center h-6 sm:h-auto sm:w-6">
          <div className="absolute left-0 -translate-x-1/2 sm:left-1/2 sm:top-0 sm:-translate-x-1/2 sm:-translate-y-1/2 w-4 h-4 rounded-full bg-slate-50 border border-slate-200" />
          <div className="w-[90%] sm:w-px h-px sm:h-[90%] border-t sm:border-l border-dashed border-slate-300" />
          <div className="absolute right-0 translate-x-1/2 sm:right-auto sm:left-1/2 sm:bottom-0 sm:-translate-x-1/2 sm:translate-y-1/2 w-4 h-4 rounded-full bg-slate-50 border border-slate-200" />
        </div>

        {/* QR stub */}
        <div className="w-full sm:w-44 bg-slate-50 flex flex-col items-center justify-center gap-3 py-6 px-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Gate Stub</p>
          <QRCanvas value={qrValue} size={112} />
          <p className="font-mono text-xs font-bold text-slate-700">{bookingRef}</p>
          <p className="text-[9px] text-slate-400 uppercase tracking-wider">Scan at entry</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        <button onClick={handleShare} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
          <Share2 size={14} /> {copied ? 'Copied!' : 'Share'}
        </button>
        <button onClick={handleDownload} disabled={dlState === 'loading'} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
          {dlState === 'done' ? <CheckCircle size={14} /> : <Download size={14} />}
          {dlState === 'loading' ? 'Generating…' : dlState === 'done' ? 'Downloaded!' : 'Download Ticket'}
        </button>
        <button onClick={onViewBookings} className="ml-auto flex items-center gap-1.5 rounded-xl bg-[#F84464] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#e03355] transition-colors">
          View My Bookings <ArrowRight size={14} />
        </button>
      </div>
      <button onClick={onClose} className="text-center text-xs text-slate-400 hover:text-slate-600 transition-colors mt-1">Close and return to movie</button>
    </div>
  );
}

// ─── Main SeatMapModal ─────────────────────────────────────────────────────────
export interface SeatMapModalProps {
  open: boolean;
  onClose: () => void;
  movieTitle: string;
  moviePoster: string;
  language: string;
  formats: string[];
  theatre: string;
  date: string;
  time: string;
  realBooking?: Booking | null;
  onNavigateBookings: () => void;
  onConfirm?: (seatLabels: string[], total: number) => Promise<void>;
}

export function SeatMapModal({
  open, onClose, movieTitle, moviePoster, language, formats, theatre, date, time,
  realBooking, onNavigateBookings, onConfirm,
}: SeatMapModalProps) {
  const seats = useMemo(() => generateSeats(), []);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [paying, setPaying] = useState(false);
  const [localConfirm, setLocalConfirm] = useState<LocalConfirm | null>(null);

  useEffect(() => { if (open) { setSelected([]); setConfirmed(false); setLocalConfirm(null); } }, [open]);
  useEffect(() => { if (realBooking) setConfirmed(true); }, [realBooking]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const toggle = (id: string, booked: boolean) => {
    if (booked) return;
    if (selected.includes(id)) { setSelected((p) => p.filter((s) => s !== id)); }
    else { if (selected.length >= MAX_SEATS) return; setSelected((p) => [...p, id]); }
  };

  const baseTotal = useMemo(() => selected.reduce((sum, id) => sum + getTier(id[0]).price, 0), [selected]);
  const conv = selected.length * CONVENIENCE_FEE;
  const gst = Math.round((baseTotal + conv) * 0.18);
  const total = baseTotal + conv + gst;

  const handlePay = async () => {
    if (selected.length === 0) return;
    setPaying(true);
    try {
      if (onConfirm) {
        await onConfirm(selected, total);
      } else {
        await new Promise((r) => setTimeout(r, 1200));
        setLocalConfirm({ movieTitle, moviePoster, language, formats, theatre, date, time, seats: selected, total });
        setConfirmed(true);
      }
    } finally { setPaying(false); }
  };

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Seat selection" className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div onClick={onClose} className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 w-full sm:max-w-3xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[95dvh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F84464]">{confirmed ? 'Booking Confirmed' : 'Select Seats'}</p>
            <h2 className="text-base font-extrabold text-slate-900 leading-tight">{movieTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{theatre} · {date} · {time}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {confirmed ? (
            <div className="p-5">
              <ConfirmationTicket booking={realBooking} localConfirm={localConfirm} onViewBookings={onNavigateBookings} onClose={onClose} />
            </div>
          ) : (
            <div className="p-5 space-y-6">
              {/* Screen marker */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-full max-w-lg mx-auto">
                  <div className="h-1.5 rounded-t-full bg-gradient-to-r from-transparent via-slate-300 to-transparent shadow-[0_3px_14px_rgba(0,0,0,.15)]" />
                </div>
                <div className="flex items-center gap-2">
                  <MonitorPlay size={12} className="text-slate-400" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Screen This Way</p>
                </div>
              </div>

              {/* Seat grid */}
              <div className="space-y-5 max-w-lg mx-auto w-full">
                {TIERS.map((tier) => (
                  <div key={tier.label}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: tier.color }}>{tier.label}</span>
                      <span className="text-[11px] font-semibold text-slate-400">₹{tier.price} / seat</span>
                    </div>
                    {tier.rows.map((row) => {
                      const rowSeats = seats.filter((s) => s.row === row);
                      const left = rowSeats.slice(0, 5);
                      const mid = rowSeats.slice(5, 7);
                      const right = rowSeats.slice(7);
                      const SeatBtn = ({ seat }: { seat: SeatData }) => {
                        const sel = selected.includes(seat.id);
                        return (
                          <button
                            key={seat.id}
                            disabled={seat.booked}
                            onClick={() => toggle(seat.id, seat.booked)}
                            aria-label={`${seat.label}${seat.booked ? ' sold' : sel ? ' selected' : ''}`}
                            aria-pressed={sel}
                            title={seat.booked ? 'Sold out' : `${seat.label} — ₹${tier.price}`}
                            className={[
                              'w-7 h-7 rounded-md border text-[9px] font-bold flex items-center justify-center transition-all select-none',
                              seat.booked ? 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed' : sel ? tier.bgSelected : tier.bgAvail,
                            ].join(' ')}
                          >
                            {!seat.booked && seat.col}
                          </button>
                        );
                      };
                      return (
                        <div key={row} className="flex items-center gap-1 mb-1.5">
                          <span className="w-5 text-[10px] font-bold text-slate-400 text-center shrink-0">{row}</span>
                          <div className="flex gap-1">{left.map((s) => <SeatBtn key={s.id} seat={s} />)}</div>
                          <div className="flex gap-1 px-2 opacity-80">{mid.map((s) => <SeatBtn key={s.id} seat={s} />)}</div>
                          <div className="flex gap-1">{right.map((s) => <SeatBtn key={s.id} seat={s} />)}</div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 pt-3 border-t border-slate-100 text-[11px] text-slate-500 max-w-lg mx-auto w-full">
                {TIERS.map((t) => (
                  <span key={t.label} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm border-2" style={{ borderColor: t.color, backgroundColor: `${t.color}22` }} />
                    <span className="font-medium" style={{ color: t.color }}>{t.label}</span>
                    <span className="text-slate-400">₹{t.price}</span>
                  </span>
                ))}
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200" />
                  <span>Sold</span>
                </span>
              </div>

              {/* Max limit notice */}
              {selected.length >= MAX_SEATS && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-700 max-w-lg mx-auto w-full">
                  <Info size={13} className="shrink-0" />
                  Max {MAX_SEATS} seats per transaction.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky booking bar */}
        {!confirmed && (
          <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4">
            {selected.length === 0 ? (
              <p className="text-center text-sm text-slate-400 font-medium py-1">Tap a seat to select it</p>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {selected.length} Seat{selected.length !== 1 ? 's' : ''} · {selected.slice(0, 5).join(', ')}{selected.length > 5 ? ` +${selected.length - 5}` : ''}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Base ₹{baseTotal} + Conv ₹{conv} + GST ₹{gst}</p>
                </div>
                <button
                  onClick={handlePay}
                  disabled={paying}
                  className="shrink-0 flex items-center gap-2 rounded-2xl bg-[#F84464] px-6 py-3 text-sm font-bold text-white hover:bg-[#e03355] active:scale-95 transition-all disabled:opacity-60 shadow-lg shadow-[#F84464]/25"
                >
                  {paying ? (
                    <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Processing…</>
                  ) : (
                    <><CreditCard size={15} /> Pay ₹{total}</>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
