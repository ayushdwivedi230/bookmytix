import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, Clock, Globe, ShieldCheck, Ticket } from 'lucide-react';
import type { Movie } from '../../types';

const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80';

interface MovieCardProps {
  movie: Movie;
  onReserve?: () => void;
  showReserveButton?: boolean;
}

export function MovieCard({ movie, onReserve, showReserveButton = true }: MovieCardProps) {
  const [imgError, setImgError] = useState(false);
  const navigate = useNavigate();

  const handleBookClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onReserve) {
      onReserve();
    } else {
      navigate(`/movies/${movie.id}#showtimes`);
    }
  };

  return (
    <article className="group relative flex flex-col rounded-2xl border border-white/[0.08] bg-[#0F1118] overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-[#F84464]/10 hover:border-[#F84464]/40 focus-within:ring-2 focus-within:ring-[#F84464]">
      {/* Poster Media Box with 2:3 aspect ratio */}
      <Link
        to={`/movies/${movie.id}`}
        className="block relative aspect-[2/3] w-full overflow-hidden bg-[#161925] shrink-0 focus:outline-none"
        tabIndex={0}
        aria-label={`${movie.title} — ${movie.genre}`}
      >
        <img
          src={imgError ? FALLBACK_POSTER : movie.poster}
          alt={`${movie.title} poster`}
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {/* Cinematic Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F1118] via-black/20 to-black/30 pointer-events-none" />

        {/* Certificate Tag */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
          <span className="inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-extrabold text-white backdrop-blur-md border border-white/10">
            <ShieldCheck size={11} className="text-[#F84464]" />
            {movie.certificate}
          </span>
          {movie.formats?.[0] && (
            <span className="rounded-md bg-white/20 backdrop-blur-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white border border-white/20">
              {movie.formats[0]}
            </span>
          )}
        </div>

        {/* Genre Pill */}
        <span className="absolute top-2.5 right-2.5 rounded-full bg-[#F84464]/90 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm z-10">
          {movie.genre}
        </span>

        {/* Bottom Rating Pill on Poster */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-lg bg-black/80 px-2 py-1 text-xs font-bold text-amber-400 backdrop-blur-md border border-amber-500/20 z-10">
          <Star size={12} className="fill-amber-400 text-amber-400" />
          <span>{movie.rating.toFixed(1)}</span>
          <span className="text-[10px] text-slate-400 font-normal">/5</span>
        </div>
      </Link>

      {/* Info Block */}
      <div className="flex flex-col flex-1 p-3.5 gap-2.5 justify-between">
        <div>
          <h3 className="text-sm font-bold text-white leading-snug line-clamp-1 group-hover:text-[#F84464] transition-colors">
            <Link to={`/movies/${movie.id}`} className="focus:outline-none">
              {movie.title}
            </Link>
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Globe size={11} className="text-slate-400" />
              {movie.language}
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <Clock size={11} className="text-slate-400" />
              {movie.duration}
            </span>
          </div>
        </div>

        {/* Action Button */}
        {showReserveButton && (
          <button
            type="button"
            onClick={handleBookClick}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#F84464]/15 hover:bg-[#F84464] text-[#F84464] hover:text-white py-2 text-xs font-bold transition-all duration-200 border border-[#F84464]/30 hover:border-[#F84464] active:scale-95 cursor-pointer mt-1"
          >
            <Ticket size={13} />
            <span>Book Tickets</span>
          </button>
        )}
      </div>
    </article>
  );
}
