import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, Filter } from 'lucide-react';
import { movies } from '../data/movies';
import type { Movie } from '../types';
import { MovieGrid } from '../components/movies/MovieGrid';
import { Button } from '../components/ui/Button';

const GENRES = ['All', 'Drama', 'Thriller', 'Romance', 'Comedy', 'Action', 'Sci-Fi', 'Family', 'Crime'];
const LANGUAGES = ['All', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali'];
const CERTIFICATES = ['All', 'U', 'UA', 'A', 'PG-13'];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function MoviesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchRaw, setSearchRaw] = useState(searchParams.get('search') || '');
  const [genre, setGenre] = useState(searchParams.get('genre') || 'All');
  const [language, setLanguage] = useState(searchParams.get('language') || 'All');
  const [certificate, setCertificate] = useState(searchParams.get('certificate') || 'All');
  const [showFilters, setShowFilters] = useState(false);

  const searchQuery = useDebounce(searchRaw, 300);

  // Sync search query to URL
  useEffect(() => {
    setSearchParams(prev => {
      if (searchQuery) prev.set('search', searchQuery); else prev.delete('search');
      if (genre !== 'All') prev.set('genre', genre); else prev.delete('genre');
      if (language !== 'All') prev.set('language', language); else prev.delete('language');
      if (certificate !== 'All') prev.set('certificate', certificate); else prev.delete('certificate');
      return prev;
    }, { replace: true });
  }, [searchQuery, genre, language, certificate]);

  const filtered = useMemo<Movie[]>(() => {
    return movies.filter(m => {
      if (genre !== 'All' && m.genre !== genre) return false;
      if (language !== 'All' && m.language !== language) return false;
      if (certificate !== 'All' && m.certificate !== certificate) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return m.title.toLowerCase().includes(q) || m.genre.toLowerCase().includes(q) || m.director.toLowerCase().includes(q);
      }
      return true;
    });
  }, [searchQuery, genre, language, certificate]);

  const hasActiveFilters = genre !== 'All' || language !== 'All' || certificate !== 'All' || searchRaw !== '';

  const clearAll = () => {
    setSearchRaw('');
    setGenre('All');
    setLanguage('All');
    setCertificate('All');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Movies</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {filtered.length} movie{filtered.length !== 1 ? 's' : ''} available
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-[#F84464] focus-within:ring-1 focus-within:ring-[#F84464] transition-all w-64">
                <Search size={15} className="text-slate-400 shrink-0" aria-hidden />
                <input
                  type="search"
                  placeholder="Search movies…"
                  value={searchRaw}
                  onChange={e => setSearchRaw(e.target.value)}
                  aria-label="Search movies"
                  className="ml-2 flex-1 bg-transparent border-none outline-none text-sm text-slate-900 placeholder-slate-400"
                />
                {searchRaw && (
                  <button onClick={() => setSearchRaw('')} aria-label="Clear search" className="text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={13} />
                  </button>
                )}
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowFilters(v => !v)}
                leftIcon={<Filter size={14} />}
                aria-expanded={showFilters}
                aria-controls="filter-panel"
              >
                Filters {hasActiveFilters && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-[#F84464] inline-block" aria-label="Active filters" />}
              </Button>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  Clear all
                </Button>
              )}
            </div>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div id="filter-panel" className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Genre */}
              <div>
                <label htmlFor="genre-filter" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Genre</label>
                <div id="genre-filter" role="group" aria-label="Genre filter" className="flex flex-wrap gap-1.5">
                  {GENRES.map(g => (
                    <button
                      key={g}
                      onClick={() => setGenre(g)}
                      aria-pressed={genre === g}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${genre === g ? 'bg-[#F84464] text-white border-[#F84464]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#F84464]/40'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label htmlFor="lang-filter" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Language</label>
                <div id="lang-filter" role="group" aria-label="Language filter" className="flex flex-wrap gap-1.5">
                  {LANGUAGES.map(l => (
                    <button
                      key={l}
                      onClick={() => setLanguage(l)}
                      aria-pressed={language === l}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${language === l ? 'bg-[#F84464] text-white border-[#F84464]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#F84464]/40'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Certificate */}
              <div>
                <label htmlFor="cert-filter" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Certificate</label>
                <div id="cert-filter" role="group" aria-label="Certificate filter" className="flex flex-wrap gap-1.5">
                  {CERTIFICATES.map(c => (
                    <button
                      key={c}
                      onClick={() => setCertificate(c)}
                      aria-pressed={certificate === c}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${certificate === c ? 'bg-[#F84464] text-white border-[#F84464]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#F84464]/40'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
              {searchRaw && (
                <Chip label={`"${searchRaw}"`} onRemove={() => setSearchRaw('')} />
              )}
              {genre !== 'All' && <Chip label={genre} onRemove={() => setGenre('All')} />}
              {language !== 'All' && <Chip label={language} onRemove={() => setLanguage('All')} />}
              {certificate !== 'All' && <Chip label={certificate} onRemove={() => setCertificate('All')} />}
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MovieGrid
          movies={filtered}
          emptyTitle="No movies match your filters"
          emptyDescription="Try adjusting or clearing your active filters."
          emptyAction="Clear all filters"
        />
      </div>
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F84464]/10 border border-[#F84464]/20 px-3 py-1 text-xs font-semibold text-[#F84464]">
      {label}
      <button onClick={onRemove} aria-label={`Remove filter ${label}`} className="hover:text-red-700 transition-colors">
        <X size={11} />
      </button>
    </span>
  );
}
