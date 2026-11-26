import QRCode from 'qrcode';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tickets, bookings, showSeats, shows, movies, events, theatres, screens, users } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export interface VerifiedTicketResult {
  valid: boolean;
  message: string;
  admittedAt?: Date;
  ticket?: {
    id: number;
    ticketRef: string;
    seatNumber: string;
    row: string;
    category: string;
    isUsed: boolean;
    usedAt: Date | null;
  };
  booking?: {
    id: number;
    bookingRef: string;
    customerName: string;
    customerEmail: string;
    totalAmount: number;
    status: string;
  };
  show?: {
    movieTitle: string;
    theatreName: string;
    screenName: string;
    showTime: string;
    showDate: string;
  };
}

export const ticketService = {
  /**
   * Generates a high-resolution base64 PNG data URL for a QR code string.
   */
  async generateQrDataUrl(qrString: string): Promise<string> {
    try {
      return await QRCode.toDataURL(qrString, {
        width: 320,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });
    } catch (err) {
      logger.error('Failed to generate QR data URL', err);
      return '';
    }
  },

  /**
   * Verify and consume a digital admission ticket at gate check-in.
   * Prevents double-scanning / QR reuse by recording admission timestamp.
   */
  async verifyTicket(tokenOrPayload: string): Promise<VerifiedTicketResult> {
    if (!tokenOrPayload || !tokenOrPayload.trim()) {
      throw new AppError('Ticket verification token is required', 400);
    }

    let token = tokenOrPayload.trim();
    let ticketRefFromPayload: string | undefined;

    // Check if the input is a JSON QR string
    if (token.startsWith('{') && token.endsWith('}')) {
      try {
        const parsed = JSON.parse(token);
        if (parsed.token) token = parsed.token;
        if (parsed.ref) ticketRefFromPayload = parsed.ref;
      } catch {
        // use raw string
      }
    }

    // Lookup ticket by qrToken or ticketRef
    let ticket = await db.query.tickets.findFirst({
      where: eq(tickets.qrToken, token),
    });

    if (!ticket && ticketRefFromPayload) {
      ticket = await db.query.tickets.findFirst({
        where: eq(tickets.ticketRef, ticketRefFromPayload),
      });
    }

    if (!ticket) {
      return {
        valid: false,
        message: 'Invalid or fraudulent ticket. Verification token not recognized.',
      };
    }

    const [booking, seat] = await Promise.all([
      db.query.bookings.findFirst({ where: eq(bookings.id, ticket.bookingId) }),
      db.query.showSeats.findFirst({ where: eq(showSeats.id, ticket.showSeatId) }),
    ]);

    if (!booking) {
      return {
        valid: false,
        message: 'Booking not found for this ticket',
      };
    }

    if (booking.status !== 'confirmed') {
      return {
        valid: false,
        message: `Admission rejected: Booking status is currently "${booking.status.toUpperCase()}". Only CONFIRMED tickets can be admitted.`,
      };
    }

    // Gate admission check: prevent double-scanning
    if (ticket.isUsed) {
      const usedDateStr = ticket.usedAt
        ? new Date(ticket.usedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        : 'earlier';
      return {
        valid: false,
        message: `TICKET ALREADY USED: This pass was previously admitted at ${usedDateStr}. Entry denied to prevent double admission.`,
        ticket: {
          id: ticket.id,
          ticketRef: ticket.ticketRef || `TIX-${ticket.id}`,
          seatNumber: seat?.seatNumber || 'Seat',
          row: seat?.row || 'A',
          category: seat?.category || 'standard',
          isUsed: true,
          usedAt: ticket.usedAt,
        },
      };
    }

    // Consume ticket: mark isUsed = true
    const now = new Date();
    await db
      .update(tickets)
      .set({ isUsed: true, usedAt: now })
      .where(eq(tickets.id, ticket.id));

    // Fetch related context
    const [user, show] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, booking.userId) }),
      db.query.shows.findFirst({ where: eq(shows.id, booking.showId) }),
    ]);

    let movieTitle = 'Cinema Ticket';
    let theatreName = 'Multiplex';
    let screenName = 'Screen 1';

    if (show) {
      const [movie, event, theatre, screen] = await Promise.all([
        show.movieId ? db.query.movies.findFirst({ where: eq(movies.id, show.movieId) }) : null,
        show.eventId ? db.query.events.findFirst({ where: eq(events.id, show.eventId) }) : null,
        db.query.theatres.findFirst({ where: eq(theatres.id, show.theatreId) }),
        show.screenId ? db.query.screens.findFirst({ where: eq(screens.id, show.screenId) }) : null,
      ]);
      if (movie) movieTitle = movie.title;
      else if (event) movieTitle = event.title;
      if (theatre) theatreName = theatre.name;
      if (screen) screenName = screen.name;
    }

    const showDateObj = show ? new Date(show.startsAt) : new Date();

    return {
      valid: true,
      message: 'Admission Authorized. Enjoy the show!',
      admittedAt: now,
      ticket: {
        id: ticket.id,
        ticketRef: ticket.ticketRef || `TIX-${ticket.id}`,
        seatNumber: seat?.seatNumber || 'Seat',
        row: seat?.row || 'A',
        category: seat?.category || 'standard',
        isUsed: true,
        usedAt: now,
      },
      booking: {
        id: booking.id,
        bookingRef: booking.bookingRef || String(booking.id),
        customerName: user?.name || 'Customer',
        customerEmail: user?.email || '',
        totalAmount: Number(booking.totalPrice),
        status: booking.status,
      },
      show: {
        movieTitle,
        theatreName,
        screenName,
        showTime: showDateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        showDate: showDateObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
      },
    };
  },

  /**
   * Retrieves printable/downloadable digital tickets for a confirmed booking.
   */
  async getBookingTickets(bookingId: number, userId?: number) {
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
    });

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    if (userId && booking.userId !== userId) {
      throw new AppError('Unauthorized access to booking tickets', 403);
    }

    const [show, bookingTickets, user] = await Promise.all([
      db.query.shows.findFirst({ where: eq(shows.id, booking.showId) }),
      db
        .select({
          id: tickets.id,
          ticketRef: tickets.ticketRef,
          qrCode: tickets.qrCode,
          qrToken: tickets.qrToken,
          isUsed: tickets.isUsed,
          usedAt: tickets.usedAt,
          seatId: showSeats.id,
          seatNumber: showSeats.seatNumber,
          row: showSeats.row,
          category: showSeats.category,
          price: showSeats.price,
        })
        .from(tickets)
        .innerJoin(showSeats, eq(tickets.showSeatId, showSeats.id))
        .where(eq(tickets.bookingId, booking.id)),
      db.query.users.findFirst({ where: eq(users.id, booking.userId) }),
    ]);

    let movieTitle = 'Movie Ticket';
    let poster = '';
    let theatreName = 'Cinema Multiplex';
    let theatreAddress = '';
    let screenName = 'Screen 1';

    if (show) {
      const [movie, event, theatre, screen] = await Promise.all([
        show.movieId ? db.query.movies.findFirst({ where: eq(movies.id, show.movieId) }) : null,
        show.eventId ? db.query.events.findFirst({ where: eq(events.id, show.eventId) }) : null,
        db.query.theatres.findFirst({ where: eq(theatres.id, show.theatreId) }),
        show.screenId ? db.query.screens.findFirst({ where: eq(screens.id, show.screenId) }) : null,
      ]);

      movieTitle = movie?.title || event?.title || 'Movie Ticket';
      poster = movie?.poster || event?.image || '';
      theatreName = theatre?.name || 'Cinema Multiplex';
      theatreAddress = theatre?.address || theatre?.city || '';
      screenName = screen?.name || 'Screen 1';
    }

    const startsAt = show ? new Date(show.startsAt) : new Date();

    // Generate QR images in parallel
    const ticketsWithQr = await Promise.all(
      bookingTickets.map(async (t) => {
        const qrDataUrl = await this.generateQrDataUrl(t.qrCode);
        return {
          id: t.id,
          ticketRef: t.ticketRef || `TIX-${t.id}`,
          seatNumber: t.seatNumber,
          row: t.row,
          category: t.category,
          price: Number(t.price || 0),
          isUsed: t.isUsed,
          usedAt: t.usedAt,
          qrToken: t.qrToken,
          qrDataUrl,
        };
      }),
    );

    return {
      booking: {
        id: booking.id,
        bookingRef: booking.bookingRef || String(booking.id),
        status: booking.status,
        totalPrice: Number(booking.totalPrice),
        ticketSubtotal: Number(booking.ticketSubtotal),
        convenienceFee: Number(booking.convenienceFee),
        taxAmount: Number(booking.taxAmount),
        foodTotal: Number(booking.foodTotal),
        discountAmount: Number(booking.discountAmount),
        createdAt: booking.createdAt,
      },
      customer: {
        name: user?.name || 'Customer',
        email: user?.email || '',
      },
      show: {
        movieTitle,
        poster,
        theatreName,
        theatreAddress,
        screenName,
        startsAt,
        formattedDate: startsAt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
        formattedTime: startsAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        language: show?.language || 'Hindi',
        format: show?.format || '2D',
      },
      tickets: ticketsWithQr,
    };
  },
};
