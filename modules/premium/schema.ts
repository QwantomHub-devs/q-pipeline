import {
  pgTable,
  text,
  boolean,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export const premiumEligibilityGates = pgTable('premium_eligibility_gates', {
  id: text('id').primaryKey(),
  fellowProfileId: text('fellow_profile_id').notNull(),
  eligibilityStatus: varchar('eligibility_status', { length: 50 }).notNull().default('pending_review'), // 'eligible' | 'ineligible' | 'pending_review'
  scoreThresholdMet: boolean('score_threshold_met').notNull().default(false),
  tierConfirmed: boolean('tier_confirmed').notNull().default(false),
  contractSigned: boolean('contract_signed').notNull().default(false),
  authenticityPassed: boolean('authenticity_passed').notNull().default(true),
  eligibilityReason: text('eligibility_reason'),
  evaluatedAt: timestamp('evaluated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const premiumShortlists = pgTable('premium_shortlists', {
  id: text('id').primaryKey(),
  fellowProfileId: text('fellow_profile_id').notNull(),
  shortlistName: text('shortlist_name').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('proposed'), // 'proposed' | 'shortlisted' | 'nominated' | 'accepted' | 'declined'
  notes: text('notes'),
  curatedBy: text('curated_by').notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type PremiumEligibilityGateRow = InferSelectModel<typeof premiumEligibilityGates>;
export type NewPremiumEligibilityGateRow = InferInsertModel<typeof premiumEligibilityGates>;
export type PremiumShortlistRow = InferSelectModel<typeof premiumShortlists>;
export type NewPremiumShortlistRow = InferInsertModel<typeof premiumShortlists>;
