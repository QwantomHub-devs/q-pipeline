import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getBaselineAssessment,
  initiateBaselineAssessment,
  ingestQuizWebhook,
  ingestGitHubGradingWebhook,
} from '../service';
import { AuthActor } from '@/modules/identity/types';
import * as authLib from '@/lib/auth';

const mockRows: any[] = [];

// Mock DB client
vi.mock('@/lib/db', () => {
  return {
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => mockRows,
          }),
        }),
      }),
      insert: () => ({
        values: (data: any) => {
          const row = {
            id: 'mock-baseline-uuid-1234',
            quizScore: 0,
            quizStatus: 'pending',
            codingScore: 0,
            codingStatus: 'pending',
            compositeScore: 0,
            status: 'in_progress',
            feedback: {},
            submittedAt: null,
            gradedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          mockRows.push(row);
          return {
            returning: () => [row],
          };
        },
      }),
      update: () => ({
        set: (data: any) => ({
          where: () => {
            if (mockRows[0]) {
              Object.assign(mockRows[0], data);
            }
            return {
              returning: () => [mockRows[0]],
            };
          },
        }),
      }),
    },
  };
});

describe('Baseline Assessment Engine & Security (Rule 5)', () => {
  const fellowId = '550e8400-e29b-41d4-a716-446655440000';
  const ownerUser: AuthActor = { clerkUserId: 'clerk_user_fellow_1', roles: ['fellow'] };
  const attackerUser: AuthActor = { clerkUserId: 'clerk_user_attacker', roles: ['fellow'] };
  const secret = process.env.QPIPELINE_WEBHOOK_SECRET || 'qpipeline_webhook_secret_dev';

  beforeEach(() => {
    mockRows.length = 0;
    vi.restoreAllMocks();
  });

  describe('Rule 5 Security Checks', () => {
    it('blocks unauthorized fellow from viewing another fellow assessment record', async () => {
      mockRows.push({
        id: 'mock-baseline-uuid-1234',
        fellowProfileId: fellowId,
        clerkUserId: 'clerk_user_fellow_1',
      });

      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(
        (actor, targetClerkUserId) => {
          if (actor.clerkUserId !== targetClerkUserId && !actor.roles.includes('admin')) {
            throw new authLib.ForbiddenError('Forbidden: Unauthorized record access');
          }
        }
      );

      await expect(getBaselineAssessment(fellowId, attackerUser)).rejects.toThrow('Forbidden');
    });

    it('allows owner fellow to access their baseline record', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(() => {});

      const result = await getBaselineAssessment(fellowId, ownerUser);
      expect(result).toBeNull(); // Empty mock DB
    });
  });

  describe('Baseline Assessment Execution & Webhook Ingestion', () => {
    it('initiates baseline assessment linked to GitHub username', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(() => {});

      const record = await initiateBaselineAssessment(
        { fellowProfileId: fellowId, githubUsername: 'octocat' },
        ownerUser
      );

      expect(record.githubUsername).toBe('octocat');
      expect(record.githubRepoUrl).toContain('octocat');
      expect(record.status).toBe('in_progress');
    });

    it('rejects quiz webhook payload with invalid or missing secret header', async () => {
      await expect(
        ingestQuizWebhook(
          { fellowProfileId: fellowId, quizScore: 85 },
          'invalid_secret_header'
        )
      ).rejects.toThrow('Unauthorized webhook secret header');

      await expect(
        ingestQuizWebhook(
          { fellowProfileId: fellowId, quizScore: 85 },
          null
        )
      ).rejects.toThrow('Unauthorized webhook secret header');
    });

    it('ingests quiz webhook result and calculates composite score', async () => {
      const record = await ingestQuizWebhook(
        { fellowProfileId: fellowId, quizScore: 90, totalQuestions: 10, correctAnswers: 9 },
        secret
      );

      expect(record.quizScore).toBe(90);
      expect(record.quizStatus).toBe('passed');
      expect(record.feedback.quizSummary?.correctAnswers).toBe(9);
    });

    it('ingests GitHub Actions grading results and evaluates pass/fail status', async () => {
      const record = await ingestGitHubGradingWebhook(
        {
          fellowProfileId: fellowId,
          repoUrl: 'https://github.com/qwantomhub-classroom/baseline-octocat',
          codingScore: 80,
          testResults: [
            { name: 'Task 1 - Algorithm Check', passed: true, durationMs: 120 },
            { name: 'Task 2 - Async Data Pipeline', passed: true, durationMs: 210 },
          ],
        },
        secret
      );

      expect(record.codingScore).toBe(80);
      expect(record.codingStatus).toBe('passed');
      expect(record.feedback.testResults?.length).toBe(2);
    });

    it('handles duplicate webhooks idempotently without double-counting scores', async () => {
      // First webhook call
      const firstRun = await ingestQuizWebhook(
        { fellowProfileId: fellowId, quizScore: 80 },
        secret
      );
      expect(firstRun.quizScore).toBe(80);

      // Duplicate webhook retry call with same score
      const duplicateRun = await ingestQuizWebhook(
        { fellowProfileId: fellowId, quizScore: 80 },
        secret
      );
      expect(duplicateRun.quizScore).toBe(80);
      expect(mockRows.length).toBe(1); // Row updated in place, no duplicate row inserted
    });

    it('maintains in_progress status in partial completion state until both components arrive', async () => {
      // Candidate completes quiz first (coding remains pending)
      const partialQuiz = await ingestQuizWebhook(
        { fellowProfileId: fellowId, quizScore: 90 },
        secret
      );
      expect(partialQuiz.quizStatus).toBe('passed');
      expect(partialQuiz.codingStatus).toBe('pending');
      expect(partialQuiz.status).toBe('in_progress'); // Overall status stays in_progress

      // Candidate completes coding second
      const fullGrading = await ingestGitHubGradingWebhook(
        {
          fellowProfileId: fellowId,
          repoUrl: 'https://github.com/qwantomhub-classroom/baseline-octocat',
          codingScore: 85,
          testResults: [{ name: 'Task 1', passed: true }],
        },
        secret
      );
      expect(fullGrading.status).toBe('passed'); // Now overall status transitions to passed
    });
  });
});
