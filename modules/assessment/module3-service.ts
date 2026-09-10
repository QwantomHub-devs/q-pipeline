import { db } from '@/lib/db';
import {
  recordedExplanationSubmissions,
  RecordedExplanationSubmissionRow,
} from './schema';
import { fellowProfiles } from '../identity/schema';
import { eq, desc } from 'drizzle-orm';
import { assertCanAccessFellowRecord, requireRole } from '@/lib/auth';
import { AuthActor } from '../identity/types';
import {
  startModule3Schema,
  submitModule3Schema,
  finalizeModule3GradingSchema,
  assignPostHocQuestionsSchema,
} from './validation';
import {
  RecordedExplanationSubmission,
  Module3RubricScores,
  calculateModule3WeightedScore,
} from './types';

/**
 * Maps database row to domain type RecordedExplanationSubmission
 */
function mapSubmissionRowToDomain(row: RecordedExplanationSubmissionRow): RecordedExplanationSubmission {
  const rubricScores = (row.rubricScores as Module3RubricScores) || {
    architectureArticulation: 0,
    trapExplanation: 0,
    aiTransparency: 0,
    communicationClarity: 0,
  };

  const specificQuestionPrompts = Array.isArray(row.specificQuestionPrompts)
    ? (row.specificQuestionPrompts as string[])
    : [];

  return {
    id: row.id,
    fellowProfileId: row.fellowProfileId,
    sandboxSubmissionId: row.sandboxSubmissionId,
    status: row.status as 'in_progress' | 'submitted' | 'graded',
    videoUrl: row.videoUrl,
    videoDurationSeconds: row.videoDurationSeconds || 0,
    transcriptionText: row.transcriptionText,
    weightedScore: row.weightedScore || 0,
    criterionScores: rubricScores,
    isLate: row.isLate,
    specificQuestionPrompts,
    authenticityPassed: row.authenticityPassed ?? true,
    authenticityNotes: row.authenticityNotes || null,
    startedAt: row.startedAt,
    submittedAt: row.submittedAt,
    gradedAt: row.gradedAt,
    reviewerUserId: row.reviewerUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export { calculateModule3WeightedScore } from './types';


/**
 * Admin assigns post-hoc submission-specific prompts picked from candidate's Module 2 sandbox work.
 */
export async function assignPostHocQuestions(
  actor: AuthActor,
  rawInput: { submissionId: string; prompts: string[] }
): Promise<RecordedExplanationSubmission> {
  requireRole(actor, 'admin');
  const input = assignPostHocQuestionsSchema.parse(rawInput);

  const existing = await db
    .select()
    .from(recordedExplanationSubmissions)
    .where(eq(recordedExplanationSubmissions.id, input.submissionId))
    .limit(1);

  if (existing.length === 0) {
    throw new Error(`Submission with ID ${input.submissionId} not found.`);
  }

  const [updated] = await db
    .update(recordedExplanationSubmissions)
    .set({
      specificQuestionPrompts: input.prompts,
      updatedAt: new Date(),
    })
    .where(eq(recordedExplanationSubmissions.id, input.submissionId))
    .returning();

  return mapSubmissionRowToDomain(updated);
}

/**
 * Initiate or resume Module 3 assessment for a fellow.
 */
export async function startModule3Assessment(
  actor: AuthActor,
  rawInput: { fellowProfileId: string; sandboxSubmissionId?: string }
): Promise<RecordedExplanationSubmission> {
  const input = startModule3Schema.parse(rawInput);
  await assertCanAccessFellowRecord(actor, input.fellowProfileId);

  // Ensure candidate fellow exists
  const fellow = await db
    .select()
    .from(fellowProfiles)
    .where(eq(fellowProfiles.id, input.fellowProfileId))
    .limit(1);

  if (fellow.length === 0) {
    throw new Error(`Fellow profile with ID ${input.fellowProfileId} not found.`);
  }

  // Check if fellow already has an active submission
  const existingSubmissions = await db
    .select()
    .from(recordedExplanationSubmissions)
    .where(eq(recordedExplanationSubmissions.fellowProfileId, input.fellowProfileId))
    .orderBy(desc(recordedExplanationSubmissions.createdAt))
    .limit(1);

  if (existingSubmissions.length > 0) {
    return mapSubmissionRowToDomain(existingSubmissions[0]);
  }

  const [inserted] = await db
    .insert(recordedExplanationSubmissions)
    .values({
      fellowProfileId: input.fellowProfileId,
      sandboxSubmissionId: input.sandboxSubmissionId || null,
      status: 'in_progress',
      startedAt: new Date(),
    })
    .returning();

  return mapSubmissionRowToDomain(inserted);
}

/**
 * Submit candidate's completed video explanation.
 * Enforces video duration check (max 180s for 3-minute video limit).
 */
export async function submitModule3Assessment(
  actor: AuthActor,
  rawInput: {
    fellowProfileId: string;
    submissionId: string;
    videoUrl: string;
    videoDurationSeconds: number;
    transcriptionText?: string;
  }
): Promise<RecordedExplanationSubmission> {
  const input = submitModule3Schema.parse(rawInput);
  await assertCanAccessFellowRecord(actor, input.fellowProfileId);

  const existing = await db
    .select()
    .from(recordedExplanationSubmissions)
    .where(eq(recordedExplanationSubmissions.id, input.submissionId))
    .limit(1);

  if (existing.length === 0) {
    throw new Error(`Submission with ID ${input.submissionId} not found.`);
  }

  const sub = existing[0];
  if (sub.fellowProfileId !== input.fellowProfileId) {
    throw new Error('Unauthorized access: submission belongs to another candidate.');
  }

  const now = new Date();
  const isOverDurationLimit = input.videoDurationSeconds > 180; // 3-minute hard limit

  const [updated] = await db
    .update(recordedExplanationSubmissions)
    .set({
      status: 'submitted',
      videoUrl: input.videoUrl,
      videoDurationSeconds: input.videoDurationSeconds,
      transcriptionText: input.transcriptionText || null,
      isLate: isOverDurationLimit,
      submittedAt: now,
      updatedAt: now,
    })
    .where(eq(recordedExplanationSubmissions.id, input.submissionId))
    .returning();

  return mapSubmissionRowToDomain(updated);
}

/**
 * Admin calibration and final rubric grading for Module 3.
 * Calculates 0-100% weighted score and records explicit Authenticity Gate status.
 */
export async function finalizeModule3Grading(
  actor: AuthActor,
  rawInput: {
    submissionId: string;
    architectureArticulation: number;
    trapExplanation: number;
    aiTransparency: number;
    communicationClarity: number;
    authenticityPassed?: boolean;
    authenticityNotes?: string;
  }
): Promise<RecordedExplanationSubmission> {
  requireRole(actor, 'admin');
  const input = finalizeModule3GradingSchema.parse(rawInput);

  const existing = await db
    .select()
    .from(recordedExplanationSubmissions)
    .where(eq(recordedExplanationSubmissions.id, input.submissionId))
    .limit(1);

  if (existing.length === 0) {
    throw new Error(`Submission with ID ${input.submissionId} not found.`);
  }

  const scores: Module3RubricScores = {
    architectureArticulation: input.architectureArticulation,
    trapExplanation: input.trapExplanation,
    aiTransparency: input.aiTransparency,
    communicationClarity: input.communicationClarity,
  };

  const weightedScore = calculateModule3WeightedScore(scores);

  const [updated] = await db
    .update(recordedExplanationSubmissions)
    .set({
      status: 'graded',
      rubricScores: scores,
      weightedScore,
      authenticityPassed: input.authenticityPassed ?? true,
      authenticityNotes: input.authenticityNotes || null,
      gradedAt: new Date(),
      reviewerUserId: actor.clerkUserId,
      updatedAt: new Date(),
    })
    .where(eq(recordedExplanationSubmissions.id, input.submissionId))
    .returning();

  return mapSubmissionRowToDomain(updated);
}

/**
 * Fetch latest Module 3 submission for a fellow profile.
 */
export async function getModule3SubmissionForFellow(
  actor: AuthActor,
  fellowProfileId: string
): Promise<RecordedExplanationSubmission | null> {
  await assertCanAccessFellowRecord(actor, fellowProfileId);

  const rows = await db
    .select()
    .from(recordedExplanationSubmissions)
    .where(eq(recordedExplanationSubmissions.fellowProfileId, fellowProfileId))
    .orderBy(desc(recordedExplanationSubmissions.createdAt))
    .limit(1);

  if (rows.length === 0) return null;
  return mapSubmissionRowToDomain(rows[0]);
}

/**
 * Fetch single submission by ID with authorization.
 */
export async function getModule3Submission(
  actor: AuthActor,
  submissionId: string
): Promise<RecordedExplanationSubmission> {
  const rows = await db
    .select()
    .from(recordedExplanationSubmissions)
    .where(eq(recordedExplanationSubmissions.id, submissionId))
    .limit(1);

  if (rows.length === 0) {
    throw new Error(`Submission with ID ${submissionId} not found.`);
  }

  const sub = rows[0];
  if (!actor.roles.includes('admin')) {
    await assertCanAccessFellowRecord(actor, sub.fellowProfileId);
  }

  return mapSubmissionRowToDomain(sub);
}

/**
 * List all submissions for admin video review queue.
 */
export async function listModule3SubmissionsForAdmin(
  actor: AuthActor
): Promise<RecordedExplanationSubmission[]> {
  requireRole(actor, 'admin');

  const rows = await db
    .select()
    .from(recordedExplanationSubmissions)
    .orderBy(desc(recordedExplanationSubmissions.createdAt));

  return rows.map(mapSubmissionRowToDomain);
}
