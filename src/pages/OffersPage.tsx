import { useState } from 'react';
import { Tag, Percent, Sparkles, Copy, Check, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EXCLUSIVE_OFFERS, Offer } from '../components/offers/OffersSection';

const MORE_OFFERS: Offer[] = [
  ...EXCLUSIVE_OFFERS,
  {
    id: 'off-4',
    code: 'HDFCINSTANT',
    title: 'HDFC Bank Credit Card Offer',
    description: 'Buy 1 Ticket and Get 1 Ticket Free on select HDFC Credit Cards every Friday.',
    discount: 'BUY 1 GET 1',
    badge: 'Bank Offer',
    color: 'from-blue-600/20 to-cyan-500/10 border-blue-500/30 text-blue-400',
    expiry: 'Valid on Fridays',
  },
  {
    id: 'off-5',
    code: 'ICICICINEMA',
    title: 'ICICI Bank 25% Instant Cashback',
    description: 'Get 25% cashback up to ₹250 on min. transaction of ₹500 using ICICI NetBanking.',
    discount: '25% CASHBACK',
    badge: 'Bank Offer',
    color: 'from-orange-500/20 to-red-500/10 border-orange-500/30 text-orange-400',
    expiry: 'Valid till 30 Nov 2026',
  },
  {
    id: 'off-6',
    code: 'SNACKFEST50',
    title: 'Flat 50% Off on Gourmet Combos',
    description: 'Pre-book your nachos and cheese dip combos at half price when ordering tickets.',
    discount: '50% OFF F&B',
    badge: 'Concessions',
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
    expiry: 'Valid all week',
  },
];

const OFFER_TABS = ['All Offers', 'Bank Offers', 'Concessions', 'Special Discounts'];

export function OffersPage() {
  const [activeTab, setActiveTab] = useState('All Offers');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const filteredOffers = MORE_OFFERS.filter((o) => {
    if (activeTab === 'Bank Offers') return o.badge.includes('Bank');
    if (activeTab === 'Concessions') return o.badge.includes('Concessions');
    if (activeTab === 'Special Discounts') return o.badge.includes('Popular') || o.badge.includes('Weekend');
    return true;
  });

  return (
    <div className="min-h-screen bg-[#08090D] text-slate-100">
      {/* ── Page Header ── */}
      <div className="border-b border-white/[0.08] bg-[#0A0C13] py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#F84464] mb-2">
            <Percent size={14} />
            <span>Promotions &amp; Savings</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Exclusive Offers &amp; Bank Discounts
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Save on tickets, concessions, and premium auditorium bookings with verified promo codes and card discounts.
          </p>
        </div>
      </div>

      {/* ── Category Filter Bar ── */}
      <div className="border-b border-white/[0.06] bg-[#0B0D14]/80 backdrop-blur-md sticky top-[64px] z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {OFFER_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
                  activeTab === tab
                    ? 'bg-[#F84464] text-white shadow-md shadow-[#F84464]/20'
                    : 'bg-[#161925] text-slate-300 hover:bg-white/10 border border-white/10'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Offers Grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOffers.map((offer) => {
            const isCopied = copiedCode === offer.code;
            return (
              <div
                key={offer.id}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0F1118] p-6 shadow-xl hover:border-white/20 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F84464]/20 border border-[#F84464]/30 px-3 py-1 text-xs font-bold text-[#F84464]">
                      <Sparkles size={11} />
                      {offer.badge}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{offer.expiry}</span>
                  </div>

                  <span className="text-xl font-black text-white block mb-1">
                    {offer.discount}
                  </span>
                  <h3 className="text-base font-bold text-white group-hover:text-[#F84464] transition-colors mb-2">
                    {offer.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{offer.description}</p>
                </div>

                {/* Promo Code Box */}
                <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 bg-[#161925] border border-dashed border-white/20 rounded-xl px-3.5 py-2 font-mono text-xs font-bold text-slate-200">
                    <Tag size={13} className="text-[#F84464]" />
                    <span>{offer.code}</span>
                  </div>

                  <button
                    onClick={() => handleCopy(offer.code)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isCopied
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white/10 hover:bg-[#F84464] hover:text-white text-slate-300'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check size={13} /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={13} /> Copy Code
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── How to Redeem Section ── */}
      <div className="border-t border-white/[0.08] bg-[#0A0C13] py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl font-black text-white tracking-tight">How to Redeem</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Apply coupon discounts in 3 simple steps during ticket checkout.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-white/10 bg-[#0F1118] p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F84464]/10 text-[#F84464] border border-[#F84464]/20 flex items-center justify-center mx-auto text-lg font-black">
                1
              </div>
              <h3 className="text-base font-bold text-white">Select Movie &amp; Seats</h3>
              <p className="text-xs text-slate-400">
                Choose your favorite cinema, showtime, and auditorium seats on BookMyTix.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0F1118] p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto text-lg font-black">
                2
              </div>
              <h3 className="text-base font-bold text-white">Apply Promo Code</h3>
              <p className="text-xs text-slate-400">
                Copy the code above and paste it in the promo code box at checkout.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0F1118] p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto text-lg font-black">
                3
              </div>
              <h3 className="text-base font-bold text-white">Enjoy Instant Savings</h3>
              <p className="text-xs text-slate-400">
                Your total price updates immediately with discounted rates. Proceed to pay!
              </p>
            </div>
          </div>

          <div className="text-center mt-10">
            <Link to="/movies">
              <button className="inline-flex items-center gap-2 rounded-xl bg-[#F84464] px-6 py-3 text-sm font-bold text-white hover:bg-[#e03355] transition-all shadow-lg shadow-[#F84464]/25">
                Browse Movies Now <ArrowRight size={16} />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
