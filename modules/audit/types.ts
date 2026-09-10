export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditLogEntry {
  id: string;
  actorClerkUserId: string;
  actorEmail: string | null;
  action: string;
  targetType: string;
  targetId: string;
  severity: AuditSeverity;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface LogAuditEventInput {
  actorClerkUserId: string;
  actorEmail?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  severity?: AuditSeverity;
  metadata?: Record<string, unknown>;
}

export interface AuditQueryOptions {
  actorClerkUserId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  severity?: AuditSeverity;
  limit?: number;
  offset?: number;
}
