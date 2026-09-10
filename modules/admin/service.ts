import { db } from '@/lib/db';
import { fellowProfiles } from '@/modules/identity/schema';
import { applicantIntakes } from '@/modules/intake/schema';
import {
  AdminFunnelMetrics,
  CandidateFilterOptions,
  CandidateSummary,
  ManualOverrideInput,
} from './types';
import { AuthActor, FellowStage, FellowTier } from '@/modules/identity/types';
import { ForbiddenError } from '@/lib/auth';
import { eq, ilike, or, and, sql } from 'drizzle-orm';
import * as identityService from '@/modules/identity/service';
import { logAuditEvent } from '@/modules/audit/service';

function assertIsAdmin(actor: AuthActor) {
  if (!actor || !actor.roles.includes('admin')) {
    throw new ForbiddenError('Access denied: Admin privileges required');
  }
}

/**
 * Aggregates pipeline funnel metrics across all candidate stages and tiers.
 */
export async function getFunnelMetrics(actor: AuthActor): Promise<AdminFunnelMetrics> {
  assertIsAdmin(actor);

  const profiles = await db.select().from(fellowProfiles);

  const stageCounts: Record<FellowStage, number> = {
    applicant: 0,
    training: 0,
    assessing: 0,
    fellow: 0,
    placed: 0,
    alumni: 0,
  };

  const tierCounts: Record<FellowTier, number> = {
    none: 0,
    top_tier: 0,
    standard: 0,
    not_selected: 0,
  };

  profiles.forEach((p) => {
    if (stageCounts[p.stage as FellowStage] !== undefined) {
      stageCounts[p.stage as FellowStage]++;
    }
    if (tierCounts[p.tier as FellowTier] !== undefined) {
      tierCounts[p.tier as FellowTier]++;
    }
  });

  return {
    totalApplicants: profiles.length,
    totalFellows: stageCounts.fellow + stageCounts.placed,
    stageCounts,
    tierCounts,
  };
}

/**
 * Lists candidates with optional search query, stage, and tier filters.
 */
export async function listCandidates(
  options: CandidateFilterOptions,
  actor: AuthActor
): Promise<CandidateSummary[]> {
  assertIsAdmin(actor);

  const conditions = [];

  if (options.search) {
    const term = `%${options.search}%`;
    conditions.push(
      or(
        ilike(fellowProfiles.firstName, term),
        ilike(fellowProfiles.lastName, term),
        ilike(fellowProfiles.email, term)
      )
    );
  }

  if (options.stage) {
    conditions.push(eq(fellowProfiles.stage, options.stage));
  }

  if (options.tier) {
    conditions.push(eq(fellowProfiles.tier, options.tier));
  }

  let query = db
    .select({
      id: fellowProfiles.id,
      clerkUserId: fellowProfiles.clerkUserId,
      email: fellowProfiles.email,
      firstName: fellowProfiles.firstName,
      lastName: fellowProfiles.lastName,
      phoneNumber: fellowProfiles.phoneNumber,
      country: fellowProfiles.country,
      stage: fellowProfiles.stage,
      tier: fellowProfiles.tier,
      createdAt: fellowProfiles.createdAt,
    })
    .from(fellowProfiles);

  if (conditions.length > 0) {
    // @ts-ignore
    query = query.where(and(...conditions));
  }

  const results = await query.limit(options.limit || 50);
  return results as CandidateSummary[];
}

/**
 * Executes an administrative manual stage or tier override for a candidate.
 */
export async function executeManualOverride(
  input: ManualOverrideInput,
  actor: AuthActor
) {
  assertIsAdmin(actor);

  const currentProfile = await identityService.getFellowProfileById(input.fellowId, actor);

  const newStage = input.stage || currentProfile.stage;
  const newTier = input.tier || currentProfile.tier;

  const updated = await identityService.updateFellowStageAndTier(input.fellowId, newStage, newTier, actor);

  // Automatically log compliance audit event (Service 7 integration)
  try {
    await logAuditEvent({
      actorClerkUserId: actor.clerkUserId,
      action: 'stage_tier_override',
      targetType: 'fellow_profile',
      targetId: input.fellowId,
      severity: 'warning',
      metadata: {
        previousStage: currentProfile.stage,
        previousTier: currentProfile.tier,
        newStage,
        newTier,
        reason: input.reason,
      },
    });
  } catch (err) {
    console.error('Failed logging audit event for manual override:', err);
  }

  return updated;
}
