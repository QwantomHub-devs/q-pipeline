import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerMentor,
  updateMentorProfile,
  listMentors,
  assignMentorToTarget,
  unassignMentor,
  scheduleSession,
  completeSession,
  getFellowMentorshipOverview,
  getCohortMentorshipOverview,
  _resetMentorshipStoresForTesting,
} from '../mentorship-service';
import {
  registerMentorAction,
  assignMentorAction,
  getFellowMentorshipAction,
  submitSessionFeedbackAction,
} from '../actions';

// Mock audit module
vi.mock('../../audit/service', () => ({
  logAuditEvent: vi.fn().mockResolvedValue({}),
}));

// Mock auth module
vi.mock('../../auth/service', () => ({
  getCurrentAuthUser: vi.fn(),
}));

import { getCurrentAuthUser } from '../../auth/service';

describe('Mentorship Module & Matching Engine (Service 15)', () => {
  beforeEach(() => {
    _resetMentorshipStoresForTesting();
    vi.clearAllMocks();
  });

  it('registers new mentor with capacity and expertise tags', async () => {
    const adminId = 'admin-user-001';
    const mentor = await registerMentor(adminId, {
      name: 'Sarah Connor',
      email: 'sarah.c@ai-labs.org',
      company: 'OpenAI Alum',
      role: 'Staff Engineer',
      expertise: ['AI Safety', 'PyTorch', 'Model Fine-tuning'],
      maxMentees: 3,
    });

    expect(mentor.id).toBeDefined();
    expect(mentor.name).toBe('Sarah Connor');
    expect(mentor.maxMentees).toBe(3);
    expect(mentor.activeMenteesCount).toBe(0);
    expect(mentor.status).toBe('active');

    const mentorsList = await listMentors();
    expect(mentorsList.some((m) => m.id === mentor.id)).toBe(true);
  });

  it('prevents registering mentor with duplicate email', async () => {
    const adminId = 'admin-user-001';
    await registerMentor(adminId, {
      name: 'Sarah Connor',
      email: 'sarah.c@ai-labs.org',
      company: 'OpenAI Alum',
      role: 'Staff Engineer',
      expertise: ['AI Safety'],
    });

    await expect(
      registerMentor(adminId, {
        name: 'Sarah Duplicate',
        email: 'sarah.c@ai-labs.org',
        company: 'Other Tech',
        role: 'Senior Engineer',
        expertise: ['TypeScript'],
      })
    ).rejects.toThrow(/already exists/);
  });

  it('assigns mentor to target and enforces mentor capacity limit', async () => {
    const adminId = 'admin-user-001';
    const mentor = await registerMentor(adminId, {
      name: 'David Kim',
      email: 'david.k@google.com',
      company: 'Google',
      role: 'Senior Architect',
      expertise: ['Cloud Architecture', 'Go'],
      maxMentees: 2,
    });

    // Assign 1: Cohort
    const assign1 = await assignMentorToTarget(adminId, {
      mentorId: mentor.id,
      targetType: 'cohort',
      targetId: 'cohort-fullstack-2026-q3',
      targetName: 'Fullstack AI Engineering Cohort 1',
    });
    expect(assign1.status).toBe('active');

    // Assign 2: Individual Fellow
    const assign2 = await assignMentorToTarget(adminId, {
      mentorId: mentor.id,
      targetType: 'fellow',
      targetId: 'fellow-user-100',
    });
    expect(assign2.status).toBe('active');

    // Assign 3: Exceed capacity (max 2) -> Should fail
    await expect(
      assignMentorToTarget(adminId, {
        mentorId: mentor.id,
        targetType: 'fellow',
        targetId: 'fellow-user-101',
      })
    ).rejects.toThrow(/reached capacity/);
  });

  it('unassigns mentor and restores capacity', async () => {
    const adminId = 'admin-user-001';
    const mentor = await registerMentor(adminId, {
      name: 'Amara Okafor',
      email: 'amara.o@meta.com',
      company: 'Meta',
      role: 'Production Engineer',
      expertise: ['GraphQL', 'React Native'],
      maxMentees: 1,
    });

    const assign = await assignMentorToTarget(adminId, {
      mentorId: mentor.id,
      targetType: 'fellow',
      targetId: 'fellow-user-200',
    });

    const overviewBefore = await getFellowMentorshipOverview('fellow-user-200');
    expect(overviewBefore.assignments.length).toBe(1);

    // Unassign
    await unassignMentor(adminId, assign.id);

    const overviewAfter = await getFellowMentorshipOverview('fellow-user-200');
    expect(overviewAfter.assignments.length).toBe(0);

    // Can now assign again because capacity was restored
    const reassign = await assignMentorToTarget(adminId, {
      mentorId: mentor.id,
      targetType: 'fellow',
      targetId: 'fellow-user-201',
    });
    expect(reassign.status).toBe('active');
  });

  it('schedules session and records fellow feedback completion', async () => {
    const adminId = 'admin-user-001';
    const fellowId = 'fellow-user-300';
    const mentor = await registerMentor(adminId, {
      name: 'Marcus Brody',
      email: 'marcus.b@microsoft.com',
      company: 'Microsoft',
      role: 'Principal PM',
      expertise: ['System Architecture', 'Career Growth'],
      maxMentees: 5,
    });

    const session = await scheduleSession(adminId, {
      mentorId: mentor.id,
      targetType: 'fellow',
      targetId: fellowId,
      fellowId,
      title: 'Mock Architecture Technical Interview',
      description: 'System design deep dive on real-time pipeline.',
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      durationMinutes: 60,
    });

    expect(session.status).toBe('scheduled');
    expect(session.meetingUrl).toContain('google.com');

    // Complete session with rating
    const completed = await completeSession(fellowId, {
      sessionId: session.id,
      mentorNotes: 'Fellow demonstrated great grasp of database sharding.',
      fellowFeedbackScore: 5,
      fellowFeedbackComments: 'Extremely insightful session! Highlight of the week.',
    });

    expect(completed.status).toBe('completed');
    expect(completed.fellowFeedbackScore).toBe(5);
    expect(completed.fellowFeedbackComments).toBeDefined();
  });

  it('Rule 5 Security: blocks non-admin user from querying another fellow mentorship data', async () => {
    vi.mocked(getCurrentAuthUser).mockResolvedValue({
      clerkUserId: 'fellow-user-A',
      email: 'fellowA@qwantomhub.com',
      firstName: 'Fellow',
      lastName: 'A',
      roles: ['fellow'],
      primaryRole: 'fellow',
    });

    // Attempting to query fellow-user-B's mentorship details
    await expect(getFellowMentorshipAction('fellow-user-B')).rejects.toThrow(
      /Unauthorized: You can only access your own mentorship data/
    );
  });
});
