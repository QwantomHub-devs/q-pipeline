import { pgTable, text, timestamp, boolean, doublePrecision, integer, jsonb } from 'drizzle-orm/pg-core';

export const fellowPlacements = pgTable('fellow_placements', {
  id: text('id').primaryKey(),
  fellowProfileId: text('fellow_profile_id').notNull(),
  opportunityId: text('opportunity_id'),
  contractId: text('contract_id'),
  clientName: text('client_name').notNull(),
  clientContactEmail: text('client_contact_email').notNull(),
  roleTitle: text('role_title').notNull(),
  monthlyCompensation: doublePrecision('monthly_compensation').notNull().default(0),
  billingRate: doublePrecision('billing_rate').notNull().default(0),
  currency: text('currency').notNull().default('USD'),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  status: text('status').notNull().default('pending_start'), // 'pending_start' | 'active' | 'completed' | 'extended' | 'terminated'
  terminationReason: text('termination_reason'),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const placementPerformanceReviews = pgTable('placement_performance_reviews', {
  id: text('id').primaryKey(),
  placementId: text('placement_id').notNull(),
  fellowProfileId: text('fellow_profile_id').notNull(),
  reviewerType: text('reviewer_type').notNull().default('client'), // 'client' | 'fellow_self' | 'admin'
  reviewerName: text('reviewer_name').notNull(),
  technicalVelocityScore: integer('technical_velocity_score').notNull().default(5), // 1 - 5
  codeQualityScore: integer('code_quality_score').notNull().default(5), // 1 - 5
  communicationScore: integer('communication_score').notNull().default(5), // 1 - 5
  reliabilityScore: integer('reliability_score').notNull().default(5), // 1 - 5
  overallRating: doublePrecision('overall_rating').notNull().default(5.0),
  isLowPerformanceFlagged: boolean('is_low_performance_flagged').notNull().default(false),
  feedbackNotes: text('feedback_notes').notNull(),
  reviewDate: text('review_date').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const placementMilestoneReports = pgTable('placement_milestone_reports', {
  id: text('id').primaryKey(),
  placementId: text('placement_id').notNull(),
  fellowProfileId: text('fellow_profile_id').notNull(),
  title: text('title').notNull(),
  deliverablesSummary: text('deliverables_summary').notNull(),
  hoursBilled: doublePrecision('hours_billed').notNull().default(0),
  status: text('status').notNull().default('submitted'), // 'submitted' | 'approved' | 'rejected'
  submittedAt: timestamp('submitted_at').notNull().defaultNow(),
  reviewedAt: timestamp('reviewed_at'),
});
