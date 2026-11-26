import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Star, Clock, Globe, ShieldCheck, ChevronLeft, ChevronRight, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Movie } from '../../types';
import { Button } from '../ui/Button';

interface MovieCarouselProps {
  movies: Movie[];
  onPlayTrailer?: (movie: Movie) => void;
}

export function MovieCarousel({ movies, onPlayTrailer }: MovieCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const navigate = useNavigate();

  // Take first 5 movies for featured hero slides
  const featured = movies.slice(0, 5);

  // Auto-advance
  useEffect(() => {
    if (isPaused || featured.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featured.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused, featured.length]);

  if (featured.length === 0) return null;

  const currentMovie = featured[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + featured.length) % featured.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % featured.length);
  };

  return (
    <section
      aria-label="Featured Movie Highlights"
      className="relative w-full h-[460px] sm:h-[540px] lg:h-[600px] overflow-hidden bg-[#08090D]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Backdrops */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMovie.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          <img
            src={currentMovie.banner || currentMovie.poster}
            alt=""
            role="presentation"
            className="w-full h-full object-cover object-top opacity-35"
          />
          {/* Multi-gradient atmospheric overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#08090D] via-[#08090D]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#08090D] via-transparent to-[#08090D]/50" />
        </motion.div>
      </AnimatePresence>

      {/* Hero Content Overlay */}
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full py-12">
          {/* Text Info */}
          <motion.div
            key={currentMovie.id + '-info'}
            initial={{ opacity: 0, x: -25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="lg:col-span-8 max-w-2xl"
          >
            {/* Format & Certificate pills */}
            <div className="flex flex-wrap items-center gap-2 mb-3.5">
              <span className="rounded-full bg-[#F84464] px-3 py-1 text-xs font-black uppercase tracking-wider text-white shadow-md">
                FEATURED
              </span>
              <span className="rounded-md bg-white/10 backdrop-blur-md px-2.5 py-1 text-xs font-bold text-slate-200 border border-white/10 flex items-center gap-1">
                <ShieldCheck size={12} className="text-[#F84464]" />
                {currentMovie.certificate}
              </span>
              <span className="rounded-md bg-white/10 backdrop-blur-md px-2.5 py-1 text-xs font-semibold text-slate-200 border border-white/10">
                {currentMovie.genre}
              </span>
              {currentMovie.formats?.map((fmt) => (
                <span
                  key={fmt}
                  className="rounded-md bg-white/10 backdrop-blur-md px-2 py-0.5 text-xs font-bold text-amber-300 border border-amber-300/20"
                >
                  {fmt}
                </span>
              ))}
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] mb-4">
              {currentMovie.title}
            </h1>

            {/* Meta tags */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-300 mb-5 font-medium">
              <span className="flex items-center gap-1 text-amber-400 font-bold bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                <span>{currentMovie.rating.toFixed(1)} / 5</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Globe size={14} className="text-slate-400" />
                <span>{currentMovie.language}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-slate-400" />
                <span>{currentMovie.duration}</span>
              </span>
            </div>

            {/* Synopsis */}
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed line-clamp-3 mb-8 max-w-xl">
              {currentMovie.description}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4">
              <Button
                variant="primary"
                size="lg"
                leftIcon={<Ticket size={18} />}
                onClick={() => navigate(`/movies/${currentMovie.id}`)}
              >
                Book Tickets
              </Button>

              {currentMovie.trailer && (
                <Button
                  variant="secondary"
                  size="lg"
                  leftIcon={<Play size={16} className="text-[#F84464] fill-current" />}
                  onClick={() => onPlayTrailer?.(currentMovie)}
                  className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
                >
                  Watch Trailer
                </Button>
              )}
            </div>
          </motion.div>

          {/* Floating Poster Preview (Desktop) */}
          <motion.div
            key={currentMovie.id + '-poster'}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="hidden lg:flex lg:col-span-4 justify-center"
          >
            <Link
              to={`/movies/${currentMovie.id}`}
              className="relative w-64 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl shadow-black/90 group focus:outline-none"
            >
              <img
                src={currentMovie.poster}
                alt={currentMovie.title}
                className="w-full aspect-[2/3] object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Ticket size={14} className="text-[#F84464]" /> View Details &amp; Showtimes
                </span>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Manual Slide Controls */}
      <div className="absolute bottom-6 left-0 right-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Thumb / Dot indicators */}
          <div className="flex items-center gap-2">
            {featured.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1}: ${m.title}`}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  currentIndex === idx ? 'w-8 bg-[#F84464]' : 'w-2 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>

          {/* Prev/Next arrows */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              aria-label="Previous slide"
              className="w-9 h-9 rounded-xl bg-black/60 hover:bg-[#F84464] border border-white/10 text-white flex items-center justify-center transition-colors backdrop-blur-sm cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleNext}
              aria-label="Next slide"
              className="w-9 h-9 rounded-xl bg-black/60 hover:bg-[#F84464] border border-white/10 text-white flex items-center justify-center transition-colors backdrop-blur-sm cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
