import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { screens, theatres, seats } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';

export interface ScreenLayoutConfig {
  rows: string[];
  cols: number;
  tiers: {
    recliner?: string[];
    premium?: string[];
    standard?: string[];
  };
  priceMultipliers: {
    recliner: number;
    premium: number;
    standard: number;
  };
}

export const DEFAULT_LAYOUT: ScreenLayoutConfig = {
  rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
  cols: 12,
  tiers: {
    recliner: ['A', 'B'],
    premium: ['C', 'D', 'E'],
    standard: ['F', 'G', 'H'],
  },
  priceMultipliers: {
    recliner: 1.6,
    premium: 1.25,
    standard: 1.0,
  },
};

export const screenService = {
  async listScreensByTheatre(theatreId: number) {
    const screenList = await db
      .select()
      .from(screens)
      .where(eq(screens.theatreId, theatreId))
      .orderBy(screens.name);

    return screenList.map((s) => {
      let layout: ScreenLayoutConfig;
      try {
        layout = JSON.parse(s.seatLayout || '{}');
      } catch {
        layout = DEFAULT_LAYOUT;
      }
      return {
        id: s.id,
        theatreId: s.theatreId,
        name: s.name,
        screenType: s.screenType,
        totalSeats: s.totalSeats,
        layout,
      };
    });
  },

  async getScreenLayout(screenId: number) {
    const screen = await db.query.screens.findFirst({
      where: eq(screens.id, screenId),
    });

    if (!screen) {
      throw new AppError('Screen not found', 404);
    }

    let layout: ScreenLayoutConfig = DEFAULT_LAYOUT;
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

    return {
      screenId: screen.id,
      name: screen.name,
      screenType: screen.screenType,
      totalSeats: screen.totalSeats,
      layout,
    };
  },

  async createScreen(
    theatreId: number,
    data: {
      name: string;
      screenType: string;
      layout?: Partial<ScreenLayoutConfig>;
    },
  ) {
    const theatre = await db.query.theatres.findFirst({
      where: eq(theatres.id, theatreId),
    });
    if (!theatre) {
      throw new AppError('Cinema not found', 404);
    }

    const layout: ScreenLayoutConfig = {
      ...DEFAULT_LAYOUT,
      ...(data.layout || {}),
      tiers: {
        ...DEFAULT_LAYOUT.tiers,
        ...(data.layout?.tiers || {}),
      },
      priceMultipliers: {
        ...DEFAULT_LAYOUT.priceMultipliers,
        ...(data.layout?.priceMultipliers || {}),
      },
    };

    const totalSeats = layout.rows.length * layout.cols;

    const [screen] = await db
      .insert(screens)
      .values({
        theatreId,
        name: data.name,
        screenType: data.screenType || 'Standard',
        totalSeats,
        seatLayout: JSON.stringify(layout),
      })
      .returning();

    // Populate physical seats table
    const seatInserts = [];
    for (const r of layout.rows) {
      const category: 'recliner' | 'premium' | 'standard' = layout.tiers.recliner?.includes(r)
        ? 'recliner'
        : layout.tiers.premium?.includes(r)
        ? 'premium'
        : 'standard';

      const multiplier = layout.priceMultipliers[category] || 1.0;

      for (let c = 1; c <= layout.cols; c++) {
        seatInserts.push({
          theatreId,
          screenId: screen.id,
          row: r,
          seatNumber: `${r}${c}`,
          seatType: category,
          seatCategory: category,
          priceMultiplier: String(multiplier),
        });
      }
    }

    if (seatInserts.length > 0) {
      await db.insert(seats).values(seatInserts);
    }

    return {
      id: screen.id,
      theatreId: screen.theatreId,
      name: screen.name,
      screenType: screen.screenType,
      totalSeats: screen.totalSeats,
      layout,
    };
  },
};
