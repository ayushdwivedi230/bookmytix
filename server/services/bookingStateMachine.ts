import { AppError } from '../middleware/errorHandler.js';

export type BookingStatus =
  | 'pending'
  | 'payment_pending'
  | 'confirmed'
  | 'failed'
  | 'cancelled'
  | 'refund_pending'
  | 'refunded'
  | 'expired';

/**
 * Permitted transitions between booking lifecycle states.
 * Strictly prevents invalid transitions (e.g. FAILED -> CONFIRMED, or CANCELLED -> CONFIRMED).
 */
export const PERMITTED_BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['payment_pending', 'failed', 'expired', 'cancelled'],
  payment_pending: ['confirmed', 'failed', 'expired', 'cancelled'],
  confirmed: ['refund_pending', 'cancelled'],
  refund_pending: ['refunded', 'cancelled'],
  failed: [],
  cancelled: [],
  refunded: [],
  expired: [],
};

export const bookingStateMachine = {
  /**
   * Validate whether a transition from currentStatus to nextStatus is allowed.
   */
  canTransition(currentStatus: BookingStatus, nextStatus: BookingStatus): boolean {
    if (currentStatus === nextStatus) return true; // idempotent
    const allowed = PERMITTED_BOOKING_TRANSITIONS[currentStatus] || [];
    return allowed.includes(nextStatus);
  },

  /**
   * Asserts transition validity, throwing an AppError 400 if invalid.
   */
  assertTransition(currentStatus: BookingStatus, nextStatus: BookingStatus): void {
    if (!this.canTransition(currentStatus, nextStatus)) {
      throw new AppError(
        `Invalid booking state transition: cannot transition from "${currentStatus.toUpperCase()}" to "${nextStatus.toUpperCase()}"`,
        400,
      );
    }
  },
};
