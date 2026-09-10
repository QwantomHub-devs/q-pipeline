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

export const mentors = pgTable('mentors', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  company: text('company').notNull(),
  role: text('role').notNull(),
  expertise: jsonb('expertise').notNull().default([]), // array of strings
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  maxMentees: integer('max_mentees').notNull().default(5),
  activeMenteesCount: integer('active_mentees_count').notNull().default(0),
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'active' | 'inactive' | 'on_leave'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const mentorAssignments = pgTable('mentor_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  mentorId: uuid('mentor_id').notNull().references(() => mentors.id, { onDelete: 'cascade' }),
  targetType: varchar('target_type', { length: 50 }).notNull(), // 'cohort' | 'fellow'
  targetId: text('target_id').notNull(), // cohort_id or fellow_id
  targetName: text('target_name'),
  assignedBy: text('assigned_by').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'active' | 'completed' | 'cancelled'
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const mentorSessions = pgTable('mentor_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  mentorId: uuid('mentor_id').notNull().references(() => mentors.id, { onDelete: 'cascade' }),
  targetType: varchar('target_type', { length: 50 }).notNull(), // 'cohort' | 'fellow'
  targetId: text('target_id').notNull(),
  fellowId: text('fellow_id'),
  cohortId: text('cohort_id'),
  title: text('title').notNull(),
  description: text('description'),
  meetingUrl: text('meeting_url').notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  durationMinutes: integer('duration_minutes').notNull().default(45),
  status: varchar('status', { length: 50 }).notNull().default('scheduled'), // 'scheduled' | 'completed' | 'cancelled'
  mentorNotes: text('mentor_notes'),
  fellowFeedbackScore: integer('fellow_feedback_score'), // 1-5
  fellowFeedbackComments: text('fellow_feedback_comments'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const enhancedMentorMatches = pgTable('enhanced_mentor_matches', {
  id: text('id').primaryKey(),
  fellowProfileId: text('fellow_profile_id').notNull(),
  mentorId: text('mentor_id').notNull(),
  compatibilityScore: integer('compatibility_score').notNull(), // 0 - 100
  skillMatchScore: integer('skill_match_score').notNull(), // 0 - 40
  experienceMatchScore: integer('experience_match_score').notNull(), // 0 - 30
  capacityScore: integer('capacity_score').notNull(), // 0 - 20
  timezoneScore: integer('timezone_score').notNull(), // 0 - 10
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'proposed' | 'active' | 'reassigned' | 'completed'
  matchedAt: timestamp('matched_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type MentorRow = InferSelectModel<typeof mentors>;
export type NewMentorRow = InferInsertModel<typeof mentors>;
export type MentorAssignmentRow = InferSelectModel<typeof mentorAssignments>;
export type NewMentorAssignmentRow = InferInsertModel<typeof mentorAssignments>;
export type MentorSessionRow = InferSelectModel<typeof mentorSessions>;
export type NewMentorSessionRow = InferInsertModel<typeof mentorSessions>;

