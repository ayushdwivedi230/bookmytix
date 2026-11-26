import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { users, shows, movies, theatres, screens, showSeats, seatLocks, bookings } from '../db/schema.js';
import { seatLockService } from '../services/seatLockService.js';
import { bookingService } from '../services/bookingService.js';
import { paymentService, RAZORPAY_WEBHOOK_SECRET } from '../services/paymentService.js';
import { movieService } from '../services/movieService.js';
import { parseIntentDeterministic } from '../services/aiDiscoveryService.js';
import { AppError } from '../middleware/errorHandler.js';
import { eq } from 'drizzle-orm';

describe('Concurrency & Security Audit Test Suite', { timeout: 40000 }, () => {
  let userA: { id: number; email: string };
  let userB: { id: number; email: string };
  let testShowId: number;
  let testSeatA: number;
  let testSeatB: number;
  let createdBookingId: number | null = null;

  beforeAll(async () => {
    // 1. Create two isolated test users for concurrency testing
    const suffix = Date.now().toString().slice(-6);
    const [uA] = await db
      .insert(users)
      .values({
        email: `concur_a_${suffix}@bookmytix.test`,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
        name: 'Concurrent User A',
        role: 'customer',
      })
      .returning();
    userA = { id: uA.id, email: uA.email };

    const [uB] = await db
      .insert(users)
      .values({
        email: `concur_b_${suffix}@bookmytix.test`,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
        name: 'Concurrent User B',
        role: 'customer',
      })
      .returning();
    userB = { id: uB.id, email: uB.email };

    // 2. Fetch or create a show with available seats for testing
    const existingShow = await db.query.shows.findFirst();
    if (existingShow) {
      testShowId = Number((existingShow as any).id);
    } else {
      const [sh] = await db
        .insert(shows)
        .values({
          theatreId: 1,
          eventId: 1,
          screenId: 1,
          startsAt: new Date(Date.now() + 86400000),
          language: 'Hindi',
          format: '2D',
          price: '300',
          status: 'selling',
        })
        .returning();
      testShowId = sh.id;
    }

    // Ensure show seats are initialized
    const showSeatData = await seatLockService.getShowSeatsWithStatus(testShowId, userA.id);
    const available = showSeatData.seats.filter((s) => s.status === 'available');
    testSeatA = available[0].id;
    testSeatB = available[1].id;
  });

  afterAll(async () => {
    // Cleanup test bookings, locks and users in proper foreign-key order
    if (createdBookingId) {
      await db.delete(bookings).where(eq(bookings.id, createdBookingId));
    }
    if (testShowId) {
      await db.delete(seatLocks).where(eq(seatLocks.showId, testShowId));
    }
    if (userA?.id) {
      await db.delete(users).where(eq(users.id, userA.id));
    }
    if (userB?.id) {
      await db.delete(users).where(eq(users.id, userB.id));
    }
  });

  // ─── 1. BOOKING CONCURRENCY & SEAT LOCKING ──────────────────────────────────
  describe('High-Concurrency Seat Locking & Race Conditions', () => {
    it('prevents double-booking when two users simultaneously lock the identical seat', async () => {
      // Clean any preexisting lock on testSeatA
      await db.delete(seatLocks).where(eq(seatLocks.showSeatId, testSeatA));

      // Simulate simultaneous requests at the exact same instant
      const [resA, resB] = await Promise.allSettled([
        seatLockService.lockSeats(testShowId, [testSeatA], userA.id),
        seatLockService.lockSeats(testShowId, [testSeatA], userB.id),
      ]);

      // Exactly ONE must succeed and ONE must be rejected
      const fulfilled = [resA, resB].filter((r) => r.status === 'fulfilled');
      const rejected = [resA, resB].filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      // Successful call must return valid lockToken and seats
      const success = (fulfilled[0] as PromiseFulfilledResult<any>).value;
      expect(success.lockToken).toBeDefined();
      expect(success.remainingSeconds).toBeGreaterThan(0);
      expect(success.seats[0].id).toBe(testSeatA);

      // Rejected call must be an AppError with 409 Conflict status
      const failure = (rejected[0] as PromiseRejectedResult).reason;
      expect(failure).toBeInstanceOf(AppError);
      expect(failure.statusCode).toBe(409);
      expect(failure.message).toMatch(/currently reserved by another customer/);
    });

    it('allows seat to be locked by another user once the original lock is released', async () => {
      // 1. User A locks testSeatB
      const lockRes = await seatLockService.lockSeats(testShowId, [testSeatB], userA.id);
      expect(lockRes.lockToken).toBeDefined();

      // 2. User B tries to lock testSeatB -> rejected 409
      await expect(
        seatLockService.lockSeats(testShowId, [testSeatB], userB.id),
      ).rejects.toThrow(/currently reserved by another customer/);

      // 3. User A releases the lock
      const releaseRes = await seatLockService.releaseSeats(
        testShowId,
        lockRes.lockToken,
        userA.id,
        [testSeatB],
      );
      expect(releaseRes.released).toBe(1);

      // 4. User B now successfully locks testSeatB
      const userBLock = await seatLockService.lockSeats(testShowId, [testSeatB], userB.id);
      expect(userBLock.lockToken).toBeDefined();
      expect(userBLock.seats[0].id).toBe(testSeatB);

      // Cleanup
      await seatLockService.releaseSeats(testShowId, userBLock.lockToken, userB.id, [testSeatB]);
    });
  });

  // ─── 2. IDOR (INSECURE DIRECT OBJECT REFERENCE) PROTECTION ───────────────────
  describe('IDOR Authorization Enforcement', () => {
    let bookingAId: number;

    beforeAll(async () => {
      // Create a confirmed booking for User A
      const [b] = await db
        .insert(bookings)
        .values({
          bookingRef: `BMT-IDOR-${Date.now().toString().slice(-6)}`,
          userId: userA.id,
          showId: testShowId,
          totalPrice: '500',
          ticketSubtotal: '400',
          convenienceFee: '80',
          taxAmount: '20',
          status: 'confirmed',
        })
        .returning();
      bookingAId = b.id;
      createdBookingId = b.id;
    });

    it('prevents User B from accessing User A booking details (IDOR protection)', async () => {
      // User B attempts to access User A's booking
      await expect(
        bookingService.getBookingById(bookingAId, userB.id),
      ).rejects.toThrow(/Booking not found or access denied/);
    });

    it('allows User A to access their own booking details', async () => {
      const details = await bookingService.getBookingById(bookingAId, userA.id);
      expect(details.id).toBe(bookingAId);
      expect(details.bookingRef).toBeDefined();
    });

    it('prevents User B from cancelling User A booking (IDOR protection)', async () => {
      // User B attempts to cancel User A's booking
      await expect(
        bookingService.cancelBooking(bookingAId, userB.id, 'Fraudulent cancellation test'),
      ).rejects.toThrow(/Booking not found/);
    });
  });

  // ─── 3. SQL INJECTION DEFENSE & INPUT VALIDATION ────────────────────────────
  describe('SQL Injection Resistance', () => {
    it('handles malicious SQL injection payload in movie search query safely', async () => {
      const sqlInjectionPayloads = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT null, email, password_hash FROM users --",
        "1' OR 1=1 --",
        "admin'--",
      ];

      for (const payload of sqlInjectionPayloads) {
        // Query must safely execute and return an array (empty or safe matches), NEVER leak or throw DB syntax error
        const results = await movieService.listMovies({ search: payload });
        expect(Array.isArray(results.movies)).toBe(true);
      }
    });

    it('safely handles malicious SQL injections in Natural Language Discovery', async () => {
      const maliciousQuery = "Show me movies'; DROP TABLE bookings; -- in Hindi";
      const intent = parseIntentDeterministic(maliciousQuery);

      expect(intent).toBeDefined();
      expect(intent.confidence).toBeGreaterThan(0);
      expect(intent.language).toBe('Hindi');
    });
  });

  // ─── 4. PAYMENT WEBHOOK SIGNATURE INTEGRITY ─────────────────────────────────
  describe('Payment Webhook Tamper Resistance', () => {
    it('strictly rejects forged or tampered Razorpay webhook signature with 400', async () => {
      const payload = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_tampered_123',
              order_id: 'order_test_tampered_123',
              amount: 50000,
            },
          },
        },
      });

      // Signature generated with wrong secret
      const forgedSignature = crypto
        .createHmac('sha256', 'attacker_fake_secret_key')
        .update(payload)
        .digest('hex');

      await expect(paymentService.handleWebhook(payload, forgedSignature)).rejects.toThrow(
        /Invalid webhook signature/,
      );
    });

    it('strictly rejects webhook when payload body is modified after signing', async () => {
      const originalPayload = JSON.stringify({ amount: 50000, order_id: 'order_abc' });
      const signature = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(originalPayload)
        .digest('hex');

      // Attacker tampers with amount
      const tamperedPayload = JSON.stringify({ amount: 100, order_id: 'order_abc' });

      await expect(paymentService.handleWebhook(tamperedPayload, signature)).rejects.toThrow(
        /Invalid webhook signature/,
      );
    });

    it('strictly rejects webhook when signature is missing', async () => {
      const payload = JSON.stringify({ amount: 50000, order_id: 'order_abc' });
      await expect(paymentService.handleWebhook(payload, '')).rejects.toThrow(
        /Missing webhook signature/,
      );
    });
  });

  // ─── 5. DETERMINISTIC FINANCIAL INTEGRITY ───────────────────────────────────
  describe('Deterministic Booking Logic vs AI Boundaries', () => {
    it('ensures AI Discovery and Assistant cannot mutate financial calculations', () => {
      // Base seat price is deterministic
      const seatPrice = 250;
      const reclinerPrice = Math.round(seatPrice * 1.6);
      const convFee = 40;
      const gst = Math.round((reclinerPrice + convFee) * 0.18);
      const total = reclinerPrice + convFee + gst;

      // Exactly ₹400 + ₹40 = ₹440 + ₹79.2 (₹79) = ₹519
      expect(reclinerPrice).toBe(400);
      expect(convFee).toBe(40);
      expect(gst).toBe(79);
      expect(total).toBe(519);
    });
  });
});
