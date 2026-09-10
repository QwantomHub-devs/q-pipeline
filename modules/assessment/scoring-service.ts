import { db } from '@/lib/db';
import {
  baselineAssessments,
  codeReviewSubmissions,
  buildSandboxSubmissions,
  recordedExplanationSubmissions,
  candidateCompositeScores,
  CandidateCompositeScoreRow,
} from './schema';
import { fellowProfiles } from '../identity/schema';
import { eq, desc } from 'drizzle-orm';
import { assertCanAccessFellowRecord, requireRole } from '@/lib/auth';
import { AuthActor } from '../identity/types';
import { logAuditEvent } from '../audit/service';
import {
  calculateCompositeScoreSchema,
  overrideCandidateTierSchema,
} from './validation';
import {
  CandidateCompositeScore,
  CandidatePlacementTier,
} from './types';

/**
 * Maps database row to domain type CandidateCompositeScore
 */
function mapRowToDomain(row: CandidateCompositeScoreRow): CandidateCompositeScore {
  return {
    id: row.id,
    fellowProfileId: row.fellowProfileId,
    baselineScore: row.baselineScore || 0,
    module1Score: row.module1Score || 0,
    module2Score: row.module2Score || 0,
    module3Score: row.module3Score || 0,
    overallCompositeScore: row.overallCompositeScore || 0,
    assignedTier: row.assignedTier as CandidatePlacementTier,
    isRedFlagged: row.isRedFlagged,
    redFlagDetails: (row.redFlagDetails as Record<string, unknown>) || {},
    overrideApplied: row.overrideApplied,
    overrideReason: row.overrideReason,
    calculatedAt: row.calculatedAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Computes 0-100% composite score and determines tier placement rules:
 * - Baseline (15%)
 * - Module 1 (25%)
 * - Module 2 (35%)
 * - Module 3 (25%)
 *
 * Tier Placement Rules:
 * - Tier 1 Global Placement: Composite >= 85% AND !isRedFlagged
 * - Tier 2 Regional Placement: Composite >= 70% AND !isRedFlagged
 * - Tier 3 Bench / Upskilling: Composite >= 50% OR (Composite >= 70% AND isRedFlagged)
 * - Tier 4 Ineligible / Rejected: Composite < 50%
 */
export async function calculateCandidateCompositeScore(
  actor: AuthActor,
  rawInput: { fellowProfileId: string }
): Promise<CandidateCompositeScore> {
  const input = calculateCompositeScoreSchema.parse(rawInput);
  await assertCanAccessFellowRecord(actor, input.fellowProfileId);

  // Fetch candidate fellow profile
  const fellowRows = await db
    .select()
    .from(fellowProfiles)
    .where(eq(fellowProfiles.id, input.fellowProfileId))
    .limit(1);

  if (fellowRows.length === 0) {
    throw new Error(`Fellow profile with ID ${input.fellowProfileId} not found.`);
  }

  // Fetch Baseline assessment
  const baselineRows = await db
    .select()
    .from(baselineAssessments)
    .where(eq(baselineAssessments.fellowProfileId, input.fellowProfileId))
    .limit(1);
  const baselineScore = baselineRows[0] ? baselineRows[0].compositeScore || 0 : 0;

  // Fetch Module 1 AI Code Review assessment
  const mod1Rows = await db
    .select()
    .from(codeReviewSubmissions)
    .where(eq(codeReviewSubmissions.fellowProfileId, input.fellowProfileId))
    .orderBy(desc(codeReviewSubmissions.createdAt))
    .limit(1);
  const mod1Raw = mod1Rows[0] ? mod1Rows[0].finalScore || mod1Rows[0].draftScore || 0 : 0;
  // Module 1 final score is 0-16 -> convert to 0-100%
  const module1Score = Math.min(100, Math.round((mod1Raw / 16) * 100));

  // Fetch Module 2 Timed AI Build Sandbox assessment
  const mod2Rows = await db
    .select()
    .from(buildSandboxSubmissions)
    .where(eq(buildSandboxSubmissions.fellowProfileId, input.fellowProfileId))
    .orderBy(desc(buildSandboxSubmissions.createdAt))
    .limit(1);
  const module2Score = mod2Rows[0] ? mod2Rows[0].weightedScore || 0 : 0;
  const trapDetected = mod2Rows[0] ? mod2Rows[0].trapDetected : false;
  const autoRedFlag = mod2Rows[0] ? mod2Rows[0].autoRedFlag : false;

  // Fetch Module 3 Recorded Explanation assessment
  const mod3Rows = await db
    .select()
    .from(recordedExplanationSubmissions)
    .where(eq(recordedExplanationSubmissions.fellowProfileId, input.fellowProfileId))
    .orderBy(desc(recordedExplanationSubmissions.createdAt))
    .limit(1);
  const module3Score = mod3Rows[0] ? mod3Rows[0].weightedScore || 0 : 0;
  const authenticityPassed = mod3Rows[0] ? mod3Rows[0].authenticityPassed ?? true : true;
  const authenticityFailed = !authenticityPassed;

  // Composite Weighted Formula (Blueprint ground truth: Baseline 0% pass/fail gate, Module 1 25%, Module 2 50%, Module 3 25%)
  const overallCompositeScore = Math.round(
    module1Score * 0.25 + module2Score * 0.50 + module3Score * 0.25
  );

  const isRedFlagged = trapDetected || autoRedFlag || authenticityFailed;
  const redFlagDetails = {
    trapDetected,
    autoRedFlag,
    authenticityFailed,
    authenticityNotes: mod3Rows[0]?.authenticityNotes || null,
    remediationRequired: isRedFlagged,
  };

  // Automated Tier Placement Rules per Blueprint Spec:
  // - Tier 1 Global Placement: Composite >= 85% AND !isRedFlagged AND authenticityPassed
  // - Tier 2 Regional Placement: Composite 65-84% AND !isRedFlagged AND authenticityPassed
  // - Tier 4 Ineligible / Rejected: Composite < 65% OR isRedFlagged OR authenticityFailed
  let assignedTier: CandidatePlacementTier = 'tier_4_rejected';
  if (overallCompositeScore >= 85 && !isRedFlagged && authenticityPassed) {
    assignedTier = 'tier_1_global';
  } else if (overallCompositeScore >= 65 && !isRedFlagged && authenticityPassed) {
    assignedTier = 'tier_2_regional';
  } else {
    assignedTier = 'tier_4_rejected';
  }

  // Check if row exists in candidateCompositeScores
  const existingRows = await db
    .select()
    .from(candidateCompositeScores)
    .where(eq(candidateCompositeScores.fellowProfileId, input.fellowProfileId))
    .limit(1);

  let resultRow: CandidateCompositeScoreRow;

  if (existingRows.length > 0) {
    const existing = existingRows[0];
    // If override was applied by admin, keep override tier unless force updated
    const finalTier = existing.overrideApplied ? existing.assignedTier : assignedTier;

    const [updated] = await db
      .update(candidateCompositeScores)
      .set({
        baselineScore,
        module1Score,
        module2Score,
        module3Score,
        overallCompositeScore: existing.overrideApplied ? existing.overallCompositeScore : overallCompositeScore,
        assignedTier: finalTier,
        isRedFlagged,
        redFlagDetails,
        updatedAt: new Date(),
      })
      .where(eq(candidateCompositeScores.fellowProfileId, input.fellowProfileId))
      .returning();
    resultRow = updated;
  } else {
    const [inserted] = await db
      .insert(candidateCompositeScores)
      .values({
        fellowProfileId: input.fellowProfileId,
        baselineScore,
        module1Score,
        module2Score,
        module3Score,
        overallCompositeScore,
        assignedTier,
        isRedFlagged,
        redFlagDetails,
        overrideApplied: false,
      })
      .returning();
    resultRow = inserted;
  }

  // Sync tier to fellow profile spine
  await db
    .update(fellowProfiles)
    .set({
      tier: mapCandidateTierToProfileTier(resultRow.assignedTier),
      stage: 'assessing',
      updatedAt: new Date(),
    })
    .where(eq(fellowProfiles.id, input.fellowProfileId));

  return mapRowToDomain(resultRow);
}

function mapCandidateTierToProfileTier(tier: string): 'none' | 'top_tier' | 'standard' | 'not_selected' {
  if (tier === 'tier_1_global' || tier === 'tier_2_regional') return 'top_tier';
  if (tier === 'tier_3_bench') return 'standard';
  return 'not_selected';
}

/**
 * Admin manual score and placement tier override with compliance audit log entry.
 */
export async function overrideCandidateTierAndScore(
  actor: AuthActor,
  rawInput: {
    fellowProfileId: string;
    newTier: CandidatePlacementTier;
    overrideScore?: number;
    reason: string;
  }
): Promise<CandidateCompositeScore> {
  requireRole(actor, 'admin');
  const input = overrideCandidateTierSchema.parse(rawInput);

  const existingRows = await db
    .select()
    .from(candidateCompositeScores)
    .where(eq(candidateCompositeScores.fellowProfileId, input.fellowProfileId))
    .limit(1);

  const oldTier = existingRows[0] ? existingRows[0].assignedTier : 'tier_4_rejected';
  const oldScore = existingRows[0] ? existingRows[0].overallCompositeScore : 0;
  const newScore = input.overrideScore !== undefined ? input.overrideScore : oldScore;

  let resultRow: CandidateCompositeScoreRow;

  if (existingRows.length > 0) {
    const [updated] = await db
      .update(candidateCompositeScores)
      .set({
        assignedTier: input.newTier,
        overallCompositeScore: newScore,
        overrideApplied: true,
        overrideReason: input.reason,
        updatedAt: new Date(),
      })
      .where(eq(candidateCompositeScores.fellowProfileId, input.fellowProfileId))
      .returning();
    resultRow = updated;
  } else {
    const [inserted] = await db
      .insert(candidateCompositeScores)
      .values({
        fellowProfileId: input.fellowProfileId,
        assignedTier: input.newTier,
        overallCompositeScore: newScore,
        overrideApplied: true,
        overrideReason: input.reason,
      })
      .returning();
    resultRow = inserted;
  }

  // Sync tier & stage to fellow profile spine
  await db
    .update(fellowProfiles)
    .set({
      tier: mapCandidateTierToProfileTier(input.newTier),
      stage: 'assessing',
      updatedAt: new Date(),
    })
    .where(eq(fellowProfiles.id, input.fellowProfileId));

  // Log compliance audit event per Rule 5 & audit framework
  await logAuditEvent({
    actorClerkUserId: actor.clerkUserId,
    action: 'CANDIDATE_TIER_OVERRIDE',
    targetType: 'fellow_profile',
    targetId: input.fellowProfileId,
    severity: 'warning',
    metadata: {
      oldTier,
      newTier: input.newTier,
      oldScore,
      newScore,
      reason: input.reason,
    },
  });

  return mapRowToDomain(resultRow);
}

/**
 * Fetch composite score for fellow with security authorization check.
 */
export async function getCompositeScoreForFellow(
  actor: AuthActor,
  fellowProfileId: string
): Promise<CandidateCompositeScore | null> {
  await assertCanAccessFellowRecord(actor, fellowProfileId);

  const rows = await db
    .select()
    .from(candidateCompositeScores)
    .where(eq(candidateCompositeScores.fellowProfileId, fellowProfileId))
    .limit(1);

  if (rows.length === 0) return null;
  return mapRowToDomain(rows[0]);
}

/**
 * List candidate scoring matrix leaderboard for admin governance.
 */
export async function listCandidateScoringMatrixForAdmin(
  actor: AuthActor
): Promise<Array<CandidateCompositeScore & { fellowName?: string; fellowEmail?: string }>> {
  requireRole(actor, 'admin');

  const rows = await db
    .select()
    .from(candidateCompositeScores)
    .orderBy(desc(candidateCompositeScores.overallCompositeScore));

  const fellows = await db.select().from(fellowProfiles);
  const fellowMap = new Map(fellows.map((f) => [f.id, f]));

  return rows.map((r) => {
    const f = fellowMap.get(r.fellowProfileId);
    return {
      ...mapRowToDomain(r),
      fellowName: f ? `${f.firstName} ${f.lastName}` : 'Anonymous Fellow',
      fellowEmail: f?.email || 'N/A',
    };
  });
}
