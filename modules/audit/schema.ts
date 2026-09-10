import { pgTable, uuid, varchar, jsonb, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';

export const auditSeverityEnum = pgEnum('audit_severity', [
  'info',
  'warning',
  'critical',
]);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorClerkUserId: varchar('actor_clerk_user_id', { length: 255 }).notNull(),
    actorEmail: varchar('actor_email', { length: 255 }),
    action: varchar('action', { length: 100 }).notNull(),
    targetType: varchar('target_type', { length: 100 }).notNull(),
    targetId: varchar('target_id', { length: 255 }).notNull(),
    severity: auditSeverityEnum('severity').notNull().default('info'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_audit_logs_actor_clerk_user_id').on(table.actorClerkUserId),
    index('idx_audit_logs_action').on(table.action),
    index('idx_audit_logs_target').on(table.targetType, table.targetId),
  ]
);
