import { logger } from '../utils/logger.js';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  keysCount: number;
  hitRatio: string;
}

class CacheService {
  private memoryStore = new Map<string, CacheEntry<unknown>>();
  private hits = 0;
  private misses = 0;
  private readonly maxEntries = 5000;

  constructor() {
    // Background garbage collection sweep every 60 seconds
    setInterval(() => {
      this.evictExpired();
    }, 60000).unref();
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryStore.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryStore.delete(key);
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.memoryStore.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      this.misses++;
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.memoryStore.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    // If cache grows too large, evict oldest entries
    if (this.memoryStore.size >= this.maxEntries) {
      const firstKey = this.memoryStore.keys().next().value;
      if (firstKey) this.memoryStore.delete(firstKey);
    }

    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.memoryStore.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.memoryStore.delete(key);
  }

  async delPrefix(prefix: string): Promise<number> {
    let count = 0;
    for (const key of this.memoryStore.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryStore.delete(key);
        count++;
      }
    }
    logger.debug(`[Cache] Evicted ${count} keys for prefix '${prefix}'`);
    return count;
  }

  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = 300,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetchFn();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const ratio = total === 0 ? '0%' : `${((this.hits / total) * 100).toFixed(1)}%`;
    return {
      hits: this.hits,
      misses: this.misses,
      keysCount: this.memoryStore.size,
      hitRatio: ratio,
    };
  }

  clear(): void {
    this.memoryStore.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

export const cacheService = new CacheService();
