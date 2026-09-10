import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  startModule1Assessment,
  submitModule1Review,
  evaluateModule1LLM,
  finalizeModule1Grading,
  getModule1Submission,
} from '../module1-service';
import { AuthActor } from '@/modules/identity/types';
import * as authLib from '@/lib/auth';

const mockSubmissions: any[] = [];
const mockAssignmentRow = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  slug: 'payment-webhook-handler',
  title: 'PR #104: Payment Webhook Handler',
  description: 'Refactors payment webhook handler',
  diffContent: '@@ -14,8 +14,18 @@',
  plantedBugs: [],
  timeLimitMinutes: 30,
  createdAt: new Date(),
};

vi.mock('@/lib/db', () => {
  return {
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => {
              if (mockSubmissions.length > 0) return mockSubmissions;
              return [{ id: '550e8400-e29b-41d4-a716-446655440000', clerkUserId: 'clerk_user_fellow_1' }];
            },
            orderBy: () => ({
              limit: () => mockSubmissions,
            }),
          }),
          orderBy: () => mockSubmissions,
          limit: () => [mockAssignmentRow],
        }),
      }),
      insert: () => ({
        values: (data: any) => {
          const row = {
            id: '550e8400-e29b-41d4-a716-446655440001',
            draftScore: 0,
            finalScore: 0,
            llmEvaluation: {},
            criterionScores: { issuesIdentified: 0, severityRanking: 0, fixQuality: 0, reasoningClarity: 0 },
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

describe('Module 1 AI Code Review Engine & Security (Rule 5)', () => {
  const fellowId = '550e8400-e29b-41d4-a716-446655440000';
  const validSubmissionId = '550e8400-e29b-41d4-a716-446655440001';
  const ownerUser: AuthActor = { clerkUserId: 'clerk_user_fellow_1', roles: ['fellow'] };
  const attackerUser: AuthActor = { clerkUserId: 'clerk_user_attacker', roles: ['fellow'] };
  const adminUser: AuthActor = { clerkUserId: 'clerk_admin_1', roles: ['admin'] };

  beforeEach(() => {
    mockSubmissions.length = 0;
    vi.restoreAllMocks();
  });

  describe('Rule 5 Security Checks', () => {
    it('blocks unauthorized fellow from accessing another candidate Module 1 submission', async () => {
      mockSubmissions.push({
        id: validSubmissionId,
        fellowProfileId: fellowId,
        clerkUserId: 'clerk_user_fellow_1',
        assignmentId: '550e8400-e29b-41d4-a716-446655440002',
        status: 'in_progress',
        startedAt: new Date(),
      });

      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation((actor) => {
        if (actor.clerkUserId !== 'clerk_user_fellow_1' && !actor.roles.includes('admin')) {
          throw new authLib.ForbiddenError('Forbidden: Unauthorized record access');
        }
      });

      await expect(getModule1Submission(fellowId, attackerUser)).rejects.toThrow('Forbidden');
    });

    it('blocks non-admin from finalizing Module 1 calibration score', async () => {
      vi.spyOn(authLib, 'requireRole').mockImplementation((actor, role) => {
        if (!actor.roles.includes(role)) {
          throw new authLib.ForbiddenError('Forbidden: Admin role required');
        }
      });

      await expect(
        finalizeModule1Grading(
          validSubmissionId,
          { issuesIdentified: 4, severityRanking: 4, fixQuality: 4, reasoningClarity: 4 },
          ownerUser
        )
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('Anthropic Claude 3.5 Sonnet LLM Pre-Grading & Heuristic Fallback', () => {
    it('evaluates candidate free-text via Anthropic Claude 3.5 Sonnet API when ANTHROPIC_API_KEY is present', async () => {
      process.env.ANTHROPIC_API_KEY = 'mock_anthropic_key';

      const mockClaudeResponse = {
        content: [
          {
            text: JSON.stringify({
              issuesIdentified: 4,
              severityRanking: 4,
              fixQuality: 4,
              reasoningClarity: 4,
              rationale: 'Candidate identified all 3 bugs and provided high quality fixes.',
            }),
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockClaudeResponse,
      } as any);

      const findings = [
        {
          bugCategory: 'security' as const,
          severityRank: 'critical' as const,
          proposedFix: 'Stripe.webhooks.constructEvent(body, sig, secret)',
          reasoning: 'Secret key leak vulnerability.',
        },
      ];

      const evalResult = await evaluateModule1LLM(findings, []);
      expect(evalResult.totalDraftScore).toBe(16);
      expect(evalResult.rationale).toContain('Claude 3.5 Sonnet');

      delete process.env.ANTHROPIC_API_KEY;
    });

    it('falls back to local heuristic pre-check when ANTHROPIC_API_KEY is absent', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const findings = [
        {
          bugCategory: 'security' as const,
          severityRank: 'critical' as const,
          proposedFix: 'const isValid = Stripe.webhooks.constructEvent(body, sig, secret); return isValid;',
          reasoning: 'Unescaped input allows secret leak because console.log prints Stripe secret key.',
        },
      ];

      const evalResult = await evaluateModule1LLM(findings, []);
      expect(evalResult.rationale).toContain('Heuristic Pre-Check');
    });
  });

  describe('Assessment Execution & Server Timer Enforcement', () => {
    it('starts Module 1 assessment and assigns scenario variant', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(() => {});

      const submission = await startModule1Assessment(fellowId, ownerUser);
      expect(submission.status).toBe('in_progress');
      expect(submission.startedAt).toBeDefined();
    });

    it('flags submission as isLate = true when elapsed time exceeds 32 minutes', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(() => {});

      const oldStartedAt = new Date(Date.now() - 40 * 60 * 1000);
      mockSubmissions.push({
        id: validSubmissionId,
        fellowProfileId: fellowId,
        clerkUserId: 'clerk_user_fellow_1',
        assignmentId: '550e8400-e29b-41d4-a716-446655440002',
        status: 'in_progress',
        startedAt: oldStartedAt,
        isLate: false,
      });

      const submission = await submitModule1Review(
        fellowId,
        validSubmissionId,
        [
          {
            bugCategory: 'security',
            severityRank: 'critical',
            proposedFix: 'const valid = checkSecretKey(sig); return valid;',
            reasoning: 'Security leak because secret key is printed in logger output.',
          },
        ],
        ownerUser
      );

      expect(submission.isLate).toBe(true);
      expect(submission.status).toBe('submitted');
    });

    it('admin finalizes Module 1 calibration score and advances fellow stage', async () => {
      vi.spyOn(authLib, 'requireRole').mockImplementation(() => {});

      mockSubmissions.push({
        id: validSubmissionId,
        fellowProfileId: fellowId,
        clerkUserId: 'clerk_user_fellow_1',
        assignmentId: '550e8400-e29b-41d4-a716-446655440002',
        status: 'submitted',
        startedAt: new Date(),
      });

      const finalized = await finalizeModule1Grading(
        validSubmissionId,
        { issuesIdentified: 4, severityRanking: 4, fixQuality: 4, reasoningClarity: 3 },
        adminUser
      );

      expect(finalized.status).toBe('graded');
      expect(finalized.finalScore).toBe(15);
    });
  });
});
