export type BaselineStatus = 'not_started' | 'in_progress' | 'passed' | 'failed';
export type SubStatus = 'pending' | 'in_progress' | 'passed' | 'failed';
export type BugCategory = 'hallucination' | 'logic' | 'security';
export type BugSeverity = 'critical' | 'warning' | 'info';

export interface TestCaseResult {
  name: string;
  passed: boolean;
  durationMs?: number;
  errorMessage?: string;
}

export interface BaselineFeedback {
  quizSummary?: {
    totalQuestions: number;
    correctAnswers: number;
    completedAt: string;
  };
  testResults?: TestCaseResult[];
  graderLogs?: string;
}

export interface BaselineAssessmentRecord {
  id: string;
  fellowProfileId: string;
  githubUsername: string | null;
  githubRepoUrl: string | null;
  quizScore: number;
  quizStatus: SubStatus;
  codingScore: number;
  codingStatus: SubStatus;
  compositeScore: number;
  status: BaselineStatus;
  feedback: BaselineFeedback;
  submittedAt: Date | null;
  gradedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InitiateBaselineInput {
  fellowProfileId: string;
  githubUsername: string;
}

export interface QuizWebhookPayload {
  fellowProfileId: string;
  quizScore: number;
  totalQuestions?: number;
  correctAnswers?: number;
}

export interface GitHubGradingWebhookPayload {
  fellowProfileId: string;
  repoUrl: string;
  codingScore: number;
  testResults: TestCaseResult[];
  graderLogs?: string;
}

// Module 1 Code Review Types
export interface PlantedBug {
  id: string;
  category: BugCategory;
  expectedSeverity: BugSeverity;
  description: string;
  location: string;
  hint: string;
}

export interface CodeReviewAssignment {
  id: string;
  slug: string;
  title: string;
  description: string;
  diffContent: string;
  plantedBugs: PlantedBug[];
  timeLimitMinutes: number;
  createdAt: Date;
}

export interface IdentifiedBugInput {
  bugCategory: BugCategory;
  severityRank: BugSeverity;
  proposedFix: string; // 10-2000 chars
  reasoning: string; // 10-2000 chars
}

export interface RubricCriterionScores {
  issuesIdentified: number; // 0-4
  severityRanking: number; // 0-4
  fixQuality: number; // 0-4
  reasoningClarity: number; // 0-4
}

export interface LLMEvaluationResult {
  draftScores: RubricCriterionScores;
  totalDraftScore: number; // 0-16
  rationale: string;
  issuesMatchedCount: number;
}

export interface CodeReviewSubmission {
  id: string;
  fellowProfileId: string;
  assignmentId: string;
  status: 'in_progress' | 'submitted' | 'graded';
  identifiedIssues: IdentifiedBugInput[];
  draftScore: number;
  finalScore: number;
  llmEvaluation: LLMEvaluationResult | null;
  criterionScores: RubricCriterionScores;
  isLate: boolean;
  startedAt: Date;
  submittedAt: Date | null;
  gradedAt: Date | null;
  reviewerUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  assignment?: CodeReviewAssignment;
}

// Module 2 Timed AI-Assisted Build Sandbox Types
export type TelemetryEventType = 'code_edit' | 'external_copy' | 'test_run' | 'commit' | 'trap_triggered';

export interface PlantedTrap {
  trapId: string;
  trapType: 'secret_leak' | 'deprecated_api' | 'security_flaw';
  secretToken?: string;
  description: string;
  expectedHandling: string;
}

export interface BuildSandboxTicket {
  id: string;
  ticketCode: string;
  title: string;
  scenarioDescription: string;
  codespaceTemplateUrl: string;
  plantedTraps: PlantedTrap[];
  timeLimitMinutes: number;
  createdAt: Date;
}

export interface TelemetryEvent {
  timestamp: string;
  eventType: TelemetryEventType;
  payload: Record<string, unknown>;
}

export interface Module2RubricScores {
  correctness: number; // 0-4
  verificationBehavior: number; // 0-4
  securityAwareness: number; // 0-4
  codeQuality: number; // 0-4
  efficiency: number; // 0-4
}

export interface BuildSandboxSubmission {
  id: string;
  fellowProfileId: string;
  ticketId: string;
  status: 'in_progress' | 'submitted' | 'graded';
  repositoryUrl: string | null;
  timeSpentSeconds: number;
  telemetryEvents: TelemetryEvent[];
  plantedTrapTriggered: boolean;
  autoRedFlagTriggered: boolean;
  redFlagReason: string | null;
  weightedScore: number; // 0-100%
  criterionScores: Module2RubricScores;
  isLate: boolean;
  startedAt: Date;
  submittedAt: Date | null;
  gradedAt: Date | null;
  reviewerUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  ticket?: BuildSandboxTicket;
}

// Module 3 Recorded Explanation Intake Types
export interface Module3RubricScores {
  architectureArticulation: number; // 0-4 (25%)
  trapExplanation: number; // 0-4 (25%)
  aiTransparency: number; // 0-4 (25%)
  communicationClarity: number; // 0-4 (25%)
}

export interface RecordedExplanationSubmission {
  id: string;
  fellowProfileId: string;
  sandboxSubmissionId: string | null;
  status: 'in_progress' | 'submitted' | 'graded';
  videoUrl: string | null;
  videoDurationSeconds: number;
  transcriptionText: string | null;
  weightedScore: number; // 0-100%
  criterionScores: Module3RubricScores;
  isLate: boolean;
  specificQuestionPrompts: string[];
  authenticityPassed: boolean;
  authenticityNotes: string | null;
  startedAt: Date;
  submittedAt: Date | null;
  gradedAt: Date | null;
  reviewerUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Service 13 Scoring & Rubric Engine Types
export type CandidatePlacementTier =
  | 'tier_1_global'
  | 'tier_2_regional'
  | 'tier_3_bench'
  | 'tier_4_rejected';

export interface CandidateCompositeScore {
  id: string;
  fellowProfileId: string;
  baselineScore: number;
  module1Score: number;
  module2Score: number;
  module3Score: number;
  overallCompositeScore: number;
  assignedTier: CandidatePlacementTier;
  isRedFlagged: boolean;
  redFlagDetails: Record<string, unknown>;
  overrideApplied: boolean;
  overrideReason: string | null;
  calculatedAt: Date;
  updatedAt: Date;
}

export function calculateModule2WeightedScore(scores: Module2RubricScores): number {
  const correctnessWeighted = (scores.correctness / 4) * 25;
  const verificationWeighted = (scores.verificationBehavior / 4) * 30;
  const securityWeighted = (scores.securityAwareness / 4) * 15;
  const qualityWeighted = (scores.codeQuality / 4) * 15;
  const efficiencyWeighted = (scores.efficiency / 4) * 15;

  return Math.round(
    correctnessWeighted + verificationWeighted + securityWeighted + qualityWeighted + efficiencyWeighted
  );
}

export function detectAutoRedFlag(scores: Module2RubricScores): boolean {
  return scores.efficiency >= 3 && scores.verificationBehavior === 0;
}

export function calculateModule3WeightedScore(scores: Module3RubricScores): number {
  const archWeighted = (scores.architectureArticulation / 4) * 25;
  const trapWeighted = (scores.trapExplanation / 4) * 25;
  const aiWeighted = (scores.aiTransparency / 4) * 25;
  const commWeighted = (scores.communicationClarity / 4) * 25;

  return Math.round(archWeighted + trapWeighted + aiWeighted + commWeighted);
}



