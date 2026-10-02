import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Calendar, MapPin, Download, CheckCircle } from 'lucide-react';
import type { Booking } from '../../types';
import { Button } from '../ui/Button';

interface TicketCardProps {
  booking: Booking;
}

function QRCanvas({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: 144,
      margin: 1,
      color: { dark: '#1e293b', light: '#ffffff' },
    }).catch(console.error);
  }, [value]);

  return (
    <canvas
      ref={canvasRef}
      aria-label={`QR code for booking ${value}`}
      className="rounded-lg"
    />
  );
}

export function TicketCard({ booking }: TicketCardProps) {
  const [downloadState, setDownloadState] = useState<'idle' | 'loading' | 'done'>('idle');
  const seatList = booking.tickets?.map(t => t.seat_number).join(', ') || 'N/A';
  const qrValue = booking.tickets?.[0]?.qr_code || `BMT-${booking.id}`;
  const bookingRef = `#${String(booking.id).padStart(6, '0')}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    setDownloadState('loading');
    try {
      const dataUrl = await QRCode.toDataURL(qrValue, { width: 300, margin: 2, color: { dark: '#1e293b', light: '#ffffff' } });

      // Build a printable HTML blob
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>BookMyTix Ticket ${bookingRef}</title>
<style>
  body { font-family: system-ui, sans-serif; background: #f5f5f5; display: flex; justify-content: center; padding: 40px 20px; }
  .ticket { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.12); max-width: 600px; width: 100%; display: flex; }
  .main { flex: 1; padding: 32px; }
  .stub { width: 220px; padding: 32px 20px; background: #f8f8fb; border-left: 2px dashed #e2e8f0; display: flex; flex-direction: column; align-items: center; gap: 16px; }
  h1 { font-size: 22px; font-weight: 800; margin: 0 0 20px; color: #0f172a; }
  .badge { background: #F84464; color: white; border-radius: 999px; padding: 2px 12px; font-size: 11px; font-weight: 700; display: inline-block; margin-bottom: 16px; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
  .row .label { color: #94a3b8; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: .05em; }
  .row .value { font-weight: 700; color: #1e293b; text-align: right; }
  .seats { color: #F84464; font-weight: 800; }
  .qr-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
  .ref { font-family: monospace; font-size: 14px; font-weight: 700; color: #1e293b; }
  .footer { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: center; }
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
    <span class="qr-label">Gate Stub</span>
    <img src="${dataUrl}" width="144" height="144" alt="QR Code" style="border-radius:8px"/>
    <span class="ref">${bookingRef}</span>
    <p class="footer">Present at venue entrance</p>
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
    <div className="w-full rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col md:flex-row">
      {/* Main ticket body */}
      <div className="flex-1 p-6">
        <div className="flex items-start justify-between mb-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Electronic Ticket</span>
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-700">
            <CheckCircle size={11} /> Confirmed
          </span>
        </div>

        <h3 className="text-xl font-extrabold text-slate-900 mb-5 leading-tight">{booking.event_title}</h3>

        <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm border-t border-slate-100 pt-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Date & Time</p>
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Calendar size={13} className="text-[#F84464]" aria-hidden />
              {booking.event_date} · {booking.show_time}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Venue</p>
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <MapPin size={13} className="text-[#F84464]" aria-hidden />
              {booking.event_location}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Theatre</p>
            <p className="font-semibold text-slate-800">{booking.theatre}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Seats ({booking.tickets?.length ?? 0})</p>
            <p className="font-extrabold text-[#F84464]">{seatList}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Total Paid</p>
            <p className="font-bold text-slate-900">₹{booking.total_price}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Booking ID</p>
            <p className="font-mono font-bold text-slate-700">{bookingRef}</p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-slate-400">Show QR at the venue entrance for entry</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handlePrint}>Print</Button>
            <Button
              variant="primary"
              size="sm"
              loading={downloadState === 'loading'}
              leftIcon={downloadState === 'done' ? <CheckCircle size={13} /> : <Download size={13} />}
              onClick={handleDownload}
            >
              {downloadState === 'done' ? 'Downloaded!' : 'Download'}
            </Button>
          </div>
        </div>
      </div>

      {/* Dashed separator */}
      <div className="relative flex items-center justify-center w-full md:w-8 py-0 md:py-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-50 border border-slate-200 md:left-auto md:right-0 md:translate-x-1/2" aria-hidden />
        <div className="w-[85%] md:w-px h-px md:h-[85%] border-t md:border-l border-dashed border-slate-200" aria-hidden />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-5 h-5 rounded-full bg-slate-50 border border-slate-200 md:left-auto md:right-0 md:translate-x-1/2" aria-hidden />
      </div>

      {/* Stub */}
      <div className="w-full md:w-48 bg-slate-50 flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Gate Stub</p>
        <QRCanvas value={qrValue} />
        <div className="text-center">
          <p className="font-mono text-sm font-bold text-slate-700">{bookingRef}</p>
          <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider">Scan at entry</p>
        </div>
      </div>
    </div>
  );
}
