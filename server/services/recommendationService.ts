import { eq, or, inArray, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { movies, users, bookings, shows, theatres } from '../db/schema.js';
import { cacheService } from './cacheService.js';
import { formatMovieRow, MovieResponse } from './movieService.js';

export interface MovieRecommendation {
  movie: MovieResponse;
  score: number;
  explanation: string;
  reasonType: 'booking_history' | 'preference_match' | 'popularity' | 'trending_in_city';
  matchedGenres: string[];
}

export interface RecommendationResult {
  recommendations: MovieRecommendation[];
  strategy: 'hybrid_personalized' | 'preference_driven' | 'popularity_fallback';
  userProfile?: {
    preferredCity?: string;
    preferredGenres?: string[];
    preferredLanguages?: string[];
    totalBookings?: number;
  };
}

function parseList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
}

export const recommendationService = {
  /**
   * Generates hybrid recommendations for a customer or guest.
   */
  async getRecommendations(
    userId?: number,
    clientCity?: string,
    limit: number = 8,
  ): Promise<RecommendationResult> {
    const cacheKey = `rec:${userId || 'guest'}:${clientCity || 'all'}:${limit}`;
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        // 1. Fetch active movies from DB
        const activeMovieRows = await db
          .select()
          .from(movies)
          .where(or(eq(movies.status, 'now_showing'), eq(movies.status, 'coming_soon')))
          .orderBy(desc(movies.popularity))
          .limit(50);

        if (activeMovieRows.length === 0) {
          return {
            recommendations: [],
            strategy: 'popularity_fallback',
          };
        }

        const candidateMovies = activeMovieRows.map(formatMovieRow);

        // 2. Load user signals if authenticated
        let preferredGenres: string[] = [];
        let preferredLanguages: string[] = [];
        let preferredCity = clientCity || '';
        let bookedMovieTitles: string[] = [];
        let bookedGenres: Set<string> = new Set();
        let bookedLanguages: Set<string> = new Set();

        if (userId) {
          const userRecord = await db.query.users.findFirst({
            where: eq(users.id, userId),
          });

          if (userRecord) {
            preferredCity = userRecord.preferredCity || clientCity || '';
            preferredGenres = parseList(userRecord.preferredGenres);
            preferredLanguages = parseList(userRecord.preferredLanguages);
          }

          // Fetch user's recent booking history
          const userBookings = await db
            .select({
              movieTitle: movies.title,
              genre: movies.genre,
              language: movies.language,
            })
            .from(bookings)
            .innerJoin(shows, eq(bookings.showId, shows.id))
            .innerJoin(movies, eq(shows.movieId, movies.id))
            .where(eq(bookings.userId, userId))
            .limit(10);

          if (userBookings.length > 0) {
            bookedMovieTitles = userBookings.map((b) => b.movieTitle).filter(Boolean);

            for (const b of userBookings) {
              if (b.genre) {
                b.genre.split(',').forEach((g) => bookedGenres.add(g.trim().toLowerCase()));
              }
              if (b.language) {
                bookedLanguages.add(b.language.toLowerCase());
              }
            }
          }
        }

        const hasHistory = bookedMovieTitles.length > 0;
        const hasPreferences = preferredGenres.length > 0 || preferredLanguages.length > 0;

        // 3. Score candidate movies
        const scored: MovieRecommendation[] = candidateMovies.map((movie) => {
          let score = 0;
          let reasonType: MovieRecommendation['reasonType'] = 'popularity';
          let explanation = `Critically acclaimed entertainment with ${movie.rating}★ rating`;
          const matchedGenres: string[] = [];

          const movieGenres = movie.genre
            .split(',')
            .map((g) => g.trim().toLowerCase())
            .filter(Boolean);
          const movieLang = movie.language.toLowerCase();

          // A. Content-Based Booking History Matching (Weight: 45%)
          if (hasHistory) {
            let genreOverlap = 0;
            for (const g of movieGenres) {
              if (bookedGenres.has(g)) {
                genreOverlap++;
                matchedGenres.push(g);
              }
            }
            if (genreOverlap > 0) {
              const similarity = genreOverlap / Math.max(1, movieGenres.length);
              score += similarity * 45;
              reasonType = 'booking_history';
              const lastBooked = bookedMovieTitles[0];
              explanation = `Because you enjoyed "${lastBooked}" (${movie.genre})`;
            }
            if (bookedLanguages.has(movieLang)) {
              score += 15;
            }
          }

          // B. User Stated Preferences Matching (Weight: 35%)
          if (hasPreferences) {
            let prefOverlap = 0;
            for (const g of movieGenres) {
              if (preferredGenres.map((p) => p.toLowerCase()).includes(g)) {
                prefOverlap++;
                if (!matchedGenres.includes(g)) matchedGenres.push(g);
              }
            }
            if (prefOverlap > 0) {
              score += (prefOverlap / Math.max(1, movieGenres.length)) * 35;
              if (reasonType !== 'booking_history') {
                reasonType = 'preference_match';
                explanation = `Matches your saved preference for ${movie.genre}`;
              }
            }
            if (preferredLanguages.map((l) => l.toLowerCase()).includes(movieLang)) {
              score += 15;
              if (reasonType === 'preference_match') {
                explanation += ` in ${movie.language}`;
              }
            }
          }

          // C. City Relevance (Weight: 15%)
          if (preferredCity) {
            // Reward movies whose primary language matches the regional language of the preferred city
            const regionalLangs: Record<string, string[]> = {
              hyderabad: ['telugu', 'hindi'],
              chennai: ['tamil', 'english'],
              bengaluru: ['kannada', 'telugu', 'tamil', 'hindi'],
              mumbai: ['hindi', 'marathi'],
              delhi: ['hindi', 'punjabi'],
              kolkata: ['bengali', 'hindi'],
            };
            const cityKey = preferredCity.toLowerCase().replace(/[^a-z]/g, '');
            const langs = regionalLangs[cityKey] || ['hindi', 'english'];
            if (langs.includes(movieLang)) {
              score += 15;
              if (reasonType === 'popularity') {
                reasonType = 'trending_in_city';
                explanation = `Trending #1 in ${preferredCity} this week`;
              }
            }
          }

          // D. Popularity & Quality Baseline (Weight: 20%)
          const ratingScore = (movie.rating / 5.0) * 15;
          const popNormalized = Math.min(10, Math.log10(Math.max(10, movie.popularity || 100)) * 4);
          score += ratingScore + popNormalized;

          if (score < 30 && reasonType === 'popularity') {
            explanation = `${movie.rating}★ rating from ${movie.voteCount.toLocaleString('en-IN')} moviegoers`;
          }

          return {
            movie,
            score: Math.round(score * 10) / 10,
            explanation,
            reasonType,
            matchedGenres,
          };
        });

        // 4. Sort by score descending and return top N
        scored.sort((a, b) => b.score - a.score);
        const topResults = scored.slice(0, limit);

        const strategy: RecommendationResult['strategy'] = hasHistory
          ? 'hybrid_personalized'
          : hasPreferences
          ? 'preference_driven'
          : 'popularity_fallback';

        return {
          recommendations: topResults,
          strategy,
          userProfile: userId
            ? {
                preferredCity,
                preferredGenres,
                preferredLanguages,
                totalBookings: bookedMovieTitles.length,
              }
            : undefined,
        };
      },
      300, // 5 min TTL
    );
  },
};
