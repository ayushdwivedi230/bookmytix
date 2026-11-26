import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Download, CheckCircle, Printer } from 'lucide-react';
import type { Booking } from '../../types';

interface TicketCardProps {
  booking: Booking;
}

function QRCanvas({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: 136,
      margin: 1,
      color: { dark: '#08090D', light: '#ffffff' },
    }).catch(console.error);
  }, [value]);

  return (
    <canvas
      ref={canvasRef}
      aria-label={`QR code for booking ${value}`}
      className="rounded-xl shadow-md"
    />
  );
}

export function TicketCard({ booking }: TicketCardProps) {
  const [downloadState, setDownloadState] = useState<'idle' | 'loading' | 'done'>('idle');
  const seatList = booking.tickets?.map((t) => t.seat_number).join(', ') || 'N/A';
  const qrValue = booking.tickets?.[0]?.qr_code || `BMT-${booking.id}`;
  const bookingRef = `#${String(booking.id).padStart(6, '0')}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    setDownloadState('loading');
    try {
      const dataUrl = await QRCode.toDataURL(qrValue, {
        width: 300,
        margin: 2,
        color: { dark: '#08090D', light: '#ffffff' },
      });

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>BookMyTix Ticket ${bookingRef}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
  body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #08090D; color: #e2e8f0; display: flex; justify-content: center; padding: 40px 20px; }
  .ticket { background: #0F1118; border: 1px solid rgba(255,255,255,0.12); border-radius: 24px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,.6); max-width: 640px; width: 100%; display: flex; }
  .main { flex: 1; padding: 32px; }
  .stub { width: 220px; padding: 32px 20px; background: #161925; border-left: 2px dashed rgba(255,255,255,0.15); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }
  h1 { font-size: 22px; font-weight: 800; margin: 0 0 20px; color: #fff; }
  .badge { background: #F84464; color: white; border-radius: 999px; padding: 4px 14px; font-size: 11px; font-weight: 800; display: inline-block; margin-bottom: 16px; letter-spacing: 0.08em; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 13px; }
  .row .label { color: #64748b; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: .06em; }
  .row .value { font-weight: 700; color: #f8fafc; text-align: right; }
  .seats { color: #F84464; font-weight: 800; }
  .qr-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
  .ref { font-family: monospace; font-size: 14px; font-weight: 700; color: #fff; }
  .footer { margin-top: 16px; font-size: 10px; color: #64748b; text-align: center; }
</style>
</head>
<body>
<div class="ticket">
  <div class="main">
    <span class="badge">CONFIRMED</span>
    <h1>${booking.event_title}</h1>
    <div class="row"><span class="label">Date</span><span class="value">${booking.event_date} · ${booking.show_time}</span></div>
    <div class="row"><span class="label">Venue</span><span class="value">${booking.event_location}</span></div>
    <div class="row"><span class="label">Theatre</span><span class="value">${booking.theatre}</span></div>
    <div class="row"><span class="label">Seats</span><span class="value seats">${seatList}</span></div>
    <div class="row"><span class="label">Total Paid</span><span class="value">₹${booking.total_price}</span></div>
    <div class="row"><span class="label">Booking ID</span><span class="value">${bookingRef}</span></div>
  </div>
  <div class="stub">
    <span class="qr-label">Gate Pass</span>
    <img src="${dataUrl}" width="144" height="144" alt="QR Code" style="border-radius:12px"/>
    <span class="ref">${bookingRef}</span>
    <p class="footer">Scan at venue entrance</p>
  </div>
</div>
</body>
</html>`;

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookmytix-ticket-${booking.id}.html`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloadState('done');
      setTimeout(() => setDownloadState('idle'), 2000);
    } catch {
      setDownloadState('idle');
    }
  };

  return (
    <article className="rounded-3xl border border-white/10 bg-[#0F1118] overflow-hidden shadow-2xl flex flex-col md:flex-row transition-all hover:border-white/20">
      {/* Main ticket body */}
      <div className="flex-1 p-6 sm:p-7 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400">
              Confirmed Booking
            </span>
            <span className="font-mono text-xs font-bold text-slate-400">{bookingRef}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white leading-tight mb-4">
            {booking.event_title}
          </h2>

          <div className="grid grid-cols-2 gap-3.5 text-xs sm:text-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Date &amp; Time</p>
              <p className="font-semibold text-white mt-0.5">{booking.event_date} · {booking.show_time}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Theatre Screen</p>
              <p className="font-semibold text-white mt-0.5">{booking.theatre}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Seats</p>
              <p className="font-black text-[#F84464] mt-0.5">{seatList}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Paid</p>
              <p className="font-extrabold text-white mt-0.5">₹{booking.total_price}</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2.5 pt-6 mt-4 border-t border-white/[0.08]">
          <button
            onClick={handleDownload}
            disabled={downloadState === 'loading'}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#161925] px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            {downloadState === 'done' ? (
              <CheckCircle size={14} className="text-emerald-400" />
            ) : (
              <Download size={14} />
            )}
            <span>{downloadState === 'done' ? 'Downloaded!' : 'Download Pass'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#161925] px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Printer size={14} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Perforated divider */}
      <div className="relative flex md:flex-col items-center justify-center h-4 md:h-auto md:w-6 bg-[#0F1118]">
        <div className="absolute left-0 -translate-x-1/2 md:left-1/2 md:top-0 md:-translate-x-1/2 md:-translate-y-1/2 w-4 h-4 rounded-full bg-[#08090D] border border-white/10" />
        <div className="w-[90%] md:w-px h-px md:h-[90%] border-t md:border-l border-dashed border-white/20" />
        <div className="absolute right-0 translate-x-1/2 md:right-auto md:left-1/2 md:bottom-0 md:-translate-x-1/2 md:translate-y-1/2 w-4 h-4 rounded-full bg-[#08090D] border border-white/10" />
      </div>

      {/* Stub with QR code */}
      <div className="w-full md:w-52 bg-[#141724] flex flex-col items-center justify-center gap-3 p-6 border-t md:border-t-0 md:border-l border-white/10">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Gate Entry QR</p>
        <div className="p-2 bg-white rounded-2xl shadow-inner">
          <QRCanvas value={qrValue} />
        </div>
        <p className="font-mono text-xs font-bold text-white">{bookingRef}</p>
        <p className="text-[9px] text-slate-500 uppercase tracking-wider text-center">
          Show at auditorium entrance
        </p>
      </div>
    </article>
  );
}
