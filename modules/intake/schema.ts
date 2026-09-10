import { pgTable, uuid, varchar, integer, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { fellowProfiles } from '@/modules/identity/schema';

export const intakeStatusEnum = pgEnum('intake_status', [
  'submitted',
  'eligible',
  'ineligible',
  'duplicate',
]);

export const outreachChannelEnum = pgEnum('outreach_channel', [
  'nysc_camp',
  'university',
  '3mtt',
  'partner_org',
  'social_media',
  'direct',
  'referral',
]);

export const nyscStatusEnum = pgEnum('nysc_status', [
  'serving',
  'completed',
  'exempt',
  'not_applicable',
]);

export const applicantIntakes = pgTable(
  'applicant_intakes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fellowId: uuid('fellow_id')
      .notNull()
      .references(() => fellowProfiles.id, { onDelete: 'cascade' }),
    clerkUserId: varchar('clerk_user_id', { length: 255 }).notNull(),
    cohortWindow: varchar('cohort_window', { length: 50 }).notNull(),
    outreachChannel: outreachChannelEnum('outreach_channel').notNull().default('direct'),
    nyscStatus: nyscStatusEnum('nysc_status').default('not_applicable'),
    university: varchar('university', { length: 255 }),
    yearsOfExperience: integer('years_of_experience').notNull().default(0),
    primaryTrack: varchar('primary_track', { length: 100 }).notNull().default('fullstack_ai'),
    status: intakeStatusEnum('status').notNull().default('submitted'),
    eligibilityNotes: text('eligibility_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_applicant_intakes_clerk_user_id').on(table.clerkUserId),
    index('idx_applicant_intakes_fellow_id').on(table.fellowId),
    index('idx_applicant_intakes_cohort_window').on(table.clerkUserId, table.cohortWindow),
  ]
);
