import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  QrCode,
  Search,
  Film,
  MapPin,
  Clock,
} from 'lucide-react';
import { ticketsApi } from '../services/api';
import type { VerifiedTicketResult } from '../types';

export const TicketVerificationPage: React.FC = () => {
  const [tokenInput, setTokenInput] = useState<string>('');
  const [result, setResult] = useState<VerifiedTicketResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tokenInput.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await ticketsApi.verify(tokenInput.trim());
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-1">
            <QrCode className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Gate Admission Scanner
          </h1>
          <p className="text-sm text-stone-400">
            Verify digital ticket tokens, authorize attendee admittance, and prevent double-entry.
          </p>
        </div>

        {/* Scanner / Token Form */}
        <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 shadow-xl">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="text-xs text-stone-300 font-semibold uppercase tracking-wider block mb-2">
                Paste QR Payload or Verification Token
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder='Paste token or {"ref":"TIX-...","token":"..."}'
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 font-mono"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading || !tokenInput.trim()}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span>Verify</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </form>
        </div>

        {/* Verification Result Card */}
        {result && (
          <div className="animate-in fade-in zoom-in-95 duration-200">
            {result.valid ? (
              /* AUTHORIZED ENTRY */
              <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-100 space-y-6 shadow-2xl">
                <div className="flex items-center gap-4 border-b border-emerald-500/20 pb-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-emerald-300">ADMISSION AUTHORIZED</h3>
                    <p className="text-xs text-emerald-400/80 mt-0.5">
                      Admitted at {new Date(result.admittedAt || Date.now()).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-900/20 border border-emerald-500/20">
                    <span className="text-emerald-400/70 uppercase text-[10px] block font-bold">Seat Number</span>
                    <span className="text-2xl font-black text-white">{result.ticket?.seatNumber}</span>
                    <span className="text-[10px] text-emerald-300 block capitalize mt-0.5 font-medium">
                      {result.ticket?.category} Category
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-900/20 border border-emerald-500/20">
                    <span className="text-emerald-400/70 uppercase text-[10px] block font-bold">Customer</span>
                    <span className="text-base font-bold text-white block truncate">
                      {result.booking?.customerName}
                    </span>
                    <span className="text-[10px] text-emerald-300 block truncate">
                      {result.booking?.customerEmail}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-emerald-200/90 pt-1">
                  <div className="flex items-center gap-2">
                    <Film className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-bold text-white">{result.show?.movieTitle}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{result.show?.theatreName} • {result.show?.screenName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{result.show?.showDate} at {result.show?.showTime}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* REJECTED ENTRY */
              <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-100 space-y-4 shadow-2xl">
                <div className="flex items-center gap-4 border-b border-rose-500/20 pb-4">
                  <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-rose-300">ENTRY DENIED</h3>
                    <p className="text-xs text-rose-400/80 mt-0.5">{result.message}</p>
                  </div>
                </div>

                {result.ticket && (
                  <div className="p-3 rounded-xl bg-rose-900/20 border border-rose-500/20 text-xs">
                    <span className="text-rose-400/80 block text-[10px] font-bold uppercase">
                      Seat #{result.ticket.seatNumber}
                    </span>
                    <span className="text-white font-mono">{result.ticket.ticketRef}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
