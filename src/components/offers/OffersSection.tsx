import { useState } from 'react';
import { Tag, Copy, Check, Sparkles, Percent } from 'lucide-react';

export interface Offer {
  id: string;
  code: string;
  title: string;
  description: string;
  discount: string;
  badge: string;
  color: string;
  expiry: string;
}

export const EXCLUSIVE_OFFERS: Offer[] = [
  {
    id: 'off-1',
    code: 'BOOKMYTIX50',
    title: 'Flat 20% Off on Movie Tickets',
    description: 'Use code at checkout to get 20% discount up to ₹100 on min. 2 tickets.',
    discount: '20% OFF',
    badge: 'Popular',
    color: 'from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-400',
    expiry: 'Valid till 31 Dec 2026',
  },
  {
    id: 'off-2',
    code: 'WEEKENDVIP',
    title: 'Weekend VIP Recliner Special',
    description: 'Enjoy 15% instant savings up to ₹150 on luxury VIP Recliner seats.',
    discount: '15% OFF',
    badge: 'Weekend Special',
    color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400',
    expiry: 'Valid on Sat & Sun',
  },
  {
    id: 'off-3',
    code: 'CINEMACOMBO',
    title: 'Free Popcorn with 3+ Tickets',
    description: 'Book 3 or more tickets and unlock a voucher for free medium caramel popcorn.',
    discount: 'FREE POPCORN',
    badge: 'Concessions',
    color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400',
    expiry: 'Valid all weekdays',
  },
];

export function OffersSection() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <section aria-label="Exclusive Offers &amp; Bank Discounts" className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#F84464] mb-1.5">
              <Percent size={14} />
              <span>Promotions &amp; Discounts</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Exclusive Offers For You
            </h2>
          </div>
          <p className="text-xs text-slate-400 sm:text-right max-w-xs">
            Save on movie tickets, IMAX screenings, and theater snacks with verified coupon codes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {EXCLUSIVE_OFFERS.map((offer) => {
            const isCopied = copiedCode === offer.code;
            return (
              <div
                key={offer.id}
                className="relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0F1118] p-5 shadow-lg hover:border-white/20 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F84464]/15 border border-[#F84464]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#F84464]">
                      <Sparkles size={10} />
                      {offer.badge}
                    </span>
                    <span className="text-[11px] text-slate-400">{offer.expiry}</span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-[#F84464] transition-colors mb-1.5">
                    {offer.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{offer.description}</p>
                </div>

                {/* Promo Code Box */}
                <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 bg-[#161925] border border-dashed border-white/20 rounded-xl px-3 py-1.5 font-mono text-xs font-bold text-slate-200">
                    <Tag size={12} className="text-[#F84464]" />
                    <span>{offer.code}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(offer.code)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-[#F84464] text-xs font-semibold text-white transition-all cursor-pointer active:scale-95"
                  >
                    {isCopied ? (
                      <>
                        <Check size={13} className="text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
