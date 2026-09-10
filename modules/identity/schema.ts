import { pgTable, uuid, varchar, text, jsonb, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';

export const stageEnum = pgEnum('fellow_stage', [
  'applicant',
  'training',
  'assessing',
  'fellow',
  'placed',
  'alumni',
]);

export const tierEnum = pgEnum('fellow_tier', [
  'none',
  'top_tier',
  'standard',
  'not_selected',
]);

export const fellowProfiles = pgTable(
  'fellow_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkUserId: varchar('clerk_user_id', { length: 255 }).notNull().unique(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    firstName: varchar('first_name', { length: 255 }).notNull(),
    lastName: varchar('last_name', { length: 255 }).notNull(),
    phoneNumber: varchar('phone_number', { length: 50 }),
    country: varchar('country', { length: 10 }).notNull().default('NG'),
    stage: stageEnum('stage').notNull().default('applicant'),
    tier: tierEnum('tier').notNull().default('none'),
    bio: text('bio'),
    githubHandle: varchar('github_handle', { length: 255 }),
    linkedinUrl: varchar('linkedin_url', { length: 255 }),
    skills: jsonb('skills').$type<string[]>().notNull().default([]),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_fellow_profiles_clerk_user_id').on(table.clerkUserId),
    index('idx_fellow_profiles_email').on(table.email),
    index('idx_fellow_profiles_stage_tier').on(table.stage, table.tier),
  ]
);
