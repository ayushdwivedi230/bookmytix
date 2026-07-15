import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock3, Star } from 'lucide-react';
import type { Movie } from '../data/movies';

interface MovieCardProps {
  movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
  const [imageError, setImageError] = useState(false);
  const imageSrc = imageError ? '/fallback-movie.svg' : movie.poster;

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <Link to={`/movies/${movie.id}`} className="group block">
        <div className="relative aspect-[3/4] overflow-hidden bg-slate-100">
          <img
            src={imageSrc}
            alt={movie.title}
            loading="lazy"
            decoding="async"
            onError={() => setImageError(true)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
          <div className="absolute left-3 top-3 rounded-full bg-[#F84464] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            {movie.genre}
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <div className="flex items-center gap-1 text-sm font-semibold text-white">
              <Star size={14} className="fill-current text-yellow-400" /> {movie.rating}
            </div>
          </div>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{movie.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{movie.city} • {movie.language}</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1"><Clock3 size={14} /> {movie.duration}</span>
            <span className="flex items-center gap-1"><CalendarDays size={14} /> {movie.city}</span>
          </div>
          <p className="text-sm leading-6 text-slate-600 line-clamp-3">{movie.description}</p>
        </div>
      </Link>
    </article>
  );
}
