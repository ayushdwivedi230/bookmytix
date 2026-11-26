import express from 'express';
import { createServer as createViteServer } from 'vite';
import * as path from 'path';
import helmet from 'helmet';
import { env } from './server/config/env.js';
import { logger } from './server/utils/logger.js';
import { apiRouter } from './server/routes/index.js';
import { errorHandler } from './server/middleware/errorHandler.js';
import { apiRateLimiter } from './server/middleware/rateLimiter.js';
import { correlationIdMiddleware } from './server/middleware/correlationId.js';
import { metricsMiddleware } from './server/middleware/metricsMiddleware.js';

export async function createServer() {
  const app = express();

  // 1. Observability: Request correlation ID & metrics tracking
  app.use(correlationIdMiddleware);
  app.use(metricsMiddleware);

  // Security headers with full support for Unsplash CDN, YouTube trailers and fonts
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: [
            "'self'",
            'data:',
            'blob:',
            'https://images.unsplash.com',
            'https://*.unsplash.com',
            'https://img.youtube.com',
            'https://i.ytimg.com',
            'https://*.ytimg.com',
          ],
          frameSrc: [
            "'self'",
            'https://www.youtube.com',
            'https://youtube.com',
            'https://www.youtube-nocookie.com',
          ],
          connectSrc: ["'self'", 'https:', 'http:'],
          mediaSrc: ["'self'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
    }),
  );

  app.use(express.json());
  app.use(express.static('public'));

  // Global API rate limiting
  app.use('/api', apiRateLimiter);

  // Mount API modular routes
  app.use('/api', apiRouter);

  // Centralized Error Handling
  app.use(errorHandler);

  // Frontend static / Vite dev middleware
  if (env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

async function startServer() {
  const app = await createServer();
  const PORT = env.PORT;

  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on http://0.0.0.0:${PORT} in ${env.NODE_ENV} mode`);
  });

  // Graceful shutdown on SIGTERM / SIGINT for containers and cloud platforms
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    server.close((err) => {
      if (err) {
        logger.error('Error closing HTTP server', err);
        process.exit(1);
      }
      logger.info('HTTP server closed cleanly. Exiting process.');
      process.exit(0);
    });

    // Force exit after 10s if connections refuse to close
    setTimeout(() => {
      logger.warn('Forcing process shutdown after timeout');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    logger.error('Failed to start server', err);
    process.exit(1);
  });
}
