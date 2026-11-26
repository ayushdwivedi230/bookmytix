import { Router } from 'express';
import { paymentController } from '../controllers/paymentController.js';
import { authenticateToken } from '../middleware/auth.js';

export const paymentRouter = Router();

// Public Webhook Endpoint (verifies HMAC header)
paymentRouter.post('/webhook', paymentController.webhook);

// Authenticated Payment Lifecycle
paymentRouter.post('/create-order', authenticateToken as any, paymentController.createOrder);
paymentRouter.post('/verify', authenticateToken as any, paymentController.verify);
