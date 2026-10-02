import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ArrowRight, Calendar, MapPin, Film, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { ApiEvent } from '../types';
import { eventsApi } from '../services/api';
import { movies } from '../data/movies';
import { EventCard } from '../components/events/EventCard';
import { MovieCard } from '../components/movies/MovieCard';
import { EventCardSkeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';

const CATEGORIES = ['All', 'Concerts', 'Movies', 'Sports', 'Comedy', 'Tech Events', 'Music'];

const HERO_SLIDES = [
  {
    title: 'Book Tickets Instantly',
    subtitle: 'Movies, concerts, sports, and live events — all in one place.',
    cta: 'Explore events',
    ctaTo: '/?category=All',
    bg: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80',
  },
  {
    title: 'Now Showing in Cinemas',
    subtitle: 'Find the best seats for the biggest releases this week.',
    cta: 'Browse movies',
    ctaTo: '/movies',
    bg: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1600&q=80',
  },
  {
    title: 'Live Concerts & Festivals',
    subtitle: 'Secure your spot at India\'s biggest music events.',
    cta: 'See concerts',
    ctaTo: '/?category=Concerts',
    bg: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1600&q=80',
  },
];

export function HomePage({ selectedCity }: { selectedCity: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || 'All';
  const searchQuery = searchParams.get('search') || '';

  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [heroIdx, setHeroIdx] = useState(0);

  // Hero auto-advance
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    const t = setInterval(() => setHeroIdx(i => (i + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    eventsApi.list()
      .then(data => { setEvents(data); setLoadingEvents(false); })
      .catch(() => setLoadingEvents(false));
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      if (activeCategory !== 'All' && ev.category !== activeCategory) return false;
      if (selectedCity && !ev.location.toLowerCase().includes(selectedCity.toLowerCase())) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return ev.title.toLowerCase().includes(q) || ev.description?.toLowerCase().includes(q) || ev.location.toLowerCase().includes(q);
      }
      return true;
    });
  }, [events, activeCategory, selectedCity, searchQuery]);

  const featuredMovies = useMemo(() => movies.slice(0, 10), []);
  const comingSoon = useMemo(() => movies.slice(10, 16), []);

  const hero = HERO_SLIDES[heroIdx];

  const setCategory = (cat: string) => {
    setSearchParams(prev => {
      if (cat === 'All') prev.delete('category'); else prev.set('category', cat);
      prev.delete('search');
      return prev;
    });
  };

  const clearFilters = () => {
    setSearchParams(prev => { prev.delete('category'); prev.delete('search'); return prev; });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Hero ── */}
      <section aria-label="Featured content" className="relative h-[420px] sm:h-[500px] overflow-hidden bg-slate-900">
        {HERO_SLIDES.map((slide, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === heroIdx ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            aria-hidden={i !== heroIdx}
          >
            <img src={slide.bg} alt="" role="presentation" className="w-full h-full object-cover opacity-40" loading={i === 0 ? 'eager' : 'lazy'} />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-transparent" />
          </div>
        ))}

        {/* Hero content */}
        <div className="relative h-full flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <motion.div
              key={heroIdx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-lg"
            >
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-4">
                {hero.title}
              </h1>
              <p className="text-lg text-slate-300 mb-6">{hero.subtitle}</p>
              <div className="flex flex-wrap gap-3">
                <Link to={hero.ctaTo}>
                  <Button variant="primary" size="lg" rightIcon={<ArrowRight size={16} />}>
                    {hero.cta}
                  </Button>
                </Link>
                <Link to="/movies">
                  <Button variant="secondary" size="lg" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                    Browse movies
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Slide indicators */}
        <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-2" role="tablist" aria-label="Hero slides">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setHeroIdx(i)}
              role="tab"
              aria-selected={i === heroIdx}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === heroIdx ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
            />
          ))}
        </div>
      </section>

      {/* ── Events section ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Upcoming Events</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {selectedCity ? `In ${selectedCity}` : 'Across India'} · {filteredEvents.length} events
            </p>
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Event categories">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                aria-pressed={activeCategory === cat}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${activeCategory === cat ? 'bg-[#F84464] text-white border-[#F84464]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Active filters info */}
        {(searchQuery || selectedCity) && (
          <div className="flex items-center gap-3 mb-4 text-sm text-slate-500">
            <span>
              {searchQuery && <>Showing results for "<strong>{searchQuery}</strong>"</>}
              {searchQuery && selectedCity && ' · '}
              {selectedCity && <>City: <strong>{selectedCity}</strong></>}
            </span>
            <button onClick={clearFilters} className="text-[#F84464] font-semibold flex items-center gap-1 hover:opacity-75 transition-opacity">
              <X size={13} /> Clear
            </button>
          </div>
        )}

        {loadingEvents ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => <EventCardSkeleton key={i} />)}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <Calendar size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="font-semibold text-slate-700 mb-1">No events found</h3>
            <p className="text-sm text-slate-400 mb-4">
              {activeCategory !== 'All'
                ? `No ${activeCategory} events available${selectedCity ? ` in ${selectedCity}` : ''}.`
                : selectedCity
                  ? `No events in ${selectedCity} yet.`
                  : 'No events match your search.'}
            </p>
            <Button variant="secondary" size="sm" onClick={clearFilters}>Show all events</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredEvents.map(ev => <EventCard key={ev.id} event={ev} />)}
          </div>
        )}
      </section>

      {/* ── Movies Now Showing ── */}
      <section className="bg-white border-y border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Now Showing</h2>
              <p className="text-sm text-slate-500 mt-0.5">Trending movies in cinemas</p>
            </div>
            <Link to="/movies" className="flex items-center gap-1.5 text-sm font-semibold text-[#F84464] hover:text-[#e03b5a] transition-colors">
              All movies <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {featuredMovies.map(m => <MovieCard key={m.id} movie={m} />)}
          </div>
        </div>
      </section>

      {/* ── Coming Soon ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Coming Soon</h2>
            <p className="text-sm text-slate-500 mt-0.5">Advance booking available</p>
          </div>
          <Link to="/movies" className="flex items-center gap-1.5 text-sm font-semibold text-[#F84464] hover:text-[#e03b5a] transition-colors">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {comingSoon.map(m => (
            <div key={m.id} className="relative">
              <MovieCard movie={m} />
              <span className="absolute top-2 left-2 rounded-md bg-slate-900/70 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-white">
                Coming Soon
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="bg-slate-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Film size={40} className="mx-auto text-[#F84464] mb-4" aria-hidden />
          <h2 className="text-3xl font-extrabold text-white mb-3">Never miss a show again</h2>
          <p className="text-slate-400 max-w-md mx-auto mb-6">
            Browse thousands of events and movies. Book instantly. Get your e-ticket. Show up.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link to="/movies"><Button variant="primary" size="lg">Browse movies</Button></Link>
            <button onClick={() => setCategory('Concerts')}>
              <Button variant="secondary" size="lg" className="border-white/20 text-white bg-white/10 hover:bg-white/20">
                Explore events
              </Button>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
