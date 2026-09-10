import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateModule3WeightedScore,
  startModule3Assessment,
  submitModule3Assessment,
  finalizeModule3Grading,
  assignPostHocQuestions,
} from '../module3-service';
import { AuthActor } from '@/modules/identity/types';
import * as authLib from '@/lib/auth';

const mockSubmissions: any[] = [];

vi.mock('@/lib/db', () => {
  return {
    db: {
      select: () => ({
        from: () => {
          const res: any = [];
          res.where = () => ({
            limit: () => {
              if (mockSubmissions.length > 0) return mockSubmissions;
              return [{ id: '550e8400-e29b-41d4-a716-446655440000', clerkUserId: 'clerk_user_fellow_1' }];
            },
            orderBy: () => ({
              limit: () => mockSubmissions,
            }),
          });
          res.orderBy = () => mockSubmissions;
          res.limit = () => mockSubmissions;
          return res;
        },
      }),
      insert: () => ({
        values: (data: any) => {
          const row = {
            id: '550e8400-e29b-41d4-a716-446655440003',
            fellowProfileId: '550e8400-e29b-41d4-a716-446655440000',
            sandboxSubmissionId: null,
            status: 'in_progress',
            videoUrl: null,
            videoDurationSeconds: 0,
            transcriptionText: null,
            weightedScore: 0,
            rubricScores: { architectureArticulation: 0, trapExplanation: 0, aiTransparency: 0, communicationClarity: 0 },
            isLate: false,
            startedAt: new Date(),
            submittedAt: null,
            gradedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          mockSubmissions.push(row);
          return { returning: () => [row] };
        },
      }),
      update: () => ({
        set: (data: any) => ({
          where: () => {
            if (mockSubmissions[0]) {
              Object.assign(mockSubmissions[0], data);
            }
            return { returning: () => [mockSubmissions[0]] };
          },
        }),
      }),
    },
  };
});

describe('Module 3 Recorded Explanation Intake Engine & Security Rules', () => {
  const fellowId = '550e8400-e29b-41d4-a716-446655440000';
  const ownerUser: AuthActor = { clerkUserId: 'clerk_user_fellow_1', roles: ['fellow'] };
  const attackerUser: AuthActor = { clerkUserId: 'clerk_user_attacker', roles: ['fellow'] };
  const adminUser: AuthActor = { clerkUserId: 'clerk_admin', roles: ['admin'] };

  beforeEach(() => {
    mockSubmissions.length = 0;
    vi.restoreAllMocks();
  });

  describe('Weighted Rubric Formula (0-100%)', () => {
    it('calculates 100% for perfect scores (4/4 across all 4 criteria)', () => {
      const scores = { architectureArticulation: 4, trapExplanation: 4, aiTransparency: 4, communicationClarity: 4 };
      expect(calculateModule3WeightedScore(scores)).toBe(100);
    });

    it('calculates exact 25% weighted increments', () => {
      const scores = { architectureArticulation: 2, trapExplanation: 4, aiTransparency: 0, communicationClarity: 0 };
      // (2/4)*25 = 12.5, (4/4)*25 = 25 -> 37.5 -> 38%
      expect(calculateModule3WeightedScore(scores)).toBe(38);
    });
  });

  describe('Rule 5 Security Authorization Policy', () => {
    it('blocks an unauthorized candidate from accessing another candidate video record', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async (actor) => {
        if (actor.clerkUserId !== 'clerk_user_fellow_1') {
          throw new Error('Unauthorized access: actor cannot access record of fellow');
        }
      });

      await expect(
        startModule3Assessment(attackerUser, { fellowProfileId: fellowId })
      ).rejects.toThrow('Unauthorized access');
    });
  });

  describe('Video Submission & Duration Limits', () => {
    it('flags isLate = true when video duration exceeds 180 seconds (3 minutes)', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      const submission = await startModule3Assessment(ownerUser, { fellowProfileId: fellowId });

      const submitted = await submitModule3Assessment(ownerUser, {
        fellowProfileId: fellowId,
        submissionId: submission.id,
        videoUrl: 'https://mock.supabase.co/storage/v1/object/sign/module3_videos/test.mp4',
        videoDurationSeconds: 200, // Exceeds 180s limit
      });

      expect(submitted.isLate).toBe(true);
      expect(submitted.status).toBe('submitted');
    });

    it('submits normally with isLate = false when video duration <= 180 seconds', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      const submission = await startModule3Assessment(ownerUser, { fellowProfileId: fellowId });

      const submitted = await submitModule3Assessment(ownerUser, {
        fellowProfileId: fellowId,
        submissionId: submission.id,
        videoUrl: 'https://mock.supabase.co/storage/v1/object/sign/module3_videos/test.mp4',
        videoDurationSeconds: 150,
      });

      expect(submitted.isLate).toBe(false);
      expect(submitted.status).toBe('submitted');
    });
  });

  describe('Admin Calibration & Anti-Proxy Defense', () => {
    it('allows admin to assign post-hoc submission-specific prompts to candidate', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      const submission = await startModule3Assessment(ownerUser, { fellowProfileId: fellowId });

      const updated = await assignPostHocQuestions(adminUser, {
        submissionId: submission.id,
        prompts: ['Explain why you handled the null case on line 47 of your submission this way'],
      });

      expect(updated.specificQuestionPrompts).toHaveLength(1);
      expect(updated.specificQuestionPrompts[0]).toContain('line 47');
    });

    it('calculates weighted score, updates status to graded, and records authenticity status', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      const submission = await startModule3Assessment(ownerUser, { fellowProfileId: fellowId });

      const graded = await finalizeModule3Grading(adminUser, {
        submissionId: submission.id,
        architectureArticulation: 3,
        trapExplanation: 4,
        aiTransparency: 4,
        communicationClarity: 3,
        authenticityPassed: false,
        authenticityNotes: 'Candidate could not explain line 47 decision',
      });

      expect(graded.status).toBe('graded');
      expect(graded.weightedScore).toBe(88); // (3/4)*25 + (4/4)*25 + (4/4)*25 + (3/4)*25 = 18.75+25+25+18.75 = 87.5 -> 88%
      expect(graded.authenticityPassed).toBe(false);
      expect(graded.authenticityNotes).toBe('Candidate could not explain line 47 decision');
      expect(graded.reviewerUserId).toBe('clerk_admin');
    });
  });
});
