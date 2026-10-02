import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Search, MapPin, ChevronDown, X, Menu, Ticket, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';

const CITIES = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Pune', 'Chandigarh', 'Jaipur', 'Goa', 'Ahmedabad', 'Kochi'];
const NAV_LINKS = [
  { label: 'Movies', category: 'Movies' },
  { label: 'Events', category: 'Concerts' },
  { label: 'Sports', category: 'Sports' },
  { label: 'Plays', category: 'Comedy' },
  { label: 'Activities', category: 'Tech Events' },
];

interface NavbarProps {
  selectedCity: string;
  setSelectedCity: (city: string) => void;
}

export function Navbar({ selectedCity, setSelectedCity }: NavbarProps) {
  const { token, user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  const searchQuery = searchParams.get('search') || '';

  const handleSearch = (val: string) => {
    if (location.pathname !== '/') {
      navigate(`/?search=${encodeURIComponent(val)}`);
    } else {
      setSearchParams(prev => {
        if (val) prev.set('search', val); else prev.delete('search');
        return prev;
      });
    }
  };

  const handleCategoryNav = (category: string) => {
    setMobileOpen(false);
    navigate(`/?category=${encodeURIComponent(category)}`);
  };

  const filteredCities = CITIES.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));

  // Close city modal on Escape
  useEffect(() => {
    if (!cityOpen) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setCityOpen(false); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [cityOpen]);

  // Close mobile menu on nav
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0 text-[#F84464] hover:opacity-85 transition-opacity">
              <Ticket size={20} aria-hidden />
              <span className="font-extrabold text-xl tracking-tighter">bookmytix</span>
            </Link>

            {/* Search */}
            <div className="hidden md:flex flex-1 items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-[#F84464] focus-within:ring-1 focus-within:ring-[#F84464] transition-all">
              <Search size={15} className="text-slate-400 shrink-0" aria-hidden />
              <input
                type="search"
                placeholder="Search movies, events, plays, sports…"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                aria-label="Search"
                className="bg-transparent border-none outline-none ml-2 w-full text-sm placeholder-slate-400 text-slate-900"
              />
              {searchQuery && (
                <button onClick={() => handleSearch('')} aria-label="Clear search" className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-3 ml-auto">
              {/* City picker */}
              <button
                onClick={() => setCityOpen(true)}
                aria-label="Select city"
                aria-expanded={cityOpen}
                className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-[#F84464] transition-colors bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 hover:bg-slate-100"
              >
                <MapPin size={14} className="text-[#F84464]" aria-hidden />
                <span>{selectedCity || 'All Cities'}</span>
                <ChevronDown size={13} className="text-slate-400" aria-hidden />
              </button>

              {/* Nav links — desktop */}
              <nav className="hidden lg:flex items-center gap-5" aria-label="Main navigation">
                {NAV_LINKS.map(l => (
                  <button
                    key={l.category}
                    onClick={() => handleCategoryNav(l.category)}
                    className="text-sm font-medium text-slate-600 hover:text-[#F84464] transition-colors"
                  >
                    {l.label}
                  </button>
                ))}
              </nav>

              {token ? (
                <div className="hidden md:flex items-center gap-3">
                  <Link to="/bookings" className="text-sm font-semibold text-slate-700 hover:text-[#F84464] transition-colors">
                    Hi, {user?.name?.split(' ')[0] || 'User'}
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">Admin</Link>
                  )}
                  <button
                    onClick={logout}
                    className="text-sm text-slate-500 hover:text-red-500 transition-colors font-medium"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link to="/login" className="hidden md:inline-flex">
                  <Button variant="primary" size="sm">Sign in</Button>
                </Link>
              )}

              {/* Mobile menu toggle */}
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
                onClick={() => setMobileOpen(v => !v)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
                aria-controls="mobile-menu"
              >
                {mobileOpen ? <X size={22} className="text-slate-700" /> : <Menu size={22} className="text-slate-700" />}
              </button>
            </div>
          </div>
        </div>

        {/* Secondary nav bar */}
        <div className="hidden lg:block bg-slate-800 border-t border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-9 gap-6">
            {NAV_LINKS.map(l => (
              <button
                key={l.category}
                onClick={() => handleCategoryNav(l.category)}
                className="text-xs font-medium text-slate-300 hover:text-white transition-colors"
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <motion.nav
              id="mobile-menu"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-white z-50 lg:hidden flex flex-col shadow-2xl"
              aria-label="Mobile navigation"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-800">
                <span className="font-bold text-white text-lg">Menu</span>
                <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="text-white/70 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              {/* Mobile search */}
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <Search size={14} className="text-slate-400" aria-hidden />
                  <input
                    type="search"
                    placeholder="Search…"
                    value={searchQuery}
                    onChange={e => handleSearch(e.target.value)}
                    aria-label="Search"
                    className="bg-transparent border-none outline-none ml-2 flex-1 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-1">
                <button
                  onClick={() => { setCityOpen(true); setMobileOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <MapPin size={15} className="text-[#F84464]" aria-hidden />
                  City: {selectedCity || 'All Cities'}
                </button>

                <hr className="border-slate-100 my-2" />

                {NAV_LINKS.map(l => (
                  <button
                    key={l.category}
                    onClick={() => handleCategoryNav(l.category)}
                    className="flex w-full items-center px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {l.label}
                  </button>
                ))}

                <hr className="border-slate-100 my-2" />

                {token ? (
                  <>
                    <Link to="/bookings" onClick={() => setMobileOpen(false)} className="flex w-full items-center px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      My Tickets
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setMobileOpen(false)} className="flex w-full items-center px-3 py-2.5 rounded-xl text-sm font-semibold text-blue-600 hover:bg-blue-50">
                        Admin Dashboard
                      </Link>
                    )}
                    <button onClick={() => { logout(); setMobileOpen(false); }} className="flex w-full items-center px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50">
                      Logout
                    </button>
                  </>
                ) : (
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="flex w-full items-center justify-center px-3 py-2.5 rounded-xl text-sm font-bold text-white bg-[#F84464] hover:bg-[#e03b5a]">
                    Sign in
                  </Link>
                )}
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* City modal */}
      <AnimatePresence>
        {cityOpen && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Select city"
          >
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setCityOpen(false)}
              aria-hidden
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden z-10"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h2 className="font-bold text-slate-900">Select City</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Filter events and shows by location</p>
                </div>
                <button
                  onClick={() => setCityOpen(false)}
                  aria-label="Close city selector"
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-[#F84464] focus-within:ring-1 focus-within:ring-[#F84464] transition-all">
                  <Search size={14} className="text-slate-400" aria-hidden />
                  <input
                    type="search"
                    placeholder="Search cities…"
                    value={citySearch}
                    onChange={e => setCitySearch(e.target.value)}
                    aria-label="Search cities"
                    autoFocus
                    className="ml-2 bg-transparent border-none outline-none flex-1 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="p-5 max-h-[320px] overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setSelectedCity(''); localStorage.removeItem('selectedCity'); setCityOpen(false); }}
                    className={`flex items-center justify-between rounded-xl border p-3 text-sm font-semibold text-left transition-all ${!selectedCity ? 'border-[#F84464] bg-[#F84464]/5 text-[#F84464]' : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}
                  >
                    All Cities
                    {!selectedCity && <CheckCircle size={14} className="text-[#F84464]" aria-hidden />}
                  </button>
                  {filteredCities.map(city => (
                    <button
                      key={city}
                      onClick={() => { setSelectedCity(city); localStorage.setItem('selectedCity', city); setCityOpen(false); }}
                      className={`flex items-center justify-between rounded-xl border p-3 text-sm font-semibold text-left transition-all ${selectedCity === city ? 'border-[#F84464] bg-[#F84464]/5 text-[#F84464]' : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      {city}
                      {selectedCity === city && <CheckCircle size={14} className="text-[#F84464]" aria-hidden />}
                    </button>
                  ))}
                  {filteredCities.length === 0 && (
                    <p className="col-span-2 text-sm text-slate-400 text-center py-6">No cities match "{citySearch}"</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
