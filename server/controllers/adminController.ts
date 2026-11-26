import type { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/adminService.js';
import { adminAnalyticsService } from '../services/adminAnalyticsService.js';
import { auditLogService } from '../services/auditLogService.js';
import { supportTicketService } from '../services/supportTicketService.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export const adminController = {
  // ─── Analytics & Stats ─────────────────────────────────────────────────────
  async stats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await adminService.getStats();
      res.json(stats);
    } catch (err) {
      next(err);
    }
  },

  async analytics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await adminAnalyticsService.getFullAnalytics();
      res.json(report);
    } catch (err) {
      next(err);
    }
  },

  async events(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const events = await adminService.getAllEvents();
      res.json(events);
    } catch (err) {
      next(err);
    }
  },

  async theatres(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const theatres = await adminService.getAllTheatres();
      res.json(theatres);
    } catch (err) {
      next(err);
    }
  },

  // ─── Bookings Management ───────────────────────────────────────────────────
  async listBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, status, limit } = req.query;
      const list = await adminService.listBookings({
        search: search ? String(search) : undefined,
        status: status ? String(status) : undefined,
        limit: limit ? parseInt(String(limit), 10) : undefined,
      });
      res.json(list);
    } catch (err) {
      next(err);
    }
  },

  async getBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const booking = await adminService.getBookingDetails(id);
      res.json(booking);
    } catch (err) {
      next(err);
    }
  },

  async cancelAndRefundBooking(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const reason = req.body.reason || 'Administrative refund';
      const result = await adminService.cancelAndRefundBooking(id, req.user!, reason);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  // ─── Users & RBAC ──────────────────────────────────────────────────────────
  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, role } = req.query;
      const users = await adminService.listUsers(
        search ? String(search) : undefined,
        role ? String(role) : undefined,
      );
      res.json(users);
    } catch (err) {
      next(err);
    }
  },

  async updateUserRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const { role } = req.body;
      const result = await adminService.updateUserRole(id, String(role), req.user!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async toggleUserStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await adminService.toggleUserStatus(id, req.user!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  // ─── Coupons Management ────────────────────────────────────────────────────
  async listCoupons(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const coupons = await adminService.listCoupons();
      res.json(coupons);
    } catch (err) {
      next(err);
    }
  },

  async createCoupon(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const coupon = await adminService.createCoupon(req.body, req.user!);
      res.status(201).json(coupon);
    } catch (err) {
      next(err);
    }
  },

  async toggleCoupon(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const coupon = await adminService.toggleCoupon(id, req.user!);
      res.json(coupon);
    } catch (err) {
      next(err);
    }
  },

  // ─── Food Catalog Management ───────────────────────────────────────────────
  async listFood(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const items = await adminService.listFood();
      res.json(items);
    } catch (err) {
      next(err);
    }
  },

  async createFood(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const item = await adminService.createFood(req.body, req.user!);
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  },

  async toggleFood(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const item = await adminService.toggleFood(id, req.user!);
      res.json(item);
    } catch (err) {
      next(err);
    }
  },

  // ─── Refunds ───────────────────────────────────────────────────────────────
  async listRefunds(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refunds = await adminService.listRefunds();
      res.json(refunds);
    } catch (err) {
      next(err);
    }
  },

  // ─── Audit Logs ────────────────────────────────────────────────────────────
  async listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { action, resourceType, actorEmail, limit, offset } = req.query;
      const result = await auditLogService.list({
        action: action ? String(action) : undefined,
        resourceType: resourceType ? String(resourceType) : undefined,
        actorEmail: actorEmail ? String(actorEmail) : undefined,
        limit: limit ? parseInt(String(limit), 10) : undefined,
        offset: offset ? parseInt(String(offset), 10) : undefined,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  // ─── Support Tickets (Admin View & Reply) ──────────────────────────────────
  async listSupportTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, category, priority } = req.query;
      const tickets = await supportTicketService.getAllTickets({
        status: status ? String(status) : undefined,
        category: category ? String(category) : undefined,
        priority: priority ? String(priority) : undefined,
      });
      res.json(tickets);
    } catch (err) {
      next(err);
    }
  },

  async respondSupportTicket(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = await supportTicketService.respondToTicket(
        id,
        req.user!.id,
        req.user!.email,
        req.body,
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
};
