import express from 'express';
import helmet from 'helmet';
import { apiRouter } from '../server/routes/index.js';
import { errorHandler } from '../server/middleware/errorHandler.js';
import { correlationIdMiddleware } from '../server/middleware/correlationId.js';
import { metricsMiddleware } from '../server/middleware/metricsMiddleware.js';

const app = express();

app.use(correlationIdMiddleware);
app.use(metricsMiddleware);

// Enable CORS for all origins in serverless environment
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Correlation-ID');
  if (_req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
app.use(express.json());

// Support both /api and root paths depending on Vercel rewrite handling
app.use('/api', apiRouter);
app.use('/', apiRouter);

app.use(errorHandler);

export default app;
