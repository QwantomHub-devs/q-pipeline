import {
  pgTable,
  uuid,
  text,
  integer,
  varchar,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { fellowProfiles } from '../identity/schema';

export const benchFellows = pgTable('bench_fellows', {
  id: uuid('id').defaultRandom().primaryKey(),
  fellowProfileId: uuid('fellow_profile_id')
    .notNull()
    .unique()
    .references(() => fellowProfiles.id, { onDelete: 'cascade' }),
  stipendBalanceAccrued: integer('stipend_balance_accrued').notNull().default(0), // Total micro-stipends earned (ready for Service 18 Ledger sync)
  completedProjectsCount: integer('completed_projects_count').notNull().default(0),
  enrolledAt: timestamp('enrolled_at', { withTimezone: true }).defaultNow().notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type BenchFellowRow = InferSelectModel<typeof benchFellows>;
export type NewBenchFellowRow = InferInsertModel<typeof benchFellows>;
