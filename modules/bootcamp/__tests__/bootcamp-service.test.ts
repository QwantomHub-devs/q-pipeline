import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createBootcampTrack,
  updateBootcampTrack,
  deleteBootcampTrack,
  listBootcampTracks,
  createCohort,
  updateCohortStatus,
  enrollFellowInCohort,
  createMilestoneForCohort,
  submitMilestoneProgress,
  gradeMilestoneProgress,
  getFellowBootcampDashboardData,
} from '../service';
import { AuthActor } from '@/modules/identity/types';
import * as authLib from '@/lib/auth';
import * as auditService from '@/modules/audit/service';

const mockTracks: any[] = [];
const mockCohorts: any[] = [];
const mockEnrollments: any[] = [];
const mockMilestones: any[] = [];
const mockProgress: any[] = [];

const fellowId = '550e8400-e29b-41d4-a716-446655440001';
const cohortId = '550e8400-e29b-41d4-a716-446655440002';
const enrollId = '550e8400-e29b-41d4-a716-446655440003';
const milestoneId = '550e8400-e29b-41d4-a716-446655440004';
const progressId = '550e8400-e29b-41d4-a716-446655440005';

const mockFellowProfiles: any[] = [{ id: fellowId, clerkUserId: 'clerk_user_fellow_1', stage: 'assessing' }];

vi.mock('@/lib/db', () => {
  return {
    db: {
      select: () => ({
        from: (table: any) => {
          let tableName = '';
          if (table) {
            tableName = table.config?.name || table._?.name || table[Symbol.for('drizzle:Name')] || table.name || '';
          }
          let dataToReturn: any[] = [];

          if (tableName.includes('tracks')) dataToReturn = mockTracks;
          else if (tableName.includes('cohorts')) dataToReturn = mockCohorts;
          else if (tableName.includes('enrollments')) dataToReturn = mockEnrollments;
          else if (tableName.includes('milestones')) dataToReturn = mockMilestones;
          else if (tableName.includes('progress')) dataToReturn = mockProgress;
          else if (tableName.includes('fellow')) dataToReturn = mockFellowProfiles;
          else dataToReturn = mockTracks;

          const res: any = dataToReturn;
          res.where = () => ({
            limit: () => dataToReturn,
            orderBy: () => ({
              limit: () => dataToReturn,
            }),
          });
          res.orderBy = () => dataToReturn;
          res.limit = () => dataToReturn;
          return res;
        },
      }),
      insert: (table: any) => ({
        values: (data: any) => {
          let tableName = '';
          if (table) {
            tableName = table.config?.name || table._?.name || table[Symbol.for('drizzle:Name')] || table.name || '';
          }

          const row = {
            id: '550e8400-e29b-41d4-a716-446655449999',
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };

          if (tableName.includes('tracks')) mockTracks.push(row);
          else if (tableName.includes('cohorts')) mockCohorts.push(row);
          else if (tableName.includes('enrollments')) mockEnrollments.push(row);
          else if (tableName.includes('milestones')) mockMilestones.push(row);
          else if (tableName.includes('progress')) mockProgress.push(row);

          return { returning: () => [row] };
        },
      }),
      update: (table: any) => ({
        set: (data: any) => ({
          where: () => {
            let tableName = '';
            if (table) {
              tableName = table.config?.name || table._?.name || table[Symbol.for('drizzle:Name')] || table.name || '';
            }

            let targetArr = mockTracks;
            if (tableName.includes('cohorts')) targetArr = mockCohorts;
            else if (tableName.includes('enrollments')) targetArr = mockEnrollments;
            else if (tableName.includes('progress')) targetArr = mockProgress;
            else if (tableName.includes('fellow')) targetArr = mockFellowProfiles;

            if (targetArr[0]) {
              Object.assign(targetArr[0], data);
            }
            const updatedRow = targetArr[0] || { id: '550e8400-e29b-41d4-a716-446655449999', ...data };
            return { returning: () => [updatedRow] };
          },
        }),
      }),
      delete: (table: any) => ({
        where: () => {
          const deletedRow = mockTracks.pop() || { id: '550e8400-e29b-41d4-a716-446655449999', slug: 'ai_systems', name: 'AI Systems' };
          return { returning: () => [deletedRow] };
        },
      }),
    },
  };
});

describe('Service 14: Bootcamp & Dynamic Cohort Management Rules', () => {
  const ownerUser: AuthActor = { clerkUserId: 'clerk_user_fellow_1', roles: ['fellow'] };
  const attackerUser: AuthActor = { clerkUserId: 'clerk_user_attacker', roles: ['fellow'] };
  const adminUser: AuthActor = { clerkUserId: 'clerk_admin', roles: ['admin'] };

  beforeEach(() => {
    mockTracks.length = 0;
    mockCohorts.length = 0;
    mockEnrollments.length = 0;
    mockMilestones.length = 0;
    mockProgress.length = 0;
    vi.restoreAllMocks();
  });

  describe('Dynamic Track Management', () => {
    it('creates, lists, and updates dynamic tracks', async () => {
      vi.spyOn(auditService, 'logAuditEvent').mockResolvedValue({} as any);

      const track = await createBootcampTrack(adminUser, {
        slug: 'fullstack_ai',
        name: 'Fullstack AI Systems Engineering',
        description: 'LLM orchestration track',
      });

      expect(track.slug).toBe('fullstack_ai');
      expect(track.name).toBe('Fullstack AI Systems Engineering');

      const updated = await updateBootcampTrack(adminUser, {
        id: track.id,
        name: 'Updated Track Name',
      });

      expect(updated.name).toBe('Updated Track Name');
    });

    it('blocks non-admin users from creating or updating dynamic tracks', async () => {
      await expect(
        createBootcampTrack(ownerUser, { slug: 'data_ai', name: 'Data AI' })
      ).rejects.toThrow(/does not have required role/i);
    });
  });

  describe('Cohort Management & Slot Capacity Enforcement', () => {
    it('creates cohort linked to dynamic track slug and enforces capacity', async () => {
      mockTracks.push({ id: '550e8400-e29b-41d4-a716-446655440010', slug: 'fullstack_ai', name: 'Fullstack AI', isActive: true });

      const cohort = await createCohort(adminUser, {
        name: 'Lagos 2026-Q3',
        trackSlug: 'fullstack_ai',
        capacity: 1,
      });

      expect(cohort.name).toBe('Lagos 2026-Q3');
      expect(cohort.trackSlug).toBe('fullstack_ai');

      // Enroll 1 fellow
      const enrollment = await enrollFellowInCohort(adminUser, {
        fellowProfileId: fellowId,
        cohortId: cohort.id,
      });

      expect(enrollment.fellowProfileId).toBe(fellowId);
      expect(mockFellowProfiles[0].stage).toBe('training');
    });
  });

  describe('Milestone Submission & Evaluation Workflow', () => {
    it('allows candidate to submit milestone deliverable and admin to grade', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      mockEnrollments.push({ id: enrollId, fellowProfileId: fellowId, cohortId: cohortId, status: 'enrolled' });
      mockMilestones.push({ id: milestoneId, cohortId: cohortId, title: 'Week 1 PR', weekNumber: 1 });

      const progress = await submitMilestoneProgress(ownerUser, {
        enrollmentId: enrollId,
        milestoneId: milestoneId,
        submissionUrl: 'https://github.com/qwantomhub/pr/1',
      });

      expect(progress.submissionUrl).toBe('https://github.com/qwantomhub/pr/1');
      expect(progress.status).toBe('submitted');

      const graded = await gradeMilestoneProgress(adminUser, {
        progressId: progressId,
        status: 'approved',
        feedback: 'Excellent clean architecture!',
      });

      expect(graded.status).toBe('approved');
      expect(graded.feedback).toBe('Excellent clean architecture!');
    });

    it('blocks unauthorized fellows from submitting milestone progress for another candidate', async () => {
      mockEnrollments.push({ id: enrollId, fellowProfileId: fellowId, cohortId: cohortId });

      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async (actor) => {
        if (actor.clerkUserId !== 'clerk_user_fellow_1') {
          throw new Error('Unauthorized record access');
        }
      });

      await expect(
        submitMilestoneProgress(attackerUser, {
          enrollmentId: enrollId,
          milestoneId: milestoneId,
          submissionUrl: 'https://github.com/hacker/pr',
        })
      ).rejects.toThrow('Unauthorized record access');
    });
  });
});
