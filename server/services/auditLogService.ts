import { desc, eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { auditLogs } from '../db/schema.js';

export interface AuditLogEntry {
  userId?: number;
  actorEmail: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown> | string;
  ipAddress?: string;
}

export interface ListAuditLogsParams {
  action?: string;
  resourceType?: string;
  actorEmail?: string;
  limit?: number;
  offset?: number;
}

export const auditLogService = {
  /**
   * Persists an administrative or security-sensitive audit event.
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const detailsStr =
        typeof entry.details === 'object'
          ? JSON.stringify(entry.details)
          : entry.details || null;

      await db.insert(auditLogs).values({
        userId: entry.userId,
        actorEmail: entry.actorEmail,
        actorRole: entry.actorRole || 'admin',
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: String(entry.resourceId),
        details: detailsStr,
        ipAddress: entry.ipAddress || null,
      });
    } catch (err) {
      // Never crash the primary operation if logging encounters an issue
      console.error('[auditLogService] Failed to record audit log:', err);
    }
  },

  /**
   * Fetches paginated audit logs for the admin dashboard.
   */
  async list(params: ListAuditLogsParams = {}): Promise<{
    logs: Array<{
      id: number;
      userId: number | null;
      actorEmail: string;
      actorRole: string;
      action: string;
      resourceType: string;
      resourceId: string;
      details: string | null;
      ipAddress: string | null;
      createdAt: string;
    }>;
    total: number;
  }> {
    const limit = Math.min(params.limit || 50, 100);
    const offset = params.offset || 0;

    const conditions = [];
    if (params.action) {
      conditions.push(eq(auditLogs.action, params.action));
    }
    if (params.resourceType) {
      conditions.push(eq(auditLogs.resourceType, params.resourceType));
    }
    if (params.actorEmail) {
      conditions.push(eq(auditLogs.actorEmail, params.actorEmail));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(whereClause);

    const rows = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      logs: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
      total: countResult?.count || 0,
    };
  },
};
