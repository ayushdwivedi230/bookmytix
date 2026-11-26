import type { Request, Response } from 'express';
import { checkDbConnection } from '../db/index.js';
import { metricsService } from '../middleware/metricsMiddleware.js';
import { cacheService } from '../services/cacheService.js';

export const healthController = {
  /**
   * Fast liveness probe for load balancers and container orchestrators.
   */
  async health(_req: Request, res: Response): Promise<void> {
    const memory = process.memoryUsage();
    res.json({
      status: 'ok',
      service: 'bookmytix-api',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      memory: {
        rssMb: Math.round(memory.rss / (1024 * 1024)),
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
      },
    });
  },

  /**
   * Readiness probe verifying active database connection and pool health.
   */
  async ready(_req: Request, res: Response): Promise<void> {
    const dbStatus = await checkDbConnection();
    if (!dbStatus.ok) {
      res.status(503).json({
        status: 'unhealthy',
        service: 'bookmytix-api',
        ready: false,
        database: { connected: false, error: dbStatus.error },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      status: 'ready',
      service: 'bookmytix-api',
      ready: true,
      database: { connected: true, latencyMs: dbStatus.latencyMs },
      cache: cacheService.getStats(),
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * SRE and observability metrics endpoint.
   */
  async metrics(_req: Request, res: Response): Promise<void> {
    const summary = metricsService.getMetricsSummary();
    res.json(summary);
  },
};
