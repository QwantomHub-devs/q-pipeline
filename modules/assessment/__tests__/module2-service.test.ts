import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateModule2WeightedScore,
  detectAutoRedFlag,
  startModule2Assessment,
  ingestSandboxTelemetry,
  submitModule2Assessment,
  finalizeModule2Grading,
} from '../module2-service';
import { AuthActor } from '@/modules/identity/types';
import * as authLib from '@/lib/auth';

const mockSubmissions: any[] = [];
const mockTicketRow = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  slug: 'e-commerce-inventory-sync',
  title: 'Ticket #204: Distributed Inventory Sync',
  description: 'Synchronizes inventory balances',
  repositoryTemplateUrl: 'https://github.com/qwantomhub/template-module2-inventory-sync',
  plantedTraps: [
    {
      trapId: 'trap-secret-leak-1',
      trapType: 'secret_leak',
      secretToken: 'PROPRIETARY_CLIENT_SECRET_KEY_99',
      description: 'Planted client secret',
      expectedHandling: 'Move to env variable',
    },
  ],
  timeLimitMinutes: 90,
  createdAt: new Date(),
};

vi.mock('@/lib/db', () => {
  return {
    db: {
      select: () => ({
        from: () => {
          const res: any = [mockTicketRow];
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
          res.limit = () => [mockTicketRow];
          return res;
        },
      }),

      insert: () => ({
        values: (data: any) => {
          const row = {
            id: '550e8400-e29b-41d4-a716-446655440001',
            fellowProfileId: '550e8400-e29b-41d4-a716-446655440000',
            ticketId: '550e8400-e29b-41d4-a716-446655440002',
            status: 'in_progress',
            telemetryLogs: [],
            trapDetected: false,
            autoRedFlag: false,
            weightedScore: 0,
            rubricScores: { correctness: 0, verificationBehavior: 0, securityAwareness: 0, codeQuality: 0, efficiency: 0 },
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

describe('Module 2 Build Sandbox Rubric Engine & Telemetry Rules', () => {
  const fellowId = '550e8400-e29b-41d4-a716-446655440000';
  const ownerUser: AuthActor = { clerkUserId: 'clerk_user_fellow_1', roles: ['fellow'] };
  const attackerUser: AuthActor = { clerkUserId: 'clerk_user_attacker', roles: ['fellow'] };

  beforeEach(() => {
    mockSubmissions.length = 0;
    vi.restoreAllMocks();
  });

  describe('Weighted Rubric Formula (0-100%)', () => {
    it('calculates 100% for perfect scores (4/4 across all 5 criteria)', () => {
      const scores = { correctness: 4, verificationBehavior: 4, securityAwareness: 4, codeQuality: 4, efficiency: 4 };
      expect(calculateModule2WeightedScore(scores)).toBe(100);
    });

    it('calculates correct weighted percentages (Correctness 25%, Verification 30%, Security 15%, Quality 15%, Efficiency 15%)', () => {
      // 2/4 correctness -> (2/4)*25 = 12.5
      // 4/4 verification -> 30
      // 0/4 security -> 0
      // 0/4 quality -> 0
      // 0/4 efficiency -> 0
      // Total = 42.5 -> 43%
      const scores = { correctness: 2, verificationBehavior: 4, securityAwareness: 0, codeQuality: 0, efficiency: 0 };
      expect(calculateModule2WeightedScore(scores)).toBe(43);
    });
  });

  describe('Auto Red-Flag Rule', () => {
    it('triggers auto red-flag when efficiency >= 3 AND verificationBehavior === 0', () => {
      const scores = { correctness: 3, verificationBehavior: 0, securityAwareness: 2, codeQuality: 2, efficiency: 3 };
      expect(detectAutoRedFlag(scores)).toBe(true);
    });

    it('does not trigger auto red-flag if verificationBehavior > 0', () => {
      const scores = { correctness: 3, verificationBehavior: 1, securityAwareness: 2, codeQuality: 2, efficiency: 4 };
      expect(detectAutoRedFlag(scores)).toBe(false);
    });
  });

  describe('Rule 5 Security Authorization Policy', () => {
    it('blocks an unauthorized fellow from starting assessment for another candidate', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async (actor, targetFellowId) => {
        if (actor.clerkUserId !== 'clerk_user_fellow_1') {
          throw new Error('Unauthorized access: actor cannot access record of fellow');
        }
      });

      await expect(
        startModule2Assessment(attackerUser, { fellowProfileId: fellowId })
      ).rejects.toThrow('Unauthorized access');
    });
  });

  describe('Planted Trap Detector & Telemetry Ingestion', () => {
    it('flags trapDetected = true when planted secret token appears in telemetry payload', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      const { submission } = await startModule2Assessment(ownerUser, { fellowProfileId: fellowId });

      const telemetryRes = await ingestSandboxTelemetry(ownerUser, {
        submissionId: submission.id,
        fellowProfileId: fellowId,
        events: [
          {
            timestamp: new Date().toISOString(),
            eventType: 'external_copy',
            payload: { pastedContent: 'const key = "PROPRIETARY_CLIENT_SECRET_KEY_99";' },
          },
        ],
      });

      expect(telemetryRes.plantedTrapTriggered).toBe(true);
    });
  });
});
