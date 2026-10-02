import type { Movie } from '../../types';
import { MovieCard } from './MovieCard';
import { CardSkeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/States';
import { Film } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MovieGridProps {
  movies: Movie[];
  loading?: boolean;
  onReserve?: (movie: Movie) => void;
  showReserveButton?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: string;
}

export function MovieGrid({
  movies,
  loading,
  onReserve,
  showReserveButton,
  emptyTitle = 'No movies match your filters',
  emptyDescription = 'Try adjusting your search or clearing filters.',
  emptyAction = 'Clear filters',
}: MovieGridProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" aria-label="Loading movies">
        {Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <EmptyState
        icon={<Film size={48} />}
        title={emptyTitle}
        description={emptyDescription}
        action={{ label: emptyAction, onClick: () => navigate('/movies') }}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {movies.map(movie => (
        <MovieCard
          key={movie.id}
          movie={movie}
          showReserveButton={showReserveButton}
          onReserve={onReserve ? () => onReserve(movie) : undefined}
        />
      ))}
    </div>
  );
}
