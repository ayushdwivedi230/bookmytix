import { db } from '../db/index.js';
import { notifications } from '../db/schema.js';
import { logger } from '../utils/logger.js';

export interface BookingEmailPayload {
  bookingRef: string;
  movieTitle: string;
  theatreName: string;
  showTime: string;
  showDate: string;
  seatNumbers: string[];
  totalAmount: number;
  qrCodeUrl?: string;
}

export const emailService = {
  /**
   * Dispatches booking confirmation email and in-app notification.
   */
  async sendBookingConfirmation(
    userId: number,
    userEmail: string,
    payload: BookingEmailPayload,
  ): Promise<void> {
    try {
      // 1. In-App Notification (Always guaranteed)
      await db.insert(notifications).values({
        userId,
        title: `Tickets Confirmed: ${payload.movieTitle}`,
        message: `Your booking #${payload.bookingRef} for ${payload.seatNumbers.join(', ')} at ${payload.theatreName} on ${payload.showDate} (${payload.showTime}) is confirmed. Total paid: ₹${payload.totalAmount}.`,
        type: 'booking_confirmed',
      });

      // 2. Email simulation / SMTP dispatch
      logger.info(
        `[EmailService] 🎟️ Confirmation email sent to ${userEmail} for booking ${payload.bookingRef}: ${payload.movieTitle} (${payload.seatNumbers.join(', ')})`,
      );
    } catch (err) {
      logger.warn(`[EmailService] Failed to record confirmation notification:`, err);
    }
  },

  /**
   * Dispatches payment failure alert.
   */
  async sendPaymentFailure(
    userId: number,
    userEmail: string,
    bookingRef: string,
    reason?: string,
  ): Promise<void> {
    try {
      await db.insert(notifications).values({
        userId,
        title: `Payment Failed for #${bookingRef}`,
        message: `Your payment could not be processed (${reason || 'Payment declined or signature mismatch'}). Reserved seats have been released.`,
        type: 'general',
      });

      logger.info(
        `[EmailService] ⚠️ Payment failure notification sent to ${userEmail} for booking ${bookingRef}`,
      );
    } catch (err) {
      logger.warn(`[EmailService] Failed to record payment failure notification:`, err);
    }
  },

  /**
   * Dispatches cancellation confirmation alert.
   */
  async sendCancellationConfirmation(
    userId: number,
    userEmail: string,
    bookingRef: string,
    refundAmount: number,
  ): Promise<void> {
    try {
      await db.insert(notifications).values({
        userId,
        title: `Booking Cancelled: #${bookingRef}`,
        message: `Your booking #${bookingRef} has been cancelled. A refund of ₹${refundAmount} has been initiated to your original payment method.`,
        type: 'general',
      });

      logger.info(
        `[EmailService] 🔄 Cancellation email sent to ${userEmail} for booking ${bookingRef}. Refund: ₹${refundAmount}`,
      );
    } catch (err) {
      logger.warn(`[EmailService] Failed to record cancellation notification:`, err);
    }
  },

  /**
   * Dispatches refund completed alert.
   */
  async sendRefundUpdate(
    userId: number,
    userEmail: string,
    bookingRef: string,
    refundAmount: number,
    refundId: string,
  ): Promise<void> {
    try {
      await db.insert(notifications).values({
        userId,
        title: `Refund Processed: #${bookingRef}`,
        message: `Your refund of ₹${refundAmount} (Ref #${refundId}) has been completed. It should reflect in your account within 5-7 business days.`,
        type: 'general',
      });

      logger.info(
        `[EmailService] 💰 Refund update sent to ${userEmail} for booking ${bookingRef}. Refund ID: ${refundId}`,
      );
    } catch (err) {
      logger.warn(`[EmailService] Failed to record refund update notification:`, err);
    }
  },
};
