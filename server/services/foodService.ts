import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { foodItems } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export interface FoodItemDTO {
  id: number;
  theatreId: number | null;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  isAvailable: boolean;
}

export interface SelectedFoodItem {
  foodItemId: number;
  quantity: number;
}

export interface ValidatedFoodLineItem {
  foodItemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

const DEFAULT_CONCESSIONS = [
  {
    name: 'Classic Salted Popcorn (Large)',
    description: 'Freshly popped golden corn tossed with fine sea salt.',
    price: '240.00',
    category: 'Popcorn',
    imageUrl: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&q=80&w=400',
    isAvailable: true,
  },
  {
    name: 'Cheese Burst Popcorn (Large)',
    description: 'Jumbo kernels generously coated in creamy cheddar cheese seasoning.',
    price: '290.00',
    category: 'Popcorn',
    imageUrl: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?auto=format&fit=crop&q=80&w=400',
    isAvailable: true,
  },
  {
    name: 'Caramel Crunch Gourmet Popcorn',
    description: 'Artisanal popcorn glazed with rich golden brown caramel.',
    price: '320.00',
    category: 'Popcorn',
    imageUrl: 'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&q=80&w=400',
    isAvailable: true,
  },
  {
    name: 'Pepsi Fountain Glass (500ml)',
    description: 'Ice-chilled fountain Pepsi served with recyclable cup & lid.',
    price: '150.00',
    category: 'Drinks',
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=400',
    isAvailable: true,
  },
  {
    name: 'Iced Hazelnut Cold Coffee',
    description: 'Slow-steeped espresso blended with milk and roasted hazelnut syrup.',
    price: '220.00',
    category: 'Drinks',
    imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&q=80&w=400',
    isAvailable: true,
  },
  {
    name: 'Crispy Tortilla Nachos & Jalapeño Cheese',
    description: 'Crunchy corn tortilla chips with warm molten cheese and tangy salsa.',
    price: '250.00',
    category: 'Snacks',
    imageUrl: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&q=80&w=400',
    isAvailable: true,
  },
  {
    name: 'Crispy Veggie & Cheese Burger',
    description: 'Crispy spiced patty with cheddar slice, lettuce, and herb mayo.',
    price: '210.00',
    category: 'Snacks',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=400',
    isAvailable: true,
  },
  {
    name: 'Blockbuster Cinema Combo',
    description: '1 Large Salted Popcorn + 1 Large Cheese Popcorn + 2 Fountain Pepsis.',
    price: '599.00',
    category: 'Combos',
    imageUrl: 'https://images.unsplash.com/photo-1585647347384-2593bc35786b?auto=format&fit=crop&q=80&w=400',
    isAvailable: true,
  },
  {
    name: 'Nachos & Popcorn Feast Combo',
    description: '1 Crispy Nachos + 1 Medium Popcorn + 1 Beverage of your choice.',
    price: '480.00',
    category: 'Combos',
    imageUrl: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&q=80&w=400',
    isAvailable: true,
  },
];

export const foodService = {
  /**
   * Fetch concession items, grouped and ordered.
   */
  async getFoodCatalog(theatreId?: number): Promise<FoodItemDTO[]> {
    try {
      for (const item of DEFAULT_CONCESSIONS) {
        const existing = await db.query.foodItems.findFirst({
          where: eq(foodItems.name, item.name),
        });
        if (!existing) {
          await db.insert(foodItems).values(item);
        }
      }

      const items = await db.query.foodItems.findMany({
        where: theatreId ? eq(foodItems.theatreId, theatreId) : undefined,
      });

      return items.map((i) => this.mapDTO(i));
    } catch (err) {
      logger.error('Failed to get food catalog', err);
      return [];
    }
  },

  /**
   * Strictly validates requested items on the backend, checking availability and prices.
   */
  async validateAndCalculateFood(
    selectedItems?: SelectedFoodItem[],
  ): Promise<{
    items: ValidatedFoodLineItem[];
    foodTotal: number;
  }> {
    if (!selectedItems || selectedItems.length === 0) {
      return { items: [], foodTotal: 0 };
    }

    const itemIds = selectedItems.map((i) => i.foodItemId);
    const dbItems = await db
      .select()
      .from(foodItems)
      .where(and(inArray(foodItems.id, itemIds), eq(foodItems.isAvailable, true)));

    const itemMap = new Map<number, typeof dbItems[0]>();
    for (const d of dbItems) {
      itemMap.set(d.id, d);
    }

    let foodTotal = 0;
    const validatedLines: ValidatedFoodLineItem[] = [];

    for (const req of selectedItems) {
      if (!req.quantity || req.quantity <= 0) continue;
      if (req.quantity > 20) {
        throw new AppError('Quantity cannot exceed 20 per food item', 400);
      }

      const match = itemMap.get(req.foodItemId);
      if (!match) {
        throw new AppError(`Food item #${req.foodItemId} is either unavailable or invalid`, 400);
      }

      const unitPrice = Number(match.price);
      const lineTotal = Math.round(unitPrice * req.quantity * 100) / 100;

      foodTotal += lineTotal;
      validatedLines.push({
        foodItemId: match.id,
        name: match.name,
        quantity: req.quantity,
        unitPrice,
        totalPrice: lineTotal,
      });
    }

    return {
      items: validatedLines,
      foodTotal: Math.round(foodTotal * 100) / 100,
    };
  },

  mapDTO(item: any): FoodItemDTO {
    let cat = item.category || 'Snacks';
    if (item.name?.toLowerCase().includes('popcorn')) {
      cat = 'Popcorn';
    } else if (
      cat === 'Beverages' ||
      item.name?.toLowerCase().includes('pepsi') ||
      item.name?.toLowerCase().includes('coffee')
    ) {
      cat = 'Drinks';
    }
    return {
      id: item.id,
      theatreId: item.theatreId,
      name: item.name,
      description: item.description || '',
      price: Number(item.price),
      category: cat,
      imageUrl: item.imageUrl || '',
      isAvailable: Boolean(item.isAvailable),
    };
  },
};
