import {
  EnhancedMentorMatch,
  Mentor,
  AutoMatchFellowInput,
  AutoMatchFellowSchema,
  RebalanceWorkloadInput,
  RebalanceWorkloadSchema,
} from './types';
import {
  listMentors,
  getMentorById,
  assignMentorToTarget,
  unassignMentor,
  listAssignments,
} from './mentorship-service';
import { getFellowProfileById } from '../identity/service';
import { logAuditEvent } from '../audit/service';

// In-memory store for enhanced mentor matches
const enhancedMatchesStore = new Map<string, EnhancedMentorMatch>();

/**
 * Calculate compatibility score between a fellow profile and a mentor (0 - 100)
 */
export function calculateCompatibilityScore(
  fellowSkills: string[],
  fellowStage: string,
  mentor: Mentor
): {
  total: number;
  skillScore: number;
  experienceScore: number;
  capacityScore: number;
  timezoneScore: number;
} {
  // 1. Skill Match Score (0 - 40)
  let skillScore = 10; // baseline
  if (fellowSkills.length > 0 && mentor.expertise.length > 0) {
    const fellowLower = fellowSkills.map((s) => s.toLowerCase().trim());
    const mentorLower = mentor.expertise.map((e) => e.toLowerCase().trim());
    const matching = fellowLower.filter((s) =>
      mentorLower.some((e) => e.includes(s) || s.includes(e))
    );
    const overlapRatio = matching.length / Math.max(1, fellowLower.length);
    skillScore = Math.min(40, Math.round(10 + overlapRatio * 30));
  }

  // 2. Experience Match Score (0 - 30)
  let experienceScore = 20; // baseline
  const roleLower = mentor.role.toLowerCase();
  if (roleLower.includes('senior') || roleLower.includes('lead') || roleLower.includes('principal') || roleLower.includes('head')) {
    experienceScore = 30;
  } else if (roleLower.includes('mid') || roleLower.includes('engineer') || roleLower.includes('developer')) {
    experienceScore = 25;
  }

  // 3. Capacity Score (0 - 20)
  const remainingSlots = Math.max(0, mentor.maxMentees - mentor.activeMenteesCount);
  const capacityRatio = remainingSlots / Math.max(1, mentor.maxMentees);
  const capacityScore = Math.round(capacityRatio * 20);

  // 4. Timezone Score (0 - 10)
  // Standard default for WAT / West Africa & Global match
  const timezoneScore = 10;

  const total = Math.min(100, Math.max(0, skillScore + experienceScore + capacityScore + timezoneScore));

  return {
    total,
    skillScore,
    experienceScore,
    capacityScore,
    timezoneScore,
  };
}

/**
 * Automatically match a fellow to the optimal active mentor based on 0-100 compatibility algorithm.
 */
export async function autoMatchFellow(
  adminUserId: string,
  input: AutoMatchFellowInput & { excludeMentorId?: string }
): Promise<EnhancedMentorMatch> {
  const validated = AutoMatchFellowSchema.parse(input);

  const profile = await getFellowProfileById(validated.fellowProfileId, {
    clerkUserId: adminUserId,
    roles: ['admin'],
  }).catch(() => null);

  const fellowSkills = profile?.skills && profile.skills.length > 0 ? profile.skills : ['TypeScript', 'Full-stack'];
  const fellowStage = profile?.stage || 'fellow';
  const fellowFullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : `Fellow ${validated.fellowProfileId}`;

  // Check if fellow already has an active enhanced match
  const existingMatches = Array.from(enhancedMatchesStore.values()).filter(
    (m) => m.fellowProfileId === validated.fellowProfileId && m.status === 'active'
  );

  if (existingMatches.length > 0 && !validated.forceReassign) {
    return existingMatches[0];
  }

  // Fetch candidate active mentors
  let activeMentors = await listMentors({ status: 'active', hasCapacity: true });
  if (input.excludeMentorId) {
    activeMentors = activeMentors.filter((m) => m.id !== input.excludeMentorId);
  }

  if (activeMentors.length === 0) {
    throw new Error('No active mentors with available capacity found for auto-matching.');
  }

  let bestMentor: Mentor | null = null;
  let bestScoreResult = {
    total: -1,
    skillScore: 0,
    experienceScore: 0,
    capacityScore: 0,
    timezoneScore: 0,
  };

  for (const mentor of activeMentors) {
    const scores = calculateCompatibilityScore(fellowSkills, fellowStage, mentor);
    if (scores.total > bestScoreResult.total) {
      bestScoreResult = scores;
      bestMentor = mentor;
    }
  }

  if (!bestMentor) {
    throw new Error('Could not calculate a valid mentor match.');
  }

  // Deactivate old match if forceReassigning
  if (validated.forceReassign && existingMatches.length > 0) {
    for (const match of existingMatches) {
      match.status = 'reassigned';
      enhancedMatchesStore.set(match.id, match);
    }
  }

  // Create internal assignment
  await assignMentorToTarget(adminUserId, {
    mentorId: bestMentor.id,
    targetType: 'fellow',
    targetId: validated.fellowProfileId,
    targetName: fellowFullName,
    notes: `Auto-matched with ${bestScoreResult.total}% compatibility score.`,
  });

  const matchId = `match_${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  const newMatch: EnhancedMentorMatch = {
    id: matchId,
    fellowProfileId: validated.fellowProfileId,
    mentorId: bestMentor.id,
    compatibilityScore: bestScoreResult.total,
    skillMatchScore: bestScoreResult.skillScore,
    experienceMatchScore: bestScoreResult.experienceScore,
    capacityScore: bestScoreResult.capacityScore,
    timezoneScore: bestScoreResult.timezoneScore,
    status: 'active',
    matchedAt: now,
    createdAt: now,
    mentorName: bestMentor.name,
    mentorCompany: bestMentor.company,
    mentorRole: bestMentor.role,
    mentorAvatarUrl: bestMentor.avatarUrl,
  };

  enhancedMatchesStore.set(matchId, newMatch);

  await logAuditEvent({
    actorClerkUserId: adminUserId,
    action: 'ENHANCED_MENTOR_MATCH_CREATED',
    targetType: 'enhanced_mentor_match',
    targetId: matchId,
    metadata: {
      fellowProfileId: validated.fellowProfileId,
      mentorId: bestMentor.id,
      compatibilityScore: bestScoreResult.total,
    },
  });

  return newMatch;
}

/**
 * List all enhanced matches with optional filters
 */
export async function listEnhancedMatches(options?: {
  fellowProfileId?: string;
  mentorId?: string;
  status?: 'proposed' | 'active' | 'reassigned' | 'completed';
}): Promise<EnhancedMentorMatch[]> {
  let list = Array.from(enhancedMatchesStore.values());

  if (options?.fellowProfileId) {
    list = list.filter((m) => m.fellowProfileId === options.fellowProfileId);
  }
  if (options?.mentorId) {
    list = list.filter((m) => m.mentorId === options.mentorId);
  }
  if (options?.status) {
    list = list.filter((m) => m.status === options.status);
  }

  // Populate mentor details
  for (const match of list) {
    const mentor = await getMentorById(match.mentorId);
    if (mentor) {
      match.mentorName = mentor.name;
      match.mentorCompany = mentor.company;
      match.mentorRole = mentor.role;
      match.mentorAvatarUrl = mentor.avatarUrl;
    }
  }

  return list.sort((a, b) => b.matchedAt.localeCompare(a.matchedAt));
}

/**
 * Get current active enhanced match for a fellow
 */
export async function getFellowEnhancedMatch(fellowProfileId: string): Promise<EnhancedMentorMatch | null> {
  const matches = await listEnhancedMatches({
    fellowProfileId,
    status: 'active',
  });
  return matches.length > 0 ? matches[0] : null;
}

/**
 * Re-balance workload by moving mentees from an overloaded or low-rating mentor to available mentors
 */
export async function rebalanceWorkload(
  adminUserId: string,
  input: RebalanceWorkloadInput
): Promise<{ reassignedCount: number; newMatches: EnhancedMentorMatch[] }> {
  const validated = RebalanceWorkloadSchema.parse(input);

  const mentor = await getMentorById(validated.mentorId);
  if (!mentor) {
    throw new Error(`Mentor with ID '${validated.mentorId}' not found.`);
  }

  // Find active assignments for this mentor
  const activeAssignments = await listAssignments({
    mentorId: validated.mentorId,
    status: 'active',
  });

  const fellowAssignments = activeAssignments.filter((a) => a.targetType === 'fellow');
  if (fellowAssignments.length === 0) {
    return { reassignedCount: 0, newMatches: [] };
  }

  const newMatches: EnhancedMentorMatch[] = [];

  // Re-assign the most recently assigned fellow to balance load
  const targetToReassign = fellowAssignments[0];

  // Unassign from current mentor
  await unassignMentor(adminUserId, targetToReassign.id);

  // Mark current match as reassigned
  const activeMatches = await listEnhancedMatches({
    fellowProfileId: targetToReassign.targetId,
    mentorId: validated.mentorId,
    status: 'active',
  });

  for (const m of activeMatches) {
    m.status = 'reassigned';
    enhancedMatchesStore.set(m.id, m);
  }

  // Auto-match fellow to another available mentor
  try {
    const freshMatch = await autoMatchFellow(adminUserId, {
      fellowProfileId: targetToReassign.targetId,
      forceReassign: true,
      excludeMentorId: validated.mentorId,
    });
    newMatches.push(freshMatch);
  } catch (err) {
    // Log error if no other mentor available
  }

  await logAuditEvent({
    actorClerkUserId: adminUserId,
    action: 'MENTOR_WORKLOAD_REBALANCED',
    targetType: 'mentor',
    targetId: validated.mentorId,
    metadata: {
      reason: validated.reason || 'Manual/Automated Workload Rebalance',
      reassignedCount: 1,
    },
  });

  return {
    reassignedCount: 1,
    newMatches,
  };
}

/**
 * Reset enhanced matching stores for testing
 */
export function _resetEnhancedMatchingStoresForTesting(): void {
  enhancedMatchesStore.clear();
}
