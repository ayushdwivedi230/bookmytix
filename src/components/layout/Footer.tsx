import { Link } from 'react-router-dom';
import { Ticket, Mail, Phone } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-400 mt-auto">
      {/* CTA strip */}
      <div className="bg-[#F84464]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-white">
            <p className="font-bold text-lg">List your show on BookMyTix</p>
            <p className="text-sm text-white/80">Got an event, activity or a live experience? Partner with us.</p>
          </div>
          <a
            href="mailto:partners@bookmytix.in"
            className="shrink-0 bg-white text-[#F84464] font-bold px-5 py-2.5 rounded-xl hover:bg-slate-100 transition-colors text-sm"
          >
            Get in touch
          </a>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link to="/" className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity mb-3">
              <Ticket size={18} aria-hidden />
              <span className="font-extrabold text-lg tracking-tighter">bookmytix</span>
            </Link>
            <p className="text-xs leading-relaxed">
              India's easiest way to book tickets for movies, concerts, sports events, and live experiences.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-slate-200 text-xs font-bold uppercase tracking-widest mb-4">Explore</h3>
            <nav className="space-y-2.5 text-sm" aria-label="Explore links">
              <Link to="/movies" className="block hover:text-white transition-colors">Movies</Link>
              <Link to="/?category=Concerts" className="block hover:text-white transition-colors">Events</Link>
              <Link to="/?category=Sports" className="block hover:text-white transition-colors">Sports</Link>
              <Link to="/?category=Comedy" className="block hover:text-white transition-colors">Plays</Link>
              <Link to="/?category=Tech Events" className="block hover:text-white transition-colors">Activities</Link>
            </nav>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-slate-200 text-xs font-bold uppercase tracking-widest mb-4">Account</h3>
            <nav className="space-y-2.5 text-sm" aria-label="Account links">
              <Link to="/login" className="block hover:text-white transition-colors">Sign in</Link>
              <Link to="/login" className="block hover:text-white transition-colors">Register</Link>
              <Link to="/bookings" className="block hover:text-white transition-colors">My Bookings</Link>
            </nav>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-slate-200 text-xs font-bold uppercase tracking-widest mb-4">Support</h3>
            <nav className="space-y-2.5 text-sm" aria-label="Support links">
              <a href="mailto:help@bookmytix.in" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail size={13} aria-hidden /> help@bookmytix.in
              </a>
              <a href="tel:+911800123456" className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone size={13} aria-hidden /> 1800-123-456
              </a>
            </nav>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>© {year} BookMyTix. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-white cursor-pointer transition-colors">Terms of Use</span>
            <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer transition-colors">Cookie Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
