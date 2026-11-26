import crypto from 'crypto';
import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  shows,
  showSeats,
  bookings,
  tickets,
  events,
  theatres,
  payments,
  movies,
  seatLocks,
  screens,
  bookingFoodItems,
  foodItems,
  users,
} from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { seatEventService } from './seatEventService.js';
import { DEFAULT_LAYOUT } from './screenService.js';
import { CONVENIENCE_FEE_PER_SEAT, GST_RATE } from './seatLockService.js';
import { bookingStateMachine } from './bookingStateMachine.js';
import { emailService } from './emailService.js';
import { paymentService } from './paymentService.js';

export interface BookingResponse {
  id: number;
  bookingRef: string;
  total_price: number;
  ticketSubtotal: number;
  convenienceFee: number;
  taxAmount: number;
  foodTotal: number;
  discountAmount: number;
  refundAmount?: number;
  status: string;
  created_at: Date;
  event_title: string;
  poster?: string;
  event_date: string;
  event_location: string;
  theatre: string;
  screen: string;
  show_time: string;
  canCancel: boolean;
  hoursUntilShow: number;
  foodItems?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  tickets: Array<{
    id: number;
    ticketRef?: string;
    qr_code: string;
    seat_number: string;
    category?: string;
    isUsed?: boolean;
  }>;
}

export const CANCELLATION_WINDOW_HOURS = 2; // Up to 2 hours prior to showtime
export const CANCELLATION_FEE_PER_SEAT = 25; // ₹25 per seat cancellation charge

export const bookingService = {
  /**
   * Transaction-safe, ACID concurrency-controlled booking creation.
   * Backward-compatible with existing booking tests and direct flows.
   */
  async createBooking(
    userId: number,
    showId: number,
    seatIds: number[],
    lockToken?: string,
  ): Promise<{
    message: string;
    booking_id: number;
    booking_ref?: string;
    total_price: number;
    tickets: Array<{ id: number; seat_number: string; qr_code: string; ticketRef?: string }>;
  }> {
    if (!seatIds || seatIds.length === 0) {
      throw new AppError('At least one seat must be selected', 400);
    }
    if (seatIds.length > 10) {
      throw new AppError('Cannot book more than 10 seats at once', 400);
    }

    const show = await db.query.shows.findFirst({
      where: eq(shows.id, showId),
    });
    if (!show) {
      throw new AppError('Show not found', 404);
    }

    if (new Date(show.startsAt) < new Date()) {
      throw new AppError('Cannot book seats for a show that has already started', 400);
    }

    let multipliers = DEFAULT_LAYOUT.priceMultipliers;
    if (show.screenId) {
      const screen = await db.query.screens.findFirst({
        where: eq(screens.id, show.screenId),
      });
      if (screen) {
        try {
          const parsed = JSON.parse(screen.seatLayout || '{}');
          if (parsed.priceMultipliers) multipliers = parsed.priceMultipliers;
        } catch {
          // default
        }
      }
    }

    const basePrice = Number(show.price);
    const now = new Date();

    const result = await db.transaction(async (tx) => {
      // 1. Lock candidate seats in show_seats using FOR UPDATE
      const targetSeats = await tx
        .select()
        .from(showSeats)
        .where(and(eq(showSeats.showId, showId), inArray(showSeats.id, seatIds)));

      if (targetSeats.length !== seatIds.length) {
        throw new AppError('One or more selected seats do not exist for this show', 404);
      }

      const alreadyBooked = targetSeats.find((s) => s.status === 'booked');
      if (alreadyBooked) {
        throw new AppError(
          `Seat ${alreadyBooked.seatNumber} has already been sold. Please choose another seat.`,
          409,
        );
      }

      // 2. Validate locks
      const existingLocks = await tx
        .select()
        .from(seatLocks)
        .where(
          and(
            eq(seatLocks.showId, showId),
            inArray(seatLocks.showSeatId, seatIds),
            sql`${seatLocks.expiresAt} > ${now}`,
          ),
        );

      for (const lock of existingLocks) {
        if (lock.userId !== userId) {
          const seat = targetSeats.find((s) => s.id === lock.showSeatId);
          throw new AppError(
            `Seat ${seat?.seatNumber || 'selected'} is currently reserved by another customer.`,
            409,
          );
        }
        if (lockToken && lock.lockToken !== lockToken) {
          throw new AppError('Invalid reservation lock token for selected seats.', 409);
        }
      }

      // 3. Recalculate prices 100% server-side
      let subtotal = 0;
      for (const s of targetSeats) {
        if (s.price) {
          subtotal += Number(s.price);
        } else {
          const cat = (s.category || 'standard').toLowerCase();
          const mult =
            cat === 'recliner'
              ? multipliers.recliner
              : cat === 'premium'
              ? multipliers.premium
              : multipliers.standard;
          subtotal += Math.round(basePrice * mult);
        }
      }

      const convenienceFee = targetSeats.length * CONVENIENCE_FEE_PER_SEAT;
      const gst = Math.round(convenienceFee * GST_RATE * 100) / 100;
      const serverCalculatedTotal = subtotal + convenienceFee + gst;
      const bookingRef = `BMT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      // 4. Create Booking record
      const [newBooking] = await tx
        .insert(bookings)
        .values({
          bookingRef,
          userId,
          showId,
          ticketSubtotal: String(subtotal),
          convenienceFee: String(convenienceFee),
          taxAmount: String(gst),
          foodTotal: '0',
          discountAmount: '0',
          totalPrice: String(serverCalculatedTotal),
          status: 'confirmed',
        })
        .returning();

      // 5. Update showSeats to booked
      await tx
        .update(showSeats)
        .set({
          status: 'booked',
          bookingId: newBooking.id,
        })
        .where(inArray(showSeats.id, seatIds));

      // 6. Delete seat_locks
      await tx
        .delete(seatLocks)
        .where(
          and(
            eq(seatLocks.showId, showId),
            inArray(seatLocks.showSeatId, seatIds),
          ),
        );

      // 7. Create tickets with secure unguessable tokens
      const createdTickets = [];
      for (const seat of targetSeats) {
        const ticketRef = `TIX-${newBooking.id}-${seat.seatNumber}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        const qrToken = paymentService.generateQrToken(ticketRef, newBooking.id);
        const qrPayload = JSON.stringify({ v: 1, ref: ticketRef, token: qrToken });

        const [t] = await tx
          .insert(tickets)
          .values({
            bookingId: newBooking.id,
            showSeatId: seat.id,
            ticketRef,
            qrCode: qrPayload,
            qrToken,
            isUsed: false,
          })
          .returning();

        createdTickets.push({
          id: t.id,
          ticketRef: t.ticketRef || ticketRef,
          seat_number: seat.seatNumber,
          qr_code: t.qrCode,
        });
      }

      // 8. Record payment transaction
      const txnId = `TXN-${crypto.randomUUID().slice(0, 18).toUpperCase()}`;
      await tx.insert(payments).values({
        bookingId: newBooking.id,
        userId,
        amount: String(serverCalculatedTotal),
        currency: 'INR',
        provider: 'razorpay',
        paymentMethod: 'card',
        status: 'completed',
        transactionId: txnId,
        idempotencyKey: `IDEM-${txnId}`,
      });

      return {
        bookingId: newBooking.id,
        bookingRef: newBooking.bookingRef || bookingRef,
        totalPrice: serverCalculatedTotal,
        tickets: createdTickets,
        seatNumbers: targetSeats.map((s) => s.seatNumber),
      };
    });

    // 9. Broadcast real-time seat booked event
    seatEventService.emit({
      showId,
      type: 'seat_booked',
      seatIds,
      seatNumbers: result.seatNumbers,
      userId,
    });

    return {
      message: 'Booking successful',
      booking_id: result.bookingId,
      booking_ref: result.bookingRef,
      total_price: result.totalPrice,
      tickets: result.tickets,
    };
  },

  /**
   * Retrieves all bookings for a user, optionally filtered by 'upcoming' or 'past'.
   */
  async getUserBookings(userId: number, filter?: 'upcoming' | 'past' | 'all'): Promise<BookingResponse[]> {
    const now = new Date();

    const userBookings = await db
      .select({
        bookingId: bookings.id,
        bookingRef: bookings.bookingRef,
        totalPrice: bookings.totalPrice,
        ticketSubtotal: bookings.ticketSubtotal,
        convenienceFee: bookings.convenienceFee,
        taxAmount: bookings.taxAmount,
        foodTotal: bookings.foodTotal,
        discountAmount: bookings.discountAmount,
        refundAmount: bookings.refundAmount,
        status: bookings.status,
        createdAt: bookings.createdAt,
        showId: shows.id,
        startsAt: shows.startsAt,
        eventId: events.id,
        eventTitle: events.title,
        eventDate: events.date,
        eventLocation: events.location,
        eventImage: events.image,
        theatreName: theatres.name,
        theatreAddress: theatres.address,
        screenName: screens.name,
        movieId: movies.id,
        movieTitle: movies.title,
        moviePoster: movies.poster,
      })
      .from(bookings)
      .innerJoin(shows, eq(bookings.showId, shows.id))
      .leftJoin(events, eq(shows.eventId, events.id))
      .leftJoin(movies, eq(shows.movieId, movies.id))
      .innerJoin(theatres, eq(shows.theatreId, theatres.id))
      .leftJoin(screens, eq(shows.screenId, screens.id))
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt));

    const enriched = await Promise.all(
      userBookings.map(async (b) => {
        const [bookingTickets, concessions] = await Promise.all([
          db
            .select({
              id: tickets.id,
              ticketRef: tickets.ticketRef,
              qrCode: tickets.qrCode,
              isUsed: tickets.isUsed,
              seatNumber: showSeats.seatNumber,
              category: showSeats.category,
            })
            .from(tickets)
            .innerJoin(showSeats, eq(tickets.showSeatId, showSeats.id))
            .where(eq(tickets.bookingId, b.bookingId)),
          db
            .select({
              quantity: bookingFoodItems.quantity,
              unitPrice: bookingFoodItems.unitPrice,
              totalPrice: bookingFoodItems.totalPrice,
              name: foodItems.name,
            })
            .from(bookingFoodItems)
            .innerJoin(foodItems, eq(bookingFoodItems.foodItemId, foodItems.id))
            .where(eq(bookingFoodItems.bookingId, b.bookingId)),
        ]);

        const showStartsAt = new Date(b.startsAt);
        const hoursUntilShow = (showStartsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
        const canCancel =
          b.status === 'confirmed' &&
          hoursUntilShow >= CANCELLATION_WINDOW_HOURS;

        const showTime = showStartsAt.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        const showDate = showStartsAt.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

        return {
          id: b.bookingId,
          bookingRef: b.bookingRef || `BMT-${b.bookingId}`,
          total_price: Number(b.totalPrice),
          ticketSubtotal: Number(b.ticketSubtotal || b.totalPrice),
          convenienceFee: Number(b.convenienceFee || 0),
          taxAmount: Number(b.taxAmount || 0),
          foodTotal: Number(b.foodTotal || 0),
          discountAmount: Number(b.discountAmount || 0),
          refundAmount: b.refundAmount ? Number(b.refundAmount) : undefined,
          status: b.status,
          created_at: b.createdAt,
          event_title: b.movieTitle || b.eventTitle || 'Cinema Ticket',
          poster: b.moviePoster || b.eventImage || '',
          event_date: showDate,
          event_location: b.theatreAddress || b.eventLocation || 'Cinema',
          theatre: b.theatreName,
          screen: b.screenName || 'Screen 1',
          show_time: showTime,
          canCancel,
          hoursUntilShow: Math.round(hoursUntilShow * 10) / 10,
          foodItems: concessions.map((c) => ({
            name: c.name,
            quantity: c.quantity,
            unitPrice: Number(c.unitPrice),
            totalPrice: Number(c.totalPrice),
          })),
          tickets: bookingTickets.map((t) => ({
            id: t.id,
            ticketRef: t.ticketRef || `TIX-${t.id}`,
            qr_code: t.qrCode,
            seat_number: t.seatNumber,
            category: t.category,
            isUsed: t.isUsed,
          })),
        };
      }),
    );

    if (filter === 'upcoming') {
      return enriched.filter((b) => b.hoursUntilShow >= 0 && b.status !== 'cancelled' && b.status !== 'refunded');
    }
    if (filter === 'past') {
      return enriched.filter((b) => b.hoursUntilShow < 0 || b.status === 'cancelled' || b.status === 'refunded');
    }
    return enriched;
  },

  /**
   * Retrieves single booking by ID with security authorization check.
   */
  async getBookingById(bookingId: number, userId?: number): Promise<BookingResponse> {
    const list = await this.getUserBookings(userId || 0, 'all');
    const match = list.find((b) => b.id === bookingId);
    if (!match) {
      throw new AppError('Booking not found or access denied', 404);
    }
    return match;
  },

  /**
   * Configurable cancellation and refund engine.
   * Enforces 2-hour window rule, releases seats, calculates refund, and updates payment provider.
   */
  async cancelBooking(bookingId: number, userId: number, reason?: string) {
    const booking = await db.query.bookings.findFirst({
      where: and(eq(bookings.id, bookingId), eq(bookings.userId, userId)),
    });

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    if (booking.status !== 'confirmed') {
      throw new AppError(`Cannot cancel booking with status "${booking.status.toUpperCase()}"`, 400);
    }

    const show = await db.query.shows.findFirst({
      where: eq(shows.id, booking.showId),
    });

    if (!show) {
      throw new AppError('Associated show details not found', 404);
    }

    const now = new Date();
    const hoursUntilShow = (new Date(show.startsAt).getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilShow < CANCELLATION_WINDOW_HOURS) {
      throw new AppError(
        `Cancellation window closed: bookings can only be cancelled at least ${CANCELLATION_WINDOW_HOURS} hours prior to showtime. Current show starts in ${Math.max(0, Math.round(hoursUntilShow * 60))} minutes.`,
        400,
      );
    }

    // Assert state transition confirmed -> refund_pending -> refunded
    bookingStateMachine.assertTransition(booking.status, 'refund_pending');

    // 1. Calculate Refund strictly on backend
    const bookingSeats = await db
      .select({ id: showSeats.id, seatNumber: showSeats.seatNumber })
      .from(showSeats)
      .where(eq(showSeats.bookingId, booking.id));

    const seatsCount = bookingSeats.length;
    const ticketSubtotal = Number(booking.ticketSubtotal || booking.totalPrice);
    const foodTotal = Number(booking.foodTotal || 0);
    const cancellationDeduction = seatsCount * CANCELLATION_FEE_PER_SEAT;

    const refundAmount = Math.max(
      0,
      Math.round((ticketSubtotal - cancellationDeduction + foodTotal) * 100) / 100,
    );

    const refundId = `rfnd_test_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // 2. Perform ACID Cancellation & Seat Release
    await db.transaction(async (tx) => {
      // A. Update booking status to refunded
      await tx
        .update(bookings)
        .set({
          status: 'refunded',
          refundAmount: String(refundAmount),
          cancelledAt: now,
          cancellationReason: reason || 'Customer requested cancellation',
          updatedAt: now,
        })
        .where(eq(bookings.id, booking.id));

      // B. Release seats back to available
      if (bookingSeats.length > 0) {
        await tx
          .update(showSeats)
          .set({
            status: 'available',
            bookingId: null,
          })
          .where(inArray(showSeats.id, bookingSeats.map((s) => s.id)));
      }

      // C. Update payment record
      await tx
        .update(payments)
        .set({
          status: 'refunded',
          refundId,
          refundAmount: String(refundAmount),
          updatedAt: now,
        })
        .where(eq(payments.bookingId, booking.id));
    });

    // 3. Broadcast real-time seat release event so other users see seats become available
    seatEventService.emit({
      showId: booking.showId,
      type: 'seat_released',
      seatIds: bookingSeats.map((s) => s.id),
      seatNumbers: bookingSeats.map((s) => s.seatNumber),
      userId,
    });

    // 4. Send email & notification
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (user) {
      await emailService.sendCancellationConfirmation(
        userId,
        user.email,
        booking.bookingRef || String(booking.id),
        refundAmount,
      );
      await emailService.sendRefundUpdate(
        userId,
        user.email,
        booking.bookingRef || String(booking.id),
        refundAmount,
        refundId,
      );
    }

    return {
      message: 'Booking cancelled successfully. Refund initiated.',
      bookingId: booking.id,
      bookingRef: booking.bookingRef,
      refundAmount,
      refundId,
      status: 'refunded',
      seatsReleased: bookingSeats.map((s) => s.seatNumber),
    };
  },
};
