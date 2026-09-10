import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  varchar,
  boolean,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export const opportunities = pgTable('opportunities', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  clientName: text('client_name').notNull(),
  opportunityType: varchar('opportunity_type', { length: 50 }).notNull(), // 'faang_placement' | 'sme_build_project' | 'staffing_maintenance'
  requiredSkills: jsonb('required_skills').notNull().default([]), // array of strings
  minScore: numeric('min_score').notNull().default('70.0'),
  requiredTier: varchar('required_tier', { length: 50 }).notNull(),
  compensationRange: text('compensation_range').notNull(),
  stipendAmount: integer('stipend_amount').default(0), // micro-stipend for SME internal build projects
  location: text('location').notNull().default('Remote / Hybrid'),
  slotsAvailable: integer('slots_available').notNull().default(1),
  filledSlotsCount: integer('filled_slots_count').notNull().default(0),
  status: varchar('status', { length: 50 }).notNull().default('open'), // 'open' | 'filled' | 'closed'
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const fellowMatches = pgTable('fellow_matches', {
  id: uuid('id').defaultRandom().primaryKey(),
  opportunityId: uuid('opportunity_id').notNull().references(() => opportunities.id, { onDelete: 'cascade' }),
  fellowId: text('fellow_id').notNull(),
  fellowName: text('fellow_name'),
  fellowEmail: text('fellow_email'),
  matchScore: numeric('match_score').notNull(),
  skillMatchPercent: numeric('skill_match_percent').notNull(),
  tierEligible: boolean('tier_eligible').notNull().default(true),
  status: varchar('status', { length: 50 }).notNull().default('suggested'), // 'suggested' | 'shortlisted' | 'client_accepted' | 'rejected' | 'placed' | 'assigned'
  notes: text('notes'),
  assignedBy: text('assigned_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type OpportunityRow = InferSelectModel<typeof opportunities>;
export type NewOpportunityRow = InferInsertModel<typeof opportunities>;
export type FellowMatchRow = InferSelectModel<typeof fellowMatches>;
export type NewFellowMatchRow = InferInsertModel<typeof fellowMatches>;
