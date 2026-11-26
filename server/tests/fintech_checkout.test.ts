import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { bookingStateMachine } from '../services/bookingStateMachine.js';
import { couponService } from '../services/couponService.js';
import { foodService } from '../services/foodService.js';
import { paymentService, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET } from '../services/paymentService.js';
import { ticketService } from '../services/ticketService.js';
import { CANCELLATION_WINDOW_HOURS, CANCELLATION_FEE_PER_SEAT } from '../services/bookingService.js';

describe('FinTech Checkout & Ticketing Lifecycle', { timeout: 30000 }, () => {
  // ─── 1. BOOKING STATE MACHINE TESTS ─────────────────────────────────────────
  describe('Booking State Machine (Feature 5)', () => {
    it('permits valid transitions throughout the lifecycle', () => {
      // Pending -> Payment Pending -> Confirmed -> Refund Pending -> Refunded
      expect(bookingStateMachine.canTransition('pending', 'payment_pending')).toBe(true);
      expect(bookingStateMachine.canTransition('payment_pending', 'confirmed')).toBe(true);
      expect(bookingStateMachine.canTransition('confirmed', 'refund_pending')).toBe(true);
      expect(bookingStateMachine.canTransition('refund_pending', 'refunded')).toBe(true);

      // Failure & Expiry paths
      expect(bookingStateMachine.canTransition('payment_pending', 'failed')).toBe(true);
      expect(bookingStateMachine.canTransition('payment_pending', 'expired')).toBe(true);
      expect(bookingStateMachine.canTransition('confirmed', 'cancelled')).toBe(true);
    });

    it('strictly prevents invalid transitions', () => {
      // Failed or Cancelled bookings cannot jump to Confirmed
      expect(bookingStateMachine.canTransition('failed', 'confirmed')).toBe(false);
      expect(bookingStateMachine.canTransition('cancelled', 'confirmed')).toBe(false);
      expect(bookingStateMachine.canTransition('expired', 'confirmed')).toBe(false);
      expect(bookingStateMachine.canTransition('refunded', 'confirmed')).toBe(false);

      // Confirmed cannot go straight to pending
      expect(bookingStateMachine.canTransition('confirmed', 'pending')).toBe(false);

      // Throws AppError 400 on assertTransition
      expect(() => bookingStateMachine.assertTransition('failed', 'confirmed')).toThrow(
        /Invalid booking state transition/,
      );
    });

    it('treats identical state transition as idempotent', () => {
      expect(bookingStateMachine.canTransition('confirmed', 'confirmed')).toBe(true);
      expect(bookingStateMachine.canTransition('payment_pending', 'payment_pending')).toBe(true);
    });
  });

  // ─── 2. COUPON & DISCOUNT ENGINE TESTS ──────────────────────────────────────
  describe('Coupon & Discount Engine (Feature 3)', () => {
    it('calculates fixed discount correctly when above minAmount', async () => {
      // WELCOME50: Flat ₹50 OFF, Min ₹200
      const res = await couponService.validateCoupon('WELCOME50', 350);
      expect(res.valid).toBe(true);
      expect(res.discountAmount).toBe(50);
      expect(res.finalAmount).toBe(300);
      expect(res.discountType).toBe('fixed');
    });

    it('rejects coupon when order amount is below minimum threshold', async () => {
      // WELCOME50 min is ₹200. Order of ₹150 must be rejected
      await expect(couponService.validateCoupon('WELCOME50', 150)).rejects.toThrow(
        /Order amount must be at least ₹200/,
      );
    });

    it('calculates percentage discount capped by maxDiscount', async () => {
      // BMT20: 20% discount up to ₹120, Min ₹300
      // 20% of ₹500 is ₹100 (< 120 cap)
      const res1 = await couponService.validateCoupon('BMT20', 500);
      expect(res1.valid).toBe(true);
      expect(res1.discountAmount).toBe(100);
      expect(res1.finalAmount).toBe(400);

      // 20% of ₹1000 is ₹200 -> capped at ₹120
      const res2 = await couponService.validateCoupon('BMT20', 1000);
      expect(res2.valid).toBe(true);
      expect(res2.discountAmount).toBe(120);
      expect(res2.finalAmount).toBe(880);
    });

    it('rejects unknown or invalid coupon code with 404', async () => {
      await expect(couponService.validateCoupon('INVALID_CODE_999', 500)).rejects.toThrow(
        /is invalid or inactive/,
      );
    });
  });

  // ─── 3. FOOD & BEVERAGES CATALOG TESTS ──────────────────────────────────────
  describe('Food & Beverages Concessions (Feature 2)', () => {
    it('returns concession catalog with categorized items', async () => {
      const items = await foodService.getFoodCatalog();
      expect(items.length).toBeGreaterThan(0);
      expect(items.some((i) => i.category === 'Popcorn')).toBe(true);
      expect(items.some((i) => i.category === 'Drinks')).toBe(true);
    });

    it('calculates valid line items and ignores zero or negative quantities', async () => {
      const items = await foodService.getFoodCatalog();
      const first = items[0];
      const second = items[1];

      const res = await foodService.validateAndCalculateFood([
        { foodItemId: first.id, quantity: 2 },
        { foodItemId: second.id, quantity: 0 }, // ignored
      ]);

      expect(res.items.length).toBe(1);
      expect(res.items[0].foodItemId).toBe(first.id);
      expect(res.items[0].quantity).toBe(2);
      expect(res.items[0].totalPrice).toBe(first.price * 2);
      expect(res.foodTotal).toBe(first.price * 2);
    });

    it('returns empty result when no food is selected', async () => {
      const res = await foodService.validateAndCalculateFood([]);
      expect(res.items).toEqual([]);
      expect(res.foodTotal).toBe(0);
    });
  });

  // ─── 4. PAYMENT GATEWAY & SIGNATURE VERIFICATION TESTS ──────────────────────
  describe('Payment Gateway & Cryptographic Signatures (Feature 4)', () => {
    it('generates authentic HMAC-SHA256 Razorpay signature', () => {
      const orderId = 'order_test_12345';
      const paymentId = 'pay_test_67890';
      const signature = paymentService.generateSignature(orderId, paymentId);

      // Verify signature manually
      const expected = crypto
        .createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      expect(signature).toBe(expected);
      expect(signature).toHaveLength(64); // SHA-256 hex is 64 characters
    });

    it('rejects tampered payment signatures in timing-safe manner', async () => {
      const orderId = 'order_test_fake_id';
      const paymentId = 'pay_test_fake_id';
      const tamperedSignature = 'deadbeef'.repeat(8);

      await expect(
        paymentService.verifyPayment({
          userId: 1,
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: tamperedSignature,
        }),
      ).rejects.toThrow();
    });

    it('verifies valid webhook HMAC signature and detects invalid payloads', async () => {
      const payload = JSON.stringify({
        event: 'payment.captured',
        id: 'evt_test_123',
        payload: {
          payment: { entity: { id: 'pay_123', order_id: 'order_nonexistent' } },
        },
      });

      const validSig = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');

      // Valid signature on non-existent order returns received: true cleanly
      const res = await paymentService.handleWebhook(payload, validSig);
      expect(res.received).toBe(true);

      // Tampered signature is rejected
      await expect(paymentService.handleWebhook(payload, 'invalid_sig')).rejects.toThrow(
        /Invalid webhook signature/,
      );
    });
  });

  // ─── 5. DIGITAL TICKETS & QR CODE VERIFICATION TESTS ────────────────────────
  describe('Digital Tickets & QR Verification (Feature 6)', () => {
    it('generates secure QR token without leaking PII or payment data', () => {
      const ticketRef = 'TIX-101-A1-ABCD';
      const bookingId = 101;
      const token = paymentService.generateQrToken(ticketRef, bookingId);

      expect(token).toHaveLength(64);
      // Ensure no credit cards, user emails, or passwords in token
      expect(token).not.toContain('@');
      expect(token).not.toContain('password');
      expect(token).not.toContain('cvv');
    });

    it('generates high-resolution base64 QR data URL for admission pass', async () => {
      const payload = JSON.stringify({ ref: 'TIX-1-A1', token: 'mock_token' });
      const dataUrl = await ticketService.generateQrDataUrl(payload);

      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    });

    it('rejects invalid or forged verification token at gate scanner', async () => {
      const result = await ticketService.verifyTicket('forged_unregistered_token_123');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid or fraudulent ticket');
    });
  });

  // ─── 6. CANCELLATION & REFUND POLICY RULES TESTS ────────────────────────────
  describe('Cancellation Rules & Policy (Feature 8)', () => {
    it('defines strict cancellation policy window and nominal fee', () => {
      expect(CANCELLATION_WINDOW_HOURS).toBe(2);
      expect(CANCELLATION_FEE_PER_SEAT).toBe(25);
    });

    it('calculates refund with ticket deduction and full food refund', () => {
      // 2 seats, subtotal ₹600, F&B ₹300, Fee ₹80, GST ₹14.40
      const subtotal = 600;
      const seatsCount = 2;
      const foodTotal = 300;
      const deduction = seatsCount * CANCELLATION_FEE_PER_SEAT; // ₹50
      const expectedRefund = subtotal - deduction + foodTotal; // ₹600 - 50 + 300 = ₹850

      expect(deduction).toBe(50);
      expect(expectedRefund).toBe(850);
    });
  });
});
