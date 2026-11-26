import { useState } from 'react';
import { Sparkles, Search, ArrowRight, Loader2, Filter, Film } from 'lucide-react';
import { aiApi } from '../../services/api';
import type { DiscoveryResult, Movie } from '../../types';

interface NaturalLanguageSearchBarProps {
  onResults?: (result: DiscoveryResult) => void;
  selectedCity?: string;
}

const DEFAULT_PROMPTS = [
  'Suggest a thriller for tonight',
  'Find comedy movies in Hindi',
  'Movies under two hours',
  'Top rated action blockbusters',
  'Family movies with rating above 4.5',
];

export function NaturalLanguageSearchBar({
  onResults,
  selectedCity,
}: NaturalLanguageSearchBarProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<DiscoveryResult | null>(null);

  const handleSearch = async (textToSearch?: string) => {
    const q = (textToSearch !== undefined ? textToSearch : query).trim();
    if (!q) return;

    if (textToSearch !== undefined) {
      setQuery(textToSearch);
    }

    setLoading(true);
    try {
      const res = await aiApi.discover(q, selectedCity);
      setLastResult(res);
      if (onResults) {
        onResults(res);
      }
    } catch {
      // Graceful error handling
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Search Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
        className="relative flex items-center w-full rounded-2xl bg-[#12141F] border border-white/15 focus-within:border-purple-500/60 shadow-xl shadow-black/40 transition-all p-1.5"
      >
        <div className="pl-3.5 pr-2 text-purple-400 flex items-center justify-center">
          <Sparkles size={18} className="animate-pulse" />
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask AI: 'Suggest a thriller for tonight', 'Hindi comedies under 2h'..."
          className="flex-1 bg-transparent py-2 px-1 text-xs sm:text-sm text-white placeholder-slate-400 outline-none"
        />

        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-900/30 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <>
              <span>Discover</span>
              <ArrowRight size={13} />
            </>
          )}
        </button>
      </form>

      {/* Suggested Quick Prompts */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
        <span className="text-slate-400 shrink-0 font-semibold flex items-center gap-1 pl-1">
          <Sparkles size={11} className="text-purple-400" />
          Try:
        </span>
        {DEFAULT_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => handleSearch(p)}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-purple-500/15 border border-white/10 hover:border-purple-500/30 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Detected Filter Feedback Banner */}
      {lastResult && (
        <div className="rounded-xl bg-purple-500/10 border border-purple-500/25 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
              <Filter size={12} />
            </span>
            <div>
              <p className="font-extrabold text-white text-xs">
                Parsed Intent: <span className="text-purple-300">{lastResult.parsedFilter.detectedIntent}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{lastResult.explanation}</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-purple-300/80 bg-purple-500/15 px-2.5 py-1 rounded-md self-start sm:self-auto border border-purple-500/20">
            {lastResult.usedProvider === 'gemini_llm' ? 'Gemini AI Validated' : 'Deterministic Search Match'}
          </span>
        </div>
      )}
    </div>
  );
}
