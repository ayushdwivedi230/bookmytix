import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, Globe, ShieldCheck } from 'lucide-react';
import type { Movie } from '../../types';

const FALLBACK = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80';

interface MovieCardProps {
  movie: Movie;
  onReserve?: () => void;
  showReserveButton?: boolean;
}

export function MovieCard({ movie, onReserve, showReserveButton }: MovieCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-[#F84464] focus-within:ring-offset-2">
      <Link
        to={`/movies/${movie.id}`}
        className="block relative aspect-[2/3] overflow-hidden bg-slate-100 shrink-0 focus:outline-none"
        tabIndex={0}
        aria-label={`${movie.title} — ${movie.genre}`}
      >
        <img
          src={imgError ? FALLBACK : movie.poster}
          alt={movie.title}
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

        {/* Certificate badge */}
        <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
          <ShieldCheck size={10} aria-hidden />
          {movie.certificate}
        </span>

        {/* Rating */}
        <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-amber-400 backdrop-blur-sm">
          <Star size={10} fill="currentColor" aria-hidden />
          {movie.rating.toFixed(1)}
        </span>

        {/* Genre */}
        <span className="absolute top-2.5 right-2.5 rounded-md bg-[#F84464]/90 px-2 py-0.5 text-[10px] font-semibold text-white">
          {movie.genre}
        </span>
      </Link>

      <div className="flex flex-col flex-1 p-3 gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-1">
            <Link to={`/movies/${movie.id}`} className="hover:text-[#F84464] transition-colors focus:outline-none">
              {movie.title}
            </Link>
          </h3>
          <p className="mt-1 text-xs text-slate-500 flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1">
              <Globe size={11} aria-hidden />
              {movie.language}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} aria-hidden />
              {movie.duration}
            </span>
          </p>
        </div>

        {showReserveButton && (
          <button
            type="button"
            onClick={onReserve}
            className="mt-auto w-full rounded-xl bg-[#F84464]/10 py-2 text-xs font-semibold text-[#F84464] transition-colors hover:bg-[#F84464] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F84464]"
          >
            Book tickets
          </button>
        )}
      </div>
    </article>
  );
}
