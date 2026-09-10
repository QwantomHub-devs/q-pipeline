import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  listOpportunities,
  calculateMatchScore,
  findMatchesForOpportunity,
  findMatchesForFellow,
  updateMatchStatus,
  _resetMatchingStoreForTesting,
} from '../matching-service';
import {
  createOpportunityAction,
  runMatchingForOpportunityAction,
  updateMatchStatusAction,
  getFellowOpportunitiesAction,
} from '../actions';

// Mock dependencies
vi.mock('../../audit/service', () => ({
  logAuditEvent: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../auth/service', () => ({
  getCurrentAuthUser: vi.fn(),
}));

vi.mock('../../admin/service', () => ({
  listCandidates: vi.fn().mockResolvedValue([
    {
      id: 'fellow-101',
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@qwantomhub.com',
    },
    {
      id: 'fellow-102',
      firstName: 'Bob',
      lastName: 'Smith',
      email: 'bob@qwantomhub.com',
    },
  ]),
}));

vi.mock('../../assessment/scoring-service', () => ({
  getCompositeScoreForFellow: vi.fn().mockImplementation(async (_actor: any, fellowProfileId: string) => {
    if (fellowProfileId === 'fellow-101') {
      return {
        overallCompositeScore: 88,
        assignedTier: 'Tier 1 Global',
      };
    }
    return {
      overallCompositeScore: 72,
      assignedTier: 'Tier 2 Regional',
    };
  }),
}));

import { getCurrentAuthUser } from '../../auth/service';

describe('Opportunity / Matching Engine (Service 16)', () => {
  beforeEach(() => {
    _resetMatchingStoreForTesting();
    vi.clearAllMocks();
  });

  it('creates client opportunity with tier and skill requirements', async () => {
    const adminId = 'admin-user-001';
    const opp = await createOpportunity(adminId, {
      title: 'Senior AI Systems Engineer',
      clientName: 'Stripe Global Tech',
      opportunityType: 'faang_placement',
      requiredSkills: ['AI Systems', 'TypeScript', 'System Design'],
      minScore: 80,
      requiredTier: 'Tier 1 Global',
      compensationRange: '$120,000 - $150,000 USD/yr',
      slotsAvailable: 2,
    });

    expect(opp.id).toBeDefined();
    expect(opp.title).toBe('Senior AI Systems Engineer');
    expect(opp.minScore).toBe(80);
    expect(opp.status).toBe('open');

    const list = await listOpportunities();
    expect(list.some((o) => o.id === opp.id)).toBe(true);
  });

  it('calculates algorithmic match score correctly based on skills and assessment tier', () => {
    const opportunity = {
      id: 'opp-001',
      title: 'Fullstack AI Lead',
      clientName: 'Scale AI',
      opportunityType: 'sme_build_project' as const,
      requiredSkills: ['TypeScript', 'AI Engineering'],
      minScore: 70,
      requiredTier: 'Tier 2 Regional' as const,
      compensationRange: '$4,000 / month',
      location: 'Remote',
      slotsAvailable: 1,
      filledSlotsCount: 0,
      status: 'open' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Candidate 1: Tier 1 Global (88% composite score, 100% skill match)
    const match1 = calculateMatchScore(
      {
        skills: ['TypeScript', 'AI Engineering', 'Python'],
        compositeScore: 88,
        placementTier: 'Tier 1 Global',
      },
      opportunity
    );

    expect(match1.skillMatchPercent).toBe(100);
    expect(match1.tierEligible).toBe(true);
    expect(match1.matchScore).toBe(94); // (100 * 0.5) + (88 * 0.5) = 94

    // Candidate 2: Tier 3 Bench (Ineligible for required Tier 2, skill match 50%)
    const match2 = calculateMatchScore(
      {
        skills: ['TypeScript'],
        compositeScore: 60,
        placementTier: 'Tier 3 Bench',
      },
      opportunity
    );

    expect(match2.skillMatchPercent).toBe(50);
    expect(match2.tierEligible).toBe(false);
    expect(match2.matchScore).toBe(30); // ((50*0.5)+(60*0.5)) - 25 penalty = 30
  });

  it('runs algorithmic matching engine for an opportunity and ranks candidates', async () => {
    const adminId = 'admin-user-001';
    const opp = await createOpportunity(adminId, {
      title: 'Fullstack AI Developer',
      clientName: 'Paystack',
      opportunityType: 'sme_build_project',
      requiredSkills: ['TypeScript', 'AI Engineering'],
      minScore: 70,
      requiredTier: 'Tier 2 Regional',
      compensationRange: '$3,500 / month',
      slotsAvailable: 1,
    });

    const matches = await findMatchesForOpportunity(adminId, opp.id);

    expect(matches.length).toBe(2);
    // Highest match score first (Alice Johnson with Tier 1 Global 88% should rank first)
    expect(matches[0].fellowId).toBe('fellow-101');
    expect(matches[0].matchScore).toBeGreaterThan(matches[1].matchScore);
  });

  it('advances candidate match status and updates filled slots upon placement', async () => {
    const adminId = 'admin-user-001';
    const opp = await createOpportunity(adminId, {
      title: 'Frontend Next.js Engineer',
      clientName: 'Flutterwave',
      opportunityType: 'staffing_maintenance',
      requiredSkills: ['TypeScript'],
      minScore: 65,
      requiredTier: 'Tier 2 Regional',
      compensationRange: '$2,500 / month',
      slotsAvailable: 1,
    });

    const matches = await findMatchesForOpportunity(adminId, opp.id);
    const targetMatch = matches[0];

    // Update status to 'placed'
    const updatedMatch = await updateMatchStatus(adminId, {
      matchId: targetMatch.id,
      status: 'placed',
      notes: 'Successfully placed after client interview.',
    });

    expect(updatedMatch.status).toBe('placed');

    // Opportunity filled slots should now be 1 and status 'filled'
    const updatedOpp = (await listOpportunities()).find((o) => o.id === opp.id);
    expect(updatedOpp?.filledSlotsCount).toBe(1);
    expect(updatedOpp?.status).toBe('filled');
  });

  it('Rule 5 Security: blocks candidate fellow from accessing another candidate matches', async () => {
    vi.mocked(getCurrentAuthUser).mockResolvedValue({
      clerkUserId: 'fellow-user-A',
      email: 'fellowA@qwantomhub.com',
      firstName: 'Fellow',
      lastName: 'A',
      roles: ['fellow'],
      primaryRole: 'fellow',
    });

    await expect(getFellowOpportunitiesAction('fellow-user-B')).rejects.toThrow(
      /Unauthorized: You can only view opportunities matched to your profile/
    );
  });
});
