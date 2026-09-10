import { db } from '@/lib/db';
import { baselineAssessments, BaselineAssessmentRow } from './schema';
import { fellowProfiles } from '../identity/schema';
import { eq } from 'drizzle-orm';
import { assertCanAccessFellowRecord } from '@/lib/auth';
import { AuthActor } from '../identity/types';
import {
  initiateBaselineSchema,
  quizWebhookPayloadSchema,
  githubGradingWebhookPayloadSchema,
} from './validation';
import {
  BaselineAssessmentRecord,
  InitiateBaselineInput,
  QuizWebhookPayload,
  GitHubGradingWebhookPayload,
  BaselineFeedback,
} from './types';

const SHARED_WEBHOOK_SECRET = process.env.QPIPELINE_WEBHOOK_SECRET || 'qpipeline_webhook_secret_dev';

function mapRowToRecord(row: BaselineAssessmentRow): BaselineAssessmentRecord {
  return {
    id: row.id,
    fellowProfileId: row.fellowProfileId,
    githubUsername: row.githubUsername,
    githubRepoUrl: row.githubRepoUrl,
    quizScore: row.quizScore ?? 0,
    quizStatus: (row.quizStatus as any) || 'pending',
    codingScore: row.codingScore ?? 0,
    codingStatus: (row.codingStatus as any) || 'pending',
    compositeScore: row.compositeScore ?? 0,
    status: (row.status as any) || 'not_started',
    feedback: (row.feedback as BaselineFeedback) || {},
    submittedAt: row.submittedAt,
    gradedAt: row.gradedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Retrieves the Stage 0 baseline assessment record for a fellow.
 * Enforces Rule 5 record ownership authorization.
 */
export async function getBaselineAssessment(
  fellowProfileId: string,
  actor: AuthActor
): Promise<BaselineAssessmentRecord | null> {
  // Fetch fellow profile to get clerkUserId for Rule 5 assertion
  const [profile] = await db
    .select()
    .from(fellowProfiles)
    .where(eq(fellowProfiles.id, fellowProfileId))
    .limit(1);

  if (profile) {
    assertCanAccessFellowRecord(actor, profile.clerkUserId);
  }

  const [row] = await db
    .select()
    .from(baselineAssessments)
    .where(eq(baselineAssessments.fellowProfileId, fellowProfileId))
    .limit(1);

  if (!row) return null;
  return mapRowToRecord(row);
}

/**
 * Initiates Stage 0 baseline assessment for a fellow.
 * Links their GitHub username and provisions initial assignment repo URL.
 */
export async function initiateBaselineAssessment(
  input: InitiateBaselineInput,
  actor: AuthActor
): Promise<BaselineAssessmentRecord> {
  const validated = initiateBaselineSchema.parse(input);

  const [profile] = await db
    .select()
    .from(fellowProfiles)
    .where(eq(fellowProfiles.id, validated.fellowProfileId))
    .limit(1);

  if (profile) {
    assertCanAccessFellowRecord(actor, profile.clerkUserId);
  }

  const repoUrl = `https://github.com/qwantomhub-classroom/baseline-${validated.githubUsername}`;

  // Check if record already exists
  const existing = await db
    .select()
    .from(baselineAssessments)
    .where(eq(baselineAssessments.fellowProfileId, validated.fellowProfileId))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(baselineAssessments)
      .set({
        githubUsername: validated.githubUsername,
        githubRepoUrl: repoUrl,
        codingStatus: 'in_progress',
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(eq(baselineAssessments.fellowProfileId, validated.fellowProfileId))
      .returning();
    return mapRowToRecord(updated);
  }

  const [inserted] = await db
    .insert(baselineAssessments)
    .values({
      fellowProfileId: validated.fellowProfileId,
      githubUsername: validated.githubUsername,
      githubRepoUrl: repoUrl,
      codingStatus: 'in_progress',
      status: 'in_progress',
    })
    .returning();

  return mapRowToRecord(inserted);
}

/**
 * Ingests Google Forms / Apps Script quiz webhook payload.
 * Verifies secret header and calculates score update.
 */
export async function ingestQuizWebhook(
  payload: QuizWebhookPayload,
  secretHeader: string | null
): Promise<BaselineAssessmentRecord> {
  if (secretHeader !== SHARED_WEBHOOK_SECRET) {
    throw new Error('Unauthorized webhook secret header');
  }

  const validated = quizWebhookPayloadSchema.parse(payload);

  const [existing] = await db
    .select()
    .from(baselineAssessments)
    .where(eq(baselineAssessments.fellowProfileId, validated.fellowProfileId))
    .limit(1);

  const quizStatus = validated.quizScore >= 60 ? 'passed' : 'failed';
  const existingCodingScore = existing?.codingScore ?? 0;
  const existingCodingStatus = existing?.codingStatus || 'pending';

  // Weighting: Quiz 40%, Coding 60%
  const compositeScore = Math.round(validated.quizScore * 0.4 + existingCodingScore * 0.6);

  let overallStatus: 'in_progress' | 'passed' | 'failed' = 'in_progress';
  if (existingCodingStatus === 'passed' || existingCodingStatus === 'failed') {
    overallStatus =
      compositeScore >= 70 && quizStatus === 'passed' && existingCodingStatus === 'passed'
        ? 'passed'
        : 'failed';
  }

  const currentFeedback = (existing?.feedback as BaselineFeedback) || {};
  const updatedFeedback: BaselineFeedback = {
    ...currentFeedback,
    quizSummary: {
      totalQuestions: validated.totalQuestions ?? 10,
      correctAnswers: validated.correctAnswers ?? Math.round((validated.quizScore / 100) * 10),
      completedAt: new Date().toISOString(),
    },
  };

  let record: BaselineAssessmentRow;

  if (existing) {
    [record] = await db
      .update(baselineAssessments)
      .set({
        quizScore: validated.quizScore,
        quizStatus,
        compositeScore,
        status: overallStatus,
        feedback: updatedFeedback,
        updatedAt: new Date(),
      })
      .where(eq(baselineAssessments.fellowProfileId, validated.fellowProfileId))
      .returning();
  } else {
    [record] = await db
      .insert(baselineAssessments)
      .values({
        fellowProfileId: validated.fellowProfileId,
        quizScore: validated.quizScore,
        quizStatus,
        compositeScore,
        status: overallStatus,
        feedback: updatedFeedback,
      })
      .returning();
  }

  // Update Fellow Profile Stage if overall passed
  if (overallStatus === 'passed') {
    await db
      .update(fellowProfiles)
      .set({ stage: 'assessing', updatedAt: new Date() })
      .where(eq(fellowProfiles.id, validated.fellowProfileId));
  }

  return mapRowToRecord(record);
}

/**
 * Ingests GitHub Actions test execution webhook payload.
 * Verifies secret header and calculates score & stage transition.
 */
export async function ingestGitHubGradingWebhook(
  payload: GitHubGradingWebhookPayload,
  secretHeader: string | null
): Promise<BaselineAssessmentRecord> {
  if (secretHeader !== SHARED_WEBHOOK_SECRET) {
    throw new Error('Unauthorized webhook secret header');
  }

  const validated = githubGradingWebhookPayloadSchema.parse(payload);

  const [existing] = await db
    .select()
    .from(baselineAssessments)
    .where(eq(baselineAssessments.fellowProfileId, validated.fellowProfileId))
    .limit(1);

  const codingStatus = validated.codingScore >= 60 ? 'passed' : 'failed';
  const existingQuizScore = existing?.quizScore ?? 0;
  const existingQuizStatus = existing?.quizStatus || 'pending';

  // Weighting: Quiz 40%, Coding 60%
  const compositeScore = Math.round(existingQuizScore * 0.4 + validated.codingScore * 0.6);

  let overallStatus: 'in_progress' | 'passed' | 'failed' = 'in_progress';
  if (existingQuizStatus === 'passed' || existingQuizStatus === 'failed') {
    overallStatus =
      compositeScore >= 70 && codingStatus === 'passed' && existingQuizStatus === 'passed'
        ? 'passed'
        : 'failed';
  }

  const currentFeedback = (existing?.feedback as BaselineFeedback) || {};
  const updatedFeedback: BaselineFeedback = {
    ...currentFeedback,
    testResults: validated.testResults,
    graderLogs: validated.graderLogs || 'GitHub Actions grading workflow run completed.',
  };

  let record: BaselineAssessmentRow;

  if (existing) {
    [record] = await db
      .update(baselineAssessments)
      .set({
        githubRepoUrl: validated.repoUrl,
        codingScore: validated.codingScore,
        codingStatus,
        compositeScore,
        status: overallStatus,
        feedback: updatedFeedback,
        submittedAt: existing.submittedAt || new Date(),
        gradedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(baselineAssessments.fellowProfileId, validated.fellowProfileId))
      .returning();
  } else {
    [record] = await db
      .insert(baselineAssessments)
      .values({
        fellowProfileId: validated.fellowProfileId,
        githubRepoUrl: validated.repoUrl,
        codingScore: validated.codingScore,
        codingStatus,
        compositeScore,
        status: overallStatus,
        feedback: updatedFeedback,
        submittedAt: new Date(),
        gradedAt: new Date(),
      })
      .returning();
  }

  // Update Fellow Profile Stage if overall passed
  if (overallStatus === 'passed') {
    await db
      .update(fellowProfiles)
      .set({ stage: 'assessing', updatedAt: new Date() })
      .where(eq(fellowProfiles.id, validated.fellowProfileId));
  }

  return mapRowToRecord(record);
}
