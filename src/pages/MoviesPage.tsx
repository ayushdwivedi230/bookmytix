import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { movies } from '../data/movies';
import type { Movie } from '../types';
import { MovieGrid } from '../components/movies/MovieGrid';
import { AiRecommendationSection } from '../components/ai/AiRecommendationSection';

const GENRES = ['All', 'Action', 'Drama', 'Thriller', 'Sci-Fi', 'Comedy', 'Romance', 'Crime', 'Family'];
const LANGUAGES = ['All', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'English'];
const CERTIFICATES = ['All', 'U', 'UA', 'A'];
const FORMATS = ['All', '2D', '3D', 'IMAX 2D', 'IMAX 3D', '4DX'];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function MoviesPage({ selectedCity: _selectedCity = 'Mumbai' }: { selectedCity?: string } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchRaw, setSearchRaw] = useState(searchParams.get('search') || '');
  const [genre, setGenre] = useState(searchParams.get('genre') || 'All');
  const [language, setLanguage] = useState(searchParams.get('language') || 'All');
  const [certificate, setCertificate] = useState(searchParams.get('certificate') || 'All');
  const [format, setFormat] = useState('All');
  const [sortBy, setSortBy] = useState<'rating' | 'release' | 'title'>('rating');
  const [showFilters, setShowFilters] = useState(false);

  const searchQuery = useDebounce(searchRaw, 300);

  // Sync state to URL
  useEffect(() => {
    setSearchParams(
      (prev) => {
        if (searchQuery) prev.set('search', searchQuery);
        else prev.delete('search');
        if (genre !== 'All') prev.set('genre', genre);
        else prev.delete('genre');
        if (language !== 'All') prev.set('language', language);
        else prev.delete('language');
        if (certificate !== 'All') prev.set('certificate', certificate);
        else prev.delete('certificate');
        return prev;
      },
      { replace: true },
    );
  }, [searchQuery, genre, language, certificate, setSearchParams]);

  const filtered = useMemo<Movie[]>(() => {
    const list = movies.filter((m) => {
      if (genre !== 'All' && m.genre !== genre) return false;
      if (language !== 'All' && m.language !== language) return false;
      if (certificate !== 'All' && m.certificate !== certificate) return false;
      if (format !== 'All' && !m.formats.includes(format)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          m.title.toLowerCase().includes(q) ||
          m.genre.toLowerCase().includes(q) ||
          m.director.toLowerCase().includes(q) ||
          m.cast.some((actor) => actor.toLowerCase().includes(q))
        );
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'release')
        return new Date(b.releaseDate ?? '').getTime() - new Date(a.releaseDate ?? '').getTime();
      return a.title.localeCompare(b.title);
    });
  }, [searchQuery, genre, language, certificate, format, sortBy]);

  const hasActiveFilters =
    genre !== 'All' ||
    language !== 'All' ||
    certificate !== 'All' ||
    format !== 'All' ||
    searchRaw !== '';

  const clearAll = () => {
    setSearchRaw('');
    setGenre('All');
    setLanguage('All');
    setCertificate('All');
    setFormat('All');
  };

  return (
    <div className="min-h-screen bg-[#08090D] text-slate-100">
      {/* ── AI Personalized Recommendations ── */}
      <AiRecommendationSection selectedCity={_selectedCity} />

      {/* ── Page Header ── */}
      <div className="border-b border-white/[0.08] bg-[#0A0C13] py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Movies in Theatres</h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Showing {filtered.length} release{filtered.length !== 1 ? 's' : ''} across languages &amp; formats
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Search Bar */}
              <div className="flex items-center bg-[#161925] border border-white/10 rounded-2xl px-3.5 py-2.5 focus-within:border-[#F84464] focus-within:ring-1 focus-within:ring-[#F84464] transition-all w-64">
                <Search size={15} className="text-slate-400 shrink-0" aria-hidden />
                <input
                  type="search"
                  placeholder="Search title, cast, genre…"
                  value={searchRaw}
                  onChange={(e) => setSearchRaw(e.target.value)}
                  className="ml-2.5 flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-white placeholder-slate-500"
                />
                {searchRaw && (
                  <button
                    onClick={() => setSearchRaw('')}
                    className="text-slate-400 hover:text-white"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-1.5 bg-[#161925] border border-white/10 rounded-2xl px-3 py-2 text-xs font-semibold text-slate-300">
                <ArrowUpDown size={13} className="text-[#F84464]" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'rating' | 'release' | 'title')}
                  className="bg-transparent border-none outline-none text-white cursor-pointer text-xs"
                >
                  <option value="rating" className="bg-[#161925]">Top Rated</option>
                  <option value="release" className="bg-[#161925]">Release Date</option>
                  <option value="title" className="bg-[#161925]">Title A-Z</option>
                </select>
              </div>

              {/* Toggle Filters Mobile */}
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={`sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-bold ${showFilters
                  ? 'bg-[#F84464] border-[#F84464] text-white'
                  : 'bg-[#161925] border-white/10 text-slate-300'
                  }`}
              >
                <SlidersHorizontal size={14} /> Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Bars ── */}
      <div className="border-b border-white/[0.06] bg-[#0B0D14]/80 backdrop-blur-md sticky top-[64px] z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-2.5">
          {/* Genre Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1 shrink-0">
              Genre:
            </span>
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${genre === g
                  ? 'bg-[#F84464] text-white shadow-md shadow-[#F84464]/20'
                  : 'bg-[#161925] text-slate-300 hover:bg-white/10 border border-white/10'
                  }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Language & Certificate Filters (Desktop or Toggled) */}
          <div className={`${showFilters ? 'flex' : 'hidden sm:flex'} flex-wrap items-center gap-4 pt-1 border-t border-white/[0.04]`}>
            {/* Language */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1 shrink-0">
                Language:
              </span>
              {LANGUAGES.map((l) => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${language === l
                    ? 'bg-white text-black font-extrabold'
                    : 'bg-[#161925] text-slate-400 hover:text-white border border-white/10'
                    }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Certificate */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1 shrink-0">
                Rated:
              </span>
              {CERTIFICATES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCertificate(c)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${certificate === c
                    ? 'bg-amber-500 text-black font-extrabold'
                    : 'bg-[#161925] text-slate-400 hover:text-white border border-white/10'
                    }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Formats */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1 shrink-0">
                Format:
              </span>
              {FORMATS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${format === f
                    ? 'bg-indigo-500 text-white font-extrabold'
                    : 'bg-[#161925] text-slate-400 hover:text-white border border-white/10'
                    }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearAll}
                className="ml-auto text-xs text-[#F84464] hover:underline font-bold flex items-center gap-1"
              >
                <X size={12} /> Clear all filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Movies Grid ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <MovieGrid movies={filtered} />
      </main>
    </div>
  );
}
