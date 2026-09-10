import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addToBench,
  assignBenchFellowToProject,
  completeBenchAssignment,
  listBenchPool,
  getFellowBenchOverview,
  _resetBenchStoreForTesting,
} from '../bench-service';
import {
  getFellowBenchOverviewAction,
} from '../actions';

// Mock dependencies
vi.mock('../../audit/service', () => ({
  logAuditEvent: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../auth/service', () => ({
  getCurrentAuthUser: vi.fn(),
}));

vi.mock('../../identity/service', () => ({
  getFellowProfileById: vi.fn().mockImplementation(async (fellowId: string) => ({
    id: fellowId,
    clerkUserId: `clerk-${fellowId}`,
    firstName: 'Chukwu',
    lastName: 'Emeka',
    email: 'fellow@qwantomhub.com',
    stage: 'bench',
  })),
}));

import { getCurrentAuthUser } from '../../auth/service';

describe('Bench / Farm-System Management (Service 17)', () => {
  beforeEach(() => {
    _resetBenchStoreForTesting();
    vi.clearAllMocks();
  });

  it('enrolls candidate fellow into bench pool and syncs lifecycle stage', async () => {
    const adminId = 'admin-user-001';
    const fellowProfileId = '550e8400-e29b-41d4-a716-446655440000';

    const benchFellow = await addToBench(adminId, {
      fellowProfileId,
      notes: 'Passed assessment Tier 3 Bench. Awaiting cohort slot.',
    });

    expect(benchFellow.id).toBeDefined();
    expect(benchFellow.fellowProfileId).toBe(fellowProfileId);
    expect(benchFellow.lifecycleStage).toBe('bench');
    expect(benchFellow.totalStipendEarned).toBe(0);

    const list = await listBenchPool();
    expect(list.some((b) => b.id === benchFellow.id)).toBe(true);
  });

  it('prevents enrolling duplicate fellow into bench pool', async () => {
    const adminId = 'admin-user-001';
    const fellowProfileId = '550e8400-e29b-41d4-a716-446655440001';

    await addToBench(adminId, { fellowProfileId });

    await expect(addToBench(adminId, { fellowProfileId })).rejects.toThrow(
      /already active in the bench pool/
    );
  });

  it('assigns bench fellow to SME build project reusing matching engine opportunities', async () => {
    const adminId = 'admin-user-001';
    const fellowProfileId = '550e8400-e29b-41d4-a716-446655440002';

    const benchFellow = await addToBench(adminId, { fellowProfileId });

    const assignment = await assignBenchFellowToProject(adminId, {
      fellowProfileId: benchFellow.fellowProfileId,
      opportunityId: 'sme-project-fintech-01',
      roleTitle: 'FinTech Payment Integration MVP',
      stipendAmount: 300,
    });

    expect(assignment.id).toBeDefined();
    expect(assignment.status).toBe('assigned');
    expect(assignment.stipendAmount).toBe(300);

    const overview = await getFellowBenchOverview(fellowProfileId);
    expect(overview.benchRecord?.currentOpportunityTitle).toBe('FinTech Payment Integration MVP');
    expect(overview.activeAssignment?.id).toBe(assignment.id);
  });

  it('completes SME project assignment, emits ledger transaction, and credits stipend', async () => {
    const adminId = 'admin-user-001';
    const fellowProfileId = '550e8400-e29b-41d4-a716-446655440003';

    const benchFellow = await addToBench(adminId, { fellowProfileId });

    const assignment = await assignBenchFellowToProject(adminId, {
      fellowProfileId: benchFellow.fellowProfileId,
      opportunityId: 'sme-project-ai-bot',
      roleTitle: 'Customer Support LLM Bot',
      stipendAmount: 400,
    });

    const completed = await completeBenchAssignment(adminId, {
      matchId: assignment.id,
      stipendEarned: 450, // includes performance bonus
      notes: 'Outstanding delivery! Delivered 2 days ahead of deadline.',
    });

    expect(completed.status).toBe('placed');
    expect(completed.stipendAmount).toBe(450);

    const overview = await getFellowBenchOverview(fellowProfileId);
    expect(overview.benchRecord?.totalProjectsCompleted).toBe(1);
    expect(overview.benchRecord?.totalStipendEarned).toBe(450);
    expect(overview.ledgerTransactions).toHaveLength(1);
    expect(overview.ledgerTransactions[0].transactionType).toBe('sme_stipend_credit');
    expect(overview.ledgerTransactions[0].amount).toBe(450);
    expect(overview.activeAssignment).toBeNull();
    expect(overview.pastAssignments.length).toBe(1);
  });

  it('Rule 5 Security: blocks candidate fellow from querying another fellow bench record', async () => {
    vi.mocked(getCurrentAuthUser).mockResolvedValue({
      clerkUserId: 'fellow-user-A',
      email: 'fellowA@qwantomhub.com',
      firstName: 'Fellow',
      lastName: 'A',
      roles: ['fellow'],
      primaryRole: 'fellow',
    });

    await expect(getFellowBenchOverviewAction('fellow-user-B')).rejects.toThrow(
      /Unauthorized: You can only access your own bench record/
    );
  });
});
