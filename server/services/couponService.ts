import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { coupons, bookings } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  couponId: number;
  discountType: 'percentage' | 'fixed';
  discountAmount: number;
  description: string;
  finalAmount: number;
}

const DEFAULT_COUPONS = [
  {
    code: 'WELCOME50',
    description: 'Flat ₹50 OFF on your first cinema ticket booking (Min order ₹200)',
    discountType: 'fixed',
    discountAmount: '50.00',
    discountPercent: 0,
    maxDiscount: '50.00',
    minAmount: '200.00',
    usageLimit: 10000,
    usedCount: 0,
    perUserLimit: 1,
    validFrom: new Date('2024-01-01'),
    validUntil: new Date('2030-12-31'),
    isActive: true,
  },
  {
    code: 'BMT20',
    description: 'Get 20% instant discount up to ₹120 on all movie bookings (Min order ₹300)',
    discountType: 'percentage',
    discountAmount: '0.00',
    discountPercent: 20,
    maxDiscount: '120.00',
    minAmount: '300.00',
    usageLimit: 5000,
    usedCount: 0,
    perUserLimit: 3,
    validFrom: new Date('2024-01-01'),
    validUntil: new Date('2030-12-31'),
    isActive: true,
  },
  {
    code: 'MOVIEBUFF100',
    description: 'Save flat ₹100 on blockbuster orders over ₹600',
    discountType: 'fixed',
    discountAmount: '100.00',
    discountPercent: 0,
    maxDiscount: '100.00',
    minAmount: '600.00',
    usageLimit: 2500,
    usedCount: 0,
    perUserLimit: 2,
    validFrom: new Date('2024-01-01'),
    validUntil: new Date('2030-12-31'),
    isActive: true,
  },
];

export const couponService = {
  /**
   * Auto-seed promotional coupons if missing.
   */
  async ensureSeedCoupons() {
    try {
      for (const c of DEFAULT_COUPONS) {
        const existing = await db.query.coupons.findFirst({
          where: eq(coupons.code, c.code),
        });
        if (!existing) {
          await db.insert(coupons).values(c);
        }
      }
    } catch (err) {
      logger.warn('Failed to auto-seed coupons', err);
    }
  },

  /**
   * List available public coupons.
   */
  async listActiveCoupons() {
    await this.ensureSeedCoupons();
    const now = new Date();
    const list = await db
      .select({
        id: coupons.id,
        code: coupons.code,
        description: coupons.description,
        discountType: coupons.discountType,
        discountPercent: coupons.discountPercent,
        discountAmount: coupons.discountAmount,
        maxDiscount: coupons.maxDiscount,
        minAmount: coupons.minAmount,
        validUntil: coupons.validUntil,
      })
      .from(coupons)
      .where(and(eq(coupons.isActive, true), sql`${coupons.validUntil} > ${now}`));

    return list.map((c) => ({
      ...c,
      discountAmount: Number(c.discountAmount),
      maxDiscount: Number(c.maxDiscount),
      minAmount: Number(c.minAmount),
    }));
  },

  /**
   * Server-side coupon verification with eligibility, bounds, and user quota checks.
   */
  async validateCoupon(
    rawCode: string,
    orderAmount: number,
    userId?: number,
  ): Promise<CouponValidationResult> {
    await this.ensureSeedCoupons();

    if (!rawCode || !rawCode.trim()) {
      throw new AppError('Coupon code is required', 400);
    }

    const code = rawCode.trim().toUpperCase();
    const coupon = await db.query.coupons.findFirst({
      where: eq(coupons.code, code),
    });

    if (!coupon || !coupon.isActive) {
      throw new AppError(`Coupon code "${code}" is invalid or inactive`, 404);
    }

    const now = new Date();
    if (new Date(coupon.validFrom) > now) {
      throw new AppError(`Coupon "${code}" is not yet active`, 400);
    }
    if (new Date(coupon.validUntil) < now) {
      throw new AppError(`Coupon "${code}" has expired on ${new Date(coupon.validUntil).toLocaleDateString()}`, 400);
    }

    const minAmount = Number(coupon.minAmount);
    if (orderAmount < minAmount) {
      throw new AppError(
        `Order amount must be at least ₹${minAmount} to apply coupon "${code}". Current order: ₹${orderAmount}`,
        400,
      );
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      throw new AppError(`Coupon "${code}" has reached its maximum global redemption limit`, 400);
    }

    // Per-user quota check
    if (userId && coupon.perUserLimit > 0) {
      const userUsage = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(bookings)
        .where(
          and(
            eq(bookings.userId, userId),
            eq(bookings.couponId, coupon.id),
            eq(bookings.status, 'confirmed'),
          ),
        );

      const usageCount = userUsage[0]?.count || 0;
      if (usageCount >= coupon.perUserLimit) {
        throw new AppError(
          `You have reached the maximum redemption limit (${coupon.perUserLimit} times) for coupon "${code}"`,
          400,
        );
      }
    }

    // Calculate discount strictly on server
    let discount: number;
    if (coupon.discountType === 'percentage') {
      const calculated = Math.round((orderAmount * coupon.discountPercent) / 100);
      const maxCap = Number(coupon.maxDiscount);
      discount = maxCap > 0 ? Math.min(calculated, maxCap) : calculated;
    } else {
      discount = Math.min(Number(coupon.discountAmount), orderAmount);
    }

    discount = Math.min(discount, orderAmount);
    const finalAmount = Math.max(0, Math.round((orderAmount - discount) * 100) / 100);

    return {
      valid: true,
      code: coupon.code,
      couponId: coupon.id,
      discountType: coupon.discountType as 'percentage' | 'fixed',
      discountAmount: discount,
      description: coupon.description,
      finalAmount,
    };
  },
};
