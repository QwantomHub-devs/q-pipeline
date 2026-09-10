import { pgTable, uuid, varchar, text, jsonb, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';
import { fellowProfiles } from '@/modules/identity/schema';

// Dynamic Track Registry (Admin configurable)
export const bootcampTracks = pgTable(
  'bootcamp_tracks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_bootcamp_tracks_slug').on(table.slug)]
);

// Cohorts Table
export const cohorts = pgTable(
  'cohorts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    trackSlug: varchar('track_slug', { length: 255 })
      .notNull()
      .references(() => bootcampTracks.slug, { onDelete: 'cascade' }),
    status: varchar('status', { length: 50 }).notNull().default('upcoming'), // upcoming, active, completed, cancelled
    capacity: integer('capacity').notNull().default(30),
    startDate: timestamp('start_date', { withTimezone: true }),
    endDate: timestamp('end_date', { withTimezone: true }),
    description: text('description'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_cohorts_track_slug').on(table.trackSlug),
    index('idx_cohorts_status').on(table.status),
  ]
);

// Bootcamp Enrollments
export const bootcampEnrollments = pgTable(
  'bootcamp_enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fellowProfileId: uuid('fellow_profile_id')
      .notNull()
      .references(() => fellowProfiles.id, { onDelete: 'cascade' }),
    cohortId: uuid('cohort_id')
      .notNull()
      .references(() => cohorts.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 50 }).notNull().default('enrolled'), // enrolled, in_progress, graduated, dropped
    currentWeek: integer('current_week').notNull().default(1),
    enrolledAt: timestamp('enrolled_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_bootcamp_enrollments_fellow_profile_id').on(table.fellowProfileId),
    index('idx_bootcamp_enrollments_cohort_id').on(table.cohortId),
  ]
);

// Bootcamp Milestones
export const bootcampMilestones = pgTable(
  'bootcamp_milestones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cohortId: uuid('cohort_id')
      .notNull()
      .references(() => cohorts.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    weekNumber: integer('week_number').notNull(),
    dueDate: timestamp('due_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_bootcamp_milestones_cohort_id').on(table.cohortId),
    index('idx_bootcamp_milestones_week_number').on(table.weekNumber),
  ]
);

// Fellow Milestone Progress
export const fellowMilestoneProgress = pgTable(
  'fellow_milestone_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => bootcampEnrollments.id, { onDelete: 'cascade' }),
    milestoneId: uuid('milestone_id')
      .notNull()
      .references(() => bootcampMilestones.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, submitted, approved, revision_needed
    submissionUrl: text('submission_url'),
    feedback: text('feedback'),
    gradedAt: timestamp('graded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_fellow_milestone_progress_enrollment').on(table.enrollmentId),
    index('idx_fellow_milestone_progress_milestone').on(table.milestoneId),
  ]
);

export type BootcampTrackRow = typeof bootcampTracks.$inferSelect;
export type NewBootcampTrackRow = typeof bootcampTracks.$inferInsert;

export type CohortRow = typeof cohorts.$inferSelect;
export type NewCohortRow = typeof cohorts.$inferInsert;

export type BootcampEnrollmentRow = typeof bootcampEnrollments.$inferSelect;
export type NewBootcampEnrollmentRow = typeof bootcampEnrollments.$inferInsert;

export type BootcampMilestoneRow = typeof bootcampMilestones.$inferSelect;
export type NewBootcampMilestoneRow = typeof bootcampMilestones.$inferInsert;

export type FellowMilestoneProgressRow = typeof fellowMilestoneProgress.$inferSelect;
export type NewFellowMilestoneProgressRow = typeof fellowMilestoneProgress.$inferInsert;
