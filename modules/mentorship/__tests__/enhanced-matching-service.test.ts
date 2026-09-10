import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateCompatibilityScore,
  autoMatchFellow,
  listEnhancedMatches,
  getFellowEnhancedMatch,
  rebalanceWorkload,
  _resetEnhancedMatchingStoresForTesting,
} from '../enhanced-matching-service';
import {
  registerMentor,
  _resetMentorshipStoresForTesting,
} from '../mentorship-service';
import {
  autoMatchFellowAction,
  getFellowEnhancedMatchAction,
  listEnhancedMatchesAction,
  rebalanceWorkloadAction,
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
    fullName: `Test Fellow ${id}`,
    email: `fellow_${id}@qwantomhub.com`,
    stage: 'fellow',
    track: 'AI Engineering',
    skills: ['Python', 'PyTorch', 'TypeScript', 'FastAPI'],
  })),
}));

import { getCurrentAuthUser } from '../../auth/service';

describe('Enhanced Mentorship Matching Automation Engine (Service 24)', () => {
  beforeEach(() => {
    _resetMentorshipStoresForTesting();
    _resetEnhancedMatchingStoresForTesting();
    vi.clearAllMocks();
  });

  it('calculates compatibility score (0-100%) based on skill, experience, capacity, and timezone', async () => {
    const adminId = 'admin-user-001';
    const mentor = await registerMentor(adminId, {
      name: 'Dr. Ada Lovelace',
      email: 'ada@ai-research.org',
      company: 'DeepMind Alum',
      role: 'Senior Staff AI Engineer',
      expertise: ['Python', 'PyTorch', 'LLMs', 'Model Optimization'],
      maxMentees: 5,
    });

    const scoreResult = calculateCompatibilityScore(
      ['Python', 'PyTorch', 'TypeScript'],
      'fellow',
      mentor
    );

    expect(scoreResult.total).toBeGreaterThanOrEqual(70);
    expect(scoreResult.skillScore).toBeGreaterThan(20);
    expect(scoreResult.experienceScore).toBe(30);
    expect(scoreResult.capacityScore).toBe(20); // 5/5 capacity
    expect(scoreResult.timezoneScore).toBe(10);
  });

  it('auto-matches fellow to the mentor with the highest compatibility score', async () => {
    const adminId = 'admin-user-001';

    // Mentor A: Mid level React mentor
    await registerMentor(adminId, {
      name: 'Frontend Mentor',
      email: 'fe@mentor.com',
      company: 'Web Corp',
      role: 'Software Engineer',
      expertise: ['React', 'CSS', 'HTML'],
      maxMentees: 5,
    });

    // Mentor B: Senior AI Mentor with exact matching skills
    const bestMentor = await registerMentor(adminId, {
      name: 'AI Engineering Mentor',
      email: 'ai@mentor.com',
      company: 'AI Labs',
      role: 'Senior Staff Engineer',
      expertise: ['Python', 'PyTorch', 'TypeScript', 'FastAPI'],
      maxMentees: 5,
    });

    const match = await autoMatchFellow(adminId, {
      fellowProfileId: 'fellow-user-001',
    });

    expect(match.id).toBeDefined();
    expect(match.fellowProfileId).toBe('fellow-user-001');
    expect(match.mentorId).toBe(bestMentor.id);
    expect(match.compatibilityScore).toBeGreaterThan(70);
    expect(match.status).toBe('active');
  });

  it('rebalances workload when a mentor is overloaded or requested', async () => {
    const adminId = 'admin-user-001';

    // Register Mentor A with max 1 mentee slot
    const overloadedMentor = await registerMentor(adminId, {
      name: 'Busy Mentor',
      email: 'busy@mentor.com',
      company: 'Big Tech',
      role: 'Senior Engineering Manager',
      expertise: ['Python', 'PyTorch', 'FastAPI', 'TypeScript'],
      maxMentees: 1,
    });

    // Register Mentor B with open capacity
    const backupMentor = await registerMentor(adminId, {
      name: 'Available Mentor',
      email: 'avail@mentor.com',
      company: 'Growth Startup',
      role: 'Senior Tech Lead',
      expertise: ['Python', 'PyTorch', 'FastAPI'],
      maxMentees: 5,
    });

    // Auto-match fellow 1 to overloaded mentor (who scores highest)
    await autoMatchFellow(adminId, {
      fellowProfileId: 'fellow-user-100',
    });

    // Trigger re-balance
    const rebalanceResult = await rebalanceWorkload(adminId, {
      mentorId: overloadedMentor.id,
      reason: 'Workload capacity re-balancing requested',
    });

    expect(rebalanceResult.reassignedCount).toBe(1);
    expect(rebalanceResult.newMatches.length).toBe(1);
    expect(rebalanceResult.newMatches[0].mentorId).toBe(backupMentor.id);
  });

  it('Rule 5 Security: prevents non-admin user from viewing another fellow mentor match', async () => {
    vi.mocked(getCurrentAuthUser).mockResolvedValue({
      clerkUserId: 'fellow-user-111',
      email: 'fellow111@qwantomhub.com',
      firstName: 'Fellow',
      lastName: '111',
      roles: ['fellow'],
      primaryRole: 'fellow',
    });

    await expect(getFellowEnhancedMatchAction('fellow-user-999')).rejects.toThrow(
      /Unauthorized: You can only view your own mentor match/
    );
  });

  it('Rule 5 Security: prevents non-admin user from re-balancing mentor workload', async () => {
    vi.mocked(getCurrentAuthUser).mockResolvedValue({
      clerkUserId: 'fellow-user-111',
      email: 'fellow111@qwantomhub.com',
      firstName: 'Fellow',
      lastName: '111',
      roles: ['fellow'],
      primaryRole: 'fellow',
    });

    await expect(
      rebalanceWorkloadAction({
        mentorId: 'some-mentor-id',
      })
    ).rejects.toThrow(/Unauthorized: Admin privilege required/);
  });
});
