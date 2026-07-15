import MovieCard from './MovieCard';
import type { Movie } from '../data/movies';

interface MovieGridProps {
  movies: Movie[];
}

export default function MovieGrid({ movies }: MovieGridProps) {
  if (!movies.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center text-slate-600">
        No movies match the selected filters.
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} />
      ))}
    </div>
  );
}
