import { Link } from 'react-router-dom';
import { Ticket, Mail, Phone, ShieldCheck, CreditCard, Sparkles, Film, Heart } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#05060A] text-slate-400 border-t border-white/[0.08] mt-auto">
      {/* List show partner strip */}
      <div className="bg-gradient-to-r from-[#F84464] via-[#FF5376] to-[#E03B5A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <p className="font-extrabold text-base sm:text-lg">Partner With BookMyTix</p>
              <p className="text-xs sm:text-sm text-white/90">
                Are you a cinema exhibitor, play director, or live concert promoter? List your shows with us.
              </p>
            </div>
          </div>
          <a
            href="mailto:partners@bookmytix.in"
            className="shrink-0 bg-white text-slate-900 hover:bg-slate-100 font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-md hover:scale-105 active:scale-95"
          >
            Get In Touch
          </a>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2 text-white group">
              <div className="w-8 h-8 rounded-lg bg-[#F84464] flex items-center justify-center">
                <Ticket className="text-white transform -rotate-12" size={18} />
              </div>
              <span className="font-extrabold text-xl tracking-tight">
                Book<span className="text-[#F84464]">My</span>Tix
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              India&apos;s premium destination for cinema reservations, IMAX 3D blockbusters, music festivals, and live cultural entertainment. Verified e-tickets and instantaneous seat selection.
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1.5 bg-white/[0.04] px-2.5 py-1.5 rounded-lg border border-white/[0.06]">
                <ShieldCheck size={14} className="text-emerald-400" /> 100% Safe Checkout
              </span>
              <span className="flex items-center gap-1.5 bg-white/[0.04] px-2.5 py-1.5 rounded-lg border border-white/[0.06]">
                <CreditCard size={14} className="text-blue-400" /> Encrypted Payments
              </span>
            </div>
          </div>

          {/* Movies */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200 mb-4 flex items-center gap-1.5">
              <Film size={13} className="text-[#F84464]" /> Movies
            </h3>
            <ul className="space-y-2 text-xs">
              <li><Link to="/movies" className="hover:text-white transition-colors">Now Showing</Link></li>
              <li><Link to="/movies?certificate=UA" className="hover:text-white transition-colors">Upcoming Releases</Link></li>
              <li><Link to="/movies?genre=Action" className="hover:text-white transition-colors">Action Blockbusters</Link></li>
              <li><Link to="/movies?genre=Sci-Fi" className="hover:text-white transition-colors">IMAX Sci-Fi</Link></li>
              <li><Link to="/cinemas" className="hover:text-white transition-colors">Cinema Chains</Link></li>
            </ul>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200 mb-4">
              Explore
            </h3>
            <ul className="space-y-2 text-xs">
              <li><Link to="/?category=Concerts" className="hover:text-white transition-colors">Live Concerts</Link></li>
              <li><Link to="/?category=Sports" className="hover:text-white transition-colors">Sports &amp; Stadiums</Link></li>
              <li><Link to="/?category=Comedy" className="hover:text-white transition-colors">Stand-Up Comedy</Link></li>
              <li><Link to="/offers" className="hover:text-white transition-colors">Bank Offers &amp; Promo Codes</Link></li>
              <li><Link to="/bookings" className="hover:text-white transition-colors">Download E-Tickets</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200 mb-4">
              Support &amp; Help
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a href="mailto:help@bookmytix.in" className="flex items-center gap-1.5 hover:text-white transition-colors">
                  <Mail size={13} className="text-[#F84464]" /> help@bookmytix.in
                </a>
              </li>
              <li>
                <a href="tel:1800123456" className="flex items-center gap-1.5 hover:text-white transition-colors">
                  <Phone size={13} className="text-[#F84464]" /> 1800-123-456 (Toll-Free)
                </a>
              </li>
              <li className="pt-2 text-[11px] text-slate-400">
                Available 24/7 for booking inquiries and cancellation support.
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>&copy; {currentYear} BookMyTix Pvt. Ltd. All Rights Reserved.</p>
          <div className="flex items-center gap-5">
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Cookie Preferences</span>
          </div>
          <p className="flex items-center gap-1 text-[11px] text-slate-400">
            Crafted with <Heart size={11} className="text-[#F84464] fill-current" /> for movie lovers
          </p>
        </div>
      </div>
    </footer>
  );
}
