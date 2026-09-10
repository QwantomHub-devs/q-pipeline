import {
  Opportunity,
  FellowMatch,
  CreateOpportunityInput,
  CreateOpportunitySchema,
  UpdateOpportunityInput,
  UpdateOpportunitySchema,
  UpdateMatchStatusInput,
  UpdateMatchStatusSchema,
  PlacementTier,
  MatchStatus,
} from './types';
import { logAuditEvent } from '../audit/service';
import { getCompositeScoreForFellow } from '../assessment/scoring-service';
import { listCandidates } from '../admin/service';
import { getFellowProfileById } from '../identity/service';

// In-memory state store for development & testing
const opportunitiesStore = new Map<string, Opportunity>();
const matchesStore = new Map<string, FellowMatch>();

/**
 * Priority rank helper for tiers
 */

const tierHierarchy: Record<PlacementTier, number> = {
  'Tier 1 Global': 4,
  'Tier 2 Regional': 3,
  'Tier 3 Bench': 2,
  'Tier 4 Rejected': 1,
};

/**
 * Check if a candidate's tier qualifies for an opportunity's required tier
 */
export function isTierEligible(candidateTier: PlacementTier, requiredTier: PlacementTier): boolean {
  return (tierHierarchy[candidateTier] || 1) >= (tierHierarchy[requiredTier] || 1);
}

/**
 * Create a new client placement opportunity (Admin only)
 */
export async function createOpportunity(
  adminUserId: string,
  input: CreateOpportunityInput
): Promise<Opportunity> {
  const validated = CreateOpportunitySchema.parse(input);

  const opportunityId = crypto.randomUUID();
  const now = new Date().toISOString();

  const opportunity: Opportunity = {
    id: opportunityId,
    title: validated.title,
    clientName: validated.clientName,
    opportunityType: validated.opportunityType,
    requiredSkills: validated.requiredSkills,
    minScore: validated.minScore,
    requiredTier: validated.requiredTier as PlacementTier,
    compensationRange: validated.compensationRange,
    location: validated.location || 'Remote / Hybrid',
    slotsAvailable: validated.slotsAvailable,
    filledSlotsCount: 0,
    status: 'open',
    description: validated.description || '',
    createdAt: now,
    updatedAt: now,
  };

  opportunitiesStore.set(opportunityId, opportunity);

  await logAuditEvent({
    actorClerkUserId: adminUserId,
    action: 'OPPORTUNITY_CREATED',
    targetType: 'opportunity',
    targetId: opportunityId,
    metadata: {
      title: opportunity.title,
      clientName: opportunity.clientName,
      type: opportunity.opportunityType,
    },
  });

  return opportunity;
}

/**
 * Update client placement opportunity
 */
export async function updateOpportunity(
  adminUserId: string,
  opportunityId: string,
  input: UpdateOpportunityInput
): Promise<Opportunity> {
  const opportunity = opportunitiesStore.get(opportunityId);
  if (!opportunity) {
    throw new Error(`Opportunity with ID '${opportunityId}' not found.`);
  }

  const validated = UpdateOpportunitySchema.parse(input);

  const updated: Opportunity = {
    ...opportunity,
    ...validated,
    requiredTier: (validated.requiredTier as PlacementTier) ?? opportunity.requiredTier,
    updatedAt: new Date().toISOString(),
  };

  opportunitiesStore.set(opportunityId, updated);

  await logAuditEvent({
    actorClerkUserId: adminUserId,
    action: 'OPPORTUNITY_UPDATED',
    targetType: 'opportunity',
    targetId: opportunityId,
    metadata: { changes: Object.keys(validated) },
  });

  return updated;
}

/**
 * Delete a client opportunity (Admin only)
 */
export async function deleteOpportunity(adminUserId: string, opportunityId: string): Promise<boolean> {
  const opportunity = opportunitiesStore.get(opportunityId);
  if (!opportunity) {
    throw new Error(`Opportunity with ID '${opportunityId}' not found.`);
  }

  opportunitiesStore.delete(opportunityId);

  // Remove matches
  for (const [matchId, match] of matchesStore.entries()) {
    if (match.opportunityId === opportunityId) {
      matchesStore.delete(matchId);
    }
  }

  await logAuditEvent({
    actorClerkUserId: adminUserId,
    action: 'OPPORTUNITY_DELETED',
    targetType: 'opportunity',
    targetId: opportunityId,
    metadata: { title: opportunity.title, clientName: opportunity.clientName },
  });

  return true;
}

/**
 * List all opportunities with filters
 */
export async function listOpportunities(options?: {
  status?: 'open' | 'filled' | 'closed';
  opportunityType?: string;
  requiredTier?: PlacementTier;
}): Promise<Opportunity[]> {
  let list = Array.from(opportunitiesStore.values());

  if (options?.status) {
    list = list.filter((o) => o.status === options.status);
  }
  if (options?.opportunityType) {
    list = list.filter((o) => o.opportunityType === options.opportunityType);
  }
  if (options?.requiredTier) {
    list = list.filter((o) => o.requiredTier === options.requiredTier);
  }

  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Retrieve single opportunity by ID
 */
export async function getOpportunityById(opportunityId: string): Promise<Opportunity | null> {
  return opportunitiesStore.get(opportunityId) || null;
}

/**
 * Calculate match score % between a candidate fellow profile and an opportunity
 */
export function calculateMatchScore(
  candidate: {
    skills?: string[];
    compositeScore: number;
    placementTier: PlacementTier;
  },
  opportunity: Opportunity
): { matchScore: number; skillMatchPercent: number; tierEligible: boolean } {
  // 1. Skill Overlap %
  const candidateSkills = (candidate.skills || []).map((s) => s.toLowerCase().trim());
  const reqSkills = opportunity.requiredSkills.map((s) => s.toLowerCase().trim());

  let matchedSkillsCount = 0;
  if (reqSkills.length > 0) {
    for (const reqSkill of reqSkills) {
      if (candidateSkills.some((cs) => cs.includes(reqSkill) || reqSkill.includes(cs))) {
        matchedSkillsCount++;
      }
    }
  }

  const skillMatchPercent =
    reqSkills.length > 0 ? Math.round((matchedSkillsCount / reqSkills.length) * 100) : 100;

  // 2. Tier Eligibility
  const tierEligible = isTierEligible(candidate.placementTier, opportunity.requiredTier);

  // 3. Score Component
  const scorePercent = candidate.compositeScore;

  // Weighted match score calculation (50% skills + 50% assessment score)
  let rawScore = Math.round(skillMatchPercent * 0.5 + scorePercent * 0.5);

  // Apply tier penalty if tier ineligible
  if (!tierEligible) {
    rawScore = Math.max(0, rawScore - 25);
  }

  return {
    matchScore: rawScore,
    skillMatchPercent,
    tierEligible,
  };
}

/**
 * Run algorithmic matching engine for a specific opportunity against active fellows
 */
export async function findMatchesForOpportunity(
  adminUserId: string,
  opportunityId: string
): Promise<FellowMatch[]> {
  const opportunity = opportunitiesStore.get(opportunityId);
  if (!opportunity) {
    throw new Error(`Opportunity with ID '${opportunityId}' not found.`);
  }

  const adminActor = { clerkUserId: adminUserId, roles: ['admin' as const], primaryRole: 'admin' as const };
  const candidates = await listCandidates({}, adminActor);
  const generatedMatches: FellowMatch[] = [];

  for (const fellow of candidates) {
    const scoreData = await getCompositeScoreForFellow(adminActor, fellow.id);
    const candidateTier: PlacementTier = (scoreData?.assignedTier as PlacementTier) || 'Tier 2 Regional';
    const candidateScore = scoreData?.overallCompositeScore ?? 70;

    // Dynamically retrieve candidate profile skills
    let candidateSkills: string[] = [];
    try {
      const profile = await getFellowProfileById(fellow.id, adminActor);
      if (profile?.skills && profile.skills.length > 0) {
        candidateSkills = profile.skills;
      }
    } catch {
      // Fallback if profile not populated yet
      candidateSkills = ['AI Engineering', 'TypeScript', 'System Design'];
    }

    const matchResult = calculateMatchScore(
      {
        skills: candidateSkills,
        compositeScore: candidateScore,
        placementTier: candidateTier,
      },
      opportunity
    );

    // Look for existing match entry or create new one
    let existingMatch: FellowMatch | undefined;
    for (const m of matchesStore.values()) {
      if (m.opportunityId === opportunityId && m.fellowId === fellow.id) {
        existingMatch = m;
        break;
      }
    }

    const now = new Date().toISOString();
    const matchId = existingMatch?.id || crypto.randomUUID();

    const match: FellowMatch = {
      id: matchId,
      opportunityId,
      fellowId: fellow.id,
      fellowName: `${fellow.firstName} ${fellow.lastName}`,
      fellowEmail: fellow.email,
      matchScore: matchResult.matchScore,
      skillMatchPercent: matchResult.skillMatchPercent,
      tierEligible: matchResult.tierEligible,
      status: existingMatch?.status || 'suggested',
      assignedBy: adminUserId,
      createdAt: existingMatch?.createdAt || now,
      updatedAt: now,
    };

    matchesStore.set(matchId, match);
    generatedMatches.push(match);
  }

  await logAuditEvent({
    actorClerkUserId: adminUserId,
    action: 'OPPORTUNITY_MATCHING_RUN',
    targetType: 'opportunity',
    targetId: opportunityId,
    metadata: { candidateMatchesCount: generatedMatches.length },
  });

  return generatedMatches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Find eligible opportunities matching a candidate fellow
 */
export async function findMatchesForFellow(
  fellowId: string,
  candidateSkills?: string[]
): Promise<(FellowMatch & { opportunity: Opportunity })[]> {
  const actor = { clerkUserId: fellowId, roles: ['fellow' as const], primaryRole: 'fellow' as const };
  const scoreData = await getCompositeScoreForFellow(actor, fellowId);
  const candidateTier: PlacementTier = (scoreData?.assignedTier as PlacementTier) || 'Tier 2 Regional';
  const candidateScore = scoreData?.overallCompositeScore ?? 70;

  let skills: string[] = candidateSkills || [];
  if (skills.length === 0) {
    try {
      const profile = await getFellowProfileById(fellowId, actor);
      if (profile?.skills && profile.skills.length > 0) {
        skills = profile.skills;
      }
    } catch {
      skills = ['AI Engineering', 'TypeScript', 'System Design'];
    }
  }

  const results: (FellowMatch & { opportunity: Opportunity })[] = [];

  for (const opportunity of opportunitiesStore.values()) {
    if (opportunity.status !== 'open') continue;

    const matchResult = calculateMatchScore(
      {
        skills,
        compositeScore: candidateScore,
        placementTier: candidateTier,
      },
      opportunity
    );

    // Only include if score >= minScore or tier eligible
    if (matchResult.tierEligible || matchResult.matchScore >= 50) {
      let existing: FellowMatch | undefined;
      for (const m of matchesStore.values()) {
        if (m.opportunityId === opportunity.id && m.fellowId === fellowId) {
          existing = m;
          break;
        }
      }

      const match: FellowMatch = existing || {
        id: crypto.randomUUID(),
        opportunityId: opportunity.id,
        fellowId,
        matchScore: matchResult.matchScore,
        skillMatchPercent: matchResult.skillMatchPercent,
        tierEligible: matchResult.tierEligible,
        status: 'suggested',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (!existing) {
        matchesStore.set(match.id, match);
      }

      results.push({
        ...match,
        opportunity,
      });
    }
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Update candidate match status (e.g. advance to 'shortlisted', 'client_accepted', 'placed')
 */
export async function updateMatchStatus(
  adminUserId: string,
  input: UpdateMatchStatusInput
): Promise<FellowMatch> {
  const validated = UpdateMatchStatusSchema.parse(input);

  const match = matchesStore.get(validated.matchId);
  if (!match) {
    throw new Error(`Fellow match with ID '${validated.matchId}' not found.`);
  }

  const opportunity = opportunitiesStore.get(match.opportunityId);

  const now = new Date().toISOString();
  const prevStatus = match.status;

  const updated: FellowMatch = {
    ...match,
    status: validated.status as MatchStatus,
    notes: validated.notes ?? match.notes,
    assignedBy: adminUserId,
    updatedAt: now,
  };

  matchesStore.set(match.id, updated);

  // If status changed to 'placed', increment filled slots on opportunity
  if (prevStatus !== 'placed' && validated.status === 'placed' && opportunity) {
    opportunity.filledSlotsCount += 1;
    if (opportunity.filledSlotsCount >= opportunity.slotsAvailable) {
      opportunity.status = 'filled';
    }
    opportunity.updatedAt = now;
    opportunitiesStore.set(opportunity.id, opportunity);
  }

  await logAuditEvent({
    actorClerkUserId: adminUserId,
    action: 'MATCH_STATUS_UPDATED',
    targetType: 'fellow_match',
    targetId: match.id,
    metadata: {
      opportunityId: match.opportunityId,
      fellowId: match.fellowId,
      prevStatus,
      newStatus: validated.status,
    },
  });

  return updated;
}

/**
 * List all matches for an opportunity or fellow
 */
export async function listMatches(options?: {
  opportunityId?: string;
  fellowId?: string;
  status?: MatchStatus;
}): Promise<FellowMatch[]> {
  let list = Array.from(matchesStore.values());

  if (options?.opportunityId) {
    list = list.filter((m) => m.opportunityId === options.opportunityId);
  }
  if (options?.fellowId) {
    list = list.filter((m) => m.fellowId === options.fellowId);
  }
  if (options?.status) {
    list = list.filter((m) => m.status === options.status);
  }

  return list.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Helper function for tests to clear matching store
 */
export function _resetMatchingStoreForTesting(): void {
  opportunitiesStore.clear();
  matchesStore.clear();
}
