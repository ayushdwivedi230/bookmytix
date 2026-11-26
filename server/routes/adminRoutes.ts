import { Router } from 'express';
import { adminController } from '../controllers/adminController.js';
import { adminMovieController } from '../controllers/adminMovieController.js';
import { cinemaController } from '../controllers/cinemaController.js';
import { showController } from '../controllers/showController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

export const adminRouter = Router();

// Enforce authentication and strict server-side role check
adminRouter.use(authenticateToken as any, requireAdmin as any);

// ─── Analytics & Statistics ───────────────────────────────────────────────────
adminRouter.get('/stats', adminController.stats as any);
adminRouter.get('/analytics', adminController.analytics as any);
adminRouter.get('/events', adminController.events as any);
adminRouter.get('/theatres', adminController.theatres as any);

// ─── Bookings & Refunds ───────────────────────────────────────────────────────
adminRouter.get('/bookings', adminController.listBookings as any);
adminRouter.get('/bookings/:id', adminController.getBooking as any);
adminRouter.post('/bookings/:id/refund', adminController.cancelAndRefundBooking as any);
adminRouter.get('/refunds', adminController.listRefunds as any);

// ─── Users & Role-Based Access Control ────────────────────────────────────────
adminRouter.get('/users', adminController.listUsers as any);
adminRouter.patch('/users/:id/role', adminController.updateUserRole as any);
adminRouter.patch('/users/:id/status', adminController.toggleUserStatus as any);

// ─── Coupons & Promotions ─────────────────────────────────────────────────────
adminRouter.get('/coupons', adminController.listCoupons as any);
adminRouter.post('/coupons', adminController.createCoupon as any);
adminRouter.patch('/coupons/:id/toggle', adminController.toggleCoupon as any);

// ─── Food & Concessions Catalog ───────────────────────────────────────────────
adminRouter.get('/food', adminController.listFood as any);
adminRouter.post('/food', adminController.createFood as any);
adminRouter.patch('/food/:id/toggle', adminController.toggleFood as any);

// ─── Audit Logs ───────────────────────────────────────────────────────────────
adminRouter.get('/audit-logs', adminController.listAuditLogs as any);

// ─── Support Tickets Workflow ─────────────────────────────────────────────────
adminRouter.get('/support/tickets', adminController.listSupportTickets as any);
adminRouter.patch('/support/tickets/:id', adminController.respondSupportTicket as any);

// ─── Cinema & Screen Administration ───────────────────────────────────────────
adminRouter.post('/cinemas', cinemaController.create as any);
adminRouter.put('/cinemas/:id', cinemaController.update as any);
adminRouter.post('/cinemas/:id/screens', cinemaController.createScreen as any);
adminRouter.post('/shows', showController.createShow as any);

// ─── Movie Content Management ─────────────────────────────────────────────────
adminRouter.get('/movies', adminMovieController.list as any);
adminRouter.post('/movies', adminMovieController.create as any);
adminRouter.get('/movies/provider/search', adminMovieController.searchProvider as any);
adminRouter.post('/movies/provider/import', adminMovieController.importProvider as any);
adminRouter.get('/movies/:id', adminMovieController.getById as any);
adminRouter.put('/movies/:id', adminMovieController.update as any);
adminRouter.patch('/movies/:id/status', adminMovieController.updateStatus as any);
adminRouter.delete('/movies/:id', adminMovieController.archive as any);
adminRouter.delete('/movies/:id/permanent', adminMovieController.delete as any);
