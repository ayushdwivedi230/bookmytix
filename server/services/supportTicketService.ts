import { desc, eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { supportTickets, bookings, users } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { auditLogService } from './auditLogService.js';

export interface CreateTicketInput {
  bookingId?: number;
  subject: string;
  category: string;
  message: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface UpdateTicketInput {
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  adminResponse?: string;
}

export const supportTicketService = {
  /**
   * Customer submits a new support inquiry or booking problem.
   */
  async createTicket(userId: number, input: CreateTicketInput) {
    if (!input.subject || !input.subject.trim()) {
      throw new AppError('Subject is required', 400);
    }
    if (!input.message || !input.message.trim()) {
      throw new AppError('Message is required', 400);
    }

    if (input.bookingId) {
      const b = await db.query.bookings.findFirst({
        where: and(eq(bookings.id, input.bookingId), eq(bookings.userId, userId)),
      });
      if (!b) {
        throw new AppError('Referenced booking does not belong to your account', 400);
      }
    }

    const ticketRef = `TKT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

    const [ticket] = await db
      .insert(supportTickets)
      .values({
        ticketRef,
        userId,
        bookingId: input.bookingId || null,
        subject: input.subject.trim(),
        category: input.category || 'booking_issue',
        message: input.message.trim(),
        priority: input.priority || 'normal',
        status: 'open',
      })
      .returning();

    return ticket;
  },

  /**
   * List tickets filed by a specific customer.
   */
  async getUserTickets(userId: number) {
    const list = await db
      .select({
        id: supportTickets.id,
        ticketRef: supportTickets.ticketRef,
        bookingId: supportTickets.bookingId,
        subject: supportTickets.subject,
        category: supportTickets.category,
        message: supportTickets.message,
        status: supportTickets.status,
        priority: supportTickets.priority,
        adminResponse: supportTickets.adminResponse,
        resolvedAt: supportTickets.resolvedAt,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
        bookingRef: bookings.bookingRef,
      })
      .from(supportTickets)
      .leftJoin(bookings, eq(bookings.id, supportTickets.bookingId))
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.createdAt));

    return list.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      resolvedAt: t.resolvedAt ? t.resolvedAt.toISOString() : null,
    }));
  },

  /**
   * Admin: List all customer tickets with optional filter by status/category.
   */
  async getAllTickets(filters?: { status?: string; category?: string; priority?: string }) {
    const conditions = [];
    if (filters?.status && filters.status !== 'All') {
      conditions.push(eq(supportTickets.status, filters.status));
    }
    if (filters?.category && filters.category !== 'All') {
      conditions.push(eq(supportTickets.category, filters.category));
    }
    if (filters?.priority && filters.priority !== 'All') {
      conditions.push(eq(supportTickets.priority, filters.priority));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db
      .select({
        id: supportTickets.id,
        ticketRef: supportTickets.ticketRef,
        userId: supportTickets.userId,
        userName: users.name,
        userEmail: users.email,
        bookingId: supportTickets.bookingId,
        bookingRef: bookings.bookingRef,
        subject: supportTickets.subject,
        category: supportTickets.category,
        message: supportTickets.message,
        status: supportTickets.status,
        priority: supportTickets.priority,
        adminResponse: supportTickets.adminResponse,
        resolvedBy: supportTickets.resolvedBy,
        resolvedAt: supportTickets.resolvedAt,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
      })
      .from(supportTickets)
      .innerJoin(users, eq(users.id, supportTickets.userId))
      .leftJoin(bookings, eq(bookings.id, supportTickets.bookingId))
      .where(whereClause)
      .orderBy(desc(supportTickets.createdAt));

    return list.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      resolvedAt: t.resolvedAt ? t.resolvedAt.toISOString() : null,
    }));
  },

  /**
   * Admin: Reply to ticket, update priority or mark resolved.
   */
  async respondToTicket(
    ticketId: number,
    adminUserId: number,
    adminEmail: string,
    input: UpdateTicketInput,
  ) {
    const existing = await db.query.supportTickets.findFirst({
      where: eq(supportTickets.id, ticketId),
    });

    if (!existing) {
      throw new AppError('Support ticket not found', 404);
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.status) {
      updateData.status = input.status;
      if (input.status === 'resolved' || input.status === 'closed') {
        updateData.resolvedBy = adminUserId;
        updateData.resolvedAt = new Date();
      }
    }

    if (input.priority) {
      updateData.priority = input.priority;
    }

    if (input.adminResponse !== undefined) {
      updateData.adminResponse = input.adminResponse.trim();
    }

    const [updated] = await db
      .update(supportTickets)
      .set(updateData)
      .where(eq(supportTickets.id, ticketId))
      .returning();

    // Record administrative audit trail
    await auditLogService.log({
      userId: adminUserId,
      actorEmail: adminEmail,
      actorRole: 'admin',
      action: 'support.ticket_responded',
      resourceType: 'support_ticket',
      resourceId: String(ticketId),
      details: {
        ticketRef: existing.ticketRef,
        newStatus: input.status,
        hasResponse: !!input.adminResponse,
      },
    });

    return updated;
  },
};
