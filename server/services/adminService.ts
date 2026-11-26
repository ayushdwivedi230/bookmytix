import { sql, desc, eq, and, or, ilike } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  events,
  theatres,
  bookings,
  users,
  payments,
  coupons,
  foodItems,
  tickets,
  showSeats,
  shows,
  movies,
} from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { auditLogService } from './auditLogService.js';
import type { AuthUser } from '../middleware/auth.js';

export const adminService = {
  // ─── Legacy Stats ──────────────────────────────────────────────────────────
  async getStats(): Promise<{ events: number; bookings: number; revenue: number }> {
    const [eventCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(events);
    const [bookingCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(bookings);
    const [revenueResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(total_price), 0)` })
      .from(bookings);

    return {
      events: eventCount.count,
      bookings: bookingCount.count,
      revenue: Number(revenueResult.total),
    };
  },

  async getAllEvents() {
    const allEvents = await db.select().from(events).orderBy(events.id);
    return allEvents.map((e) => ({ ...e, price: Number(e.basePrice) }));
  },

  async getAllTheatres() {
    return db.select().from(theatres).orderBy(theatres.id);
  },

  // ─── Bookings Management ───────────────────────────────────────────────────
  async listBookings(params?: { search?: string; status?: string; limit?: number }) {
    const limit = Math.min(params?.limit || 50, 100);
    const conditions = [];

    if (params?.status && params.status !== 'All') {
      conditions.push(eq(bookings.status, params.status as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db
      .select({
        id: bookings.id,
        bookingRef: bookings.bookingRef,
        userId: bookings.userId,
        userName: users.name,
        userEmail: users.email,
        showId: bookings.showId,
        movieTitle: movies.title,
        theatreName: theatres.name,
        theatreCity: theatres.city,
        startsAt: shows.startsAt,
        totalPrice: bookings.totalPrice,
        status: bookings.status,
        cancellationReason: bookings.cancellationReason,
        refundAmount: bookings.refundAmount,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .innerJoin(users, eq(users.id, bookings.userId))
      .innerJoin(shows, eq(shows.id, bookings.showId))
      .leftJoin(movies, eq(movies.id, shows.movieId))
      .innerJoin(theatres, eq(theatres.id, shows.theatreId))
      .where(whereClause)
      .orderBy(desc(bookings.createdAt))
      .limit(limit);

    return list.map((b) => ({
      ...b,
      movieTitle: b.movieTitle || 'Theatrical Showcase',
      totalPrice: Number(b.totalPrice),
      refundAmount: b.refundAmount ? Number(b.refundAmount) : null,
      startsAt: b.startsAt.toISOString(),
      createdAt: b.createdAt.toISOString(),
    }));
  },

  async getBookingDetails(bookingId: number) {
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
      with: {
        user: true,
        show: {
          with: {
            movie: true,
            theatre: true,
            screen: true,
          },
        },
        tickets: {
          with: {
            showSeat: true,
          },
        },
        payments: true,
        foodItems: {
          with: {
            foodItem: true,
          },
        },
      },
    });

    if (!booking) {
      throw new AppError('Booking record not found', 404);
    }

    return booking;
  },

  async cancelAndRefundBooking(bookingId: number, actor: AuthUser, reason: string) {
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
    });

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    if (booking.status === 'cancelled' || booking.status === 'refunded') {
      throw new AppError('Booking is already cancelled or refunded', 400);
    }

    const refundAmount = booking.totalPrice;

    // Update booking status
    await db
      .update(bookings)
      .set({
        status: 'refunded',
        cancellationReason: reason || 'Administrative cancellation & refund',
        cancelledAt: new Date(),
        refundAmount: String(refundAmount),
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));

    // Release show seats
    await db
      .update(showSeats)
      .set({ status: 'available', bookingId: null })
      .where(eq(showSeats.bookingId, bookingId));

    // Update payment record
    await db
      .update(payments)
      .set({
        status: 'refunded',
        refundAmount: String(refundAmount),
        refundId: `REF-${Date.now()}`,
        updatedAt: new Date(),
      })
      .where(eq(payments.bookingId, bookingId));

    // Audit log
    await auditLogService.log({
      userId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'booking.refunded',
      resourceType: 'booking',
      resourceId: String(bookingId),
      details: {
        bookingRef: booking.bookingRef,
        refundAmount,
        reason,
      },
    });

    return { message: 'Booking successfully cancelled and refund initiated' };
  },

  // ─── Users & RBAC Management ───────────────────────────────────────────────
  async listUsers(search?: string, roleFilter?: string) {
    const conditions = [];

    if (roleFilter && roleFilter !== 'All') {
      conditions.push(eq(users.role, roleFilter as any));
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(or(ilike(users.name, q), ilike(users.email, q)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        phone: users.phone,
        preferredCity: users.preferredCity,
        isEmailVerified: users.isEmailVerified,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(100);

    return list.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    }));
  },

  async updateUserRole(userId: number, newRole: string, actor: AuthUser) {
    const validRoles = ['customer', 'admin', 'cinema_manager', 'user'];
    if (!validRoles.includes(newRole.toLowerCase())) {
      throw new AppError('Invalid user role specified', 400);
    }

    const targetUser = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!targetUser) throw new AppError('User not found', 404);

    if (targetUser.id === actor.id) {
      throw new AppError('Administrators cannot modify their own role', 400);
    }

    const roleToSet = newRole.toLowerCase() === 'customer' ? 'user' : newRole.toLowerCase();

    await db
      .update(users)
      .set({ role: roleToSet as any, updatedAt: new Date() })
      .where(eq(users.id, userId));

    await auditLogService.log({
      userId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'user.role_changed',
      resourceType: 'user',
      resourceId: String(userId),
      details: {
        targetEmail: targetUser.email,
        oldRole: targetUser.role,
        newRole,
      },
    });

    return { message: `User role updated to ${newRole}` };
  },

  async toggleUserStatus(userId: number, actor: AuthUser) {
    const targetUser = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!targetUser) throw new AppError('User not found', 404);

    if (targetUser.id === actor.id) {
      throw new AppError('Administrators cannot deactivate their own account', 400);
    }

    const newStatus = !targetUser.isActive;

    await db
      .update(users)
      .set({ isActive: newStatus, updatedAt: new Date() })
      .where(eq(users.id, userId));

    await auditLogService.log({
      userId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: newStatus ? 'user.activated' : 'user.deactivated',
      resourceType: 'user',
      resourceId: String(userId),
      details: {
        targetEmail: targetUser.email,
        isActive: newStatus,
      },
    });

    return { message: `User account has been ${newStatus ? 'activated' : 'deactivated'}` };
  },

  // ─── Coupons Management ────────────────────────────────────────────────────
  async listCoupons() {
    return db.select().from(coupons).orderBy(desc(coupons.createdAt));
  },

  async createCoupon(
    data: {
      code: string;
      description?: string;
      discountType: 'percentage' | 'fixed';
      discountPercent?: number;
      discountAmount?: number;
      maxDiscount?: number;
      minAmount?: number;
      usageLimit?: number;
      validUntil: string;
    },
    actor: AuthUser,
  ) {
    const [coupon] = await db
      .insert(coupons)
      .values({
        code: data.code.trim().toUpperCase(),
        description: data.description?.trim() || '',
        discountType: data.discountType,
        discountPercent: data.discountPercent || 0,
        discountAmount: String(data.discountAmount || 0),
        maxDiscount: String(data.maxDiscount || 0),
        minAmount: String(data.minAmount || 0),
        usageLimit: data.usageLimit || 500,
        validUntil: new Date(data.validUntil),
        isActive: true,
      })
      .returning();

    await auditLogService.log({
      userId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'coupon.created',
      resourceType: 'coupon',
      resourceId: String(coupon.id),
      details: { code: coupon.code, discountType: coupon.discountType },
    });

    return coupon;
  },

  async toggleCoupon(id: number, actor: AuthUser) {
    const existing = await db.query.coupons.findFirst({ where: eq(coupons.id, id) });
    if (!existing) throw new AppError('Coupon not found', 404);

    const [updated] = await db
      .update(coupons)
      .set({ isActive: !existing.isActive })
      .where(eq(coupons.id, id))
      .returning();

    await auditLogService.log({
      userId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: updated.isActive ? 'coupon.activated' : 'coupon.deactivated',
      resourceType: 'coupon',
      resourceId: String(id),
      details: { code: existing.code, isActive: updated.isActive },
    });

    return updated;
  },

  // ─── Food Catalog Management ───────────────────────────────────────────────
  async listFood() {
    return db.select().from(foodItems).orderBy(foodItems.category, foodItems.name);
  },

  async createFood(
    data: {
      name: string;
      description?: string;
      price: number;
      category: string;
      imageUrl?: string;
    },
    actor: AuthUser,
  ) {
    const [food] = await db
      .insert(foodItems)
      .values({
        name: data.name.trim(),
        description: data.description?.trim() || '',
        price: String(data.price),
        category: data.category || 'Snacks',
        imageUrl: data.imageUrl || '',
        isAvailable: true,
      })
      .returning();

    await auditLogService.log({
      userId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'food.created',
      resourceType: 'food_item',
      resourceId: String(food.id),
      details: { name: food.name, price: food.price },
    });

    return food;
  },

  async toggleFood(id: number, actor: AuthUser) {
    const existing = await db.query.foodItems.findFirst({ where: eq(foodItems.id, id) });
    if (!existing) throw new AppError('Food item not found', 404);

    const [updated] = await db
      .update(foodItems)
      .set({ isAvailable: !existing.isAvailable })
      .where(eq(foodItems.id, id))
      .returning();

    await auditLogService.log({
      userId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: updated.isAvailable ? 'food.available' : 'food.unavailable',
      resourceType: 'food_item',
      resourceId: String(id),
      details: { name: existing.name, isAvailable: updated.isAvailable },
    });

    return updated;
  },

  // ─── Refunds Log ───────────────────────────────────────────────────────────
  async listRefunds() {
    return db
      .select({
        id: payments.id,
        bookingId: payments.bookingId,
        bookingRef: bookings.bookingRef,
        userId: payments.userId,
        userName: users.name,
        userEmail: users.email,
        refundAmount: payments.refundAmount,
        refundId: payments.refundId,
        createdAt: payments.updatedAt,
      })
      .from(payments)
      .innerJoin(bookings, eq(bookings.id, payments.bookingId))
      .innerJoin(users, eq(users.id, payments.userId))
      .where(eq(payments.status, 'refunded'))
      .orderBy(desc(payments.updatedAt));
  },
};
