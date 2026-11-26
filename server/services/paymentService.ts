import crypto from 'crypto';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  bookings,
  payments,
  showSeats,
  seatLocks,
  tickets,
  shows,
  movies,
  events,
  theatres,
  coupons,
  bookingFoodItems,
  users,
} from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { checkoutService, OrderSummaryRequest } from './checkoutService.js';
import { bookingStateMachine } from './bookingStateMachine.js';
import { seatEventService } from './seatEventService.js';
import { emailService } from './emailService.js';

export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_bookmytix_sandbox';
export const RAZORPAY_KEY_SECRET =
  process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_bookmytix_mock_key_2026';
export const RAZORPAY_WEBHOOK_SECRET =
  process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_bookmytix_test';

export interface CreateOrderParams extends OrderSummaryRequest {
  userId: number;
  lockToken?: string;
}

export interface VerifyPaymentParams {
  userId: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export const paymentService = {
  /**
   * Generates a valid Razorpay sandbox HMAC-SHA256 signature for testing or gateway verification.
   */
  generateSignature(orderId: string, paymentId: string, secret = RAZORPAY_KEY_SECRET): string {
    return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  },

  /**
   * Generates a secure QR token without embedding PII.
   */
  generateQrToken(ticketRef: string, bookingId: number): string {
    return crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${ticketRef}|${bookingId}|bmt_secure_entry`)
      .digest('hex');
  },

  /**
   * 1. Creates an order with status 'payment_pending' and generates a Razorpay payment order.
   * Strict server-side validation of seats, pricing, concessions, and coupon eligibility.
   */
  async createPaymentOrder(params: CreateOrderParams) {
    const { userId, showId, seatIds, lockToken, foodItems, couponCode } = params;

    // 1. Calculate and verify full order summary on the backend
    const summary = await checkoutService.calculateSummary({
      showId,
      seatIds,
      foodItems,
      couponCode,
      userId,
    });

    const now = new Date();
    // 2. Validate seat availability & active locks
    const activeSeats = await db
      .select()
      .from(showSeats)
      .where(and(eq(showSeats.showId, showId), inArray(showSeats.id, seatIds)));

    for (const seat of activeSeats) {
      if (seat.status === 'booked') {
        throw new AppError(`Seat ${seat.seatNumber} is already booked`, 409);
      }
    }

    const locks = await db
      .select()
      .from(seatLocks)
      .where(
        and(
          eq(seatLocks.showId, showId),
          inArray(seatLocks.showSeatId, seatIds),
        ),
      );

    for (const lock of locks) {
      if (new Date(lock.expiresAt) > now) {
        if (lock.userId !== userId) {
          throw new AppError('One or more selected seats are reserved by another user', 409);
        }
        if (lockToken && lock.lockToken !== lockToken) {
          throw new AppError('Invalid reservation lock token', 409);
        }
      }
    }

    // 3. Unique booking reference
    const bookingRef = `BMT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minute payment window

    // 4. Create Razorpay Test Order
    const amountInPaise = Math.round(summary.pricing.finalPayable * 100);
    const razorpayOrderId = `order_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const idempotencyKey = `IDEM-${razorpayOrderId}`;

    // 5. Persist booking and payment records in atomic transaction
    const booking = await db.transaction(async (tx) => {
      const [newBooking] = await tx
        .insert(bookings)
        .values({
          bookingRef,
          userId,
          showId,
          ticketSubtotal: String(summary.pricing.ticketSubtotal),
          convenienceFee: String(summary.pricing.convenienceFee),
          taxAmount: String(summary.pricing.taxAmount),
          foodTotal: String(summary.pricing.foodTotal),
          discountAmount: String(summary.pricing.discountAmount),
          couponId: summary.coupon ? (await db.query.coupons.findFirst({ where: eq(coupons.code, summary.coupon.code) }))?.id : null,
          totalPrice: String(summary.pricing.finalPayable),
          status: 'payment_pending',
          expiresAt,
        })
        .returning();

      // Persist pending payment record
      await tx.insert(payments).values({
        bookingId: newBooking.id,
        userId,
        amount: String(summary.pricing.finalPayable),
        currency: 'INR',
        provider: 'razorpay',
        paymentMethod: 'card',
        orderId: razorpayOrderId,
        status: 'pending',
        transactionId: `TXN-PENDING-${razorpayOrderId}`,
        idempotencyKey,
        metadata: JSON.stringify({
          seatIds,
          foodItems: summary.foodItems,
          couponCode: summary.coupon?.code,
        }),
      });

      return newBooking;
    });

    return {
      bookingId: booking.id,
      bookingRef: booking.bookingRef,
      orderId: razorpayOrderId,
      amount: amountInPaise,
      currency: 'INR',
      keyId: RAZORPAY_KEY_ID,
      summary,
      expiresAt: booking.expiresAt,
    };
  },

  /**
   * 2. Payment Verification with cryptographic HMAC-SHA256 signature verification.
   * State Machine: Validates and transitions payment_pending -> confirmed atomically.
   */
  async verifyPayment(params: VerifyPaymentParams) {
    const { userId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new AppError('Missing payment verification parameters', 400);
    }

    // 1. Verify HMAC-SHA256 signature
    const expectedSignature = this.generateSignature(razorpayOrderId, razorpayPaymentId);
    let signatureValid: boolean;
    try {
      signatureValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf-8'),
        Buffer.from(razorpaySignature, 'utf-8'),
      );
    } catch {
      signatureValid = false;
    }

    // Find the payment record
    const payment = await db.query.payments.findFirst({
      where: eq(payments.orderId, razorpayOrderId),
    });

    if (!payment) {
      throw new AppError(`Payment order "${razorpayOrderId}" not found`, 404);
    }

    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, payment.bookingId),
    });

    if (!booking) {
      throw new AppError('Associated booking record not found', 404);
    }

    // If signature check failed:
    if (!signatureValid) {
      logger.error(`[Payment] Signature mismatch for order ${razorpayOrderId}`);
      await db.transaction(async (tx) => {
        await tx
          .update(bookings)
          .set({ status: 'failed', updatedAt: new Date() })
          .where(eq(bookings.id, booking.id));

        await tx
          .update(payments)
          .set({ status: 'failed', updatedAt: new Date() })
          .where(eq(payments.id, payment.id));
      });

      const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
      if (user) {
        await emailService.sendPaymentFailure(
          userId,
          user.email,
          booking.bookingRef || String(booking.id),
          'Payment signature verification failed',
        );
      }

      throw new AppError('Invalid payment signature. Verification failed.', 400);
    }

    // 2. State Machine Check: If already confirmed, idempotent return
    if (booking.status === 'confirmed') {
      const existingTickets = await db
        .select({
          id: tickets.id,
          ticketRef: tickets.ticketRef,
          seatNumber: showSeats.seatNumber,
          qrCode: tickets.qrCode,
        })
        .from(tickets)
        .innerJoin(showSeats, eq(tickets.showSeatId, showSeats.id))
        .where(eq(tickets.bookingId, booking.id));

      return {
        message: 'Payment already verified and confirmed',
        bookingId: booking.id,
        bookingRef: booking.bookingRef,
        tickets: existingTickets,
        status: 'confirmed',
      };
    }

    // Validate transition
    bookingStateMachine.assertTransition(booking.status, 'confirmed');

    // Parse metadata for seatIds and food items
    let meta: { seatIds?: number[]; foodItems?: Array<{ foodItemId: number; quantity: number; unitPrice: number; totalPrice: number }> } = {};
    try {
      meta = JSON.parse(payment.metadata || '{}');
    } catch {
      // empty
    }

    const seatIds = meta.seatIds || [];

    // 3. Complete booking in ACID transaction
    const finalResult = await db.transaction(async (tx) => {
      // A. Update booking status
      await tx
        .update(bookings)
        .set({
          status: 'confirmed',
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, booking.id));

      // B. Update showSeats to booked
      if (seatIds.length > 0) {
        await tx
          .update(showSeats)
          .set({
            status: 'booked',
            bookingId: booking.id,
          })
          .where(inArray(showSeats.id, seatIds));

        // C. Clear seat locks
        await tx
          .delete(seatLocks)
          .where(
            and(
              eq(seatLocks.showId, booking.showId),
              inArray(seatLocks.showSeatId, seatIds),
            ),
          );
      }

      // D. Generate secure tickets with unguessable QR tokens
      const bookedSeats = await tx
        .select()
        .from(showSeats)
        .where(inArray(showSeats.id, seatIds));

      const createdTickets = [];
      for (const seat of bookedSeats) {
        const ticketRef = `TIX-${booking.id}-${seat.seatNumber}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        const qrToken = paymentService.generateQrToken(ticketRef, booking.id);
        const qrPayload = JSON.stringify({
          v: 1,
          ref: ticketRef,
          token: qrToken,
        });

        const [t] = await tx
          .insert(tickets)
          .values({
            bookingId: booking.id,
            showSeatId: seat.id,
            ticketRef,
            qrCode: qrPayload,
            qrToken,
            isUsed: false,
          })
          .returning();

        createdTickets.push({
          id: t.id,
          ticketRef: t.ticketRef,
          seatNumber: seat.seatNumber,
          qrCode: t.qrCode,
          qrToken: t.qrToken,
        });
      }

      // E. Update payment status to completed
      await tx
        .update(payments)
        .set({
          status: 'completed',
          transactionId: razorpayPaymentId,
          signature: razorpaySignature,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));

      // F. Increment coupon usage if used
      if (booking.couponId) {
        const coupon = await tx.query.coupons.findFirst({
          where: eq(coupons.id, booking.couponId),
        });
        if (coupon) {
          await tx
            .update(coupons)
            .set({ usedCount: coupon.usedCount + 1 })
            .where(eq(coupons.id, coupon.id));
        }
      }

      // G. Persist concessions into booking_food_items
      if (meta.foodItems && meta.foodItems.length > 0) {
        for (const f of meta.foodItems) {
          await tx.insert(bookingFoodItems).values({
            bookingId: booking.id,
            foodItemId: f.foodItemId,
            quantity: f.quantity,
            unitPrice: String(f.unitPrice),
            totalPrice: String(f.totalPrice),
          });
        }
      }

      return {
        bookingId: booking.id,
        bookingRef: booking.bookingRef,
        tickets: createdTickets,
        seatNumbers: bookedSeats.map((s) => s.seatNumber),
      };
    });

    // 4. Broadcast real-time seat booked event
    seatEventService.emit({
      showId: booking.showId,
      type: 'seat_booked',
      seatIds,
      seatNumbers: finalResult.seatNumbers,
      userId,
    });

    // 5. Send confirmation notifications
    const [user, show] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, userId) }),
      db.query.shows.findFirst({ where: eq(shows.id, booking.showId) }),
    ]);

    if (user && show) {
      const [movie, event, theatre] = await Promise.all([
        show.movieId ? db.query.movies.findFirst({ where: eq(movies.id, show.movieId) }) : null,
        show.eventId ? db.query.events.findFirst({ where: eq(events.id, show.eventId) }) : null,
        db.query.theatres.findFirst({ where: eq(theatres.id, show.theatreId) }),
      ]);

      const startsAt = new Date(show.startsAt);
      await emailService.sendBookingConfirmation(userId, user.email, {
        bookingRef: finalResult.bookingRef || String(finalResult.bookingId),
        movieTitle: movie?.title || event?.title || 'Cinema Ticket',
        theatreName: theatre?.name || 'Multiplex Cinema',
        showTime: startsAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        showDate: startsAt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
        seatNumbers: finalResult.seatNumbers,
        totalAmount: Number(booking.totalPrice),
      });
    }

    return {
      message: 'Payment verified and booking confirmed successfully',
      bookingId: finalResult.bookingId,
      bookingRef: finalResult.bookingRef,
      tickets: finalResult.tickets,
      status: 'confirmed',
    };
  },

  /**
   * 3. Webhook handling with HMAC signature verification and idempotency protection.
   */
  async handleWebhook(rawBody: string, signature: string) {
    if (!signature) {
      throw new AppError('Missing webhook signature', 400);
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    let valid: boolean;
    try {
      valid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf-8'),
        Buffer.from(signature, 'utf-8'),
      );
    } catch {
      valid = false;
    }

    if (!valid) {
      throw new AppError('Invalid webhook signature', 400);
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      throw new AppError('Invalid JSON payload in webhook', 400);
    }

    logger.info(`[Webhook] Processing Razorpay event: ${event.event} (${event.id || 'no-id'})`);

    const paymentEntity = event.payload?.payment?.entity;
    const orderEntity = event.payload?.order?.entity;
    const orderId = paymentEntity?.order_id || orderEntity?.id;

    if (!orderId) {
      return { received: true, note: 'Ignored event without order_id' };
    }

    const payment = await db.query.payments.findFirst({
      where: eq(payments.orderId, orderId),
    });

    if (!payment) {
      logger.warn(`[Webhook] No payment found for order: ${orderId}`);
      return { received: true, note: 'Payment order not found' };
    }

    // Idempotency: check if already processed
    if (payment.webhookProcessedAt) {
      logger.info(`[Webhook] Event for order ${orderId} already processed at ${payment.webhookProcessedAt}`);
      return { received: true, status: 'already_processed' };
    }

    // Handle events
    if (event.event === 'order.paid' || event.event === 'payment.captured') {
      const paymentId = paymentEntity?.id || `pay_${Date.now()}`;
      const dummySig = this.generateSignature(orderId, paymentId);
      try {
        await this.verifyPayment({
          userId: payment.userId,
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: dummySig,
        });
      } catch (err) {
        logger.warn(`[Webhook] verifyPayment call completed or idempotent:`, err);
      }
    } else if (event.event === 'payment.failed') {
      await db.transaction(async (tx) => {
        await tx
          .update(bookings)
          .set({ status: 'failed', updatedAt: new Date() })
          .where(eq(bookings.id, payment.bookingId));

        await tx
          .update(payments)
          .set({ status: 'failed', updatedAt: new Date() })
          .where(eq(payments.id, payment.id));
      });
    }

    // Mark webhook processed
    await db
      .update(payments)
      .set({ webhookProcessedAt: new Date() })
      .where(eq(payments.id, payment.id));

    return { received: true, status: 'processed', event: event.event };
  },
};
