import type { Movie } from '../../types';
import { MovieCard } from './MovieCard';
import { EmptyState } from '../ui/States';
import { Film } from 'lucide-react';

interface MovieGridProps {
  movies: Movie[];
  onReserve?: (movie: Movie) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  onClearFilters?: () => void;
}

export function MovieGrid({
  movies,
  onReserve,
  emptyTitle = 'No movies match your filters',
  emptyDescription = 'Try adjusting your language, genre, or search terms to discover more movies.',
  onClearFilters,
}: MovieGridProps) {
  if (movies.length === 0) {
    return (
      <EmptyState
        icon={<Film size={44} />}
        title={emptyTitle}
        description={emptyDescription}
        action={onClearFilters ? { label: 'Reset Filters', onClick: onClearFilters } : undefined}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
      {movies.map((movie) => (
        <MovieCard
          key={movie.id}
          movie={movie}
          onReserve={onReserve ? () => onReserve(movie) : undefined}
        />
      ))}
    </div>
  );
}
