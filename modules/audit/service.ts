import { db } from '@/lib/db';
import { auditLogs } from '@/modules/audit/schema';
import { AuditLogEntry, AuditQueryOptions, LogAuditEventInput } from './types';
import { logAuditEventSchema } from './validation';
import { AuthActor } from '@/modules/identity/types';
import { ForbiddenError } from '@/lib/auth';
import { eq, and, desc } from 'drizzle-orm';

function assertIsAdmin(actor: AuthActor) {
  if (!actor || !actor.roles.includes('admin')) {
    throw new ForbiddenError('Access denied: Admin privileges required to inspect compliance audit logs');
  }
}

/**
 * Inserts an immutable, append-only compliance audit log event.
 */
export async function logAuditEvent(input: LogAuditEventInput): Promise<AuditLogEntry> {
  const validated = logAuditEventSchema.parse(input);

  const [entry] = await db
    .insert(auditLogs)
    .values({
      actorClerkUserId: validated.actorClerkUserId,
      actorEmail: validated.actorEmail ?? null,
      action: validated.action,
      targetType: validated.targetType,
      targetId: validated.targetId,
      severity: validated.severity,
      metadata: validated.metadata,
    })
    .returning();

  return entry as AuditLogEntry;
}

/**
 * Queries system audit logs. Restricted strictly to admin actors (Rule 5).
 */
export async function queryAuditLogs(
  options: AuditQueryOptions,
  actor: AuthActor
): Promise<AuditLogEntry[]> {
  assertIsAdmin(actor);

  const conditions = [];

  if (options.actorClerkUserId) {
    conditions.push(eq(auditLogs.actorClerkUserId, options.actorClerkUserId));
  }

  if (options.action) {
    conditions.push(eq(auditLogs.action, options.action));
  }

  if (options.targetType) {
    conditions.push(eq(auditLogs.targetType, options.targetType));
  }

  if (options.targetId) {
    conditions.push(eq(auditLogs.targetId, options.targetId));
  }

  if (options.severity) {
    conditions.push(eq(auditLogs.severity, options.severity));
  }

  let query = db.select().from(auditLogs);

  if (conditions.length > 0) {
    // @ts-ignore
    query = query.where(and(...conditions));
  }

  // @ts-ignore
  query = query.orderBy(desc(auditLogs.createdAt)).limit(options.limit || 100);

  const results = await query;
  return results as AuditLogEntry[];
}
