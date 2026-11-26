import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Compass, Star, ChevronRight, ChevronLeft, MapPin } from 'lucide-react';
import { aiApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import type { MovieRecommendation, RecommendationResult } from '../../types';

interface AiRecommendationSectionProps {
  selectedCity?: string;
}

export function AiRecommendationSection({ selectedCity = 'Mumbai' }: AiRecommendationSectionProps) {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [data, setData] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    aiApi
      .getRecommendations(selectedCity, 10, token)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCity, token]);

  if (loading) {
    return (
      <section className="py-8 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-6 animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20" />
            <div className="h-6 w-56 bg-white/10 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="aspect-[2/3] bg-white/[0.04] rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!data || data.recommendations.length === 0) {
    return null;
  }

  const strategyLabel =
    data.strategy === 'hybrid_personalized'
      ? 'Tailored to your booking taste'
      : data.strategy === 'preference_driven'
      ? 'Matched to your profile preferences'
      : `Popular in ${selectedCity}`;

  return (
    <section className="py-10 border-b border-white/[0.06] bg-gradient-to-b from-[#131127]/40 via-transparent to-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-300 text-[11px] font-bold tracking-wide">
                <Sparkles size={12} className="text-purple-400 animate-pulse" />
                AI Recommendation Engine
              </span>
              <span className="text-xs text-slate-500">• {strategyLabel}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Recommended For You
            </h2>
          </div>

          <button
            onClick={() => navigate('/movies')}
            className="flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors"
          >
            <span>Explore Catalog</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Carousel / Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {data.recommendations.slice(0, 5).map((rec: MovieRecommendation) => {
            const m = rec.movie;
            return (
              <div
                key={m.id}
                onClick={() => navigate(`/movies/${m.id}`)}
                className="group cursor-pointer flex flex-col justify-between rounded-2xl bg-[#0F1118] border border-white/10 hover:border-purple-500/40 p-2.5 sm:p-3 transition-all hover:shadow-xl hover:shadow-purple-950/20 hover:-translate-y-1 relative"
              >
                {/* Poster */}
                <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#161925] mb-3">
                  <img
                    src={m.poster}
                    alt={m.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[11px] font-black text-amber-400 border border-white/10">
                    <Star size={11} fill="#F59E0B" />
                    <span>{m.rating}</span>
                  </div>

                  {/* Format tag */}
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    {m.formats?.slice(0, 2).map((fmt) => (
                      <span
                        key={fmt}
                        className="px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-black text-slate-200 border border-white/15"
                      >
                        {fmt}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-white text-sm line-clamp-1 group-hover:text-purple-300 transition-colors">
                      {m.title}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {m.language} &bull; {m.genre.split(',')[0]}
                    </p>
                  </div>

                  {/* AI Reason Badge */}
                  <div className="pt-2 border-t border-white/[0.06]">
                    <p className="text-[10px] font-semibold text-purple-300/90 line-clamp-2 leading-tight flex items-start gap-1">
                      <Sparkles size={11} className="shrink-0 text-purple-400 mt-0.5" />
                      <span>{rec.explanation}</span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
