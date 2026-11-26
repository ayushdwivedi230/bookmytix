import { or, and, ilike, gte, eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { movies } from '../db/schema.js';
import { env } from '../config/env.js';
import { formatMovieRow, MovieResponse } from './movieService.js';
import { logger } from '../utils/logger.js';

export interface DiscoveryFilter {
  query: string;
  genre?: string;
  language?: string;
  maxDurationMinutes?: number;
  minRating?: number;
  status?: 'now_showing' | 'coming_soon';
  city?: string;
  timeIntent?: 'tonight' | 'weekend' | 'today' | 'anytime';
  format?: string;
  confidence: number;
  detectedIntent: string;
}

export interface DiscoveryResult {
  query: string;
  parsedFilter: DiscoveryFilter;
  matchesCount: number;
  movies: MovieResponse[];
  usedProvider: 'deterministic_nlp' | 'gemini_llm';
  explanation: string;
}

const VALID_GENRES = [
  'Action',
  'Sci-Fi',
  'Comedy',
  'Drama',
  'Thriller',
  'Romance',
  'Family',
  'Crime',
  'Horror',
  'Adventure',
  'Animation',
];

const VALID_LANGUAGES = [
  'Hindi',
  'Telugu',
  'Tamil',
  'Kannada',
  'Malayalam',
  'English',
  'Marathi',
  'Bengali',
];

/**
 * Deterministic Rule-Based Intent Parser with zero external dependencies.
 * Converts natural English phrases into structured database queries.
 */
export function parseIntentDeterministic(rawQuery: string): DiscoveryFilter {
  const query = rawQuery.trim().toLowerCase();
  const filter: DiscoveryFilter = {
    query: rawQuery,
    confidence: 0.85,
    detectedIntent: 'Filtered movie catalog discovery',
  };

  const intentParts: string[] = [];

  // 1. Detect Genre
  for (const genre of VALID_GENRES) {
    const gLower = genre.toLowerCase();
    const regex = new RegExp(`\\b${gLower}(?:s|ic)?\\b`, 'i');
    if (regex.test(query)) {
      filter.genre = genre;
      intentParts.push(`Genre: ${genre}`);
      break;
    }
  }

  // 2. Detect Language
  for (const lang of VALID_LANGUAGES) {
    const lLower = lang.toLowerCase();
    const regex = new RegExp(`\\b${lLower}\\b`, 'i');
    if (regex.test(query)) {
      filter.language = lang;
      intentParts.push(`Language: ${lang}`);
      break;
    }
  }

  // 3. Detect Duration (e.g. "under 2 hours", "under two hours", "less than 90 mins", "short")
  if (/under (?:two|2) hours?/i.test(query) || /less than 2 hours?/i.test(query)) {
    filter.maxDurationMinutes = 120;
    intentParts.push('Runtime < 2 hrs');
  } else if (/under (?:90|ninety) min(?:ute)?s?/i.test(query) || /short (?:movie|film)s?/i.test(query)) {
    filter.maxDurationMinutes = 100;
    intentParts.push('Runtime < 100 mins');
  } else if (/under (?:2\.5|two and a half) hours?/i.test(query)) {
    filter.maxDurationMinutes = 150;
    intentParts.push('Runtime < 2.5 hrs');
  }

  // 4. Detect Rating / Acclaim
  if (/top[- ]?rated|best|highest rated|acclaimed|blockbuster/i.test(query)) {
    filter.minRating = 4.2;
    intentParts.push('Rating ≥ 4.2★');
  } else if (/above 4(?: stars?|\.0)?/i.test(query) || /high rated/i.test(query)) {
    filter.minRating = 4.0;
    intentParts.push('Rating ≥ 4.0★');
  }

  // 5. Detect Time intent
  if (/\btonight\b|\bthis evening\b/i.test(query)) {
    filter.timeIntent = 'tonight';
    filter.status = 'now_showing';
    intentParts.push('Playing Tonight');
  } else if (/\bweekend\b|\bsaturday\b|\bsunday\b/i.test(query)) {
    filter.timeIntent = 'weekend';
    intentParts.push('This Weekend');
  } else if (/\bcoming soon\b|\bupcoming\b/i.test(query)) {
    filter.status = 'coming_soon';
    intentParts.push('Coming Soon');
  } else if (/\bnow showing\b|\bin cinema\b|\bin theatres?\b/i.test(query)) {
    filter.status = 'now_showing';
    intentParts.push('Now Showing');
  }

  // 6. Format
  if (/\bimax\b/i.test(query)) {
    filter.format = 'IMAX';
    intentParts.push('Format: IMAX');
  } else if (/\b3d\b/i.test(query)) {
    filter.format = '3D';
    intentParts.push('Format: 3D');
  }

  filter.detectedIntent = intentParts.length > 0 ? intentParts.join(' • ') : 'Relevant movie matches';
  return filter;
}

/**
 * Optional Gemini LLM Extraction when GEMINI_API_KEY is present in the environment.
 * Strictly constrained with a JSON Schema prompt, with instant fallback to deterministic parsing.
 */
async function parseWithGemini(rawQuery: string): Promise<DiscoveryFilter | null> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const prompt = `You are a movie search query parser. Extract structured search criteria from the user's movie query: "${rawQuery}".
Available Genres: ${VALID_GENRES.join(', ')}
Available Languages: ${VALID_LANGUAGES.join(', ')}

Respond ONLY with valid JSON in this exact shape:
{
  "genre": string or null,
  "language": string or null,
  "maxDurationMinutes": number or null,
  "minRating": number or null,
  "status": "now_showing" or "coming_soon" or null,
  "timeIntent": "tonight" or "weekend" or "today" or "anytime" or null,
  "detectedIntent": string
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      logger.warn(`Gemini API returned ${res.status}, falling back to deterministic NLP`);
      return null;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const parsed = JSON.parse(text);
    return {
      query: rawQuery,
      genre: VALID_GENRES.find((g) => g.toLowerCase() === parsed.genre?.toLowerCase()),
      language: VALID_LANGUAGES.find((l) => l.toLowerCase() === parsed.language?.toLowerCase()),
      maxDurationMinutes: typeof parsed.maxDurationMinutes === 'number' ? parsed.maxDurationMinutes : undefined,
      minRating: typeof parsed.minRating === 'number' ? parsed.minRating : undefined,
      status: parsed.status === 'coming_soon' ? 'coming_soon' : parsed.status === 'now_showing' ? 'now_showing' : undefined,
      timeIntent: parsed.timeIntent || undefined,
      confidence: 0.96,
      detectedIntent: parsed.detectedIntent || 'AI Natural Language Intent',
    };
  } catch (err) {
    logger.debug('Gemini extraction failed, using deterministic NLP fallback', { error: err });
    return null;
  }
}

function parseDurationMinutes(durationStr: string): number {
  if (!durationStr) return 120;
  const hMatch = durationStr.match(/(\d+)\s*h/i);
  const mMatch = durationStr.match(/(\d+)\s*m/i);
  const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
  const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
  return hours * 60 + mins;
}

export const aiDiscoveryService = {
  /**
   * Discovers movies using natural language criteria.
   * Safety Guarantee: Only queries movie metadata, never affects booking/pricing state.
   */
  async discover(rawQuery: string, clientCity?: string): Promise<DiscoveryResult> {
    if (!rawQuery || rawQuery.trim().length === 0) {
      return {
        query: '',
        parsedFilter: { query: '', confidence: 1, detectedIntent: 'All Movies' },
        matchesCount: 0,
        movies: [],
        usedProvider: 'deterministic_nlp',
        explanation: 'Please provide a movie query like "Action movies under 2 hours" or "Hindi comedies for tonight".',
      };
    }

    // 1. Parse intent via Gemini or deterministic fallback
    let parsedFilter = await parseWithGemini(rawQuery);
    let usedProvider: DiscoveryResult['usedProvider'] = 'gemini_llm';

    if (!parsedFilter) {
      parsedFilter = parseIntentDeterministic(rawQuery);
      usedProvider = 'deterministic_nlp';
    }

    if (clientCity && !parsedFilter.city) {
      parsedFilter.city = clientCity;
    }

    // 2. Query DB with validated constraints
    const conditions = [];

    // Filter by status if specified
    if (parsedFilter.status) {
      conditions.push(eq(movies.status, parsedFilter.status));
    } else {
      conditions.push(or(eq(movies.status, 'now_showing'), eq(movies.status, 'coming_soon')));
    }

    // Filter by genre
    if (parsedFilter.genre) {
      conditions.push(ilike(movies.genre, `%${parsedFilter.genre}%`));
    }

    // Filter by language
    if (parsedFilter.language) {
      conditions.push(ilike(movies.language, `%${parsedFilter.language}%`));
    }

    // Filter by min rating
    if (parsedFilter.minRating) {
      conditions.push(gte(movies.rating, String(parsedFilter.minRating)));
    }

    // Search query fallback on title / description if no specific genre or language matched
    if (!parsedFilter.genre && !parsedFilter.language) {
      const q = `%${rawQuery.trim()}%`;
      conditions.push(
        or(
          ilike(movies.title, q),
          ilike(movies.genre, q),
          ilike(movies.description, q),
        ),
      );
    }

    const rows = await db
      .select()
      .from(movies)
      .where(and(...conditions))
      .orderBy(desc(movies.popularity))
      .limit(30);

    let formatted = rows.map(formatMovieRow);

    // Filter by duration in memory if requested
    if (parsedFilter.maxDurationMinutes) {
      const maxMins = parsedFilter.maxDurationMinutes;
      formatted = formatted.filter((m) => parseDurationMinutes(m.duration) <= maxMins);
    }

    // Build human-friendly explanation
    let explanation = `Found ${formatted.length} movie${formatted.length !== 1 ? 's' : ''}`;
    if (parsedFilter.genre) explanation += ` in ${parsedFilter.genre}`;
    if (parsedFilter.language) explanation += ` (${parsedFilter.language})`;
    if (parsedFilter.maxDurationMinutes) explanation += ` under ${parsedFilter.maxDurationMinutes} mins`;
    if (parsedFilter.minRating) explanation += ` with rating ≥ ${parsedFilter.minRating}★`;
    if (parsedFilter.timeIntent === 'tonight') explanation += ` playing tonight`;

    return {
      query: rawQuery,
      parsedFilter,
      matchesCount: formatted.length,
      movies: formatted,
      usedProvider,
      explanation,
    };
  },
};
