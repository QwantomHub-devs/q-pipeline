'use server';

import { auth } from '@clerk/nextjs/server';
import { getFellowProfileByClerkId } from '../identity/service';
import {
  getBaselineAssessment,
  initiateBaselineAssessment,
} from './service';
import {
  getModule1Submission,
  startModule1Assessment,
  submitModule1Review,
  finalizeModule1Grading,
  getModule1ReviewQueue,
} from './module1-service';
import {
  startModule2Assessment,
  submitModule2Assessment,
  getModule2SubmissionForFellow,
  listModule2SubmissionsForAdmin,
  finalizeModule2Grading,
} from './module2-service';
import {
  startModule3Assessment,
  submitModule3Assessment,
  getModule3SubmissionForFellow,
  listModule3SubmissionsForAdmin,
  finalizeModule3Grading,
  assignPostHocQuestions,
} from './module3-service';
import {
  calculateCandidateCompositeScore,
  overrideCandidateTierAndScore,
  getCompositeScoreForFellow,
  listCandidateScoringMatrixForAdmin,
} from './scoring-service';
import {
  BaselineAssessmentRecord,
  CodeReviewSubmission,
  IdentifiedBugInput,
  RubricCriterionScores,
  BuildSandboxSubmission,
  Module2RubricScores,
  RecordedExplanationSubmission,
  Module3RubricScores,
  CandidateCompositeScore,
  CandidatePlacementTier,
} from './types';
import { AuthActor } from '../identity/types';

export async function getMyBaselineAssessmentAction(): Promise<{
  success: boolean;
  data?: BaselineAssessmentRecord | null;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const requestingUser: AuthActor = { clerkUserId: userId, roles: ['fellow'] };
    const profile = await getFellowProfileByClerkId(userId, requestingUser);
    if (!profile) {
      return { success: false, error: 'Fellow profile spine not found' };
    }

    const record = await getBaselineAssessment(profile.id, requestingUser);
    return { success: true, data: record };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch baseline assessment' };
  }
}

export async function initiateBaselineAction(githubUsername: string): Promise<{
  success: boolean;
  data?: BaselineAssessmentRecord;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const requestingUser: AuthActor = { clerkUserId: userId, roles: ['fellow'] };
    const profile = await getFellowProfileByClerkId(userId, requestingUser);
    if (!profile) {
      return { success: false, error: 'Fellow profile spine not found' };
    }

    const record = await initiateBaselineAssessment(
      { fellowProfileId: profile.id, githubUsername },
      requestingUser
    );
    return { success: true, data: record };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to initiate baseline assessment' };
  }
}

// Module 1 Actions
export async function getMyModule1SubmissionAction(): Promise<{
  success: boolean;
  data?: CodeReviewSubmission | null;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const requestingUser: AuthActor = { clerkUserId: userId, roles: ['fellow'] };
    const profile = await getFellowProfileByClerkId(userId, requestingUser);
    if (!profile) {
      return { success: false, error: 'Fellow profile spine not found' };
    }

    const submission = await getModule1Submission(profile.id, requestingUser);
    return { success: true, data: submission };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch Module 1 submission' };
  }
}

export async function startModule1Action(): Promise<{
  success: boolean;
  data?: CodeReviewSubmission;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const requestingUser: AuthActor = { clerkUserId: userId, roles: ['fellow'] };
    const profile = await getFellowProfileByClerkId(userId, requestingUser);
    if (!profile) {
      return { success: false, error: 'Fellow profile spine not found' };
    }

    const submission = await startModule1Assessment(profile.id, requestingUser);
    return { success: true, data: submission };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to start Module 1 assessment' };
  }
}

export async function submitModule1ReviewAction(
  submissionId: string,
  identifiedIssues: IdentifiedBugInput[]
): Promise<{
  success: boolean;
  data?: CodeReviewSubmission;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const requestingUser: AuthActor = { clerkUserId: userId, roles: ['fellow'] };
    const profile = await getFellowProfileByClerkId(userId, requestingUser);
    if (!profile) {
      return { success: false, error: 'Fellow profile spine not found' };
    }

    const submission = await submitModule1Review(
      profile.id,
      submissionId,
      identifiedIssues,
      requestingUser
    );
    return { success: true, data: submission };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit code review' };
  }
}

export async function getModule1ReviewQueueAction(): Promise<{
  success: boolean;
  data?: CodeReviewSubmission[];
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const adminUser: AuthActor = { clerkUserId: userId, roles: ['admin'] };
    const queue = await getModule1ReviewQueue(adminUser);
    return { success: true, data: queue };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch review queue' };
  }
}

export async function finalizeModule1GradingAction(
  submissionId: string,
  criterionScores: RubricCriterionScores
): Promise<{
  success: boolean;
  data?: CodeReviewSubmission;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const adminUser: AuthActor = { clerkUserId: userId, roles: ['admin'] };
    const submission = await finalizeModule1Grading(submissionId, criterionScores, adminUser);
    return { success: true, data: submission };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to finalize grading' };
  }
}

// Module 2 Server Actions
export async function getMyModule2SubmissionAction(): Promise<{
  success: boolean;
  data?: BuildSandboxSubmission | null;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const requestingUser: AuthActor = { clerkUserId: userId, roles: ['fellow'] };
    const profile = await getFellowProfileByClerkId(userId, requestingUser);
    if (!profile) {
      return { success: false, error: 'Fellow profile spine not found' };
    }

    const submission = await getModule2SubmissionForFellow(requestingUser, profile.id);
    return { success: true, data: submission };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch Module 2 submission' };
  }
}

export async function startModule2Action(ticketId?: string): Promise<{
  success: boolean;
  data?: { ticket: any; submission: BuildSandboxSubmission };
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const requestingUser: AuthActor = { clerkUserId: userId, roles: ['fellow'] };
    const profile = await getFellowProfileByClerkId(userId, requestingUser);
    if (!profile) {
      return { success: false, error: 'Fellow profile spine not found' };
    }

    const result = await startModule2Assessment(requestingUser, {
      fellowProfileId: profile.id,
      ticketId,
    });
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to start Module 2 assessment' };
  }
}

export async function submitModule2Action(
  submissionId: string,
  repositoryUrl?: string
): Promise<{
  success: boolean;
  data?: BuildSandboxSubmission;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const requestingUser: AuthActor = { clerkUserId: userId, roles: ['fellow'] };
    const profile = await getFellowProfileByClerkId(userId, requestingUser);
    if (!profile) {
      return { success: false, error: 'Fellow profile spine not found' };
    }

    const submission = await submitModule2Assessment(requestingUser, {
      fellowProfileId: profile.id,
      submissionId,
      repositoryUrl,
    });
    return { success: true, data: submission };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit Module 2 assessment' };
  }
}

export async function getModule2SandboxQueueAction(): Promise<{
  success: boolean;
  data?: BuildSandboxSubmission[];
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const adminUser: AuthActor = { clerkUserId: userId, roles: ['admin'] };
    const queue = await listModule2SubmissionsForAdmin(adminUser);
    return { success: true, data: queue };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch sandbox queue' };
  }
}

export async function finalizeModule2GradingAction(
  submissionId: string,
  scores: Module2RubricScores
): Promise<{
  success: boolean;
  data?: BuildSandboxSubmission;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const adminUser: AuthActor = { clerkUserId: userId, roles: ['admin'] };
    const submission = await finalizeModule2Grading(adminUser, {
      submissionId,
      ...scores,
    });
    return { success: true, data: submission };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to finalize Module 2 grading' };
  }
}

// Module 3 Server Actions
export async function getMyModule3SubmissionAction(): Promise<{
  success: boolean;
  data?: RecordedExplanationSubmission | null;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const requestingUser: AuthActor = { clerkUserId: userId, roles: ['fellow'] };
    const profile = await getFellowProfileByClerkId(userId, requestingUser);
    if (!profile) {
      return { success: false, error: 'Fellow profile spine not found' };
    }

    const submission = await getModule3SubmissionForFellow(requestingUser, profile.id);
    return { success: true, data: submission };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch Module 3 submission' };
  }
}

export async function startModule3Action(sandboxSubmissionId?: string): Promise<{
  success: boolean;
  data?: RecordedExplanationSubmission;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const requestingUser: AuthActor = { clerkUserId: userId, roles: ['fellow'] };
    const profile = await getFellowProfileByClerkId(userId, requestingUser);
    if (!profile) {
      return { success: false, error: 'Fellow profile spine not found' };
    }

    const submission = await startModule3Assessment(requestingUser, {
      fellowProfileId: profile.id,
      sandboxSubmissionId,
    });
    return { success: true, data: submission };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to start Module 3 assessment' };
  }
}

export async function submitModule3Action(
  submissionId: string,
  videoUrl: string,
  videoDurationSeconds: number,
  transcriptionText?: string
): Promise<{
  success: boolean;
  data?: RecordedExplanationSubmission;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const requestingUser: AuthActor = { clerkUserId: userId, roles: ['fellow'] };
    const profile = await getFellowProfileByClerkId(userId, requestingUser);
    if (!profile) {
      return { success: false, error: 'Fellow profile spine not found' };
    }

    const submission = await submitModule3Assessment(requestingUser, {
      fellowProfileId: profile.id,
      submissionId,
      videoUrl,
      videoDurationSeconds,
      transcriptionText,
    });
    return { success: true, data: submission };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit Module 3 video explanation' };
  }
}

export async function getModule3VideoQueueAction(): Promise<{
  success: boolean;
  data?: RecordedExplanationSubmission[];
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const adminUser: AuthActor = { clerkUserId: userId, roles: ['admin'] };
    const queue = await listModule3SubmissionsForAdmin(adminUser);
    return { success: true, data: queue };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch video explanation queue' };
  }
}

export async function assignPostHocQuestionsAction(
  submissionId: string,
  prompts: string[]
): Promise<{
  success: boolean;
  data?: RecordedExplanationSubmission;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const adminUser: AuthActor = { clerkUserId: userId, roles: ['admin'] };
    const submission = await assignPostHocQuestions(adminUser, {
      submissionId,
      prompts,
    });
    return { success: true, data: submission };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to assign post-hoc questions' };
  }
}

export async function finalizeModule3GradingAction(
  submissionId: string,
  scores: Module3RubricScores,
  authenticityPassed: boolean = true,
  authenticityNotes?: string
): Promise<{
  success: boolean;
  data?: RecordedExplanationSubmission;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const adminUser: AuthActor = { clerkUserId: userId, roles: ['admin'] };
    const submission = await finalizeModule3Grading(adminUser, {
      submissionId,
      ...scores,
      authenticityPassed,
      authenticityNotes,
    });
    return { success: true, data: submission };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to finalize Module 3 grading' };
  }
}

// Service 13 Server Actions
export async function getMyCompositeScoreAction(): Promise<{
  success: boolean;
  data?: CandidateCompositeScore | null;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const requestingUser: AuthActor = { clerkUserId: userId, roles: ['fellow'] };
    const profile = await getFellowProfileByClerkId(userId, requestingUser);
    if (!profile) {
      return { success: false, error: 'Fellow profile spine not found' };
    }

    const score = await getCompositeScoreForFellow(requestingUser, profile.id);
    return { success: true, data: score };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch composite score' };
  }
}

export async function calculateMyCompositeScoreAction(): Promise<{
  success: boolean;
  data?: CandidateCompositeScore;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const requestingUser: AuthActor = { clerkUserId: userId, roles: ['fellow'] };
    const profile = await getFellowProfileByClerkId(userId, requestingUser);
    if (!profile) {
      return { success: false, error: 'Fellow profile spine not found' };
    }

    const score = await calculateCandidateCompositeScore(requestingUser, { fellowProfileId: profile.id });
    return { success: true, data: score };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to calculate composite score' };
  }
}

export async function getAdminScoringMatrixAction(): Promise<{
  success: boolean;
  data?: Array<CandidateCompositeScore & { fellowName?: string; fellowEmail?: string }>;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const adminUser: AuthActor = { clerkUserId: userId, roles: ['admin'] };
    const matrix = await listCandidateScoringMatrixForAdmin(adminUser);
    return { success: true, data: matrix };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch scoring matrix' };
  }
}

export async function overrideCandidateTierAction(
  fellowProfileId: string,
  newTier: CandidatePlacementTier,
  reason: string,
  overrideScore?: number
): Promise<{
  success: boolean;
  data?: CandidateCompositeScore;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const adminUser: AuthActor = { clerkUserId: userId, roles: ['admin'] };
    const score = await overrideCandidateTierAndScore(adminUser, {
      fellowProfileId,
      newTier,
      reason,
      overrideScore,
    });
    return { success: true, data: score };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to override candidate tier' };
  }
}



