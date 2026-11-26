import type { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cacheService.js';

interface LatencySample {
  path: string;
  durationMs: number;
  timestamp: number;
}

class MetricsService {
  private totalRequests = 0;
  private statusCodes: Record<string, number> = {
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0,
  };
  private latencies: number[] = [];
  private readonly maxLatencySamples = 1000;
  private paymentFailures = 0;
  private activeLocksHeld = 0;
  private startedAt = Date.now();

  recordRequest(statusCode: number, durationMs: number): void {
    this.totalRequests++;

    if (statusCode >= 200 && statusCode < 300) this.statusCodes['2xx']++;
    else if (statusCode >= 300 && statusCode < 400) this.statusCodes['3xx']++;
    else if (statusCode >= 400 && statusCode < 500) this.statusCodes['4xx']++;
    else if (statusCode >= 500) this.statusCodes['5xx']++;

    if (this.latencies.length >= this.maxLatencySamples) {
      this.latencies.shift();
    }
    this.latencies.push(durationMs);
  }

  recordPaymentFailure(): void {
    this.paymentFailures++;
  }

  getMetricsSummary() {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const count = sorted.length;
    const p50 = count > 0 ? sorted[Math.floor(count * 0.5)] : 0;
    const p95 = count > 0 ? sorted[Math.floor(count * 0.95)] : 0;
    const p99 = count > 0 ? sorted[Math.floor(count * 0.99)] : 0;
    const avg = count > 0 ? Math.round(sorted.reduce((a, b) => a + b, 0) / count) : 0;

    const uptimeSeconds = Math.round((Date.now() - this.startedAt) / 1000);
    const memory = process.memoryUsage();

    return {
      uptimeSeconds,
      totalRequests: this.totalRequests,
      statusCodes: this.statusCodes,
      latencyMs: {
        avg,
        p50,
        p95,
        p99,
        samples: count,
      },
      errorRate:
        this.totalRequests > 0
          ? `${(((this.statusCodes['5xx'] || 0) / this.totalRequests) * 100).toFixed(2)}%`
          : '0.00%',
      paymentFailures: this.paymentFailures,
      cacheStats: cacheService.getStats(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        rssMb: Math.round(memory.rss / (1024 * 1024)),
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export const metricsService = new MetricsService();

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    metricsService.recordRequest(res.statusCode, durationMs);
  });

  next();
}
