import { z } from 'zod';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// ─── Image Fallbacks ─────────────────────────────────────────────────────────
const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80';
const FALLBACK_BACKDROP =
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1600&q=80';

// ─── Provider Data Interfaces ────────────────────────────────────────────────
export interface ProviderMovieSummary {
  externalId: number | string;
  source: 'tmdb' | 'omdb' | 'local';
  title: string;
  overview: string;
  posterUrl: string;
  backdropUrl: string;
  releaseDate: string;
  rating: number;
  voteCount: number;
  popularity: number;
  originalLanguage?: string;
}

export interface ProviderCastMember {
  name: string;
  role: string;
  image?: string;
}

export interface ProviderCrewMember {
  name: string;
  role: string;
}

export interface ProviderMovieDetails extends ProviderMovieSummary {
  trailerUrl: string;
  genre: string;
  language: string;
  duration: string;
  certification: string;
  cast: ProviderCastMember[];
  crew: ProviderCrewMember[];
  formats: string[];
}

export interface ProviderAttribution {
  provider: 'tmdb' | 'omdb' | 'bookmytix';
  attributionText: string;
  logoUrl?: string;
  termsUrl?: string;
}

// ─── Zod Schemas for Provider Payload Validation ─────────────────────────────
const tmdbSearchItemSchema = z.object({
  id: z.number(),
  title: z.string().default('Untitled Movie'),
  overview: z.string().default(''),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  release_date: z.string().default(''),
  vote_average: z.number().default(0),
  vote_count: z.number().default(0),
  popularity: z.number().default(0),
  original_language: z.string().default('en'),
});

const tmdbSearchResponseSchema = z.object({
  page: z.number().default(1),
  results: z.array(tmdbSearchItemSchema).default([]),
  total_results: z.number().default(0),
});

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MovieDataProviderService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTtlMs = 60 * 60 * 1000; // 1 hour TTL

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCached<T>(key: string, data: T, ttlMs: number = this.defaultTtlMs): void {
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  /**
   * Get provider attribution according to TMDB / OMDb compliance policies.
   */
  getAttribution(): ProviderAttribution {
    if (env.TMDB_API_KEY) {
      return {
        provider: 'tmdb',
        attributionText:
          'This product uses the TMDB API but is not endorsed or certified by TMDB.',
        logoUrl:
          'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg',
        termsUrl: 'https://www.themoviedb.org/documentation/api/terms-of-use',
      };
    }
    if (env.OMDB_API_KEY) {
      return {
        provider: 'omdb',
        attributionText: 'Movie data provided by Open Movie Database (OMDb API).',
        termsUrl: 'https://www.omdbapi.com/',
      };
    }
    return {
      provider: 'bookmytix',
      attributionText: 'Curated entertainment metadata powered by BookMyTix Catalog.',
    };
  }

  /**
   * Search movies using external provider with caching and graceful local fallback.
   */
  async searchExternal(query: string): Promise<ProviderMovieSummary[]> {
    if (!query || query.trim().length === 0) return [];
    const cacheKey = `search:${query.toLowerCase().trim()}`;
    const cached = this.getCached<ProviderMovieSummary[]>(cacheKey);
    if (cached) return cached;

    // TMDB Integration
    if (env.TMDB_API_KEY) {
      try {
        const url = `https://api.themoviedb.org/3/search/movie?api_key=${env.TMDB_API_KEY}&query=${encodeURIComponent(
          query,
        )}&include_adult=false&language=en-US`;

        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) {
          logger.warn(`[MovieProvider] TMDB search failed with status ${res.status}`);
          return this.getFallbackSearchResults(query);
        }

        const raw = await res.json();
        const parsed = tmdbSearchResponseSchema.safeParse(raw);
        if (!parsed.success) {
          logger.warn('[MovieProvider] Failed to parse TMDB response', { issues: parsed.error.issues });
          return this.getFallbackSearchResults(query);
        }

        const results: ProviderMovieSummary[] = parsed.data.results.map((item) => ({
          externalId: item.id,
          source: 'tmdb',
          title: item.title,
          overview: item.overview,
          posterUrl: item.poster_path
            ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
            : FALLBACK_POSTER,
          backdropUrl: item.backdrop_path
            ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
            : FALLBACK_BACKDROP,
          releaseDate: item.release_date || new Date().toISOString().slice(0, 10),
          rating: Math.round(item.vote_average * 10) / 10,
          voteCount: item.vote_count,
          popularity: item.popularity,
          originalLanguage: item.original_language,
        }));

        this.setCached(cacheKey, results);
        return results;
      } catch (err) {
        logger.error(
          '[MovieProvider] TMDB API network error, using fallback',
          err instanceof Error ? err : new Error(String(err)),
        );
        return this.getFallbackSearchResults(query);
      }
    }

    return this.getFallbackSearchResults(query);
  }

  /**
   * Fetch full movie details including cast, crew, and trailer from TMDB.
   */
  async getExternalDetails(tmdbId: number): Promise<ProviderMovieDetails | null> {
    const cacheKey = `details:${tmdbId}`;
    const cached = this.getCached<ProviderMovieDetails>(cacheKey);
    if (cached) return cached;

    if (!env.TMDB_API_KEY) {
      return null;
    }

    try {
      const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${env.TMDB_API_KEY}&append_to_response=credits,videos,release_dates&language=en-US`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) {
        logger.warn(`[MovieProvider] TMDB get details failed: status ${res.status}`);
        return null;
      }

      const data = await res.json();

      // Extract trailer (YouTube)
      let trailerUrl = '';
      if (data.videos?.results && Array.isArray(data.videos.results)) {
        const trailer = data.videos.results.find(
          (v: { site: string; type: string; key: string }) =>
            v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'),
        );
        if (trailer?.key) {
          trailerUrl = `https://www.youtube.com/embed/${trailer.key}?rel=0&modestbranding=1`;
        }
      }

      // Extract top cast (first 8)
      const cast: ProviderCastMember[] = [];
      if (data.credits?.cast && Array.isArray(data.credits.cast)) {
        for (const actor of data.credits.cast.slice(0, 8)) {
          cast.push({
            name: actor.name || 'Unknown Actor',
            role: actor.character || 'Cast',
            image: actor.profile_path
              ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
              : undefined,
          });
        }
      }

      // Extract director and crew
      const crew: ProviderCrewMember[] = [];
      if (data.credits?.crew && Array.isArray(data.credits.crew)) {
        for (const member of data.credits.crew) {
          if (member.job === 'Director' || member.job === 'Producer' || member.job === 'Writer') {
            if (!crew.some((c) => c.name === member.name)) {
              crew.push({ name: member.name, role: member.job });
            }
          }
          if (crew.length >= 4) break;
        }
      }

      // Extract certification (Indian CBFC or US MPAA)
      let certification = 'UA';
      if (data.release_dates?.results && Array.isArray(data.release_dates.results)) {
        const inRelease = data.release_dates.results.find((r: { iso_3166_1: string }) => r.iso_3166_1 === 'IN');
        const usRelease = data.release_dates.results.find((r: { iso_3166_1: string }) => r.iso_3166_1 === 'US');
        const cert = inRelease?.release_dates?.[0]?.certification || usRelease?.release_dates?.[0]?.certification;
        if (cert) certification = cert;
      }

      const durationMinutes = data.runtime || 135;
      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      const durationStr = `${hours}h ${mins}m`;

      const genre = data.genres?.[0]?.name || 'Action';
      const language = data.spoken_languages?.[0]?.english_name || 'English';

      const details: ProviderMovieDetails = {
        externalId: data.id,
        source: 'tmdb',
        title: data.title || 'Untitled',
        overview: data.overview || '',
        posterUrl: data.poster_path
          ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
          : FALLBACK_POSTER,
        backdropUrl: data.backdrop_path
          ? `https://image.tmdb.org/t/p/original${data.backdrop_path}`
          : FALLBACK_BACKDROP,
        releaseDate: data.release_date || new Date().toISOString().slice(0, 10),
        rating: Math.round((data.vote_average || 7.5) * 10) / 10,
        voteCount: data.vote_count || 1000,
        popularity: data.popularity || 100,
        trailerUrl,
        genre,
        language,
        duration: durationStr,
        certification,
        cast,
        crew,
        formats: ['2D', '3D', 'IMAX 3D'],
      };

      this.setCached(cacheKey, details);
      return details;
    } catch (err) {
      logger.error(
        `[MovieProvider] Failed to fetch external details for TMDB ID ${tmdbId}`,
        err instanceof Error ? err : new Error(String(err)),
      );
      return null;
    }
  }

  /**
   * Safe curated fallback when external API keys are missing or provider endpoints are offline.
   */
  private getFallbackSearchResults(query: string): ProviderMovieSummary[] {
    const q = query.toLowerCase();
    const fallbackCatalog: ProviderMovieSummary[] = [
      {
        externalId: 101,
        source: 'local',
        title: 'Pushpa 2: The Rule',
        overview: 'The clash between Pushpa Raj and SP Bhanwar Singh continues in this action saga.',
        posterUrl:
          'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=800&h=600',
        backdropUrl:
          'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1600&q=80',
        releaseDate: '2026-12-05',
        rating: 4.8,
        voteCount: 42100,
        popularity: 350.5,
        originalLanguage: 'te',
      },
      {
        externalId: 102,
        source: 'local',
        title: 'Kalki 2898 AD',
        overview: 'A futuristic sci-fi epic where mythology converges with dystopian survival.',
        posterUrl:
          'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&q=80&w=800&h=600',
        backdropUrl:
          'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1600&q=80',
        releaseDate: '2026-06-27',
        rating: 4.7,
        voteCount: 38900,
        popularity: 290.0,
        originalLanguage: 'te',
      },
      {
        externalId: 103,
        source: 'local',
        title: 'Stree 2: Sarkate Ka Aatank',
        overview: 'The town of Chanderi faces a terrifying new headless evil threat.',
        posterUrl:
          'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=800&h=600',
        backdropUrl:
          'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1600&q=80',
        releaseDate: '2026-08-15',
        rating: 4.6,
        voteCount: 34200,
        popularity: 240.2,
        originalLanguage: 'hi',
      },
    ];

    return fallbackCatalog.filter((item) =>
      item.title.toLowerCase().includes(q) || item.overview.toLowerCase().includes(q),
    );
  }
}

export const movieDataProvider = new MovieDataProviderService();
