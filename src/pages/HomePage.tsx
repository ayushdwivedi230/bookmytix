import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  Film,
  Sparkles,
  TrendingUp,
  Clapperboard,
  Tv,
  MapPin,
  Play,
  X,
  Compass,
} from 'lucide-react';
import type { ApiEvent } from '../types';
import { eventsApi } from '../services/api';
import { movies } from '../data/movies';
import { MovieCarousel } from '../components/movies/MovieCarousel';
import { MovieCard } from '../components/movies/MovieCard';
import { EventCard } from '../components/events/EventCard';
import { CinemaCard, POPULAR_CINEMAS } from '../components/cinemas/CinemaCard';
import { OffersSection } from '../components/offers/OffersSection';
import { EventCardSkeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { AiRecommendationSection } from '../components/ai/AiRecommendationSection';
import { NaturalLanguageSearchBar } from '../components/ai/NaturalLanguageSearchBar';

const CATEGORIES = [
  { id: 'All', label: 'All Experiences', icon: Compass },
  { id: 'Movies', label: 'Movies & IMAX', icon: Film },
  { id: 'Concerts', label: 'Live Concerts', icon: Sparkles },
  { id: 'Comedy', label: 'Stand-up Comedy', icon: Tv },
  { id: 'Sports', label: 'Live Sports', icon: Clapperboard },
];

export function HomePage({ selectedCity }: { selectedCity: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || 'All';
  const searchQuery = searchParams.get('search') || '';

  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [trailerModal, setTrailerModal] = useState<string | null>(null);

  useEffect(() => {
    eventsApi.list()
      .then((data) => {
        setEvents(data);
        setLoadingEvents(false);
      })
      .catch(() => setLoadingEvents(false));
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (activeCategory !== 'All' && ev.category !== activeCategory) return false;
      if (selectedCity && !ev.location.toLowerCase().includes(selectedCity.toLowerCase())) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          ev.title.toLowerCase().includes(q) ||
          ev.description?.toLowerCase().includes(q) ||
          ev.location.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [events, activeCategory, selectedCity, searchQuery]);

  // Curated movie sets from movie catalog
  const featuredMovies = useMemo(() => movies.slice(0, 5), []);
  const trendingMovies = useMemo(() => movies.slice(0, 6), []);
  const nowShowingMovies = useMemo(() => movies.slice(0, 10), []);
  const comingSoonMovies = useMemo(() => movies.slice(10, 16), []);
  const recommendedMovies = useMemo(() => [...movies].reverse().slice(0, 5), []);

  // Filter cinemas by selected city if applicable
  const displayedCinemas = useMemo(() => {
    if (!selectedCity) return POPULAR_CINEMAS;
    const matched = POPULAR_CINEMAS.filter((c) =>
      c.city.toLowerCase().includes(selectedCity.toLowerCase()),
    );
    return matched.length > 0 ? matched : POPULAR_CINEMAS;
  }, [selectedCity]);

  const setCategory = (cat: string) => {
    setSearchParams((prev) => {
      if (cat === 'All') prev.delete('category');
      else prev.set('category', cat);
      prev.delete('search');
      return prev;
    });
  };

  const clearFilters = () => {
    setSearchParams((prev) => {
      prev.delete('category');
      prev.delete('search');
      return prev;
    });
  };

  const handleWatchTrailer = (trailerUrl: string) => {
    setTrailerModal(trailerUrl);
  };

  return (
    <div className="min-h-screen bg-[#08090D] text-slate-100">
      {/* ── 1. Hero Movie Carousel ── */}
      <section aria-label="Featured Movie Highlights" className="relative">
        <MovieCarousel
          movies={featuredMovies}
          onPlayTrailer={(movie) => movie.trailer && handleWatchTrailer(movie.trailer)}
        />
      </section>

      {/* ── 2. Quick Category / Experience Bar ── */}
      <section aria-label="Experience Categories" className="border-b border-white/[0.06] bg-[#0B0D14]/80 backdrop-blur-md sticky top-[64px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {CATEGORIES.map(({ id, label, icon: Icon }) => {
              const active = activeCategory === id;
              return (
                <button
                  key={id}
                  onClick={() => setCategory(id)}
                  aria-pressed={active}
                  className={`flex items-center gap-2 shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 ${active
                    ? 'bg-[#F84464] text-white shadow-lg shadow-[#F84464]/25 ring-1 ring-[#F84464]'
                    : 'bg-[#161925] text-slate-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.08]'
                    }`}
                >
                  <Icon size={14} className={active ? 'text-white' : 'text-[#F84464]'} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AI Discovery Search Bar ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <NaturalLanguageSearchBar
          selectedCity={selectedCity}
          onResults={(res) => {
            if (res.movies && res.movies.length > 0) {
              setSearchParams({ search: res.query });
            }
          }}
        />
      </section>

      {/* ── Active Filters Bar (if searched or filtered) ── */}
      {(searchQuery || (activeCategory !== 'All' && activeCategory !== 'Movies')) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0F1118] border border-white/10 text-sm text-slate-300">
            <span>
              {searchQuery && <>Results for: <strong className="text-white">"{searchQuery}"</strong></>}
              {searchQuery && activeCategory !== 'All' && ' · '}
              {activeCategory !== 'All' && <>Category: <strong className="text-[#F84464]">{activeCategory}</strong></>}
              {selectedCity && <> · City: <strong className="text-white">{selectedCity}</strong></>}
            </span>
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-[#F84464] hover:underline flex items-center gap-1 font-bold"
            >
              <X size={13} /> Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* ── AI Personalized Recommendations ── */}
      <AiRecommendationSection selectedCity={selectedCity} />

      {/* ── 3. Trending Movies in Cinemas ── */}
      <section aria-label="Trending Movies" className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#F84464]/10 text-[#F84464] border border-[#F84464]/20">
                <TrendingUp size={18} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Trending Now
                </h2>
                <p className="text-xs text-slate-400">
                  Most booked blockbusters across theatres {selectedCity ? `in ${selectedCity}` : 'this week'}
                </p>
              </div>
            </div>
            <Link
              to="/movies"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#F84464] hover:text-[#ff6b85] transition-colors"
            >
              See all movies <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {trendingMovies.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Now Showing in Cinemas ── */}
      <section aria-label="Now Showing" className="py-12 border-t border-white/[0.06] bg-[#0A0C13]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Film size={18} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Now Showing in Cinemas
                </h2>
                <p className="text-xs text-slate-400">
                  Select your showtime, pick luxury seats, and book tickets instantly
                </p>
              </div>
            </div>
            <Link
              to="/movies"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#F84464] hover:text-[#ff6b85] transition-colors"
            >
              Explore all <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {nowShowingMovies.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Popular Cinemas & Multiplexes ── */}
      <section aria-label="Popular Cinemas" className="py-14 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#F84464] mb-1.5">
                <MapPin size={13} />
                <span>Premium Multiplex Experience</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Top Multiplexes {selectedCity ? `in ${selectedCity}` : 'Near You'}
              </h2>
            </div>
            <Link
              to="/cinemas"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#F84464] hover:text-[#ff6b85] transition-colors"
            >
              View all theatres <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {displayedCinemas.map((cinema) => (
              <CinemaCard key={cinema.id} cinema={cinema} />
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. Coming Soon Section ── */}
      <section aria-label="Coming Soon" className="py-14 border-t border-white/[0.06] bg-[#0A0C13]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-400 mb-1.5">
                <Sparkles size={13} />
                <span>Advance Bookings Opening Soon</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Upcoming Releases
              </h2>
            </div>
            <Link
              to="/movies"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#F84464] hover:text-[#ff6b85] transition-colors"
            >
              See all upcoming <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {comingSoonMovies.map((m) => (
              <div key={m.id} className="relative group">
                <MovieCard movie={m} />
                <span className="absolute top-3 left-3 rounded-md bg-amber-500/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-black text-slate-950 shadow-md uppercase tracking-wider">
                  Coming Soon
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Exclusive Offers & Discounts ── */}
      <section className="border-t border-white/[0.06]">
        <OffersSection />
      </section>

      {/* ── 8. Live Events & Concerts (if available in DB) ── */}
      {(filteredEvents.length > 0 || loadingEvents) && (
        <section aria-label="Live Events" className="py-14 border-t border-white/[0.06] bg-[#0A0C13]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#F84464] mb-1.5">
                  <Sparkles size={13} />
                  <span>Concerts &amp; Live Performances</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Upcoming Live Events
                </h2>
              </div>
            </div>

            {loadingEvents ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[...Array(4)].map((_, i) => (
                  <EventCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-12 rounded-2xl bg-[#0F1118] border border-white/[0.08]">
                <Calendar size={36} className="mx-auto text-slate-600 mb-3" />
                <p className="text-slate-400 text-sm">No live events found matching your criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {filteredEvents.slice(0, 4).map((ev) => (
                  <EventCard key={ev.id} event={ev} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── 9. Recommended For You ── */}
      <section aria-label="Recommended For You" className="py-14 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#F84464] mb-1.5">
                <Sparkles size={13} />
                <span>Handpicked Picks</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Recommended Movies
              </h2>
            </div>
            <Link
              to="/movies"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#F84464] hover:text-[#ff6b85] transition-colors"
            >
              Explore catalog <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {recommendedMovies.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. Trailer Video Modal ── */}
      {trailerModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden bg-black border border-white/20 shadow-2xl">
            <button
              onClick={() => setTrailerModal(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/70 border border-white/20 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors"
              aria-label="Close trailer"
            >
              <X size={18} />
            </button>
            <div className="aspect-video w-full">
              <iframe
                src={`${trailerModal}?autoplay=1&rel=0`}
                title="Movie Trailer"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 11. Bottom Cinematic CTA ── */}
      <section className="border-t border-white/[0.08] bg-gradient-to-b from-[#0F1118] to-[#08090D] py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F84464]/10 text-[#F84464] border border-[#F84464]/20 mb-5">
            <Play size={24} />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Your Front-Row Seat to Entertainment
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto mb-8">
            Experience the magic of cinema with instant seat reservation, contactless digital QR entry, and exclusive card discounts.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/movies">
              <Button variant="primary" size="lg" rightIcon={<ArrowRight size={16} />}>
                Browse All Movies
              </Button>
            </Link>
            <Link to="/cinemas">
              <Button variant="secondary" size="lg">
                Find Theatres Nearby
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
