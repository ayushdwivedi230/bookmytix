import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { shows, showSeats, movies, events, theatres, screens } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { DEFAULT_LAYOUT } from './screenService.js';
import { CONVENIENCE_FEE_PER_SEAT, GST_RATE } from './seatLockService.js';
import { foodService, SelectedFoodItem, ValidatedFoodLineItem } from './foodService.js';
import { couponService, CouponValidationResult } from './couponService.js';

export interface OrderSummaryRequest {
  showId: number;
  seatIds: number[];
  foodItems?: SelectedFoodItem[];
  couponCode?: string;
  userId?: number;
}

export interface OrderSummaryResponse {
  show: {
    id: number;
    title: string;
    poster: string;
    theatre: string;
    screen: string;
    startsAt: Date;
    formattedDate: string;
    formattedTime: string;
    language: string;
    format: string;
  };
  seats: Array<{
    id: number;
    seatNumber: string;
    row: string;
    category: string;
    price: number;
  }>;
  foodItems: ValidatedFoodLineItem[];
  pricing: {
    ticketSubtotal: number;
    convenienceFee: number;
    taxAmount: number;
    foodTotal: number;
    discountAmount: number;
    finalPayable: number;
    currency: string;
  };
  coupon?: {
    code: string;
    description: string;
    discountAmount: number;
  };
}

export const checkoutService = {
  /**
   * Complete, server-calculated order summary and price verification.
   * Every number is derived strictly from backend records and math rules.
   */
  async calculateSummary(params: OrderSummaryRequest): Promise<OrderSummaryResponse> {
    const { showId, seatIds, foodItems: rawFood, couponCode, userId } = params;

    if (!seatIds || seatIds.length === 0) {
      throw new AppError('At least one seat must be selected', 400);
    }
    if (seatIds.length > 10) {
      throw new AppError('Cannot book more than 10 seats at once', 400);
    }

    // 1. Fetch Show and relations
    const show = await db.query.shows.findFirst({
      where: eq(shows.id, showId),
    });
    if (!show) {
      throw new AppError('Show not found', 404);
    }

    if (new Date(show.startsAt) < new Date()) {
      throw new AppError('Cannot book seats for a show that has already started', 400);
    }

    const [movie, event, theatre, screen] = await Promise.all([
      show.movieId ? db.query.movies.findFirst({ where: eq(movies.id, show.movieId) }) : null,
      show.eventId ? db.query.events.findFirst({ where: eq(events.id, show.eventId) }) : null,
      db.query.theatres.findFirst({ where: eq(theatres.id, show.theatreId) }),
      show.screenId ? db.query.screens.findFirst({ where: eq(screens.id, show.screenId) }) : null,
    ]);

    // 2. Resolve seat prices
    let multipliers = DEFAULT_LAYOUT.priceMultipliers;
    if (screen) {
      try {
        const parsed = JSON.parse(screen.seatLayout || '{}');
        if (parsed.priceMultipliers) multipliers = parsed.priceMultipliers;
      } catch {
        // default multipliers
      }
    }

    const basePrice = Number(show.price);
    const targetSeats = await db
      .select()
      .from(showSeats)
      .where(and(eq(showSeats.showId, showId), inArray(showSeats.id, seatIds)));

    if (targetSeats.length !== seatIds.length) {
      throw new AppError('One or more selected seats do not exist for this show', 404);
    }

    let ticketSubtotal = 0;
    const resolvedSeats = targetSeats.map((s) => {
      let seatPrice: number;
      if (s.price) {
        seatPrice = Number(s.price);
      } else {
        const cat = (s.category || 'standard').toLowerCase();
        const mult =
          cat === 'recliner'
            ? multipliers.recliner
            : cat === 'premium'
            ? multipliers.premium
            : multipliers.standard;
        seatPrice = Math.round(basePrice * mult);
      }
      ticketSubtotal += seatPrice;
      return {
        id: s.id,
        seatNumber: s.seatNumber,
        row: s.row || 'A',
        category: s.category || 'standard',
        price: seatPrice,
      };
    });

    // 3. Convenience fee and Tax calculation
    const convenienceFee = resolvedSeats.length * CONVENIENCE_FEE_PER_SEAT;
    // 18% GST applies to the convenience fee service charge
    const taxAmount = Math.round(convenienceFee * GST_RATE * 100) / 100;

    // 4. Food & Beverage add-ons calculation
    const { items: validatedFood, foodTotal } = await foodService.validateAndCalculateFood(rawFood);

    // 5. Pre-discount total
    const preDiscountTotal = ticketSubtotal + convenienceFee + taxAmount + foodTotal;

    // 6. Coupon discount calculation
    let discountAmount = 0;
    let couponResult: CouponValidationResult | undefined;
    if (couponCode && couponCode.trim()) {
      couponResult = await couponService.validateCoupon(couponCode, preDiscountTotal, userId);
      discountAmount = couponResult.discountAmount;
    }

    // 7. Final payable amount
    const finalPayable = Math.max(
      0,
      Math.round((preDiscountTotal - discountAmount) * 100) / 100,
    );

    const showDate = new Date(show.startsAt);
    return {
      show: {
        id: show.id,
        title: movie?.title || event?.title || 'Cinema Ticket',
        poster: movie?.poster || event?.image || '',
        theatre: theatre?.name || 'Multiplex Cinema',
        screen: screen?.name || 'Audi 1',
        startsAt: show.startsAt,
        formattedDate: showDate.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        formattedTime: showDate.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        language: show.language,
        format: show.format,
      },
      seats: resolvedSeats,
      foodItems: validatedFood,
      pricing: {
        ticketSubtotal,
        convenienceFee,
        taxAmount,
        foodTotal,
        discountAmount,
        finalPayable,
        currency: 'INR',
      },
      coupon: couponResult
        ? {
            code: couponResult.code,
            description: couponResult.description,
            discountAmount: couponResult.discountAmount,
          }
        : undefined,
    };
  },
};
