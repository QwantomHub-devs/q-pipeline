import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  evaluateFellowEligibility,
  getFellowEligibilityOverview,
  curateShortlist,
  updateShortlistStatus,
  listEligibleFellows,
  _resetPremiumStoresForTesting,
} from '../service';
import {
  evaluateEligibilityAction,
  getFellowEligibilityAction,
  curateShortlistAction,
  updateShortlistStatusAction,
} from '../actions';

// Mock audit module
vi.mock('../../audit/service', () => ({
  logAuditEvent: vi.fn().mockResolvedValue({}),
}));

// Mock auth module
vi.mock('../../auth/service', () => ({
  getCurrentAuthUser: vi.fn(),
}));

// Mock identity service
vi.mock('../../identity/service', () => ({
  getFellowProfileById: vi.fn().mockImplementation(async (id: string) => ({
    id,
    firstName: 'Alex',
    lastName: 'Rivers',
    email: `alex_${id}@qwantomhub.com`,
    stage: 'fellow',
    tier: id.includes('ineligible') ? 'standard' : 'top_tier',
  })),
}));

// Mock contracts service
vi.mock('../../contracts/service', () => ({
  listContractsForFellow: vi.fn().mockResolvedValue([
    { id: 'contract-001', status: 'signed' },
  ]),
}));

// Mock scoring service
vi.mock('../../assessment/scoring-service', () => ({
  getCompositeScoreForFellow: vi.fn().mockResolvedValue({
    overallCompositeScore: 85,
  }),
}));

import { getCurrentAuthUser } from '../../auth/service';

describe('Service 25: Premium Track Eligibility Gate Engine', () => {
  beforeEach(() => {
    _resetPremiumStoresForTesting();
    vi.clearAllMocks();
  });

  it('evaluates Top Tier fellow as ELIGIBLE when score threshold, contract, and tier criteria pass', async () => {
    const adminId = 'admin-user-001';
    const fellowId = 'fellow-user-eligible-100';

    const gate = await evaluateFellowEligibility(adminId, {
      fellowProfileId: fellowId,
    });

    expect(gate.id).toBeDefined();
    expect(gate.fellowProfileId).toBe(fellowId);
    expect(gate.eligibilityStatus).toBe('eligible');
    expect(gate.tierConfirmed).toBe(true);
    expect(gate.scoreThresholdMet).toBe(true);
    expect(gate.contractSigned).toBe(true);
    expect(gate.authenticityPassed).toBe(true);

    const overview = await getFellowEligibilityOverview(fellowId);
    expect(overview.gate?.eligibilityStatus).toBe('eligible');
  });

  it('evaluates non-Top Tier fellow as INELIGIBLE and records reason', async () => {
    const adminId = 'admin-user-001';
    const fellowId = 'fellow-user-ineligible-200';

    const gate = await evaluateFellowEligibility(adminId, {
      fellowProfileId: fellowId,
    });

    expect(gate.eligibilityStatus).toBe('ineligible');
    expect(gate.tierConfirmed).toBe(false);
    expect(gate.eligibilityReason).toContain('Top Tier');
  });

  it('curates eligible fellow into Seelicongate partner shortlist', async () => {
    const adminId = 'admin-user-001';
    const fellowId = 'fellow-user-eligible-300';

    const shortlist = await curateShortlist(adminId, {
      fellowProfileId: fellowId,
      shortlistName: 'Seelicongate Global AI Engineering Q4',
      notes: 'Strong system design background.',
    });

    expect(shortlist.id).toBeDefined();
    expect(shortlist.status).toBe('shortlisted');
    expect(shortlist.shortlistName).toBe('Seelicongate Global AI Engineering Q4');

    const updated = await updateShortlistStatus(adminId, {
      shortlistId: shortlist.id,
      status: 'nominated',
      notes: 'Nomination package transmitted to Seelicongate hiring board.',
    });

    expect(updated.status).toBe('nominated');
    expect(updated.submittedAt).toBeDefined();
  });

  it('prevents shortlisting an ineligible candidate', async () => {
    const adminId = 'admin-user-001';
    const fellowId = 'fellow-user-ineligible-400';

    await expect(
      curateShortlist(adminId, {
        fellowProfileId: fellowId,
        shortlistName: 'Seelicongate Global Track',
      })
    ).rejects.toThrow(/ineligible/);
  });

  it('Rule 5 Security: prevents non-admin user from viewing another fellow eligibility status', async () => {
    vi.mocked(getCurrentAuthUser).mockResolvedValue({
      clerkUserId: 'fellow-user-A',
      email: 'fellowA@qwantomhub.com',
      firstName: 'Fellow',
      lastName: 'A',
      roles: ['fellow'],
      primaryRole: 'fellow',
    });

    await expect(getFellowEligibilityAction('fellow-user-B')).rejects.toThrow(
      /Unauthorized: You can only access your own Premium eligibility status/
    );
  });

  it('Rule 5 Security: prevents non-admin user from curating shortlists', async () => {
    vi.mocked(getCurrentAuthUser).mockResolvedValue({
      clerkUserId: 'fellow-user-A',
      email: 'fellowA@qwantomhub.com',
      firstName: 'Fellow',
      lastName: 'A',
      roles: ['fellow'],
      primaryRole: 'fellow',
    });

    await expect(
      curateShortlistAction({
        fellowProfileId: 'fellow-user-eligible-100',
        shortlistName: 'Seelicongate Global Track',
      })
    ).rejects.toThrow(/Unauthorized: Admin privilege required/);
  });
});
