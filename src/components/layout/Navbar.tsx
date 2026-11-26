import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  MapPin,
  ChevronDown,
  X,
  Menu,
  Ticket,
  CheckCircle,
  Tag,
  Film,
  Calendar,
  Sparkles,
  User as UserIcon,
  User,
  HelpCircle,
  LogOut,
  Shield,
  History,
  Star,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { moviesApi } from '../../services/api';
import type { SearchSuggestion } from '../../types';

export const CITIES = [
  'Mumbai',
  'Delhi-NCR',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Pune',
  'Kolkata',
  'Jaipur',
  'Ahmedabad',
  'Goa',
  'Chandigarh',
  'Kochi',
];

interface NavbarProps {
  selectedCity: string;
  setSelectedCity: (city: string) => void;
}

export function Navbar({ selectedCity, setSelectedCity }: NavbarProps) {
  const { token, user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Search state
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bmt_recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      /* noop */
    }
  }, []);

  // Debounced search suggestions
  useEffect(() => {
    if (!searchInput.trim() || searchInput.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      moviesApi
        .suggestions(searchInput.trim())
        .then((res) => setSuggestions(res.suggestions))
        .catch(() => setSuggestions([]));
    }, 200);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Click outside search container to close suggestions
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return;
    try {
      const updated = [
        term.trim(),
        ...recentSearches.filter((s) => s.toLowerCase() !== term.trim().toLowerCase()),
      ].slice(0, 6);
      setRecentSearches(updated);
      localStorage.setItem('bmt_recent_searches', JSON.stringify(updated));
    } catch {
      /* noop */
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('bmt_recent_searches');
  };

  const executeSearch = (term: string) => {
    if (!term.trim()) return;
    saveRecentSearch(term);
    setSuggestionsOpen(false);
    navigate(`/search?q=${encodeURIComponent(term.trim())}`);
  };

  const handleSuggestionClick = (item: SearchSuggestion) => {
    saveRecentSearch(item.title);
    setSuggestionsOpen(false);
    setSearchInput('');
    navigate(`/movies/${item.slug || item.id}`);
  };

  const filteredCities = CITIES.filter((c) =>
    c.toLowerCase().includes(citySearch.toLowerCase()),
  );

  // Close menus on Escape key
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCityOpen(false);
        setUserMenuOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { label: 'Movies', to: '/movies', icon: <Film size={15} /> },
    { label: 'Cinemas', to: '/cinemas', icon: <MapPin size={15} /> },
    { label: 'AI Discover', to: '/search', icon: <Sparkles size={15} className="text-purple-400" /> },
    { label: 'Events & Concerts', to: '/?category=Concerts', icon: <Calendar size={15} /> },
    { label: 'Offers & Deals', to: '/offers', icon: <Tag size={15} /> },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#08090D]/90 backdrop-blur-xl border-b border-white/[0.08] transition-all">
        {/* Top bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-3 sm:gap-6">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2.5 shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F84464] rounded-xl py-1 px-1.5"
              aria-label="BookMyTix Home"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#F84464] to-[#FF6B8B] flex items-center justify-center shadow-lg shadow-[#F84464]/30 group-hover:scale-105 transition-transform">
                <Ticket className="text-white transform -rotate-12" size={20} />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-white leading-none">
                  Book<span className="text-[#F84464]">My</span>Tix
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 leading-tight">
                  Cinema &bull; Live
                </span>
              </div>
            </Link>

            {/* Global Search Bar with Autocomplete & History */}
            <div ref={searchContainerRef} className="hidden md:block flex-1 max-w-lg relative">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  executeSearch(searchInput);
                }}
                className="flex items-center bg-[#131622] border border-white/10 rounded-xl px-3.5 py-2 focus-within:border-[#F84464] focus-within:ring-2 focus-within:ring-[#F84464]/20 transition-all shadow-inner"
              >
                <Search size={16} className="text-slate-400 shrink-0" aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Search movies, languages, genres..."
                  value={searchInput}
                  onFocus={() => setSuggestionsOpen(true)}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setSuggestionsOpen(true);
                  }}
                  aria-label="Search entertainment"
                  className="bg-transparent border-none outline-none ml-2.5 w-full text-sm text-slate-100 placeholder-slate-400"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setSuggestions([]);
                    }}
                    aria-label="Clear search query"
                    className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </form>

              {/* Suggestions / Recent Searches Dropdown */}
              <AnimatePresence>
                {suggestionsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-[#0F1118] border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-50 text-sm"
                  >
                    {/* Live suggestions */}
                    {suggestions.length > 0 && (
                      <div className="p-2 space-y-1">
                        <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Film size={12} className="text-[#F84464]" /> Movies
                        </div>
                        {suggestions.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleSuggestionClick(item)}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.08] cursor-pointer transition-colors group"
                          >
                            <img
                              src={item.poster}
                              alt=""
                              className="w-8 aspect-[2/3] object-cover rounded-md bg-slate-800 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-white text-xs sm:text-sm truncate group-hover:text-[#F84464] transition-colors">
                                {item.title}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {item.genre} &bull; {item.language} {item.releaseYear && `(${item.releaseYear})`}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 text-amber-400 text-xs font-bold shrink-0">
                              <Star size={11} fill="#F59E0B" />
                              <span>{item.rating.toFixed(1)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Recent searches */}
                    {searchInput.trim().length < 2 && recentSearches.length > 0 && (
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <History size={12} className="text-slate-400" /> Recent Searches
                          </span>
                          <button
                            type="button"
                            onClick={clearRecentSearches}
                            className="text-[10px] text-slate-400 hover:text-[#F84464] transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {recentSearches.map((term) => (
                            <button
                              key={term}
                              type="button"
                              onClick={() => {
                                setSearchInput(term);
                                executeSearch(term);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#161925] border border-white/10 text-xs text-slate-300 hover:text-white hover:border-white/20 transition-all flex items-center gap-1.5"
                            >
                              <span>{term}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Search All Footer */}
                    {searchInput.trim() && (
                      <div
                        onClick={() => executeSearch(searchInput)}
                        className="px-4 py-2.5 bg-[#161925] border-t border-white/[0.08] text-xs font-semibold text-[#F84464] hover:bg-white/10 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <span>See all movie results for "{searchInput}"</span>
                        <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-300 font-mono">
                          Enter ↵
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right actions: City selector + Auth + Mobile toggle */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* City selector button */}
              <button
                type="button"
                onClick={() => setCityOpen(true)}
                aria-label="Select city"
                aria-expanded={cityOpen}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-200 hover:text-[#F84464] bg-[#161926] hover:bg-[#1E2235] border border-white/10 rounded-xl px-3 py-2 transition-all cursor-pointer shadow-sm"
              >
                <MapPin size={15} className="text-[#F84464] shrink-0" />
                <span className="max-w-[85px] sm:max-w-none truncate">
                  {selectedCity || 'All Cities'}
                </span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>

              {/* User Profile / Auth */}
              {token ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2 bg-[#161926] hover:bg-[#1E2235] border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-white transition-all cursor-pointer"
                    aria-expanded={userMenuOpen}
                    aria-label="User account menu"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#F84464]/20 border border-[#F84464]/40 flex items-center justify-center text-[#F84464] text-xs font-bold">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden sm:inline-block max-w-[100px] truncate">
                      {user?.name?.split(' ')[0]}
                    </span>
                    <ChevronDown size={14} className="text-slate-400" />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 6 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0F1118] border border-white/10 shadow-2xl py-2 z-50 text-sm"
                      >
                        <div className="px-4 py-2.5 border-b border-white/[0.08]">
                          <p className="font-bold text-white truncate">{user?.name}</p>
                          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                          {isAdmin && (
                            <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                              <Shield size={10} /> Administrator
                            </span>
                          )}
                        </div>

                        <div className="p-1 space-y-0.5">
                          <Link
                            to="/dashboard?tab=bookings"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/5 transition-colors font-medium"
                          >
                            <Ticket size={16} className="text-[#F84464]" />
                            My Tickets &amp; Passes
                          </Link>

                          <Link
                            to="/dashboard?tab=profile"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/5 transition-colors font-medium"
                          >
                            <User size={16} className="text-indigo-400" />
                            Profile &amp; Preferences
                          </Link>

                          <Link
                            to="/support"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/5 transition-colors font-medium"
                          >
                            <HelpCircle size={16} className="text-amber-400" />
                            Help &amp; Support Desk
                          </Link>

                          <Link
                            to="/verify-ticket"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors font-medium text-xs"
                          >
                            <Sparkles size={16} />
                            Gate Admission Scanner
                          </Link>

                          {isAdmin && (
                            <Link
                              to="/admin"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors font-medium"
                            >
                              <Shield size={16} />
                              Admin Control Center
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              logout();
                              setUserMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors font-medium text-left cursor-pointer"
                          >
                            <LogOut size={16} />
                            Log Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link to="/login">
                  <Button variant="primary" size="sm" leftIcon={<UserIcon size={14} />}>
                    Sign In
                  </Button>
                </Link>
              )}

              {/* Mobile menu trigger */}
              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Category Navigation Bar */}
        <div className="hidden lg:block border-t border-white/[0.06] bg-[#0A0C13]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center gap-8 h-10 text-xs font-semibold text-slate-300">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-1.5 py-2 transition-colors relative hover:text-white ${
                      isActive ? 'text-[#F84464]' : 'text-slate-300'
                    }`}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F84464] rounded-full" />
                    )}
                  </Link>
                );
              })}
              <div className="ml-auto flex items-center gap-5 text-slate-400 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Instant M-Ticket & QR Entry
                </span>
                <span>&bull;</span>
                <span className="hover:text-white cursor-pointer transition-colors">
                  Customer Support: 1800-123-456
                </span>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Slide-out Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-80 bg-[#0F1118] border-l border-white/10 z-50 lg:hidden flex flex-col shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Navigation"
            >
              <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#F84464] flex items-center justify-center">
                    <Ticket size={16} className="text-white" />
                  </div>
                  <span className="font-extrabold text-lg text-white">BookMyTix</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Mobile Search */}
              <div className="p-4 border-b border-white/[0.08]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (searchInput.trim()) {
                      setMobileOpen(false);
                      executeSearch(searchInput);
                    }
                  }}
                  className="flex items-center bg-[#161926] border border-white/10 rounded-xl px-3 py-2.5"
                >
                  <Search size={15} className="text-slate-400 shrink-0" />
                  <input
                    type="search"
                    placeholder="Search movies, languages..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="ml-2 w-full bg-transparent border-none outline-none text-sm text-white placeholder-slate-400"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => setSearchInput('')}
                      className="text-slate-400 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                </form>
              </div>

              {/* Links */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setCityOpen(true);
                    setMobileOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-[#161926] text-sm font-semibold text-white mb-3"
                >
                  <span className="flex items-center gap-2">
                    <MapPin size={16} className="text-[#F84464]" />
                    City: {selectedCity || 'All Cities'}
                  </span>
                  <ChevronDown size={14} className="text-slate-400" />
                </button>

                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-200 hover:bg-white/5 hover:text-white text-sm font-semibold"
                  >
                    <span className="text-[#F84464]">{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                ))}

                <hr className="border-white/[0.08] my-3" />

                {token ? (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-200 hover:bg-white/5 text-sm font-semibold"
                    >
                      <User size={16} className="text-indigo-400" />
                      Dashboard &amp; Profile
                    </Link>
                    <Link
                      to="/dashboard?tab=bookings"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-200 hover:bg-white/5 text-sm font-semibold"
                    >
                      <Ticket size={16} className="text-[#F84464]" />
                      My Bookings &amp; Passes
                    </Link>
                    <Link
                      to="/support"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-200 hover:bg-white/5 text-sm font-semibold"
                    >
                      <HelpCircle size={16} className="text-amber-400" />
                      Help &amp; Support
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-purple-400 hover:bg-purple-500/10 text-sm font-semibold"
                      >
                        <Shield size={16} />
                        Admin Control Center
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setMobileOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 text-sm font-semibold text-left"
                    >
                      <LogOut size={16} />
                      Log Out
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full py-3 text-center bg-[#F84464] text-white font-bold rounded-xl mt-4"
                  >
                    Sign In / Register
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* City Selector Modal */}
      <AnimatePresence>
        {cityOpen && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Select City"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setCityOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-lg bg-[#0F1118] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#161925]/70">
                <div>
                  <h2 className="text-lg font-bold text-white">Select Your City</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Personalizes movie schedules, cinemas, and local timings
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCityOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* City Search */}
              <div className="p-4 border-b border-white/[0.08]">
                <div className="flex items-center bg-[#161926] border border-white/10 rounded-xl px-3.5 py-2">
                  <Search size={15} className="text-slate-400" />
                  <input
                    type="search"
                    placeholder="Search your city..."
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    className="ml-2 w-full bg-transparent border-none outline-none text-sm text-white placeholder-slate-400"
                    autoFocus
                  />
                </div>
              </div>

              {/* City Grid */}
              <div className="p-5 max-h-[340px] overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCity('');
                      localStorage.removeItem('selectedCity');
                      setCityOpen(false);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                      !selectedCity
                        ? 'border-[#F84464] bg-[#F84464]/15 text-[#F84464]'
                        : 'border-white/10 bg-[#161926]/80 text-slate-300 hover:border-white/20 hover:bg-[#1E2235]'
                    }`}
                  >
                    <span>All Cities</span>
                    {!selectedCity && <CheckCircle size={14} className="text-[#F84464]" />}
                  </button>

                  {filteredCities.map((city) => {
                    const isSelected = selectedCity === city;
                    return (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          setSelectedCity(city);
                          localStorage.setItem('selectedCity', city);
                          setCityOpen(false);
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#F84464] bg-[#F84464]/15 text-[#F84464]'
                            : 'border-white/10 bg-[#161926]/80 text-slate-300 hover:border-white/20 hover:bg-[#1E2235]'
                        }`}
                      >
                        <span className="truncate">{city}</span>
                        {isSelected && <CheckCircle size={14} className="text-[#F84464] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                {filteredCities.length === 0 && (
                  <p className="text-center text-sm text-slate-400 py-8">
                    No cities matching &ldquo;{citySearch}&rdquo;
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
