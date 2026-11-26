import express from 'express';
import helmet from 'helmet';
import { apiRouter } from '../server/routes/index.js';
import { errorHandler } from '../server/middleware/errorHandler.js';
import { correlationIdMiddleware } from '../server/middleware/correlationId.js';
import { metricsMiddleware } from '../server/middleware/metricsMiddleware.js';

const app = express();

app.use(correlationIdMiddleware);
app.use(metricsMiddleware);
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
