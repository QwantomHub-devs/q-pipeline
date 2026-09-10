import { z } from 'zod';

export const initiateBaselineSchema = z.object({
  fellowProfileId: z.string().uuid({ message: 'Invalid fellow profile UUID' }),
  githubUsername: z
    .string()
    .min(1, { message: 'GitHub username is required' })
    .max(255, { message: 'GitHub username too long' })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: 'Invalid GitHub username format' }),
});

export const quizWebhookPayloadSchema = z.object({
  fellowProfileId: z.string().uuid({ message: 'Invalid fellow profile UUID' }),
  quizScore: z.number().min(0).max(100),
  totalQuestions: z.number().optional(),
  correctAnswers: z.number().optional(),
});

export const testCaseResultSchema = z.object({
  name: z.string().min(1),
  passed: z.boolean(),
  durationMs: z.number().optional(),
  errorMessage: z.string().optional(),
});

export const githubGradingWebhookPayloadSchema = z.object({
  fellowProfileId: z.string().uuid({ message: 'Invalid fellow profile UUID' }),
  repoUrl: z.string().url({ message: 'Invalid repository URL' }),
  codingScore: z.number().min(0).max(100),
  testResults: z.array(testCaseResultSchema),
  graderLogs: z.string().optional(),
});

// Service 10: Module 1 Code Review Validation Schemas
export const bugCategorySchema = z.enum(['hallucination', 'logic', 'security']);
export const bugSeveritySchema = z.enum(['critical', 'warning', 'info']);

export const identifiedBugInputSchema = z.object({
  bugCategory: bugCategorySchema,
  severityRank: bugSeveritySchema,
  proposedFix: z
    .string()
    .min(10, { message: 'Proposed fix must be at least 10 characters' })
    .max(2000, { message: 'Proposed fix cannot exceed 2000 characters' }),
  reasoning: z
    .string()
    .min(10, { message: 'Reasoning must be at least 10 characters' })
    .max(2000, { message: 'Reasoning cannot exceed 2000 characters' }),
});

export const submitCodeReviewSchema = z.object({
  fellowProfileId: z.string().uuid({ message: 'Invalid fellow profile UUID' }),
  submissionId: z.string().uuid({ message: 'Invalid submission UUID' }),
  identifiedIssues: z
    .array(identifiedBugInputSchema)
    .min(1, { message: 'At least one identified issue is required' })
    .max(5, { message: 'Cannot submit more than 5 issues' }),
});

export const finalizeGradingSchema = z.object({
  submissionId: z.string().uuid({ message: 'Invalid submission UUID' }),
  issuesIdentifiedScore: z.number().min(0).max(4),
  severityRankingScore: z.number().min(0).max(4),
  fixQualityScore: z.number().min(0).max(4),
  reasoningClarityScore: z.number().min(0).max(4),
});

// Service 11: Module 2 Build Sandbox Validation Schemas
export const startModule2Schema = z.object({
  fellowProfileId: z.string().uuid({ message: 'Invalid fellow profile UUID' }),
  ticketId: z.string().uuid({ message: 'Invalid ticket UUID' }).optional(),
});

export const telemetryEventTypeSchema = z.enum([
  'code_edit',
  'external_copy',
  'test_run',
  'commit',
  'trap_triggered',
]);

export const telemetryEventSchema = z.object({
  timestamp: z.string(),
  eventType: telemetryEventTypeSchema,
  payload: z.record(z.unknown()),
});

export const ingestTelemetrySchema = z.object({
  submissionId: z.string().uuid({ message: 'Invalid submission UUID' }),
  fellowProfileId: z.string().uuid({ message: 'Invalid fellow profile UUID' }),
  events: z.array(telemetryEventSchema).min(1, { message: 'At least one telemetry event is required' }),
});

export const submitModule2Schema = z.object({
  fellowProfileId: z.string().uuid({ message: 'Invalid fellow profile UUID' }),
  submissionId: z.string().uuid({ message: 'Invalid submission UUID' }),
  repositoryUrl: z.string().url({ message: 'Invalid repository URL' }).nullable().optional(),
});

export const finalizeModule2GradingSchema = z.object({
  submissionId: z.string().uuid({ message: 'Invalid submission UUID' }),
  correctness: z.number().min(0).max(4),
  verificationBehavior: z.number().min(0).max(4),
  securityAwareness: z.number().min(0).max(4),
  codeQuality: z.number().min(0).max(4),
  efficiency: z.number().min(0).max(4),
});

// Service 12: Module 3 Recorded Explanation Intake Validation Schemas
export const startModule3Schema = z.object({
  fellowProfileId: z.string().uuid({ message: 'Invalid fellow profile UUID' }),
  sandboxSubmissionId: z.string().uuid({ message: 'Invalid sandbox submission UUID' }).optional(),
});

export const submitModule3Schema = z.object({
  fellowProfileId: z.string().uuid({ message: 'Invalid fellow profile UUID' }),
  submissionId: z.string().uuid({ message: 'Invalid submission UUID' }),
  videoUrl: z.string().url({ message: 'Valid video URL is required' }),
  videoDurationSeconds: z
    .number()
    .min(1, { message: 'Video duration must be at least 1 second' })
    .max(300, { message: 'Video duration cannot exceed 5 minutes (300 seconds)' }),
  transcriptionText: z.string().optional(),
});

export const assignPostHocQuestionsSchema = z.object({
  submissionId: z.string().uuid({ message: 'Invalid submission UUID' }),
  prompts: z
    .array(z.string().min(5, { message: 'Question prompt must be at least 5 characters' }))
    .min(1, { message: 'At least 1 post-hoc submission question is required' })
    .max(3, { message: 'Cannot assign more than 3 post-hoc questions' }),
});

export const finalizeModule3GradingSchema = z.object({
  submissionId: z.string().uuid({ message: 'Invalid submission UUID' }),
  architectureArticulation: z.number().min(0).max(4),
  trapExplanation: z.number().min(0).max(4),
  aiTransparency: z.number().min(0).max(4),
  communicationClarity: z.number().min(0).max(4),
  authenticityPassed: z.boolean().default(true),
  authenticityNotes: z.string().optional(),
});

// Service 13: Scoring & Rubric Engine Validation Schemas
export const candidatePlacementTierSchema = z.enum([
  'tier_1_global',
  'tier_2_regional',
  'tier_3_bench',
  'tier_4_rejected',
]);

export const calculateCompositeScoreSchema = z.object({
  fellowProfileId: z.string().uuid({ message: 'Invalid fellow profile UUID' }),
});

export const overrideCandidateTierSchema = z.object({
  fellowProfileId: z.string().uuid({ message: 'Invalid fellow profile UUID' }),
  newTier: candidatePlacementTierSchema,
  overrideScore: z.number().min(0).max(100).optional(),
  reason: z
    .string()
    .min(10, { message: 'Override reason must be at least 10 characters' })
    .max(1000, { message: 'Override reason cannot exceed 1000 characters' }),
});



