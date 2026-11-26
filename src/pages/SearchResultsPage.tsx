import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, X, ArrowUpDown, Film } from 'lucide-react';
import { moviesApi } from '../services/api';
import type { ApiMovie, MovieFilterOptions } from '../types';
import { MovieCard } from '../components/movies/MovieCard';
import { EventCardSkeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { NaturalLanguageSearchBar } from '../components/ai/NaturalLanguageSearchBar';

export function SearchResultsPage({ selectedCity }: { selectedCity: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const query = searchParams.get('q') || '';
  const selectedGenre = searchParams.get('genre') || 'All';
  const selectedLanguage = searchParams.get('language') || 'All';
  const selectedRating = searchParams.get('minRating') || '';
  const sortBy = searchParams.get('sort') || 'popularity';

  const [inputVal, setInputVal] = useState(query);
  const [moviesList, setMoviesList] = useState<ApiMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [filterOptions, setFilterOptions] = useState<MovieFilterOptions | null>(null);

  // Sync input value with URL query
  useEffect(() => {
    setInputVal(query);
  }, [query]);

  // Fetch filter options
  useEffect(() => {
    moviesApi.filters(selectedCity).then(setFilterOptions).catch(() => {});
  }, [selectedCity]);

  // Fetch search results from backend
  useEffect(() => {
    setLoading(true);
    moviesApi
      .list({
        search: query,
        genre: selectedGenre !== 'All' ? selectedGenre : undefined,
        language: selectedLanguage !== 'All' ? selectedLanguage : undefined,
        minRating: selectedRating ? Number(selectedRating) : undefined,
        city: selectedCity !== 'All Cities' ? selectedCity : undefined,
        sort: sortBy,
      })
      .then((res) => {
        setMoviesList(res.movies);
        setTotalCount(res.total);
        setLoading(false);
      })
      .catch(() => {
        setMoviesList([]);
        setTotalCount(0);
        setLoading(false);
      });
  }, [query, selectedGenre, selectedLanguage, selectedRating, selectedCity, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    // Save to search history
    try {
      const historyStr = localStorage.getItem('bmt_recent_searches') || '[]';
      const history: string[] = JSON.parse(historyStr);
      const updated = [inputVal.trim(), ...history.filter((s) => s.toLowerCase() !== inputVal.trim().toLowerCase())].slice(0, 8);
      localStorage.setItem('bmt_recent_searches', JSON.stringify(updated));
    } catch {
      /* noop */
    }

    setSearchParams((prev) => {
      prev.set('q', inputVal.trim());
      return prev;
    });
  };

  const updateParam = (key: string, val: string) => {
    setSearchParams((prev) => {
      if (!val || val === 'All') prev.delete(key);
      else prev.set(key, val);
      return prev;
    });
  };

  const clearAllFilters = () => {
    setSearchParams((prev) => {
      prev.delete('genre');
      prev.delete('language');
      prev.delete('minRating');
      return prev;
    });
  };

  // Convert ApiMovie into Movie format expected by MovieCard
  const mappedMovies = useMemo(() => {
    return moviesList.map((m) => ({
      id: String(m.id),
      title: m.title,
      city: selectedCity || 'Mumbai',
      genre: m.genre,
      language: m.language,
      duration: m.duration,
      certificate: m.certification,
      rating: m.rating,
      votes: m.voteCount,
      releaseDate: m.releaseDate,
      director: m.crew.find((c) => c.role === 'Director')?.name || 'Director',
      cast: m.cast.map((c) => c.name),
      description: m.description,
      poster: m.poster,
      banner: m.backdrop || m.poster,
      trailer: m.trailerUrl || null,
      availableTheatres: ['PVR Cinemas', 'INOX Multiplex', 'Cinepolis'],
      showTimings: ['10:30 AM', '02:00 PM', '06:15 PM', '09:30 PM'],
      formats: m.formats,
    }));
  }, [moviesList, selectedCity]);

  return (
    <div className="min-h-screen bg-[#08090D] text-slate-100">
      {/* ── Search Bar Banner ── */}
      <div className="border-b border-white/[0.08] bg-[#0A0C13] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <div className="max-w-2xl mx-auto">
            <NaturalLanguageSearchBar
              selectedCity={selectedCity}
              onResults={(res) => {
                if (res.movies && res.movies.length > 0) {
                  updateParam('q', res.query);
                }
              }}
            />
          </div>

          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto">
            <div className="flex items-center bg-[#131622] border border-white/10 rounded-2xl px-4 py-3 focus-within:border-[#F84464] focus-within:ring-2 focus-within:ring-[#F84464]/20 shadow-xl transition-all">
              <Search size={18} className="text-slate-400 shrink-0" />
              <input
                type="search"
                placeholder="Search movies by title, cast, or genre…"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className="bg-transparent border-none outline-none ml-3 w-full text-sm sm:text-base text-white placeholder-slate-400"
              />
              {inputVal && (
                <button
                  type="button"
                  onClick={() => {
                    setInputVal('');
                    updateParam('q', '');
                  }}
                  className="text-slate-400 hover:text-white mr-2"
                >
                  <X size={15} />
                </button>
              )}
              <Button type="submit" variant="primary" size="sm">
                Search
              </Button>
            </div>
          </form>

          {/* Results Summary */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
            <div>
              {query ? (
                <p className="text-slate-300">
                  Showing <strong className="text-white">{totalCount}</strong> results for{' '}
                  <strong className="text-[#F84464]">"{query}"</strong>
                  {selectedCity && selectedCity !== 'All Cities' && (
                    <span> in <strong className="text-white">{selectedCity}</strong></span>
                  )}
                </p>
              ) : (
                <p className="text-slate-300">
                  Showing <strong className="text-white">{totalCount}</strong> movies available
                </p>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 flex items-center gap-1 font-semibold">
                <ArrowUpDown size={12} className="text-[#F84464]" /> Sort by:
              </span>
              <select
                value={sortBy}
                onChange={(e) => updateParam('sort', e.target.value)}
                className="bg-[#161925] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
              >
                <option value="popularity">Most Popular</option>
                <option value="rating">Top Rated</option>
                <option value="release_date">Newest Release</option>
                <option value="title">Title A-Z</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="border-b border-white/[0.06] bg-[#0B0D14]/80 backdrop-blur-md sticky top-[64px] z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-3">
          {/* Genre Filter */}
          {filterOptions?.genres && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1 shrink-0">
                Genre:
              </span>
              {filterOptions.genres.slice(0, 8).map((g) => (
                <button
                  key={g}
                  onClick={() => updateParam('genre', g)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                    selectedGenre === g
                      ? 'bg-[#F84464] text-white shadow-md shadow-[#F84464]/20'
                      : 'bg-[#161925] text-slate-300 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}

          {/* Language Filter */}
          {filterOptions?.languages && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1 shrink-0">
                Language:
              </span>
              {filterOptions.languages.slice(0, 6).map((l) => (
                <button
                  key={l}
                  onClick={() => updateParam('language', l)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                    selectedLanguage === l
                      ? 'bg-white text-black font-extrabold'
                      : 'bg-[#161925] text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          )}

          {/* Active filter reset */}
          {(selectedGenre !== 'All' || selectedLanguage !== 'All' || selectedRating) && (
            <button
              onClick={clearAllFilters}
              className="ml-auto text-xs text-[#F84464] hover:underline font-bold flex items-center gap-1"
            >
              <X size={12} /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Results Grid ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {[...Array(10)].map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : mappedMovies.length === 0 ? (
          <div className="text-center py-20 rounded-3xl bg-[#0F1118] border border-white/10 max-w-lg mx-auto">
            <Film size={44} className="mx-auto text-slate-600 mb-4" />
            <h3 className="text-xl font-black text-white">No Movies Found</h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xs mx-auto">
              We couldn't find any movies matching "{query}". Try checking your spelling or clearing filters.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setInputVal('');
                  setSearchParams({});
                }}
              >
                Clear Search
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/movies')}>
                Browse All Movies
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {mappedMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
