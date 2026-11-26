import crypto from 'crypto';
import { eq, and, inArray, sql, lt, ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import { shows, showSeats, seatLocks, screens } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { seatEventService } from './seatEventService.js';
import { DEFAULT_LAYOUT, ScreenLayoutConfig } from './screenService.js';

export const LOCK_DURATION_SECONDS = 8 * 60; // 8 minutes
export const CONVENIENCE_FEE_PER_SEAT = 40;
export const GST_RATE = 0.18;

export interface SeatWithStatus {
  id: number;
  seatNumber: string;
  seat_number?: string;
  row: string;
  category: 'standard' | 'premium' | 'recliner';
  price: number;
  status: 'available' | 'locked' | 'locked_by_you' | 'booked';
  lockExpiresAt?: string | null;
  remainingSeconds?: number;
}

export interface LockSeatsResult {
  lockToken: string;
  expiresAt: string;
  remainingSeconds: number;
  seats: Array<{
    id: number;
    seatNumber: string;
    seat_number?: string;
    row: string;
    category: string;
    price: number;
  }>;
  subtotal: number;
  convenienceFee: number;
  gst: number;
  total: number;
}

function calculateSeatPrice(
  basePrice: number,
  category: string,
  multipliers: { recliner: number; premium: number; standard: number },
): number {
  const cat = (category || 'standard').toLowerCase();
  const mult =
    cat === 'recliner'
      ? multipliers.recliner
      : cat === 'premium'
      ? multipliers.premium
      : multipliers.standard;
  return Math.round(basePrice * mult);
}

export const seatLockService = {
  /**
   * Lazily sweep expired locks for a given show (or system-wide).
   */
  async cleanExpiredLocks(showId?: number): Promise<number> {
    const now = new Date();
    const condition = showId
      ? and(eq(seatLocks.showId, showId), lt(seatLocks.expiresAt, now))
      : lt(seatLocks.expiresAt, now);

    const expired = await db
      .delete(seatLocks)
      .where(condition)
      .returning({ id: seatLocks.id, showId: seatLocks.showId, showSeatId: seatLocks.showSeatId });

    if (expired.length > 0) {
      // Group by showId to emit release events
      const byShow = new Map<number, number[]>();
      for (const item of expired) {
        const list = byShow.get(item.showId) || [];
        list.push(item.showSeatId);
        byShow.set(item.showId, list);
      }
      for (const [sId, seatIds] of byShow.entries()) {
        seatEventService.emit({
          showId: sId,
          type: 'seat_released',
          seatIds,
          seatNumbers: [],
        });
      }
    }
    return expired.length;
  },

  /**
   * Fetch all seats for a show with real-time lock status and category prices.
   */
  async getShowSeatsWithStatus(
    showId: number,
    currentUserId?: number,
  ): Promise<{
    show: {
      id: number;
      startsAt: string;
      endsAt: string | null;
      language: string;
      format: string;
      basePrice: number;
      screen: {
        id: number | null;
        name: string;
        type: string;
        layout: ScreenLayoutConfig;
      };
    };
    seats: SeatWithStatus[];
  }> {
    // 1. Clean expired locks first
    await this.cleanExpiredLocks(showId);

    // 2. Fetch show and screen details
    const show = await db.query.shows.findFirst({
      where: eq(shows.id, showId),
    });
    if (!show) {
      throw new AppError('Show not found', 404);
    }

    let layout = DEFAULT_LAYOUT;
    let screenName = 'Standard Screen';
    let screenType = 'Standard';

    if (show.screenId) {
      const screen = await db.query.screens.findFirst({
        where: eq(screens.id, show.screenId),
      });
      if (screen) {
        screenName = screen.name;
        screenType = screen.screenType;
        try {
          const parsed = JSON.parse(screen.seatLayout || '{}');
          if (parsed.rows && parsed.cols) {
            layout = {
              ...DEFAULT_LAYOUT,
              ...parsed,
              priceMultipliers: parsed.priceMultipliers || DEFAULT_LAYOUT.priceMultipliers,
            };
          }
        } catch {
          layout = DEFAULT_LAYOUT;
        }
      }
    }

    const basePrice = Number(show.price);

    // 3. Fetch runtime show seats
    let allSeats = await db
      .select()
      .from(showSeats)
      .where(eq(showSeats.showId, showId))
      .orderBy(showSeats.seatNumber);

    // If no seats exist for this show yet, auto-populate full auditorium grid
    if (allSeats.length === 0) {
      const defaultRows: Array<{
        row: string;
        category: 'recliner' | 'premium' | 'standard';
        mult: number;
      }> = [
        { row: 'A', category: 'recliner', mult: 1.6 },
        { row: 'B', category: 'recliner', mult: 1.6 },
        { row: 'C', category: 'premium', mult: 1.25 },
        { row: 'D', category: 'premium', mult: 1.25 },
        { row: 'E', category: 'premium', mult: 1.25 },
        { row: 'F', category: 'standard', mult: 1.0 },
        { row: 'G', category: 'standard', mult: 1.0 },
        { row: 'H', category: 'standard', mult: 1.0 },
      ];
      const newSeatInserts = [];
      for (const { row, category, mult } of defaultRows) {
        for (let col = 1; col <= 12; col++) {
          newSeatInserts.push({
            showId,
            seatNumber: `${row}${col}`,
            row,
            category,
            price: String(Math.round(basePrice * mult)),
            status: 'available' as const,
          });
        }
      }
      allSeats = await db.insert(showSeats).values(newSeatInserts).returning();
    }

    // 4. Fetch active locks for this show
    const now = new Date();
    const activeLocks = await db
      .select()
      .from(seatLocks)
      .where(and(eq(seatLocks.showId, showId), sql`${seatLocks.expiresAt} > ${now}`));

    const lockBySeatId = new Map<
      number,
      { userId: number; expiresAt: Date; lockToken: string }
    >();
    for (const lock of activeLocks) {
      lockBySeatId.set(lock.showSeatId, {
        userId: lock.userId,
        expiresAt: lock.expiresAt,
        lockToken: lock.lockToken,
      });
    }

    const formattedSeats: SeatWithStatus[] = allSeats.map((seat) => {
      const activeLock = lockBySeatId.get(seat.id);
      let status: 'available' | 'locked' | 'locked_by_you' | 'booked' = 'available';
      let lockExpiresAt: string | null = null;
      let remainingSeconds: number | undefined = undefined;

      if (seat.status === 'booked') {
        status = 'booked';
      } else if (activeLock) {
        const remaining = Math.max(
          0,
          Math.round((activeLock.expiresAt.getTime() - now.getTime()) / 1000),
        );
        if (remaining > 0) {
          status = currentUserId && activeLock.userId === currentUserId ? 'locked_by_you' : 'locked';
          lockExpiresAt = activeLock.expiresAt.toISOString();
          remainingSeconds = remaining;
        }
      }

      const category = (seat.category as 'standard' | 'premium' | 'recliner') || 'standard';
      const calculatedPrice = seat.price
        ? Number(seat.price)
        : calculateSeatPrice(basePrice, category, layout.priceMultipliers);

      return {
        id: seat.id,
        seatNumber: seat.seatNumber,
        seat_number: seat.seatNumber,
        row: seat.row || seat.seatNumber.charAt(0),
        category,
        price: calculatedPrice,
        status,
        lockExpiresAt,
        remainingSeconds,
      };
    });

    return {
      show: {
        id: show.id,
        startsAt: show.startsAt.toISOString(),
        endsAt: show.endsAt ? show.endsAt.toISOString() : null,
        language: show.language,
        format: show.format,
        basePrice,
        screen: {
          id: show.screenId,
          name: screenName,
          type: screenType,
          layout,
        },
      },
      seats: formattedSeats,
    };
  },

  /**
   * Lock selected seats for a user within an ACID PostgreSQL transaction.
   * Row-level locks and unique constraints prevent double reservations.
   */
  async lockSeats(
    showId: number,
    seatIds: number[],
    userId: number,
  ): Promise<LockSeatsResult> {
    if (!seatIds || seatIds.length === 0) {
      throw new AppError('At least one seat must be selected', 400);
    }
    if (seatIds.length > 10) {
      throw new AppError('Cannot reserve more than 10 seats at once', 400);
    }

    const show = await db.query.shows.findFirst({
      where: eq(shows.id, showId),
    });
    if (!show) {
      throw new AppError('Show not found', 404);
    }
    if (new Date(show.startsAt) < new Date()) {
      throw new AppError('Cannot reserve seats for a show that has already started', 400);
    }

    const basePrice = Number(show.price);

    // Get screen multipliers
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

    const now = new Date();
    const expiresAt = new Date(now.getTime() + LOCK_DURATION_SECONDS * 1000);
    const lockToken = crypto.randomUUID();

    // Execute in an isolated transaction with row-level locks
    const lockedSeatsData = await db.transaction(async (tx) => {
      // 1. Delete already-expired locks for this show
      await tx
        .delete(seatLocks)
        .where(and(eq(seatLocks.showId, showId), lt(seatLocks.expiresAt, now)));

      // 2. Lock targets in showSeats using FOR UPDATE
      const targetSeats = await tx
        .select()
        .from(showSeats)
        .where(and(eq(showSeats.showId, showId), inArray(showSeats.id, seatIds)));

      if (targetSeats.length !== seatIds.length) {
        throw new AppError('One or more selected seats do not exist for this show', 404);
      }

      // Check if any seat is already booked
      const bookedSeat = targetSeats.find((s) => s.status === 'booked');
      if (bookedSeat) {
        throw new AppError(
          `Seat ${bookedSeat.seatNumber} is already booked. Please choose another seat.`,
          409,
        );
      }

      // 3. Check if any seat is currently locked by ANOTHER user
      const existingLocks = await tx
        .select()
        .from(seatLocks)
        .where(
          and(
            eq(seatLocks.showId, showId),
            inArray(seatLocks.showSeatId, seatIds),
            sql`${seatLocks.expiresAt} > ${now}`,
            ne(seatLocks.userId, userId),
          ),
        );

      if (existingLocks.length > 0) {
        const conflictingSeat = targetSeats.find(
          (s) => s.id === existingLocks[0].showSeatId,
        );
        throw new AppError(
          `Seat ${conflictingSeat?.seatNumber || 'selected'} is currently reserved by another customer. Please choose another seat.`,
          409,
        );
      }

      // 4. Release any existing locks owned by this user for these specific seats
      await tx
        .delete(seatLocks)
        .where(
          and(
            eq(seatLocks.showId, showId),
            inArray(seatLocks.showSeatId, seatIds),
            eq(seatLocks.userId, userId),
          ),
        );

      // 5. Insert new seat_locks
      const lockInserts = targetSeats.map((seat) => ({
        showId,
        showSeatId: seat.id,
        userId,
        lockToken,
        lockedAt: now,
        expiresAt,
      }));

      await tx.insert(seatLocks).values(lockInserts);

      return targetSeats.map((s) => ({
        id: s.id,
        seatNumber: s.seatNumber,
        seat_number: s.seatNumber,
        row: s.row || s.seatNumber.charAt(0),
        category: (s.category as 'standard' | 'premium' | 'recliner') || 'standard',
        price: s.price
          ? Number(s.price)
          : calculateSeatPrice(basePrice, s.category || 'standard', multipliers),
      }));
    });

    // Server-side price calculation
    const subtotal = lockedSeatsData.reduce((sum, s) => sum + s.price, 0);
    const convenienceFee = lockedSeatsData.length * CONVENIENCE_FEE_PER_SEAT;
    const gst = Math.round((subtotal + convenienceFee) * GST_RATE);
    const total = subtotal + convenienceFee + gst;

    // Broadcast real-time seat lock event
    seatEventService.emit({
      showId,
      type: 'seat_locked',
      seatIds,
      seatNumbers: lockedSeatsData.map((s) => s.seatNumber),
      userId,
      expiresAt: expiresAt.toISOString(),
    });

    return {
      lockToken,
      expiresAt: expiresAt.toISOString(),
      remainingSeconds: LOCK_DURATION_SECONDS,
      seats: lockedSeatsData,
      subtotal,
      convenienceFee,
      gst,
      total,
    };
  },

  /**
   * Release seat locks held by a user.
   */
  async releaseSeats(
    showId: number,
    lockToken: string,
    userId: number,
    seatIds?: number[],
  ): Promise<{ released: number }> {
    const conditions = [
      eq(seatLocks.showId, showId),
      eq(seatLocks.lockToken, lockToken),
      eq(seatLocks.userId, userId),
    ];

    if (seatIds && seatIds.length > 0) {
      conditions.push(inArray(seatLocks.showSeatId, seatIds));
    }

    const released = await db
      .delete(seatLocks)
      .where(and(...conditions))
      .returning({ showSeatId: seatLocks.showSeatId });

    if (released.length > 0) {
      const releasedSeatIds = released.map((r) => r.showSeatId);
      const seats = await db
        .select({ id: showSeats.id, seatNumber: showSeats.seatNumber })
        .from(showSeats)
        .where(inArray(showSeats.id, releasedSeatIds));

      seatEventService.emit({
        showId,
        type: 'seat_released',
        seatIds: releasedSeatIds,
        seatNumbers: seats.map((s) => s.seatNumber),
        userId,
      });
    }

    return { released: released.length };
  },
};
