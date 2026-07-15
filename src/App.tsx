import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams, Navigate, useSearchParams, useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, ChevronRight, Ticket, CreditCard, CheckCircle, Download, Menu, Star, Calendar, MonitorPlay, X, Headphones, RefreshCcw, Mail, Play, ArrowRight, Sparkles, Filter as FilterIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SearchBar from './components/SearchBar';
import Filter from './components/Filter';
import MovieGrid from './components/MovieGrid';
import MovieCard from './components/MovieCard';
import { movies as movieCatalog } from './data/movies';

const API_BASE = '/api';

const clearStoredAuth = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

const notifyAuthExpired = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth:expired'));
  }
};

const requestJson = async (url: string, options: RequestInit = {}, token?: string | null) => {
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(url, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await res.json().catch(() => ({}))
    : { error: await res.text().catch(() => 'Request failed') };

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      clearStoredAuth();
      notifyAuthExpired();
    }
    throw new Error(data.error || 'API Error');
  }

  return data;
};

const api = {
  get: async (url: string, token?: string | null) => requestJson(`${API_BASE}${url}`, {}, token),
  post: async (url: string, body: any, token?: string | null) => requestJson(`${API_BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }, token)
};

const THEME = {
  primary: '#F84464',
  primaryHover: '#e03b5a',
  bgDark: '#2B314B',
  bgLight: '#F5F5F5'
};

const Navbar = ({ token, user, onLogOut, selectedCity, setSelectedCity }: any) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const searchQuery = searchParams.get('search') || '';

  const handleSearchChange = (val: string) => {
    if (location.pathname !== '/') {
      navigate(`/?search=${encodeURIComponent(val)}`);
    } else {
      setSearchParams(prev => {
        if (val) {
          prev.set('search', val);
        } else {
          prev.delete('search');
        }
        return prev;
      });
    }
  };

  const handleCategoryClick = (category: string) => {
    setIsMenuOpen(false);
    navigate(`/?category=${encodeURIComponent(category)}`);
  };

  const CITIES = ['Mumbai', 'Bengaluru', 'Delhi', 'Hyderabad', 'Pune', 'Chandigarh', 'Jaipur', 'Goa'];
  const filteredCities = CITIES.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));

  // Close city modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsCityModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="bg-white sticky top-0 z-50 shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8 flex-1">
            <Link to="/" className="flex items-center gap-2 shrink-0" style={{ color: THEME.primary }}>
              <span className="font-extrabold text-2xl tracking-tighter leading-none hover:opacity-90 transition-opacity">bookmytix</span>
            </Link>
            
            {/* Global Search Bar */}
            <div className="hidden lg:flex items-center bg-gray-50 border border-gray-200 rounded px-3 py-2 w-[500px] focus-within:border-[#F84464] focus-within:ring-1 focus-within:ring-[#F84464] transition-all">
              <Search size={16} className="text-gray-400" />
              <input 
                type="text" 
                placeholder="Search for Movies, Events, Plays, Sports and Activities" 
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
                className="bg-transparent border-none outline-none ml-3 w-full text-sm placeholder-gray-400 text-gray-900"
              />
              {searchQuery && (
                <button onClick={() => handleSearchChange('')} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* City Selector Trigger */}
            <div 
              onClick={() => setIsCityModalOpen(true)}
              className="hidden lg:flex items-center gap-1.5 text-sm text-gray-700 hover:text-[#F84464] cursor-pointer font-semibold transition-colors bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200"
            >
              <MapPin size={15} className="text-[#F84464]" />
              <span>{selectedCity || 'All Cities'}</span>
              <ChevronRight size={14} className="rotate-90 text-gray-400" />
            </div>

            <Link to="/movies" className="hidden lg:inline-block text-sm font-semibold text-slate-700 hover:text-[#F84464] transition-colors">
              Movies
            </Link>

            {token ? (
              <div className="hidden lg:flex items-center gap-6">
                <Link to="/bookings" className="text-sm font-semibold text-gray-700 hover:text-[#F84464] transition-colors">
                  Hi, {user?.name?.split(' ')[0] || 'User'}
                </Link>
                <Link to="/admin" className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                  Admin
                </Link>
                <button onClick={onLogOut} className="text-sm font-medium text-gray-500 hover:text-red-500 transition-colors cursor-pointer">Logout</button>
              </div>
            ) : (
              <Link to="/login" className="hidden lg:inline-block text-sm font-bold px-6 py-2 text-white rounded-lg cursor-pointer hover:shadow-lg transition-all hover:scale-102" style={{ backgroundColor: THEME.primary }}>
                Sign in
              </Link>
            )}
            <button className="lg:hidden p-1 rounded-md hover:bg-gray-100" onClick={() => setIsMenuOpen(true)}>
              <Menu size={24} className="text-gray-700" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Sidebar */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}>
          <div 
            className="absolute top-0 right-0 w-72 h-full bg-white shadow-2xl flex flex-col transform transition-transform"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b flex justify-between items-center bg-[#2B314B] text-white">
              <span className="font-bold text-lg">Hey! {token ? user?.name?.split(' ')[0] : 'Guest'}</span>
              <button className="p-1 rounded-full hover:bg-white/10" onClick={() => setIsMenuOpen(false)}><X size={20} /></button>
            </div>
            
            {/* Mobile Search */}
            <div className="p-4 border-b">
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <Search size={16} className="text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  className="bg-transparent border-none outline-none ml-2 w-full text-sm text-gray-900"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 text-gray-800">
               {/* Mobile City Selector */}
               <div 
                 onClick={() => { setIsCityModalOpen(true); setIsMenuOpen(false); }}
                 className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 cursor-pointer text-sm font-semibold"
               >
                 <MapPin size={16} className="text-[#F84464]" />
                 <span>City: {selectedCity || 'All Cities'}</span>
               </div>
               <hr className="border-gray-100" />

               <Link to="/movies" onClick={() => setIsMenuOpen(false)} className="hover:bg-gray-50 p-2 rounded-lg font-medium">Movies</Link>

               {token ? (
                  <>
                     <Link to="/bookings" onClick={() => setIsMenuOpen(false)} className="hover:bg-gray-50 p-2 rounded-lg font-medium">My Bookings</Link>
                     <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="hover:bg-gray-50 p-2 rounded-lg font-medium text-blue-600">Admin Dashboard</Link>
                     <button onClick={() => { onLogOut(); setIsMenuOpen(false); }} className="text-left text-red-500 hover:bg-red-50 p-2 rounded-lg font-medium">Logout</button>
                  </>
               ) : (
                  <Link to="/login" onClick={() => setIsMenuOpen(false)} className="hover:bg-gray-50 p-2 rounded-lg font-semibold text-[#F84464]">Login / Register</Link>
               )}
               <hr className="border-gray-100" />
               <div className="text-xs font-bold text-gray-400 uppercase px-2">Categories</div>
               <button onClick={() => handleCategoryClick('Movies')} className="text-left hover:bg-gray-50 p-2 rounded-lg font-medium">Movies</button>
               <button onClick={() => handleCategoryClick('Movies')} className="text-left hover:bg-gray-50 p-2 rounded-lg font-medium">Stream</button>
               <button onClick={() => handleCategoryClick('Concerts')} className="text-left hover:bg-gray-50 p-2 rounded-lg font-medium">Events</button>
               <button onClick={() => handleCategoryClick('Comedy')} className="text-left hover:bg-gray-50 p-2 rounded-lg font-medium">Plays</button>
               <button onClick={() => handleCategoryClick('Sports')} className="text-left hover:bg-gray-50 p-2 rounded-lg font-medium">Sports</button>
               <button onClick={() => handleCategoryClick('Tech Events')} className="text-left hover:bg-gray-50 p-2 rounded-lg font-medium">Activities</button>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Nav */}
      <div className="bg-[#222539] hidden lg:block border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-10 items-center text-sm">
          <div className="flex gap-6 text-gray-300">
            <button onClick={() => handleCategoryClick('Movies')} className="hover:text-white transition-colors cursor-pointer">Movies</button>
            <button onClick={() => handleCategoryClick('Movies')} className="hover:text-white transition-colors cursor-pointer">Stream</button>
            <button onClick={() => handleCategoryClick('Concerts')} className="hover:text-white transition-colors cursor-pointer font-medium text-white border-b-2 border-[#F84464] h-10 px-1 flex items-center">Events</button>
            <button onClick={() => handleCategoryClick('Comedy')} className="hover:text-white transition-colors cursor-pointer">Plays</button>
            <button onClick={() => handleCategoryClick('Sports')} className="hover:text-white transition-colors cursor-pointer">Sports</button>
            <button onClick={() => handleCategoryClick('Tech Events')} className="hover:text-white transition-colors cursor-pointer">Activities</button>
          </div>
          <div className="flex gap-6 text-gray-300 text-xs tracking-wider">
            <span className="text-gray-400">ListYourShow</span>
            <span className="text-gray-400">Corporates</span>
            <span className="text-gray-400">Offers</span>
            <span className="text-gray-400">Gift Cards</span>
          </div>
        </div>
      </div>

      {/* City Selector Modal */}
      <AnimatePresence>
        {isCityModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop with Blur */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCityModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            
            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">Select City</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Choose your city to filter local shows</p>
                </div>
                <button 
                  onClick={() => setIsCityModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search Box */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-full focus-within:border-[#F84464] focus-within:ring-1 focus-within:ring-[#F84464] transition-all">
                  <Search size={16} className="text-gray-400 mr-2" />
                  <input 
                    type="text" 
                    placeholder="Search for your city..." 
                    value={citySearch}
                    onChange={e => setCitySearch(e.target.value)}
                    className="bg-transparent border-none outline-none w-full text-sm text-gray-900"
                  />
                  {citySearch && (
                    <button onClick={() => setCitySearch('')} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Cities Grid */}
              <div className="p-5 overflow-y-auto flex-1 max-h-[300px]">
                <div className="grid grid-cols-2 gap-3">
                  {/* Option for All Cities */}
                  <button
                    onClick={() => {
                      setSelectedCity('');
                      localStorage.removeItem('selectedCity');
                      setIsCityModalOpen(false);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border text-sm font-semibold transition-all text-left ${
                      !selectedCity 
                        ? 'border-[#F84464] bg-[#F84464]/5 text-[#F84464]' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span>All Cities</span>
                    {!selectedCity && <CheckCircle size={16} className="text-[#F84464] shrink-0" />}
                  </button>

                  {filteredCities.map(city => {
                    const isSelected = selectedCity === city;
                    return (
                      <button
                        key={city}
                        onClick={() => {
                          setSelectedCity(city);
                          localStorage.setItem('selectedCity', city);
                          setIsCityModalOpen(false);
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl border text-sm font-semibold transition-all text-left ${
                          isSelected 
                            ? 'border-[#F84464] bg-[#F84464]/5 text-[#F84464]' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <span>{city}</span>
                        {isSelected && <CheckCircle size={16} className="text-[#F84464] shrink-0" />}
                      </button>
                    );
                  })}

                  {filteredCities.length === 0 && (
                    <div className="col-span-2 text-center py-6 text-sm text-gray-500">
                      No cities found matching "{citySearch}"
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
};

// --- Components ---
const HeroSlider = ({ onBookNow, onExplore }: { onBookNow: () => void, onExplore: () => void }) => {
  const images = [
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1920&h=800&q=80', // Concert
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1920&h=800&q=80', // Cinema
    'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1920&h=800&q=80'  // Sports
  ];
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 4000); 
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-[400px] lg:h-[500px] overflow-hidden bg-[#1A1A1A]">
      <AnimatePresence mode="wait">
        <motion.div 
          key={images[current]} 
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          <img src={images[current]} className="w-full h-full object-cover opacity-60" alt="Hero background" />
        </motion.div>
      </AnimatePresence>
      
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent"></div>
      
      <div className="absolute inset-0 flex items-center z-10 w-full">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-2xl text-white backdrop-blur-xl bg-white/5 border border-white/10 p-8 md:p-12 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
               <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#F84464]/30 rounded-full blur-[80px] transition-all duration-[3000ms] animate-pulse"></div>
               <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] transition-all duration-[3000ms] animate-pulse delay-1000"></div>
               
               <div className="relative z-10">
                 <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4 tracking-tight leading-tight drop-shadow-lg text-white">
                   Book Your Next <br/> Experience <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F84464] to-pink-400 drop-shadow-md">Instantly</span>
                 </h1>
                 <p className="text-gray-300 text-lg md:text-xl mb-8 font-medium max-w-lg drop-shadow">
                   Fast, secure, and hassle-free ticket booking for concerts, movies, and the most vibrant global festivals.
                 </p>
                 <div className="flex flex-wrap gap-4">
                   <button onClick={onBookNow} className="px-8 py-3.5 rounded-xl font-bold text-white transition-all transform hover:scale-105 hover:shadow-[0_0_30px_rgba(248,68,100,0.5)] bg-gradient-to-r from-[#F84464] to-[#e03b5a] shadow-[0_0_20px_rgba(248,68,100,0.3)]">
                     Book Now
                   </button>
                   <button onClick={onExplore} className="px-8 py-3.5 rounded-xl font-bold text-white transition-all transform hover:scale-105 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md">
                     Explore Events
                   </button>
                 </div>
                </div>
             </div>
          </div>
        </div>
      </div>
  );
};

const TRAILER_MAP: Record<string, { embedUrl: string, genre: string, duration: string, rating: string }> = {
  'Pushpa 2': {
    embedUrl: 'https://www.youtube.com/embed/1kVK0MZlbI4',
    genre: 'Action, Thriller',
    duration: '2h 45m',
    rating: 'UA | 16+'
  },
  'Kalki 2898 AD': {
    embedUrl: 'https://www.youtube.com/embed/kQDd1AhGIHk',
    genre: 'Sci-Fi, Action',
    duration: '3h 0m',
    rating: 'UA | 13+'
  },
  'Stree 2': {
    embedUrl: 'https://www.youtube.com/embed/KVnheGhrRAw',
    genre: 'Comedy, Horror',
    duration: '2h 27m',
    rating: 'UA | 16+'
  },
  'Sunburn Goa': {
    embedUrl: 'https://www.youtube.com/embed/9Wq_3sS7L-M',
    genre: 'Music Festival',
    duration: '3 Days',
    rating: '15+'
  },
  'Diljit Live': {
    embedUrl: 'https://www.youtube.com/embed/Upa41vS-qU8',
    genre: 'Concert, Music',
    duration: '3h 0m',
    rating: 'All Ages'
  },
  'IPL Finals': {
    embedUrl: 'https://www.youtube.com/embed/F3gCJuS4XnI',
    genre: 'Sports, Cricket',
    duration: '4h 0m',
    rating: 'All Ages'
  },
  'India vs Australia': {
    embedUrl: 'https://www.youtube.com/embed/F3gCJuS4XnI',
    genre: 'Sports, Cricket',
    duration: '8h 0m',
    rating: 'All Ages'
  },
  'Zakir Khan Live': {
    embedUrl: 'https://www.youtube.com/embed/z129C_qQc4Y',
    genre: 'Standup Comedy',
    duration: '1h 30m',
    rating: '16+'
  },
  'Anubhav Singh Bassi Tour': {
    embedUrl: 'https://www.youtube.com/embed/F6p9L13v_cM',
    genre: 'Standup Comedy',
    duration: '1h 20m',
    rating: '16+'
  },
  'AI India Summit': {
    embedUrl: 'https://www.youtube.com/embed/x7X9w_G5C6o',
    genre: 'Tech Conference',
    duration: '2 Days',
    rating: 'Professional'
  }
};

const MoviesPage = () => {
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('All');
  const [language, setLanguage] = useState('All');
  const [rating, setRating] = useState('All');
  const [format, setFormat] = useState('All');

  const genres = useMemo(() => ['All', ...Array.from(new Set(movieCatalog.map((movie) => movie.genre)))], []);
  const languages = useMemo(() => ['All', ...Array.from(new Set(movieCatalog.map((movie) => movie.language)))], []);
  const ratings = useMemo(() => ['All', ...Array.from(new Set(movieCatalog.map((movie) => movie.rating)))], []);
  const formats = useMemo(() => ['All', ...Array.from(new Set(movieCatalog.flatMap((movie) => movie.formats)))], []);

  const filteredMovies = useMemo(() => {
    const query = search.trim().toLowerCase();
    return movieCatalog.filter((movie) => {
      const matchesSearch = !query || [movie.title, movie.city, movie.genre, movie.language, movie.director, movie.description]
        .join(' ')
        .toLowerCase()
        .includes(query);
      const matchesGenre = genre === 'All' || movie.genre === genre;
      const matchesLanguage = language === 'All' || movie.language === language;
      const matchesRating = rating === 'All' || movie.rating === rating;
      const matchesFormat = format === 'All' || movie.formats.includes(format);
      return matchesSearch && matchesGenre && matchesLanguage && matchesRating && matchesFormat;
    });
  }, [search, genre, language, rating, format]);

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-[#2B314B] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-20 sm:px-6 lg:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-medium text-slate-200 backdrop-blur">
              <Play size={14} className="mr-2 fill-current" /> Discover the best Indian cinema across major cities
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Movies that move with your city</h1>
            <p className="mt-4 text-lg text-slate-300">Browse a curated collection of over 60 realistic movie experiences with trailers, showtimes, theatres, and formats for every audience.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">Now showing</p>
            <p className="mt-2 text-2xl font-semibold">{movieCatalog.length}+ curated titles</p>
            <p className="mt-2 text-sm text-slate-300">Search by city, language, rating, genre, and format.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Explore movies</h2>
            <p className="mt-1 text-sm text-slate-500">Filter by your favourite style, language, and viewing format.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="md:col-span-2 xl:col-span-2">
              <SearchBar value={search} onChange={setSearch} placeholder="Search title, city, cast, or genre" />
            </div>
            <Filter label="Genre" value={genre} options={genres} onChange={setGenre} />
            <Filter label="Language" value={language} options={languages} onChange={setLanguage} />
            <Filter label="Rating" value={rating} options={ratings} onChange={setRating} />
            <Filter label="Format" value={format} options={formats} onChange={setFormat} />
          </div>
        </div>

        <MovieGrid movies={filteredMovies} />
      </section>
    </div>
  );
};

const MovieDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const movie = movieCatalog.find((item) => item.id === id);

  if (!movie) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-20 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Movie not found</h1>
        <p className="mt-3 text-slate-600">The movie you are looking for is no longer available.</p>
        <button onClick={() => navigate('/movies')} className="mt-6 rounded-full bg-[#F84464] px-5 py-2.5 font-semibold text-white">
          Back to movies
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <img src={movie.banner} alt={movie.title} className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/30" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-20 sm:px-6 lg:flex-row lg:items-end lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.35em] text-[#F84464]">{movie.city}</p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{movie.title}</h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-300">{movie.description}</p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-200">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">{movie.genre}</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">{movie.language}</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">{movie.duration}</span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">{movie.rating}</span>
            </div>
          </div>
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-2 text-sm text-slate-200">
              <Star size={16} className="fill-current text-yellow-400" /> {movie.rating}
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div><span className="text-slate-400">Director:</span> {movie.director}</div>
              <div><span className="text-slate-400">Cast:</span> {movie.cast.join(', ')}</div>
              <div><span className="text-slate-400">Formats:</span> {movie.formats.join(' • ')}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6 md:flex-row">
              <img src={movie.poster} alt={movie.title} className="h-80 w-full max-w-[260px] rounded-2xl object-cover shadow-md" />
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-slate-900">About the movie</h2>
                <p className="mt-4 text-base leading-8 text-slate-600">{movie.description}</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">Director</p>
                    <p className="mt-2 text-base font-semibold text-slate-900">{movie.director}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">Duration</p>
                    <p className="mt-2 text-base font-semibold text-slate-900">{movie.duration}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Watch trailer</h3>
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <iframe src={movie.trailer} title={`${movie.title} trailer`} className="aspect-video w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
              </div>
              <a href={movie.trailer} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#F84464]">
                <Play size={14} className="fill-current" /> Open trailer on YouTube
              </a>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Showtimes & theatres</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">Theatres</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {movie.availableTheatres.map((theatre) => (
                      <span key={theatre} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{theatre}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">Timings</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {movie.showTimings.map((timing) => (
                      <span key={timing} className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700">{timing}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">Formats</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {movie.formats.map((formatOption) => (
                      <span key={formatOption} className="rounded-full bg-[#F84464]/10 px-3 py-1 text-sm font-medium text-[#F84464]">{formatOption}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const Home = ({ selectedCity }: { selectedCity: string }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTrailer, setActiveTrailer] = useState<any | null>(null);
  const [activeMovieIndex, setActiveMovieIndex] = useState(0);

  const activeCategory = searchParams.get('category') || 'All';
  const searchQuery = searchParams.get('search') || '';

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSearchChange = (val: string) => {
    setSearchParams(prev => {
      if (val) {
        prev.set('search', val);
      } else {
        prev.delete('search');
      }
      return prev;
    });
  };

  const handleCategoryClick = (category: string) => {
    setSearchParams(prev => {
      if (category === 'All') {
        prev.delete('category');
      } else {
        prev.set('category', category);
      }
      return prev;
    });
  };

  useEffect(() => {
    api.get('/events').then(data => {
      if (Array.isArray(data)) {
         setEvents(data);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // ESC key to close trailer modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveTrailer(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const categories = ["All", "Movies", "Concerts", "Sports", "Comedy", "Tech Events"];
  const featuredMovies = movieCatalog.slice(0, 6);
  const nowShowing = movieCatalog.slice(0, 8);
  const comingSoon = movieCatalog.slice(8, 16);
  const topRated = useMemo(() => {
    const ratingScore = (rating: string) => ({ U: 5, UA: 4, 'PG-13': 3, A: 2 }[rating] ?? 1);
    return [...movieCatalog]
      .sort((a, b) => ratingScore(b.rating) - ratingScore(a.rating) || a.title.localeCompare(b.title))
      .slice(0, 8);
  }, []);
  const activeFeaturedMovie = featuredMovies[activeMovieIndex] || featuredMovies[0];

  useEffect(() => {
    if (!featuredMovies.length) return;
    const timer = window.setInterval(() => {
      setActiveMovieIndex((prev) => (prev + 1) % featuredMovies.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [featuredMovies.length]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 text-gray-500 bg-[#0a0a0b] min-h-screen">
      <div className="w-12 h-12 border-4 border-[#F84464] border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="font-semibold text-lg text-gray-300">Loading the best events for you...</p>
    </div>
  );

  // Filter logic
  const filteredEvents = events.filter(e => {
    const matchesCategory = activeCategory === "All" || e.category === activeCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      e.title.toLowerCase().includes(query) || 
      e.category.toLowerCase().includes(query) || 
      e.location.toLowerCase().includes(query);
    const matchesCity = !selectedCity || e.location.toLowerCase() === selectedCity.toLowerCase();
    
    return matchesCategory && matchesSearch && matchesCity;
  });

  const openTrailer = (titleKey: string) => {
    const trailer = TRAILER_MAP[titleKey];
    if (trailer) {
      setActiveTrailer({
        title: titleKey,
        ...trailer
      });
    } else {
      // Fallback
      setActiveTrailer({
        title: titleKey,
        embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Rickroll or generic placeholder
        genre: 'Entertainment',
        duration: '2h 0m',
        rating: 'UA'
      });
    }
  };

  return (
    <div className="bg-[#0a0a0b] min-h-screen text-white">
      <HeroSlider onBookNow={() => scrollTo('booking-section')} onExplore={() => scrollTo('explore-section')} />

      <section className="border-t border-white/10 bg-[#0a0a0b] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#F84464]">Trending now</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Featured movies</h2>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setActiveMovieIndex((prev) => (prev - 1 + featuredMovies.length) % featuredMovies.length)} className="rounded-full border border-white/10 bg-white/5 p-2 text-white transition hover:bg-[#F84464]">
                <ArrowRight size={16} className="rotate-180" />
              </button>
              <button onClick={() => setActiveMovieIndex((prev) => (prev + 1) % featuredMovies.length)} className="rounded-full border border-white/10 bg-white/5 p-2 text-white transition hover:bg-[#F84464]">
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <Link to={`/movies/${activeFeaturedMovie.id}`} className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[#111218] shadow-2xl">
              <img src={activeFeaturedMovie.banner} alt={activeFeaturedMovie.title} className="h-full min-h-[420px] w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#06070a] via-[#06070a]/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-8 text-white">
                <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 backdrop-blur">
                  Featured pick
                </div>
                <h3 className="mt-4 text-3xl font-semibold">{activeFeaturedMovie.title}</h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">{activeFeaturedMovie.description}</p>
                <div className="mt-5 flex flex-wrap gap-2 text-sm text-slate-200">
                  <span className="rounded-full bg-white/10 px-3 py-1">{activeFeaturedMovie.genre}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1">{activeFeaturedMovie.language}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1">{activeFeaturedMovie.duration}</span>
                </div>
              </div>
            </Link>

            <div className="grid gap-4 sm:grid-cols-2">
              {featuredMovies.slice(0, 4).map((movie) => (
                <Link key={movie.id} to={`/movies/${movie.id}`} className="group overflow-hidden rounded-[24px] border border-white/10 bg-[#111218]">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img src={movie.banner} alt={movie.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
                  </div>
                  <div className="p-4 text-white">
                    <h4 className="font-semibold">{movie.title}</h4>
                    <p className="mt-1 text-sm text-slate-400">{movie.city} • {movie.language}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#111218] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#F84464]">Releasing now</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Now showing</h2>
            </div>
            <Link to="/movies" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#F84464]">
              Browse All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {nowShowing.slice(0, 8).map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#0a0a0b] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#F84464]">Soon on screen</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Coming soon</h2>
            </div>
            <Link to="/movies" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#F84464]">
              Browse All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {comingSoon.slice(0, 8).map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#111218] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#F84464]">Fan favourites</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Top rated</h2>
            </div>
            <Link to="/movies" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#F84464]">
              Browse All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {topRated.slice(0, 8).map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        </div>
      </section>

      {/* Booking Section */}
      <section id="booking-section" className="py-24 relative bg-gradient-to-b from-[#1A1A1A] to-[#0a0a0b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#F84464]">New experience</p>
              <h3 className="text-xl font-semibold text-white">Explore our full movies catalogue</h3>
            </div>
            <Link to="/movies" className="rounded-full bg-[#F84464] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e03b5a]">
              Browse Movies
            </Link>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 flex items-center gap-2">
                <Ticket className="text-[#F84464]" /> Ticket Booking
              </h2>
              <p className="text-gray-400">
                {selectedCity ? `Reserve your seats for trending experiences in ${selectedCity}.` : 'Reserve your seats for trending experiences.'}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-md">
                {categories.map(c => (
                  <button 
                    key={c} 
                    onClick={() => handleCategoryClick(c)}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${activeCategory === c ? 'bg-[#F84464] text-white shadow-[0_0_15px_rgba(248,68,100,0.5)]' : 'hover:text-white text-gray-400'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="md:ml-2 flex items-center bg-white/5 rounded-full px-4 py-2.5 border border-white/10 backdrop-blur-md focus-within:border-[#F84464] focus-within:ring-1 focus-within:ring-[#F84464] transition-all">
                 <Search size={16} className="text-gray-400 mr-2" />
                 <input 
                   type="text" 
                   placeholder="Search events..." 
                   value={searchQuery}
                   onChange={e => handleSearchChange(e.target.value)}
                   className="bg-transparent border-none outline-none text-sm text-white w-32 md:w-48 placeholder-gray-500" 
                 />
              </div>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl p-8 max-w-lg mx-auto">
              <Search size={48} className="mx-auto text-gray-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No matching events found</h3>
              <p className="text-gray-400 text-sm mb-6">
                We couldn't find any events matching "{searchQuery}" {selectedCity ? `in ${selectedCity}` : ''}. Try adjusting your filters or category.
              </p>
              <button 
                onClick={() => {
                  setSearchParams(prev => {
                    prev.delete('search');
                    prev.delete('category');
                    return prev;
                  });
                }}
                className="px-6 py-2.5 rounded-xl font-bold bg-[#F84464] text-white hover:bg-[#e03b5a] transition-all cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredEvents.map((event, i) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    key={event.id}
                    className="group relative bg-[#131521]/80 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:bg-white/5 transition-all duration-300 shadow-lg hover:border-white/20 hover:shadow-[#F84464]/20 flex flex-col h-full"
                  >
                    <div className="aspect-[4/3] overflow-hidden relative bg-black/50 shrink-0">
                       <img src={event.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=600&h=800'} loading="lazy" alt={event.title} className="w-full h-full object-cover opacity-80 transform group-hover:scale-110 group-hover:opacity-100 transition duration-700 ease-out" />
                       <div className="absolute inset-0 bg-gradient-to-t from-[#131521] to-transparent opacity-90"></div>
                       
                       <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-sm font-bold border border-white/10">
                         ₹{event.price}
                       </div>
                       <div className="absolute top-3 left-3 bg-gradient-to-r from-[#F84464] to-[#e03b5a] px-3 py-1 text-xs font-bold shadow-[0_0_15px_rgba(248,68,100,0.5)] rounded-full">
                         {event.category}
                       </div>
                    </div>
                    <div className="p-4 relative -mt-6 z-10 flex flex-col flex-1 justify-between">
                      <div>
                        <h3 className="font-bold text-lg mb-1 text-white group-hover:text-[#F84464] transition-colors truncate drop-shadow-md">{event.title}</h3>
                        <div className="space-y-1.5 mb-4">
                          <div className="flex items-center text-gray-400 text-xs gap-2">
                             <Calendar size={12} className="text-[#F84464]" /> {event.date}
                          </div>
                          <div className="flex items-center text-gray-400 text-xs gap-2">
                             <MapPin size={12} className="text-[#F84464]" /> {event.location}
                          </div>
                        </div>
                      </div>
                      <Link to={`/events/${event.id}`} className="block w-full py-2.5 rounded-xl text-center text-sm font-bold transition-all bg-white/10 hover:bg-[#F84464] hover:shadow-[0_0_20px_rgba(248,68,100,0.5)] border border-white/10 hover:border-transparent text-white group-hover:scale-[1.02]">
                        Reserve Seat
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </section>

      {/* Explore Section */}
      <section id="explore-section" className="py-24 relative bg-[#0a0a0b] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div>
                 <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 flex items-center gap-2">
                   <Sparkles className="text-[#F84464]" /> Showcase Events
                 </h2>
                 <p className="text-gray-400">Discover premium events and live experiences near you. Click the Play button to watch the trailer!</p>
              </div>
              <button 
                onClick={() => scrollTo('booking-section')}
                className="flex items-center gap-2 text-sm text-[#F84464] font-semibold hover:text-white transition group border border-[#F84464]/30 px-4 py-2 rounded-full hover:bg-[#F84464] hover:border-[#F84464] cursor-pointer"
              >
                View Full Showcase <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
              {/* Main Feature */}
              <motion.div 
                onClick={() => openTrailer('Sunburn Goa')}
                whileHover={{ scale: 1.01 }} 
                className="group relative rounded-2xl overflow-hidden aspect-[4/3] cursor-pointer border border-white/10 shadow-xl bg-[#1A1A1A]"
              >
                 <img src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80" loading="lazy" alt="Showcase" className="w-full h-full object-cover opacity-60 group-hover:opacity-90 transition duration-700 ease-out transform group-hover:scale-105" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-0"></div>
                 <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full flex justify-between items-end z-10">
                    <div className="pr-4 border-l-4 border-[#F84464] pl-4">
                      <div className="bg-[#F84464] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm inline-block mb-2 tracking-wider uppercase">Live Concert</div>
                      <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-1 leading-tight drop-shadow-md">Sunburn Festival <br/> Goa 2026</h3>
                      <p className="text-gray-300 text-xs md:text-sm font-medium drop-shadow max-w-[250px]">Experience Asia's biggest electronic dance music festival.</p>
                    </div>
                    <button className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-3 group-hover:bg-[#F84464] transition-all duration-300 group-hover:border-transparent group-hover:shadow-[0_0_20px_rgba(248,68,100,0.6)] group-hover:scale-110 cursor-pointer">
                      <Play size={20} className="text-white ml-0.5" fill="currentColor" />
                    </button>
                 </div>
              </motion.div>
                           {/* Secondary Features */}
              <div className="grid grid-cols-1 gap-6">
                 <motion.div 
                   onClick={() => openTrailer('Pushpa 2')}
                   whileHover={{ scale: 1.02 }} 
                   className="group relative rounded-2xl overflow-hidden cursor-pointer border border-white/10 shadow-xl bg-[#1A1A1A]"
                 >
                    <img src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80" loading="lazy" alt="Showcase" className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition duration-700 ease-out transform group-hover:scale-105 absolute inset-0" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"></div>
                    <div className="relative p-6 h-full flex items-end justify-between min-h-[200px]">
                          <div className="border-l-2 border-blue-500 pl-3">
                             <div className="text-[10px] text-blue-400 font-bold mb-1 tracking-wider uppercase">Movie Premiere</div>
                             <h3 className="text-xl font-bold text-white drop-shadow-md">Pushpa 2: The Rule</h3>
                          </div>
                          <div className="bg-white/10 p-2.5 rounded-full backdrop-blur border border-white/10 group-hover:bg-blue-600 transition-colors group-hover:border-blue-600 shadow-[0_0_15px_rgba(59,130,246,0)] group-hover:shadow-[0_0_15px_rgba(59,130,246,0.6)] cursor-pointer">
                             <Play className="text-white" size={18} fill="currentColor" />
                          </div>
                    </div>
                 </motion.div>

                 <motion.div 
                   onClick={() => openTrailer('IPL Finals')}
                   whileHover={{ scale: 1.02 }} 
                   className="group relative rounded-2xl overflow-hidden cursor-pointer border border-white/10 shadow-xl bg-[#1A1A1A]"
                 >
                    <img src="https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=80" loading="lazy" alt="Showcase" className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition duration-700 ease-out transform group-hover:scale-105 absolute inset-0" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"></div>
                    <div className="relative p-6 h-full flex items-end justify-between min-h-[200px]">
                          <div className="border-l-2 border-yellow-400 pl-3">
                             <div className="text-[10px] text-yellow-400 font-bold mb-1 tracking-wider uppercase">Live Sports</div>
                             <h3 className="text-xl font-bold text-white drop-shadow-md">IPL Finals Live</h3>
                          </div>
                          <div className="bg-white/10 p-2.5 rounded-full backdrop-blur border border-white/10 group-hover:bg-yellow-500 transition-colors group-hover:border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0)] group-hover:shadow-[0_0_15px_rgba(234,179,8,0.6)] cursor-pointer">
                             <Play className="text-white" size={18} fill="currentColor" />
                          </div>
                    </div>
                 </motion.div>
              </div>
           </div>
        </div>
      </section>

      {/* Showcase Trailer Modal */}
      <AnimatePresence>
        {activeTrailer && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            {/* Dark blur backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveTrailer(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />
            
            {/* Modal Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl bg-[#131521] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-10 flex flex-col md:flex-row h-full max-h-[85vh] md:max-h-[500px]"
            >
              {/* Close Button */}
              <button 
                onClick={() => setActiveTrailer(null)}
                className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 border border-white/10 text-white hover:bg-[#F84464] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Left Side: Video Player */}
              <div className="w-full md:w-3/5 bg-black flex items-center justify-center relative aspect-video md:aspect-auto md:h-full">
                <iframe 
                  src={activeTrailer.embedUrl}
                  title="Showcase Trailer"
                  className="w-full h-full border-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  allowFullScreen
                />
              </div>

              {/* Right Side: Showcase Metadata */}
              <div className="w-full md:w-2/5 p-6 flex flex-col justify-between overflow-y-auto md:h-full">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#F84464] tracking-widest block mb-1">Trailer Preview</span>
                  <h3 className="text-2xl font-extrabold text-white leading-tight mb-4">{activeTrailer.title}</h3>
                  
                  <div className="space-y-4 text-sm text-gray-300 border-t border-white/10 pt-4">
                    <div>
                      <span className="text-xs text-gray-500 font-semibold block uppercase">Genre</span>
                      <span className="font-semibold text-white">{activeTrailer.genre}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 font-semibold block uppercase">Duration</span>
                      <span className="font-semibold text-white">{activeTrailer.duration}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 font-semibold block uppercase">Certification</span>
                      <span className="font-semibold text-white">{activeTrailer.rating}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-white/10">
                  <a 
                    href={activeTrailer.embedUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold bg-[#F84464] text-white hover:bg-[#e03b5a] transition-all shadow-[0_0_20px_rgba(248,68,100,0.4)]"
                  >
                    <Play size={16} fill="currentColor" /> Watch Trailer on YouTube
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const EventDetails = ({ token }: { token: string | null }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [seats, setSeats] = useState<any[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/events/${id}`),
      api.get(`/events/${id}/seats`)
    ]).then(([evtData, seatsData]) => {
      setEvent(evtData);
      setSeats(seatsData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const getSeatCategory = (index: number) => {
    const row = Math.floor(index / 10);
    if (row < 2) {
      return { name: 'VIP', badge: 'Gold', surcharge: 200, badgeColor: 'bg-amber-100 text-amber-800 border-amber-200' };
    } else if (row < 4) {
      return { name: 'Premium', badge: 'Purple', surcharge: 100, badgeColor: 'bg-purple-100 text-purple-800 border-purple-200' };
    } else {
      return { name: 'Executive', badge: 'Green', surcharge: 0, badgeColor: 'bg-green-100 text-green-800 border-green-200' };
    }
  };

  const toggleSeat = (seatId: number, status: string) => {
    if (status !== 'available') return;
    setSelectedSeats(prev => 
      prev.includes(seatId) ? prev.filter(s => s !== seatId) : [...prev, seatId]
    );
  };

  // Pricing calculations
  const basePrice = event?.price || 0;
  const numTickets = selectedSeats.length;
  const basePriceTotal = numTickets * basePrice;
  
  const premiumChargesTotal = selectedSeats.reduce((sum, seatId) => {
    const seatIndex = seats.findIndex(s => s.id === seatId);
    if (seatIndex !== -1) {
      return sum + getSeatCategory(seatIndex).surcharge;
    }
    return sum;
  }, 0);

  const convenienceFee = numTickets > 0 ? numTickets * 40 : 0; // ₹40 per ticket convenience fee
  const gst = numTickets > 0 ? Math.round((basePriceTotal + premiumChargesTotal + convenienceFee) * 0.18) : 0; // 18% GST
  const grandTotal = basePriceTotal + premiumChargesTotal + convenienceFee + gst;

  const handleBook = async () => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (selectedSeats.length === 0) return;
    setBooking(true);
    try {
      await api.post('/bookings', { event_id: event.id, seat_ids: selectedSeats, total_price: grandTotal }, token);
      alert('Booking Successful!');
      navigate('/bookings');
    } catch (e: any) {
      alert(`Booking failed: ${e.message}`);
    } finally {
      setBooking(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 text-gray-500 bg-[#F5F5F5] min-h-screen">
      <div className="w-12 h-12 border-4 border-[#F84464] border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="font-semibold text-lg text-gray-700">Loading show details...</p>
    </div>
  );
  
  if (!event) return <div className="text-center py-32 text-red-500">Event not found.</div>;

  return (
    <div className="bg-[#F5F5F5] min-h-screen pb-20 font-sans">
      {/* Top Banner section */}
      <div className="bg-[#1A1A1A] text-white py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-transparent z-0"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row gap-8 relative z-10">
           <div className="w-full md:w-64 shrink-0 rounded-2xl overflow-hidden shadow-2xl relative border border-gray-800 aspect-[3/4] md:aspect-auto">
             <img src={event.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=600&h=800'} alt={event.title} className="w-full h-full object-cover" />
           </div>
           
           <div className="flex flex-col justify-center flex-1">
             <span className="bg-[#F84464] text-white text-xs font-bold px-3 py-1 rounded-full w-max mb-3 uppercase tracking-wider shadow-[0_0_15px_rgba(248,68,100,0.4)]">
               {event.category}
             </span>
             <h1 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight drop-shadow-md">{event.title}</h1>
             
             <div className="bg-white/5 border border-white/10 backdrop-blur-md inline-flex items-center gap-4 px-4 py-2.5 rounded-xl mb-6 max-w-fit text-sm">
                <div className="flex items-center gap-1 text-[#F84464] font-bold">
                   <Star size={18} className="fill-current" />
                   <span className="text-white ml-1">4.8/5</span>
                </div>
                <div className="w-px h-5 bg-white/20"></div>
                <div className="text-gray-300 font-medium">Add rating & review</div>
             </div>

             <div className="space-y-3 mb-6 bg-white/5 border border-white/10 backdrop-blur-sm p-5 rounded-xl inline-block text-sm max-w-md">
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-[#F84464]" />
                    <span className="font-semibold text-gray-200">{event.date}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin size={18} className="text-[#F84464]" />
                    <span className="text-gray-300">{event.location}</span>
                  </div>
             </div>

             <div className="mt-auto pt-6 border-t border-white/10 w-full flex items-center justify-between">
                <div>
                   <span className="text-gray-400 text-xs uppercase block font-semibold">Ticket Price</span>
                   <span className="text-2xl font-bold text-white">₹{event.price}</span>
                </div>
                <button
                  onClick={() => document.getElementById('seat-selector')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-8 py-3.5 rounded-xl font-bold text-white shadow-lg bg-[#F84464] hover:bg-[#e03b5a] transform transition hover:scale-105 cursor-pointer shadow-[0_0_20px_rgba(248,68,100,0.4)]"
                >
                  Select Seats
                </button>
             </div>
           </div>
        </div>
      </div>

      {/* Seat Selection */}
      <div id="seat-selector" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 md:p-8">
          <h2 className="text-2xl font-extrabold mb-8 text-gray-900 border-b pb-4 flex items-center gap-2">
            <Ticket className="text-[#F84464]" /> Select Seats
          </h2>
          
          <div className="w-full relative py-8 flex flex-col items-center">
              {/* Screen Indicator */}
              <div className="w-full max-w-lg mb-16 text-center">
                <div className="h-2.5 bg-gradient-to-r from-gray-200 via-gray-400 to-gray-200 rounded-t-[100%] shadow-[0_-5px_15px_rgba(0,0,0,0.1)] relative">
                  <div className="absolute inset-0 bg-[#F84464]/20 blur-[10px] rounded-t-[100%]"></div>
                </div>
                <p className="text-[10px] text-gray-400 mt-3 uppercase tracking-widest font-bold">Stage / Screen This Way</p>
              </div>

              {/* Seating Grid */}
              <div className="bg-gray-50/50 p-6 md:p-10 rounded-2xl border border-gray-100 w-full max-w-4xl overflow-x-auto">
                <div className="grid grid-cols-10 gap-2 md:gap-3 min-w-[340px] justify-center mx-auto">
                  {seats.map((seat, index) => {
                    const isSelected = selectedSeats.includes(seat.id);
                    const isBooked = seat.status === 'booked';
                    const category = getSeatCategory(index);
                    
                    let seatColor = '';
                    if (isBooked) {
                      seatColor = 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed';
                    } else if (isSelected) {
                      if (category.name === 'VIP') seatColor = 'bg-amber-500 border-amber-500 text-white shadow-md scale-110';
                      else if (category.name === 'Premium') seatColor = 'bg-purple-500 border-purple-500 text-white shadow-md scale-110';
                      else seatColor = 'bg-green-500 border-green-500 text-white shadow-md scale-110';
                    } else {
                      // Available states
                      if (category.name === 'VIP') seatColor = 'bg-white border-amber-400 text-amber-700 hover:bg-amber-50 hover:scale-105';
                      else if (category.name === 'Premium') seatColor = 'bg-white border-purple-400 text-purple-700 hover:bg-purple-50 hover:scale-105';
                      else seatColor = 'bg-white border-green-400 text-green-700 hover:bg-green-50 hover:scale-105';
                    }

                    return (
                      <div key={seat.id} className="relative group/seat flex flex-col items-center">
                        <button
                          disabled={isBooked}
                          onClick={() => toggleSeat(seat.id, seat.status)}
                          className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg border text-[10px] sm:text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${seatColor}`}
                        >
                          {seat.seat_number}
                        </button>
                        
                        {/* Hover Tooltip */}
                        {!isBooked && (
                          <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-[9px] font-bold px-2 py-1 rounded shadow-lg opacity-0 pointer-events-none group-hover/seat:opacity-100 transition-opacity z-10 whitespace-nowrap">
                            {category.name} Tier (+₹{category.surcharge})
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs bg-gray-50 py-3 px-6 rounded-xl border border-gray-100">
                <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-white border border-amber-400 rounded-md"></div> VIP Available</div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-white border border-purple-400 rounded-md"></div> Premium Available</div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-white border border-green-400 rounded-md"></div> Executive Available</div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded-md"></div> Sold</div>
              </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Bar for Booking Checkout with pricing summary */}
      <AnimatePresence>
        {selectedSeats.length > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-200 p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] z-40"
          >
             <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
                {/* Pricing Summary Breakdown */}
                <div className="w-full md:w-auto grid grid-cols-2 sm:grid-cols-4 md:flex items-center gap-x-6 gap-y-2 text-xs text-gray-600 border-r-0 md:border-r border-gray-200 pr-0 md:pr-8">
                  <div>
                    <span className="block font-semibold text-gray-400">Tickets ({numTickets})</span>
                    <span className="font-bold text-gray-900 text-sm">₹{basePriceTotal}</span>
                  </div>
                  <div>
                    <span className="block font-semibold text-gray-400">Tiers Surcharge</span>
                    <span className="font-bold text-gray-900 text-sm">₹{premiumChargesTotal}</span>
                  </div>
                  <div>
                    <span className="block font-semibold text-gray-400">Convenience Fee</span>
                    <span className="font-bold text-gray-900 text-sm">₹{convenienceFee}</span>
                  </div>
                  <div>
                    <span className="block font-semibold text-[#F84464]">GST (18%)</span>
                    <span className="font-bold text-[#F84464] text-sm">₹{gst}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full md:w-auto gap-8 flex-1 md:flex-initial">
                  <div>
                     <span className="text-gray-400 text-xs font-semibold block uppercase">Grand Total</span>
                     <div className="text-2xl font-extrabold text-gray-900 leading-none">
                       ₹{grandTotal}
                     </div>
                  </div>
                  <button
                    onClick={handleBook}
                    disabled={booking}
                    className="px-10 py-3.5 rounded-xl font-bold text-white bg-[#F84464] hover:bg-[#e03b5a] transition-all transform hover:scale-102 cursor-pointer shadow-[0_0_20px_rgba(248,68,100,0.4)] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {booking ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Processing...
                      </span>
                    ) : 'Pay Amount & Book'}
                  </button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const QRCodeGrid = ({ value }: { value: string }) => {
  const size = 17; // 17x17 grid
  const cells: boolean[] = [];
  
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const isTopLeftAnchor = r < 4 && c < 4;
      const isTopRightAnchor = r < 4 && c >= size - 4;
      const isBottomLeftAnchor = r >= size - 4 && c < 4;
      
      if (isTopLeftAnchor || isTopRightAnchor || isBottomLeftAnchor) {
        const border = (r === 0 || r === 3 || c === 0 || c === 3) ||
                       (r === 0 || r === 3 || c === size - 1 || c === size - 4) ||
                       (r === size - 1 || r === size - 4 || c === 0 || c === 3);
        const center = (r === 1 && c === 1) || (r === 1 && c === 2) || (r === 2 && c === 1) || (r === 2 && c === 2) ||
                       (r === 1 && c === size - 2) || (r === 1 && c === size - 3) || (r === 2 && c === size - 2) || (r === 2 && c === size - 3) ||
                       (r === size - 2 && c === 1) || (r === size - 2 && c === 2) || (r === size - 3 && c === 1) || (r === size - 3 && c === 2);
        
        cells.push(border || center);
      } else {
        const cellHash = Math.abs(Math.sin(hash + r * 31 + c * 17));
        cells.push(cellHash > 0.45);
      }
    }
  }

  return (
    <div className="grid bg-white p-2.5 rounded-lg border border-gray-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, gap: '1px' }}>
      {cells.map((filled, i) => (
        <div key={i} className={`aspect-square rounded-[0.5px] ${filled ? 'bg-gray-800' : 'bg-transparent'}`} />
      ))}
    </div>
  );
};

const TicketCard = ({ booking }: { booking: any }) => {
  const [downloadState, setDownloadState] = useState<'idle' | 'generating' | 'success'>('idle');

  const handleDownload = () => {
    setDownloadState('generating');
    setTimeout(() => {
      setDownloadState('success');
      
      // Simulate file download
      const element = document.createElement("a");
      const seatsList = booking.tickets?.map((t: any) => t.seat_number).join(', ') || 'N/A';
      const fileContent = `
=============================================
             BOOKMYTIX ELECTRONIC TICKET
=============================================
Booking ID    : #${booking.id.toString().padStart(5, '0')}
Event Title   : ${booking.event_title}
Date & Time   : ${booking.event_date}
Venue         : ${booking.event_location}
Seats         : ${seatsList}
Price Paid    : ₹${booking.total_price || 'N/A'}
Status        : CONFIRMED
Security Code : ${booking.tickets?.[0]?.qr_code || 'N/A'}
=============================================
Thank you for booking with BookMyTix!
Please show this ticket details at the entrance.
      `.trim();
      
      const file = new Blob([fileContent], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `ticket-${booking.id}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      
      setTimeout(() => {
        setDownloadState('idle');
      }, 2000);
    }, 1500);
  };

  const seatsList = booking.tickets?.map((t: any) => t.seat_number).join(', ') || 'N/A';
  const qrCodeValue = booking.tickets?.[0]?.qr_code || `REF-${booking.id}`;

  return (
    <div className="relative group transition-all duration-300 transform hover:scale-[1.005]">
      {/* Glow background behind ticket */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/10 via-[#F84464]/10 to-indigo-500/10 rounded-2xl blur-md opacity-70 group-hover:opacity-100 transition duration-500"></div>
      
      <div className="relative bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-md flex flex-col md:flex-row w-full z-10">
        
        {/* Left Side: MAIN TICKET */}
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Booked Event Ticket</span>
              <span className="text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-green-200 shadow-sm leading-none">
                <CheckCircle size={12} /> Confirmed
              </span>
            </div>

            <h3 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-6 drop-shadow-sm pr-12">{booking.event_title}</h3>

            <div className="grid grid-cols-2 gap-y-5 gap-x-8 text-sm border-t border-gray-100 pt-5">
              <div>
                <span className="text-gray-400 text-xs font-semibold uppercase block tracking-wide">Date & Time</span>
                <span className="font-bold text-gray-800 flex items-center gap-1.5 mt-0.5"><Calendar size={14} className="text-[#F84464]" /> {booking.event_date}</span>
              </div>
              <div>
                <span className="text-gray-400 text-xs font-semibold uppercase block tracking-wide">Venue</span>
                <span className="font-bold text-gray-800 flex items-center gap-1.5 mt-0.5"><MapPin size={14} className="text-[#F84464]" /> {booking.event_location}</span>
              </div>
              <div>
                <span className="text-gray-400 text-xs font-semibold uppercase block tracking-wide">Seats ({booking.tickets?.length || 0})</span>
                <span className="font-extrabold text-[#F84464] block mt-0.5 bg-[#F84464]/5 px-2 py-0.5 rounded border border-[#F84464]/10 w-max">{seatsList}</span>
              </div>
              <div>
                <span className="text-gray-400 text-xs font-semibold uppercase block tracking-wide">Grand Total</span>
                <span className="font-bold text-gray-900 block mt-0.5">₹{booking.total_price || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-center">
            <span className="text-xs text-gray-400">Scan code at entry stub</span>
            <button
              onClick={handleDownload}
              disabled={downloadState === 'generating'}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md hover:shadow-lg transition-all transform active:scale-98 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              style={{ backgroundColor: THEME.primary }}
            >
              {downloadState === 'generating' ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Generating Ticket...
                </>
              ) : downloadState === 'success' ? (
                <>
                  <CheckCircle size={14} />
                  Downloaded!
                </>
              ) : (
                <>
                  <Download size={14} />
                  Download Ticket
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dashed Separator & Ticket Notch Cutouts */}
        <div className="relative flex flex-row md:flex-col items-center justify-center shrink-0 w-full md:w-max py-2 md:py-0">
          {/* Top Notch Cutout */}
          <div className="absolute top-0 left-1/2 md:left-auto md:right-0 md:top-0 -translate-x-1/2 md:translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F5F5F5] border border-gray-200/80 z-20"></div>
          
          {/* Dashed line */}
          <div className="h-px md:h-[80%] w-[90%] md:w-px border-t md:border-l border-dashed border-gray-300 z-10"></div>
          
          {/* Bottom Notch Cutout */}
          <div className="absolute bottom-0 left-1/2 md:left-auto md:right-0 md:bottom-0 -translate-x-1/2 md:translate-x-1/2 translate-y-1/2 w-6 h-6 rounded-full bg-[#F5F5F5] border border-gray-200/80 z-20"></div>
        </div>

        {/* Right Side: TICKET STUB */}
        <div className="w-full md:w-72 p-6 md:p-8 bg-gray-50/50 flex flex-col items-center justify-between gap-4 shrink-0 text-center">
          <div className="w-full">
            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-3 tracking-wider font-semibold">Gate Stub</span>
            <div className="w-36 h-36 mx-auto">
              <QRCodeGrid value={qrCodeValue} />
            </div>
          </div>
          
          <div className="space-y-1 text-center w-full">
            <div>
              <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-wide font-semibold">Booking ID</span>
              <span className="font-mono font-bold text-gray-800">#{booking.id.toString().padStart(5, '0')}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-wide mt-1 font-semibold">Security Code</span>
              <span className="font-mono text-xs text-gray-600 font-semibold truncate block max-w-[200px] mx-auto">{qrCodeValue}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const Bookings = ({ token }: { token: string | null }) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.get('/bookings', token).then(data => {
      setBookings(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  if (!token) return <Navigate to="/login" />;

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 text-gray-500 bg-[#F5F5F5] min-h-screen">
      <div className="w-12 h-12 border-4 border-[#F84464] border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="font-semibold text-lg text-gray-700">Loading your tickets...</p>
    </div>
  );

  return (
    <div className="bg-[#F5F5F5] min-h-screen py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight mb-8 text-gray-900">Your Tickets</h1>
        
        {bookings.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-xl border border-gray-200 shadow-sm">
            <Ticket size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Looks empty here!</h2>
            <p className="text-gray-500 mb-6 text-sm">Grab tickets for your favorite movies and events.</p>
            <Link to="/" className="inline-flex py-2.5 px-6 text-white font-bold rounded-xl shadow-sm hover:shadow-lg transition-all" style={{ backgroundColor: THEME.primary }}>
              Explore Events
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {bookings.map(b => (
              <TicketCard key={b.id} booking={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const AdminDashboard = ({ token }: { token: string | null }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [price, setPrice] = useState('');
  const [seats, setSeats] = useState('20');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    api.get('/admin/stats', token)
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token, navigate]);

  const handleCreateEvent = async (e: any) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/events', { title, location, date, price: parseFloat(price), num_seats: parseInt(seats) }, token);
      alert('Event Created Successfully!');
      setTitle(''); setLocation(''); setDate(''); setPrice(''); setSeats('20');
      
      api.get('/admin/stats', token).then(setStats);
    } catch (err: any) {
      alert(`Error creating event: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  if (!token) return null;
  if (loading) return <div className="text-center py-20 text-gray-500">Loading admin data...</div>;

  return (
    <div className="bg-[#F5F5F5] min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight mb-8">Admin Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white border rounded-lg p-6 shadow-sm border-l-4 border-l-blue-500">
            <div className="text-gray-500 font-semibold mb-2 text-xs uppercase tracking-wider">Total Events</div>
            <div className="text-4xl font-bold text-gray-900">{stats?.events || 0}</div>
          </div>
          <div className="bg-white border rounded-lg p-6 shadow-sm border-l-4 border-l-green-500">
            <div className="text-gray-500 font-semibold mb-2 text-xs uppercase tracking-wider">Total Bookings</div>
            <div className="text-4xl font-bold text-gray-900">{stats?.bookings || 0}</div>
          </div>
          <div className="bg-white border rounded-lg p-6 shadow-sm border-l-4 border-l-[#F84464]">
            <div className="text-gray-500 font-semibold mb-2 text-xs uppercase tracking-wider">Total Revenue</div>
            <div className="text-4xl font-bold text-gray-900">₹{(stats?.revenue || 0)}</div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6 shadow-sm max-w-3xl">
          <h2 className="text-lg font-bold mb-6 pb-4 border-b">Create New Event</h2>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2 bg-gray-50 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g. AI Conf 2026" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input type="text" required value={location} onChange={e => setLocation(e.target.value)} className="w-full px-4 py-2 bg-gray-50 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g. New York, NY" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-2 bg-gray-50 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ticket Price (₹)</label>
                <input type="number" step="0.01" required value={price} onChange={e => setPrice(e.target.value)} className="w-full px-4 py-2 bg-gray-50 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="1499" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Seats (Max capacity)</label>
                <input type="number" required value={seats} onChange={e => setSeats(e.target.value)} className="w-full px-4 py-2 bg-gray-50 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="20" />
              </div>
            </div>
            <button type="submit" disabled={creating} className="w-full py-3 text-white font-semibold rounded bg-gray-900 hover:bg-black transition-colors mt-6">
              {creating ? 'Creating...' : 'Publish Event'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const Auth = ({ setAuth }: { setAuth: (token: string, user: any) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return 'Please enter a valid email address.';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters long.';
    }
    if (!isLogin && name.trim().length < 2) {
      return 'Please enter your full name.';
    }
    return '';
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const body = isLogin
        ? { email: email.trim().toLowerCase(), password }
        : { name: name.trim(), email: email.trim().toLowerCase(), password };
      const data = await api.post(endpoint, body);
      setAuth(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded shadow-sm border border-gray-200">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold tracking-tight text-gray-900">{isLogin ? 'Get Started' : 'Register'}</h2>
          <p className="text-gray-500 text-xs mt-1">Please enter your details to continue</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-2 rounded text-xs mb-4 font-medium text-center border border-red-100">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:border-[#F84464]" placeholder="John Doe" />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:border-[#F84464]" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:border-[#F84464]" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full py-2.5 text-white font-bold rounded text-sm transition-colors mt-2 disabled:opacity-70" style={{ backgroundColor: THEME.primary }}>
            {isSubmitting ? (isLogin ? 'Signing in...' : 'Creating account...') : (isLogin ? 'Continue' : 'Sign Up')}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-6 border-t pt-4">
          {isLogin ? "I agree to the Terms & Conditions and Privacy Policy." : "Already have an account? "}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="font-semibold text-black hover:underline cursor-pointer block w-full mt-2">
            {isLogin ? 'Create an account instead' : 'Login instead'}
          </button>
        </p>
      </div>
    </div>
  );
};

const Footer = () => {
  return (
    <footer className="bg-[#333338] text-gray-400 text-sm mt-auto">
      <div className="bg-[#2B314B] py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-white font-semibold">
             <span>List your Show</span>
             <span className="text-gray-300 font-normal hidden lg:inline">Got a show, event, activity or a great experience? Partner with us & get listed on BookMyTix</span>
          </div>
          <button className="bg-[#F84464] text-white px-6 py-2 rounded font-semibold hover:bg-[#e03b5a] transition">Contact today!</button>
        </div>
      </div>
      
      <div className="bg-[#404043] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap justify-around items-center text-center text-gray-300 gap-8">
           <div className="flex flex-col items-center gap-3 group cursor-pointer hover:text-white transition">
              <Headphones size={42} className="text-gray-400 group-hover:text-white transition" />
              <span className="text-[11px] font-semibold uppercase tracking-widest">24/7 Customer Care</span>
           </div>
           <div className="flex flex-col items-center gap-3 group cursor-pointer hover:text-white transition">
              <RefreshCcw size={42} className="text-gray-400 group-hover:text-white transition" />
              <span className="text-[11px] font-semibold uppercase tracking-widest">Resend Booking Confirmation</span>
           </div>
           <div className="flex flex-col items-center gap-3 group cursor-pointer hover:text-white transition">
              <Mail size={42} className="text-gray-400 group-hover:text-white transition" />
              <span className="text-[11px] font-semibold uppercase tracking-widest">Subscribe to the Newsletter</span>
           </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 pb-16">
         <div>
            <h4 className="text-gray-200 text-xs font-semibold mb-3 tracking-widest">MOVIES NOW SHOWING</h4>
            <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs text-gray-500">
              <a href="#" className="hover:text-white transition-colors">Rata Shivaji</a> | <a href="#" className="hover:text-white transition-colors">The Devil Wears Prada 2</a> | <a href="#" className="hover:text-white transition-colors">Bhoothi Bangla</a> | <a href="#" className="hover:text-white transition-colors">Michael</a> | <a href="#" className="hover:text-white transition-colors">Mortal Kombat II</a> | <a href="#" className="hover:text-white transition-colors">Dhurandhar The Revenge</a>
            </div>
         </div>
         <div>
            <h4 className="text-gray-200 text-xs font-semibold mb-3 tracking-widest">UPCOMING MOVIES PER WEEK</h4>
            <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs text-gray-500">
              <a href="#" className="hover:text-white transition-colors">Upcoming Movies Today</a> | <a href="#" className="hover:text-white transition-colors">Upcoming Movies Tomorrow</a> | <a href="#" className="hover:text-white transition-colors">Upcoming Movies This Weekend</a>
            </div>
         </div>
         <div>
            <h4 className="text-gray-200 text-xs font-semibold mb-3 tracking-widest">MOVIES BY GENRE</h4>
            <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs text-gray-500">
              <a href="#" className="hover:text-white transition-colors">Drama Movies</a> | <a href="#" className="hover:text-white transition-colors">Comedy Movies</a> | <a href="#" className="hover:text-white transition-colors">Romantic Movies</a> | <a href="#" className="hover:text-white transition-colors">Action Movies</a> | <a href="#" className="hover:text-white transition-colors">Thriller Movies</a> | <a href="#" className="hover:text-white transition-colors">Mystery Movies</a>
            </div>
         </div>
         <div>
            <h4 className="text-gray-200 text-xs font-semibold mb-3 tracking-widest">EVENTS IN TOP CITIES</h4>
            <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs text-gray-500">
              <a href="#" className="hover:text-white transition-colors">Events in Mumbai</a> | <a href="#" className="hover:text-white transition-colors">Events in Delhi-NCR</a> | <a href="#" className="hover:text-white transition-colors">Events in Chennai</a> | <a href="#" className="hover:text-white transition-colors">Events in Bengaluru</a> | <a href="#" className="hover:text-white transition-colors">Events in Hyderabad</a> | <a href="#" className="hover:text-white transition-colors">Events in Pune</a>
            </div>
         </div>
         <div className="pt-8 text-center text-xs border-t border-gray-700">
            <p>Copyright 2026 © Bigtree Entertainment Pvt. Ltd. All Rights Reserved.</p>
            <p className="mt-2 text-gray-600">The content and images used on this site are copyright protected and copyrights vests with the respective owners. The usage of the content and images on this website is intended to promote the works and no endorsement of the artist shall be implied. Unauthorized use is prohibited and punishable by law.</p>
         </div>
      </div>
    </footer>
  );
};

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('user') || 'null'));
  const [selectedCity, setSelectedCity] = useState<string>(() => localStorage.getItem('selectedCity') || '');

  useEffect(() => {
    const handleExpiredSession = () => {
      setToken(null);
      setUser(null);
      clearStoredAuth();
    };

    window.addEventListener('auth:expired', handleExpiredSession);
    return () => window.removeEventListener('auth:expired', handleExpiredSession);
  }, []);

  const handleSetAuth = (newToken: string, newUser: any) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const handleLogOut = () => {
    setToken(null);
    setUser(null);
    clearStoredAuth();
  };

  return (
    <Router>
      <div className="font-sans text-gray-900 selection:bg-[#F84464]/20 selection:text-black flex flex-col min-h-screen">
        <Navbar token={token} user={user} onLogOut={handleLogOut} selectedCity={selectedCity} setSelectedCity={setSelectedCity} />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home selectedCity={selectedCity} />} />
            <Route path="/movies" element={<MoviesPage />} />
            <Route path="/movies/:id" element={<MovieDetailsPage />} />
            <Route path="/events/:id" element={<EventDetails token={token} />} />
            <Route path="/bookings" element={<Bookings token={token} />} />
            <Route path="/admin" element={<AdminDashboard token={token} />} />
            <Route path="/login" element={<Auth setAuth={handleSetAuth} />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
