import { pgTable, uuid, varchar, integer, text, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core';
import { fellowProfiles } from '../identity/schema';

export const baselineAssessments = pgTable('baseline_assessments', {
  id: uuid('id').defaultRandom().primaryKey(),
  fellowProfileId: uuid('fellow_profile_id')
    .notNull()
    .unique()
    .references(() => fellowProfiles.id, { onDelete: 'cascade' }),
  githubUsername: varchar('github_username', { length: 255 }),
  githubRepoUrl: text('github_repo_url'),
  quizScore: integer('quiz_score').default(0),
  quizStatus: varchar('quiz_status', { length: 50 }).notNull().default('pending'), // 'pending' | 'passed' | 'failed'
  codingScore: integer('coding_score').default(0),
  codingStatus: varchar('coding_status', { length: 50 }).notNull().default('pending'), // 'pending' | 'in_progress' | 'passed' | 'failed'
  compositeScore: integer('composite_score').default(0),
  status: varchar('status', { length: 50 }).notNull().default('not_started'), // 'not_started' | 'in_progress' | 'passed' | 'failed'
  feedback: jsonb('feedback').default({}),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  gradedAt: timestamp('graded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Service 10: Module 1 Code Review Assignments
export const codeReviewAssignments = pgTable('code_review_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  diffContent: text('diff_content').notNull(),
  plantedBugs: jsonb('planted_bugs').notNull().default([]),
  timeLimitMinutes: integer('time_limit_minutes').notNull().default(30),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Service 10: Module 1 Code Review Submissions
export const codeReviewSubmissions = pgTable('code_review_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  fellowProfileId: uuid('fellow_profile_id')
    .notNull()
    .references(() => fellowProfiles.id, { onDelete: 'cascade' }),
  assignmentId: uuid('assignment_id')
    .notNull()
    .references(() => codeReviewAssignments.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 50 }).notNull().default('in_progress'),
  identifiedIssues: jsonb('identified_issues').notNull().default([]),
  draftScore: integer('draft_score').default(0),
  finalScore: integer('final_score').default(0),
  llmEvaluation: jsonb('llm_evaluation').default({}),
  criterionScores: jsonb('criterion_scores').default({
    issuesIdentified: 0,
    severityRanking: 0,
    fixQuality: 0,
    reasoningClarity: 0,
  }),
  isLate: boolean('is_late').notNull().default(false),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  gradedAt: timestamp('graded_at', { withTimezone: true }),
  reviewerUserId: varchar('reviewer_user_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Service 11: Module 2 Timed AI Build Sandbox Tickets
export const buildSandboxTickets = pgTable('build_sandbox_tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  repositoryTemplateUrl: text('repository_template_url').notNull(),
  plantedTraps: jsonb('planted_traps').notNull().default([]), // Array of PlantedTrap
  timeLimitMinutes: integer('time_limit_minutes').notNull().default(90),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Service 11: Module 2 Timed AI Build Sandbox Submissions
export const buildSandboxSubmissions = pgTable('build_sandbox_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  fellowProfileId: uuid('fellow_profile_id')
    .notNull()
    .references(() => fellowProfiles.id, { onDelete: 'cascade' }),
  ticketId: uuid('ticket_id')
    .notNull()
    .references(() => buildSandboxTickets.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 50 }).notNull().default('in_progress'), // 'in_progress' | 'submitted' | 'graded'
  sandboxRepoUrl: text('sandbox_repo_url'),
  telemetryLogs: jsonb('telemetry_logs').notNull().default([]), // Array of TelemetryEvent
  trapDetected: boolean('trap_detected').notNull().default(false),
  autoRedFlag: boolean('auto_red_flag').notNull().default(false),
  weightedScore: integer('weighted_score').default(0), // 0-100%
  rubricScores: jsonb('rubric_scores').default({
    correctness: 0,
    verificationBehavior: 0,
    securityAwareness: 0,
    codeQuality: 0,
    efficiency: 0,
  }),
  timeToFirstWorkingVersionMinutes: integer('time_to_first_working_version_minutes'),
  isLate: boolean('is_late').notNull().default(false),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  gradedAt: timestamp('graded_at', { withTimezone: true }),
  reviewerUserId: varchar('reviewer_user_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Service 12: Module 3 Recorded Explanation Intake Submissions
export const recordedExplanationSubmissions = pgTable('recorded_explanation_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  fellowProfileId: uuid('fellow_profile_id')
    .notNull()
    .references(() => fellowProfiles.id, { onDelete: 'cascade' }),
  sandboxSubmissionId: uuid('sandbox_submission_id').references(() => buildSandboxSubmissions.id, {
    onDelete: 'set null',
  }),
  status: varchar('status', { length: 50 }).notNull().default('in_progress'), // 'in_progress' | 'submitted' | 'graded'
  videoUrl: text('video_url'),
  videoDurationSeconds: integer('video_duration_seconds').default(0),
  transcriptionText: text('transcription_text'),
  weightedScore: integer('weighted_score').default(0), // 0-100%
  rubricScores: jsonb('rubric_scores').default({
    architectureArticulation: 0,
    trapExplanation: 0,
    aiTransparency: 0,
    communicationClarity: 0,
  }),
  isLate: boolean('is_late').notNull().default(false),
  specificQuestionPrompts: jsonb('specific_question_prompts').default([]), // Post-hoc submission-specific prompts picked by reviewer from Module 2 code
  authenticityPassed: boolean('authenticity_passed').notNull().default(true), // Hard gate: false = disqualified regardless of score
  authenticityNotes: text('authenticity_notes'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  gradedAt: timestamp('graded_at', { withTimezone: true }),
  reviewerUserId: varchar('reviewer_user_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Service 13: Candidate Composite Scores & Tier Placement
export const candidateCompositeScores = pgTable('candidate_composite_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  fellowProfileId: uuid('fellow_profile_id')
    .notNull()
    .unique()
    .references(() => fellowProfiles.id, { onDelete: 'cascade' }),
  baselineScore: integer('baseline_score').default(0), // 0-100%
  module1Score: integer('module1_score').default(0), // 0-100%
  module2Score: integer('module2_score').default(0), // 0-100%
  module3Score: integer('module3_score').default(0), // 0-100%
  overallCompositeScore: integer('overall_composite_score').default(0), // 0-100%
  assignedTier: varchar('assigned_tier', { length: 50 }).notNull().default('tier_4_rejected'), // 'tier_1_global' | 'tier_2_regional' | 'tier_3_bench' | 'tier_4_rejected'
  isRedFlagged: boolean('is_red_flagged').notNull().default(false),
  redFlagDetails: jsonb('red_flag_details').default({}),
  overrideApplied: boolean('override_applied').notNull().default(false),
  overrideReason: text('override_reason'),
  calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type BaselineAssessmentRow = typeof baselineAssessments.$inferSelect;
export type CodeReviewAssignmentRow = typeof codeReviewAssignments.$inferSelect;
export type CodeReviewSubmissionRow = typeof codeReviewSubmissions.$inferSelect;
export type BuildSandboxTicketRow = typeof buildSandboxTickets.$inferSelect;
export type BuildSandboxSubmissionRow = typeof buildSandboxSubmissions.$inferSelect;
export type RecordedExplanationSubmissionRow = typeof recordedExplanationSubmissions.$inferSelect;
export type CandidateCompositeScoreRow = typeof candidateCompositeScores.$inferSelect;


