import { eq, or, ilike, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { movies, theatres, shows } from '../db/schema.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantResponse {
  answer: string;
  sources: string[];
  disclaimer: string;
  suggestedFollowUps: string[];
  relatedLinks?: Array<{ label: string; url: string }>;
  isAiGenerated: boolean;
}

/**
 * Official BookMyTix Application Grounded Knowledge Base
 */
const VERIFIED_POLICIES = {
  seatLock: `BookMyTix uses an automated real-time seat lock mechanism. When you select seats, they are held exclusively for your session for 8 minutes with a live countdown timer. If payment is not completed before expiry, seats are automatically returned to the available auditorium pool.`,
  cancellation: `Tickets can be cancelled up to 2 hours before the scheduled showtime directly from your User Dashboard ('My Tickets' tab). Approved refunds are automatically credited back to your original payment method (Razorpay / UPI / Card / NetBanking) within 3-5 business days. Convenience fees are non-refundable.`,
  digitalPasses: `All confirmed bookings include an instant digital gate pass containing a cryptographically verifiable QR code, seat numbers, screen format, and entrance details. You can download an offline pass or share it via link. Physical box office ticket exchange is not required.`,
  convenienceFee: `A standard convenience fee of ₹40 per seat plus 18% GST is applied to all theatrical seat bookings to maintain low-latency live seat reservation systems.`,
  foodAndBeverages: `Food and Beverage items (popcorn, nachos, warm snacks, combos) are optional add-ons during checkout and are served directly to your reserved auditorium seat or available at the priority concession counter.`,
};

export const aiAssistantService = {
  /**
   * Generates a grounded response to customer queries about movies, cinemas, showtimes, and policies.
   */
  async answerQuestion(
    question: string,
    _history: AssistantMessage[] = [],
  ): Promise<AssistantResponse> {
    const q = question.trim().toLowerCase();
    const disclaimer =
      'AI Assistant — Responses are contextual guidance grounded in verified BookMyTix policies and catalog data. Always refer to your Dashboard for official booking records.';

    // 1. Direct Policy & FAQ Matches
    if (/cancel|refund|return money/i.test(q)) {
      return {
        answer: `**Cancellation & Refund Policy:**\n\n${VERIFIED_POLICIES.cancellation}\n\nTo cancel an upcoming reservation, navigate to your **Dashboard > My Bookings**, locate your confirmed pass, and click **Cancel Booking**.`,
        sources: ['BookMyTix Cancellation Policy §4.2', 'FinTech Refund Terms'],
        disclaimer,
        suggestedFollowUps: [
          'How long are seats locked during checkout?',
          'Where do I find my digital gate pass?',
        ],
        relatedLinks: [{ label: 'View My Bookings', url: '/dashboard?tab=bookings' }],
        isAiGenerated: false,
      };
    }

    if (/seat lock|timer|hold seat|lock expires/i.test(q)) {
      return {
        answer: `**Real-Time Seat Reservation:**\n\n${VERIFIED_POLICIES.seatLock}\n\nThis prevents two customers from purchasing the same seat at the same time across web and mobile.`,
        sources: ['BookMyTix High-Concurrency Reservation Spec'],
        disclaimer,
        suggestedFollowUps: [
          'What happens if my payment fails while seats are locked?',
          'What are the seat categories and pricing?',
        ],
        isAiGenerated: false,
      };
    }

    if (/qr code|gate pass|digital ticket|m-ticket|offline/i.test(q)) {
      return {
        answer: `**Digital Ticket Entry:**\n\n${VERIFIED_POLICIES.digitalPasses}\n\nYou can present your phone screen directly at the cinema usher gate for contactless entry.`,
        sources: ['BookMyTix Digital Pass Engine'],
        disclaimer,
        suggestedFollowUps: [
          'Can I share my ticket with friends?',
          'How do I cancel a ticket?',
        ],
        relatedLinks: [{ label: 'Open Digital Passes', url: '/dashboard' }],
        isAiGenerated: false,
      };
    }

    if (/food|popcorn|snack|beverage|f&b/i.test(q)) {
      return {
        answer: `**Concessions & Add-Ons:**\n\n${VERIFIED_POLICIES.foodAndBeverages}\n\nConcessions can be configured in your booking during checkout or pre-ordered using available discount coupons.`,
        sources: ['BookMyTix Concessions Catalog'],
        disclaimer,
        suggestedFollowUps: ['Are discounts or coupons available on food?'],
        isAiGenerated: false,
      };
    }

    // 2. Dynamic Database Retrieval (Movies & Cinemas)
    // Extract potential movie or cinema names
    const activeMovies = await db
      .select({
        id: movies.id,
        title: movies.title,
        genre: movies.genre,
        language: movies.language,
        duration: movies.duration,
        rating: movies.rating,
        status: movies.status,
      })
      .from(movies)
      .where(or(eq(movies.status, 'now_showing'), eq(movies.status, 'coming_soon')))
      .limit(20);

    const activeTheatres = await db
      .select({
        id: theatres.id,
        name: theatres.name,
        city: theatres.city,
        location: theatres.location,
      })
      .from(theatres)
      .limit(10);

    // Check if query is asking about a specific movie
    const matchedMovie = activeMovies.find((m) =>
      q.includes(m.title.toLowerCase()),
    );

    if (matchedMovie) {
      // Find showtimes for this movie
      const movieShows = await db
        .select({
          showId: shows.id,
          startsAt: shows.startsAt,
          price: shows.price,
          theatreName: theatres.name,
        })
        .from(shows)
        .leftJoin(theatres, eq(shows.theatreId, theatres.id))
        .where(eq(shows.movieId, matchedMovie.id))
        .limit(6);

      let answer = `**${matchedMovie.title}** (${matchedMovie.language} • ${matchedMovie.genre})\n\n`;
      answer += `- **Runtime:** ${matchedMovie.duration}\n`;
      answer += `- **Audience Rating:** ${matchedMovie.rating}★\n`;
      answer += `- **Status:** ${matchedMovie.status === 'now_showing' ? 'Now Showing in Theatres' : 'Coming Soon'}\n\n`;

      if (movieShows.length > 0) {
        answer += `**Upcoming Shows:**\n`;
        for (const s of movieShows) {
          const formatted = new Date(s.startsAt).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          });
          answer += `- ${s.theatreName || 'Multiplex'}: **${formatted}** (₹${s.price})\n`;
        }
      } else {
        answer += `Showtimes are available across partner multiplexes. Click below to view the schedule.`;
      }

      return {
        answer,
        sources: [`BookMyTix Verified Movie DB: ${matchedMovie.title}`],
        disclaimer,
        suggestedFollowUps: [
          `Book tickets for ${matchedMovie.title}`,
          'What are the seat pricing categories?',
        ],
        relatedLinks: [{ label: `View ${matchedMovie.title} Details`, url: `/movies/${matchedMovie.id}` }],
        isAiGenerated: false,
      };
    }

    // 3. Fallback to Gemini with RAG Context if configured
    if (env.GEMINI_API_KEY) {
      try {
        const ragContext = `
VERIFIED MOVIES CURRENTLY AVAILABLE:
${activeMovies.map((m) => `- ${m.title} (${m.language}, ${m.genre}, Rating: ${m.rating}★, Runtime: ${m.duration})`).join('\n')}

VERIFIED CINEMAS:
${activeTheatres.map((t) => `- ${t.name} in ${t.city} (${t.location})`).join('\n')}

POLICIES:
- Seat Holding: 8 minutes lock with countdown timer.
- Cancellation: Allowed up to 2 hours before showtime from dashboard. Refund processed within 3-5 days.
- Gate Pass: Instant QR code M-ticket on dashboard.
`;

        const prompt = `You are the BookMyTix AI Concierge.
Answer the customer's question concisely based ONLY on the verified context below.
Never make up movies, cinema names, or pricing that are not listed.
Never promise manual refunds or claim you can book tickets directly.

CONTEXT:
${ragContext}

CUSTOMER QUESTION:
${question}

Answer in markdown format.`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const generated = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generated) {
            return {
              answer: generated,
              sources: ['BookMyTix Live Catalog Grounding', 'Operational Policies'],
              disclaimer,
              suggestedFollowUps: [
                'Browse Now Showing movies',
                'What is the ticket cancellation policy?',
              ],
              isAiGenerated: true,
            };
          }
        }
      } catch (err) {
        logger.debug('Gemini assistant query failed, using deterministic FAQ fallback', { error: err });
      }
    }

    // 4. Default Helpful Overview
    return {
      answer: `Hello! I am your BookMyTix Virtual Assistant. I can help you with:\n\n` +
        `• **Movie Discovery:** Ask about current releases, ratings, genres, or cast.\n` +
        `• **Multiplex Schedules:** Find showtimes across PVR, INOX, and Cinepolis.\n` +
        `• **Booking Information:** Learn about our 8-minute seat holding and payment security.\n` +
        `• **Cancellations & Passes:** Check refund timelines and how to access your digital QR gate pass.\n\n` +
        `How can I assist your movie experience today?`,
      sources: ['BookMyTix Help Center'],
      disclaimer,
      suggestedFollowUps: [
        'How does seat reservation work?',
        'What movies are now showing?',
        'What is your cancellation and refund policy?',
      ],
      relatedLinks: [
        { label: 'Browse Movies', url: '/movies' },
        { label: 'Customer Support Desk', url: '/support' },
      ],
      isAiGenerated: false,
    };
  },
};
