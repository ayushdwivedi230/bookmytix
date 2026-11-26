import { sql, desc, eq, and, gte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { bookings, payments, showSeats, shows, movies, theatres, coupons } from '../db/schema.js';

export interface AdminAnalyticsReport {
  overview: {
    totalBookings: number;
    totalRevenue: number;
    confirmedBookings: number;
    failedBookings: number;
    cancelledBookings: number;
    averageOrderValue: number;
    occupancyRate: number; // percentage (e.g. 68.5%)
  };
  payments: {
    successfulCount: number;
    successfulAmount: number;
    failedCount: number;
    refundedCount: number;
    refundedAmount: number;
  };
  popularMovies: Array<{
    id: number;
    title: string;
    ticketsSold: number;
    revenue: number;
  }>;
  popularCinemas: Array<{
    id: number;
    name: string;
    city: string;
    ticketsSold: number;
    revenue: number;
  }>;
  trends: Array<{
    date: string;
    bookings: number;
    revenue: number;
  }>;
  coupons: {
    totalRedemptions: number;
    totalDiscountGiven: number;
    popularCoupons: Array<{
      code: string;
      usedCount: number;
      discountType: string;
    }>;
  };
}

export const adminAnalyticsService = {
  /**
   * Derives real-time business and operations analytics directly from database tables.
   */
  async getFullAnalytics(): Promise<AdminAnalyticsReport> {
    // 1. Overview metrics
    const [overviewRow] = await db
      .select({
        totalBookings: sql<number>`count(*)::int`,
        totalRevenue: sql<number>`coalesce(sum(case when status in ('confirmed', 'payment_pending') then total_price else 0 end), 0)::float`,
        confirmedBookings: sql<number>`count(case when status = 'confirmed' then 1 end)::int`,
        failedBookings: sql<number>`count(case when status in ('failed', 'expired') then 1 end)::int`,
        cancelledBookings: sql<number>`count(case when status in ('cancelled', 'refunded') then 1 end)::int`,
        avgOrder: sql<number>`coalesce(avg(case when status = 'confirmed' then total_price end), 0)::float`,
      })
      .from(bookings);

    // 2. Occupancy rate calculation from show_seats table
    const [occupancyRow] = await db
      .select({
        totalSeats: sql<number>`count(*)::int`,
        bookedSeats: sql<number>`count(case when status = 'booked' then 1 end)::int`,
      })
      .from(showSeats);

    const totalAuditoriumSeats = occupancyRow?.totalSeats || 0;
    const bookedAuditoriumSeats = occupancyRow?.bookedSeats || 0;
    const occupancyRate =
      totalAuditoriumSeats > 0
        ? Math.round((bookedAuditoriumSeats / totalAuditoriumSeats) * 1000) / 10
        : 0;

    // 3. Payment analytics
    const [paymentRow] = await db
      .select({
        successfulCount: sql<number>`count(case when status = 'completed' then 1 end)::int`,
        successfulAmount: sql<number>`coalesce(sum(case when status = 'completed' then amount else 0 end), 0)::float`,
        failedCount: sql<number>`count(case when status = 'failed' then 1 end)::int`,
        refundedCount: sql<number>`count(case when status = 'refunded' then 1 end)::int`,
        refundedAmount: sql<number>`coalesce(sum(case when status = 'refunded' then coalesce(refund_amount, amount) else 0 end), 0)::float`,
      })
      .from(payments);

    // 4. Popular movies (by confirmed tickets and revenue)
    const movieRows = await db
      .select({
        id: movies.id,
        title: movies.title,
        ticketsSold: sql<number>`count(case when ${bookings.status} = 'confirmed' then 1 end)::int`,
        revenue: sql<number>`coalesce(sum(case when ${bookings.status} = 'confirmed' then ${bookings.totalPrice} else 0 end), 0)::float`,
      })
      .from(movies)
      .leftJoin(shows, eq(shows.movieId, movies.id))
      .leftJoin(bookings, eq(bookings.showId, shows.id))
      .groupBy(movies.id, movies.title)
      .orderBy(desc(sql`coalesce(sum(case when ${bookings.status} = 'confirmed' then ${bookings.totalPrice} else 0 end), 0)`))
      .limit(5);

    // 5. Popular cinemas
    const cinemaRows = await db
      .select({
        id: theatres.id,
        name: theatres.name,
        city: theatres.city,
        ticketsSold: sql<number>`count(case when ${bookings.status} = 'confirmed' then 1 end)::int`,
        revenue: sql<number>`coalesce(sum(case when ${bookings.status} = 'confirmed' then ${bookings.totalPrice} else 0 end), 0)::float`,
      })
      .from(theatres)
      .leftJoin(shows, eq(shows.theatreId, theatres.id))
      .leftJoin(bookings, eq(bookings.showId, shows.id))
      .groupBy(theatres.id, theatres.name, theatres.city)
      .orderBy(desc(sql`count(case when ${bookings.status} = 'confirmed' then 1 end)`))
      .limit(5);

    // 6. Booking trends (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const trendRows = await db
      .select({
        date: sql<string>`to_char(${bookings.createdAt}, 'YYYY-MM-DD')`,
        bookings: sql<number>`count(*)::int`,
        revenue: sql<number>`coalesce(sum(case when ${bookings.status} = 'confirmed' then ${bookings.totalPrice} else 0 end), 0)::float`,
      })
      .from(bookings)
      .where(gte(bookings.createdAt, sevenDaysAgo))
      .groupBy(sql`to_char(${bookings.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${bookings.createdAt}, 'YYYY-MM-DD')`);

    // 7. Coupon usage analytics
    const [couponSummary] = await db
      .select({
        totalRedemptions: sql<number>`coalesce(sum(used_count), 0)::int`,
      })
      .from(coupons);

    const [discountSum] = await db
      .select({
        totalDiscountGiven: sql<number>`coalesce(sum(discount_amount), 0)::float`,
      })
      .from(bookings);

    const popularCouponRows = await db
      .select({
        code: coupons.code,
        usedCount: coupons.usedCount,
        discountType: coupons.discountType,
      })
      .from(coupons)
      .orderBy(desc(coupons.usedCount))
      .limit(5);

    return {
      overview: {
        totalBookings: overviewRow?.totalBookings || 0,
        totalRevenue: Math.round((overviewRow?.totalRevenue || 0) * 100) / 100,
        confirmedBookings: overviewRow?.confirmedBookings || 0,
        failedBookings: overviewRow?.failedBookings || 0,
        cancelledBookings: overviewRow?.cancelledBookings || 0,
        averageOrderValue: Math.round((overviewRow?.avgOrder || 0) * 100) / 100,
        occupancyRate,
      },
      payments: {
        successfulCount: paymentRow?.successfulCount || 0,
        successfulAmount: Math.round((paymentRow?.successfulAmount || 0) * 100) / 100,
        failedCount: paymentRow?.failedCount || 0,
        refundedCount: paymentRow?.refundedCount || 0,
        refundedAmount: Math.round((paymentRow?.refundedAmount || 0) * 100) / 100,
      },
      popularMovies: movieRows.map((m) => ({
        id: m.id,
        title: m.title,
        ticketsSold: m.ticketsSold || 0,
        revenue: Math.round((m.revenue || 0) * 100) / 100,
      })),
      popularCinemas: cinemaRows.map((c) => ({
        id: c.id,
        name: c.name,
        city: c.city || 'Metro',
        ticketsSold: c.ticketsSold || 0,
        revenue: Math.round((c.revenue || 0) * 100) / 100,
      })),
      trends: trendRows.map((t) => ({
        date: t.date,
        bookings: t.bookings || 0,
        revenue: Math.round((t.revenue || 0) * 100) / 100,
      })),
      coupons: {
        totalRedemptions: couponSummary?.totalRedemptions || 0,
        totalDiscountGiven: Math.round((discountSum?.totalDiscountGiven || 0) * 100) / 100,
        popularCoupons: popularCouponRows,
      },
    };
  },
};
