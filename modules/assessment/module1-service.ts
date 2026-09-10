import { db } from '@/lib/db';
import {
  codeReviewAssignments,
  codeReviewSubmissions,
  CodeReviewAssignmentRow,
  CodeReviewSubmissionRow,
} from './schema';
import { fellowProfiles } from '../identity/schema';
import { eq, desc } from 'drizzle-orm';
import { assertCanAccessFellowRecord, requireRole } from '@/lib/auth';
import { AuthActor } from '../identity/types';
import {
  identifiedBugInputSchema,
  submitCodeReviewSchema,
  finalizeGradingSchema,
} from './validation';
import {
  CodeReviewAssignment,
  CodeReviewSubmission,
  IdentifiedBugInput,
  LLMEvaluationResult,
  RubricCriterionScores,
  PlantedBug,
} from './types';

// Seed Scenarios for Rotation
const SEEDED_SCENARIOS: Array<{
  slug: string;
  title: string;
  description: string;
  diffContent: string;
  plantedBugs: PlantedBug[];
}> = [
  {
    slug: 'payment-webhook-handler',
    title: 'PR #104: Payment Webhook Handler & Fraud Prevention',
    description: 'Refactors payment webhook handler to support Stripe webhook signatures and fraud threshold checks.',
    diffContent: `@@ -14,8 +14,18 @@ export async function handleStripeWebhook(req: Request) {
   const body = await req.text();
   const signature = req.headers.get("stripe-signature");

-  // Legacy signature check
-  if (!signature) return new Response("Missing signature", { status: 400 });
+  // Planted Bug 1 (Hallucination): Non-existent Stripe API method
+  const isValid = await Stripe.verifyWebhookSignatureV3Async(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
+  if (!isValid) return new Response("Invalid signature", { status: 401 });

+  const event = JSON.parse(body);
+  // Planted Bug 3 (Security): Secret key leak in logger
+  console.log("Processing Stripe event with key:", process.env.STRIPE_SECRET_KEY);

+  // Planted Bug 2 (Logic): Wrong comparison operator allows transaction boundary fraud bypass
+  if (event.data.object.amount_in_cents > MAX_TRANSACTION_LIMIT_CENTS) {
+    await flagFraudulentTransaction(event.data.object.id);
+  }
   return new Response("OK", { status: 200 });
 }`,
    plantedBugs: [
      {
        id: 'bug-1',
        category: 'hallucination',
        expectedSeverity: 'warning',
        description: 'Hallucinated API call Stripe.verifyWebhookSignatureV3Async does not exist in Stripe SDK.',
        location: 'Line 18',
        hint: 'Check Stripe SDK documentation for webhook verification method signatures.',
      },
      {
        id: 'bug-2',
        category: 'logic',
        expectedSeverity: 'warning',
        description: 'Off-by-one/boundary logic bug: > should be >= to catch exact limit threshold.',
        location: 'Line 25',
        hint: 'Check boundary comparison condition.',
      },
      {
        id: 'bug-3',
        category: 'security',
        expectedSeverity: 'critical',
        description: 'Security leak: STRIPE_SECRET_KEY logged in application stdout logs.',
        location: 'Line 22',
        hint: 'Inspect secret environment variables in log output.',
      },
    ],
  },
  {
    slug: 'auth-token-refresher',
    title: 'PR #112: OAuth2 Token Rotation & Refresh Engine',
    description: 'Implements OAuth2 refresh token rotation and JWT signature validation.',
    diffContent: `@@ -10,6 +10,16 @@ export async function refreshTokenPair(refreshToken: string) {
+  // Planted Bug 1 (Security): Insecure JWT decode without signature verification
+  const decoded = jwt.decode(refreshToken);
+  const userId = decoded.sub;

+  // Planted Bug 2 (Hallucination): Non-existent Crypto quantum method
+  const newAccessToken = await Crypto.generateQuantumSafeHMAC(userId, process.env.JWT_SECRET);

+  // Planted Bug 3 (Logic): Subtraction instead of addition for expiration calculation
+  const expiresAt = Date.now() - (3600 * 1000);

   await saveSessionToken(userId, newAccessToken, expiresAt);
   return { accessToken: newAccessToken, expiresAt };
 }`,
    plantedBugs: [
      {
        id: 'bug-1',
        category: 'security',
        expectedSeverity: 'critical',
        description: 'Unverified JWT token decoded without cryptographic signature verification.',
        location: 'Line 11',
        hint: 'Check JWT token verification method.',
      },
      {
        id: 'bug-2',
        category: 'hallucination',
        expectedSeverity: 'info',
        description: 'Crypto.generateQuantumSafeHMAC is a hallucinated function.',
        location: 'Line 14',
        hint: 'Check Web Crypto API standard helper names.',
      },
      {
        id: 'bug-3',
        category: 'logic',
        expectedSeverity: 'warning',
        description: 'Logic flaw: Token expiration calculates past timestamp via subtraction.',
        location: 'Line 17',
        hint: 'Inspect timestamp calculation operator.',
      },
    ],
  },
];

function mapAssignmentRow(row: CodeReviewAssignmentRow): CodeReviewAssignment {
  if (!row) {
    return {
      id: '550e8400-e29b-41d4-a716-446655440002',
      slug: SEEDED_SCENARIOS[0].slug,
      title: SEEDED_SCENARIOS[0].title,
      description: SEEDED_SCENARIOS[0].description,
      diffContent: SEEDED_SCENARIOS[0].diffContent,
      plantedBugs: SEEDED_SCENARIOS[0].plantedBugs,
      timeLimitMinutes: 30,
      createdAt: new Date(),
    };
  }

  return {
    id: row.id || '550e8400-e29b-41d4-a716-446655440002',
    slug: row.slug || SEEDED_SCENARIOS[0].slug,
    title: row.title || SEEDED_SCENARIOS[0].title,
    description: row.description || SEEDED_SCENARIOS[0].description,
    diffContent: row.diffContent || SEEDED_SCENARIOS[0].diffContent,
    plantedBugs: (row.plantedBugs as PlantedBug[]) || SEEDED_SCENARIOS[0].plantedBugs,
    timeLimitMinutes: row.timeLimitMinutes || 30,
    createdAt: row.createdAt || new Date(),
  };
}

function mapSubmissionRow(
  row: CodeReviewSubmissionRow,
  assignment?: CodeReviewAssignment
): CodeReviewSubmission {
  return {
    id: row.id,
    fellowProfileId: row.fellowProfileId,
    assignmentId: row.assignmentId,
    status: (row.status as any) || 'in_progress',
    identifiedIssues: (row.identifiedIssues as IdentifiedBugInput[]) || [],
    draftScore: row.draftScore ?? 0,
    finalScore: row.finalScore ?? 0,
    llmEvaluation: (row.llmEvaluation as LLMEvaluationResult) || null,
    criterionScores: (row.criterionScores as RubricCriterionScores) || {
      issuesIdentified: 0,
      severityRanking: 0,
      fixQuality: 0,
      reasoningClarity: 0,
    },
    isLate: row.isLate ?? false,
    startedAt: row.startedAt,
    submittedAt: row.submittedAt,
    gradedAt: row.gradedAt,
    reviewerUserId: row.reviewerUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    assignment,
  };
}

/**
 * Ensures assignment pool is seeded in DB.
 */
export async function seedAssignmentsIfNeeded(): Promise<CodeReviewAssignmentRow[]> {
  const existing = await db.select().from(codeReviewAssignments);
  if (existing.length >= 2) return existing;

  const insertedRows: CodeReviewAssignmentRow[] = [];
  for (const s of SEEDED_SCENARIOS) {
    try {
      const [row] = await db
        .insert(codeReviewAssignments)
        .values({
          slug: s.slug,
          title: s.title,
          description: s.description,
          diffContent: s.diffContent,
          plantedBugs: s.plantedBugs,
        })
        .returning();
      if (row) insertedRows.push(row);
    } catch {
      // Ignore duplicate key conflicts during seeding
    }
  }

  const all = await db.select().from(codeReviewAssignments);
  return all;
}

/**
 * Returns a randomized scenario assignment for cohort scenario rotation.
 */
export async function getRandomRotatedAssignment(): Promise<CodeReviewAssignment> {
  const all = await seedAssignmentsIfNeeded();
  const selected = all.length > 0 ? all[Math.floor(Math.random() * all.length)] : null;
  const base = selected ? mapAssignmentRow(selected) : {
    id: '550e8400-e29b-41d4-a716-446655440002',
    slug: SEEDED_SCENARIOS[0].slug,
    title: SEEDED_SCENARIOS[0].title,
    description: SEEDED_SCENARIOS[0].description,
    diffContent: SEEDED_SCENARIOS[0].diffContent,
    plantedBugs: SEEDED_SCENARIOS[0].plantedBugs,
    timeLimitMinutes: 30,
    createdAt: new Date(),
  };

  // Within-Cohort Parameter Randomization: Randomize threshold limits & variable tokens
  const randomLimit = [50000, 100000, 250000][Math.floor(Math.random() * 3)];
  const randomizedDiff = base.diffContent.replace(/MAX_TRANSACTION_LIMIT_CENTS/g, `${randomLimit}`);

  return {
    ...base,
    diffContent: randomizedDiff,
  };
}

/**
 * Gets fellow's Module 1 submission record with Rule 5 authorization.
 */
export async function getModule1Submission(
  fellowProfileId: string,
  actor: AuthActor
): Promise<CodeReviewSubmission | null> {
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
    .from(codeReviewSubmissions)
    .where(eq(codeReviewSubmissions.fellowProfileId, fellowProfileId))
    .orderBy(desc(codeReviewSubmissions.createdAt))
    .limit(1);

  if (!row) return null;

  const [assignmentRow] = await db
    .select()
    .from(codeReviewAssignments)
    .where(eq(codeReviewAssignments.id, row.assignmentId))
    .limit(1);

  return mapSubmissionRow(row, assignmentRow ? mapAssignmentRow(assignmentRow) : undefined);
}

/**
 * Starts candidate Module 1 code review assessment (starts server timer).
 */
export async function startModule1Assessment(
  fellowProfileId: string,
  actor: AuthActor
): Promise<CodeReviewSubmission> {
  const [profile] = await db
    .select()
    .from(fellowProfiles)
    .where(eq(fellowProfiles.id, fellowProfileId))
    .limit(1);

  if (!profile) {
    throw new Error('Fellow profile not found');
  }

  assertCanAccessFellowRecord(actor, profile.clerkUserId);

  // Check if active or completed submission exists
  const existing = await getModule1Submission(fellowProfileId, actor);
  if (existing) return existing;

  const assignment = await getRandomRotatedAssignment();

  const [inserted] = await db
    .insert(codeReviewSubmissions)
    .values({
      fellowProfileId,
      assignmentId: assignment.id,
      status: 'in_progress',
      startedAt: new Date(),
    })
    .returning();

  return mapSubmissionRow(inserted, assignment);
}

/**
 * Evaluates candidate submission using Anthropic Claude 3.5 Sonnet LLM Pre-Grading API.
 * Falls back cleanly to local heuristic pre-check if ANTHROPIC_API_KEY is absent.
 */
export async function evaluateModule1LLM(
  identifiedIssues: IdentifiedBugInput[],
  plantedBugs: PlantedBug[]
): Promise<LLMEvaluationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      const prompt = `You are an expert software engineering reviewer evaluating a candidate's code review submission.
Target Planted Bugs: ${JSON.stringify(plantedBugs, null, 2)}
Candidate Reported Findings: ${JSON.stringify(identifiedIssues, null, 2)}

Grade the candidate's free-text submission across 4 criteria (0-4 points each):
1. issuesIdentified (0-4): Did candidate spot the 3 planted issues (Hallucination, Logic Bug, Security)? 0=none, 2=1-2, 4=all 3.
2. severityRanking (0-4): Did candidate prioritize Security > Logic > Hallucination? 4=correctly prioritized, 0=security ranked low/info.
3. fixQuality (0-4): Are proposed code fixes clean, correct, and minimal?
4. reasoningClarity (0-4): Is root cause reasoning precise and accurate?

Return ONLY a valid JSON object matching this schema:
{
  "issuesIdentified": number,
  "severityRanking": number,
  "fixQuality": number,
  "reasoningClarity": number,
  "rationale": "2-sentence explanation of scores"
}`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const text = json.content?.[0]?.text || '';
        const parsed = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));

        const draftScores: RubricCriterionScores = {
          issuesIdentified: parsed.issuesIdentified ?? 0,
          severityRanking: parsed.severityRanking ?? 0,
          fixQuality: parsed.fixQuality ?? 0,
          reasoningClarity: parsed.reasoningClarity ?? 0,
        };

        const totalDraftScore =
          draftScores.issuesIdentified +
          draftScores.severityRanking +
          draftScores.fixQuality +
          draftScores.reasoningClarity;

        return {
          draftScores,
          totalDraftScore,
          rationale: `🤖 Claude 3.5 Sonnet: ${parsed.rationale || 'Evaluated free-text fixes and reasoning quality.'}`,
          issuesMatchedCount: parsed.issuesIdentified >= 4 ? 3 : 1,
        };
      }
    } catch {
      // Fallback to local heuristic if network call fails
    }
  }

  // Local Heuristic Pre-Check Fallback
  const categoriesPresent = new Set(identifiedIssues.map((i) => i.bugCategory));

  let issuesIdentifiedScore = 0;
  if (categoriesPresent.size >= 3) {
    issuesIdentifiedScore = 4;
  } else if (categoriesPresent.size >= 1) {
    issuesIdentifiedScore = 2;
  }

  let severityRankingScore = 2;
  const securityIssue = identifiedIssues.find((i) => i.bugCategory === 'security');
  if (securityIssue && securityIssue.severityRank === 'critical') {
    severityRankingScore = 4;
  } else if (securityIssue && securityIssue.severityRank === 'info') {
    severityRankingScore = 0;
  }

  let fixQualityScore = 2;
  const hasDetailedFixes = identifiedIssues.every(
    (i) => i.proposedFix.length >= 20 && (i.proposedFix.includes('return') || i.proposedFix.includes('if') || i.proposedFix.includes('const') || i.proposedFix.includes('await'))
  );
  if (hasDetailedFixes) {
    fixQualityScore = 4;
  }

  let reasoningClarityScore = 2;
  const hasStrongReasoning = identifiedIssues.every(
    (i) => i.reasoning.length >= 25 && (i.reasoning.includes('because') || i.reasoning.includes('vulnerability') || i.reasoning.includes('sdk') || i.reasoning.includes('logic'))
  );
  if (hasStrongReasoning) {
    reasoningClarityScore = 4;
  }

  const totalDraftScore =
    issuesIdentifiedScore + severityRankingScore + fixQualityScore + reasoningClarityScore;

  return {
    draftScores: {
      issuesIdentified: issuesIdentifiedScore,
      severityRanking: severityRankingScore,
      fixQuality: fixQualityScore,
      reasoningClarity: reasoningClarityScore,
    },
    totalDraftScore,
    rationale: `⚡ Automated Heuristic Pre-Check (Local): Candidate identified ${categoriesPresent.size} distinct bug categories. Security issue severity ranked as ${securityIssue?.severityRank || 'unspecified'}.`,
    issuesMatchedCount: categoriesPresent.size,
  };
}

/**
 * Submits candidate code review findings.
 * Enforces server hard timer check (30 mins limit + 2 min buffer = 32 mins max).
 * Invokes LLM pre-grader and queues submission for admin review.
 */
export async function submitModule1Review(
  fellowProfileId: string,
  submissionId: string,
  identifiedIssues: IdentifiedBugInput[],
  actor: AuthActor
): Promise<CodeReviewSubmission> {
  const validated = submitCodeReviewSchema.parse({
    fellowProfileId,
    submissionId,
    identifiedIssues,
  });

  const [profile] = await db
    .select()
    .from(fellowProfiles)
    .where(eq(fellowProfiles.id, validated.fellowProfileId))
    .limit(1);

  if (profile) {
    assertCanAccessFellowRecord(actor, profile.clerkUserId);
  }

  const [submissionRow] = await db
    .select()
    .from(codeReviewSubmissions)
    .where(eq(codeReviewSubmissions.id, validated.submissionId))
    .limit(1);

  if (!submissionRow) {
    throw new Error('Submission record not found');
  }

  // Server-side Hard Timer Boundary Check (30 mins limit + 2 mins network grace)
  const elapsedMs = Date.now() - new Date(submissionRow.startedAt).getTime();
  const maxAllowedMs = (30 + 2) * 60 * 1000;
  const isLate = elapsedMs > maxAllowedMs;

  const [assignmentRow] = await db
    .select()
    .from(codeReviewAssignments)
    .where(eq(codeReviewAssignments.id, submissionRow.assignmentId))
    .limit(1);

  const plantedBugs = (assignmentRow?.plantedBugs as PlantedBug[]) || [];

  // Evaluate LLM Pre-Grading (Claude 3.5 Sonnet / Heuristic fallback)
  const llmEval = await evaluateModule1LLM(validated.identifiedIssues, plantedBugs);

  const [updated] = await db
    .update(codeReviewSubmissions)
    .set({
      status: 'submitted',
      identifiedIssues: validated.identifiedIssues,
      draftScore: llmEval.totalDraftScore,
      criterionScores: llmEval.draftScores,
      llmEvaluation: llmEval,
      isLate,
      submittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(codeReviewSubmissions.id, validated.submissionId))
    .returning();

  return mapSubmissionRow(updated, assignmentRow ? mapAssignmentRow(assignmentRow) : undefined);
}

/**
 * Returns pending submissions queue for Admin Calibration (Rule 5 admin check).
 */
export async function getModule1ReviewQueue(actor: AuthActor): Promise<CodeReviewSubmission[]> {
  requireRole(actor, 'admin');

  const rows = await db
    .select()
    .from(codeReviewSubmissions)
    .orderBy(desc(codeReviewSubmissions.submittedAt));

  const results: CodeReviewSubmission[] = [];
  for (const r of rows) {
    const [a] = await db
      .select()
      .from(codeReviewAssignments)
      .where(eq(codeReviewAssignments.id, r.assignmentId))
      .limit(1);
    results.push(mapSubmissionRow(r, a ? mapAssignmentRow(a) : undefined));
  }

  return results;
}

/**
 * Admin Calibration action: Finalizes score (0-16) and updates fellow stage.
 */
export async function finalizeModule1Grading(
  submissionId: string,
  criterionScores: RubricCriterionScores,
  reviewerActor: AuthActor
): Promise<CodeReviewSubmission> {
  requireRole(reviewerActor, 'admin');

  const validatedScores = finalizeGradingSchema.parse({
    submissionId,
    issuesIdentifiedScore: criterionScores.issuesIdentified,
    severityRankingScore: criterionScores.severityRanking,
    fixQualityScore: criterionScores.fixQuality,
    reasoningClarityScore: criterionScores.reasoningClarity,
  });

  const finalScore =
    validatedScores.issuesIdentifiedScore +
    validatedScores.severityRankingScore +
    validatedScores.fixQualityScore +
    validatedScores.reasoningClarityScore;

  const [submissionRow] = await db
    .select()
    .from(codeReviewSubmissions)
    .where(eq(codeReviewSubmissions.id, submissionId))
    .limit(1);

  if (!submissionRow) {
    throw new Error('Submission record not found');
  }

  const [updated] = await db
    .update(codeReviewSubmissions)
    .set({
      status: 'graded',
      finalScore,
      criterionScores: {
        issuesIdentified: validatedScores.issuesIdentifiedScore,
        severityRanking: validatedScores.severityRankingScore,
        fixQuality: validatedScores.fixQualityScore,
        reasoningClarity: validatedScores.reasoningClarityScore,
      },
      reviewerUserId: reviewerActor.clerkUserId,
      gradedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(codeReviewSubmissions.id, submissionId))
    .returning();

  // Update Fellow Stage to 'assessing'
  await db
    .update(fellowProfiles)
    .set({ stage: 'assessing', updatedAt: new Date() })
    .where(eq(fellowProfiles.id, submissionRow.fellowProfileId));

  return mapSubmissionRow(updated);
}
