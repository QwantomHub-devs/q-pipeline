import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateCandidateCompositeScore,
  overrideCandidateTierAndScore,
  getCompositeScoreForFellow,
} from '../scoring-service';
import { AuthActor } from '@/modules/identity/types';
import * as authLib from '@/lib/auth';
import * as auditService from '@/modules/audit/service';

const mockCompositeScores: any[] = [];
const mockBaseline: any = { compositeScore: 80 };
const mockMod1: any = { finalScore: 14 }; // (14/16)*100 = 88%
const mockMod2: any = { weightedScore: 90, trapDetected: false, autoRedFlag: false };
const mockMod3: any = { weightedScore: 88 };

vi.mock('@/lib/db', () => {
  return {
    db: {
      select: () => ({
        from: (table: any) => {
          let tableName = '';
          if (table) {
            tableName = table.config?.name || table._?.name || table[Symbol.for('drizzle:Name')] || table[Symbol.for('drizzle:OriginalName')] || table.name || '';
          }
          let dataToReturn: any[] = [];

          if (tableName.includes('fellow') || tableName === 'fellow_profiles') {
            dataToReturn = [{ id: '550e8400-e29b-41d4-a716-446655440000', fullName: 'Test Fellow', email: 'fellow@qwantomhub.com' }];
          } else if (tableName.includes('baseline')) {
            dataToReturn = [mockBaseline];
          } else if (tableName.includes('code_review')) {
            dataToReturn = [mockMod1];
          } else if (tableName.includes('build_sandbox')) {
            dataToReturn = [mockMod2];
          } else if (tableName.includes('recorded_explanation')) {
            dataToReturn = [mockMod3];
          } else if (tableName.includes('composite')) {
            dataToReturn = mockCompositeScores;
          } else {
            // Default fallback for single-table queries if name unresolvable
            dataToReturn = [{ id: '550e8400-e29b-41d4-a716-446655440000', fullName: 'Test Fellow', email: 'fellow@qwantomhub.com' }];
          }

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
      insert: () => ({
        values: (data: any) => {
          const row = {
            id: '550e8400-e29b-41d4-a716-446655440004',
            fellowProfileId: '550e8400-e29b-41d4-a716-446655440000',
            baselineScore: 80,
            module1Score: 88,
            module2Score: 90,
            module3Score: 88,
            overallCompositeScore: 87,
            assignedTier: 'tier_1_global',
            isRedFlagged: false,
            redFlagDetails: {},
            overrideApplied: false,
            overrideReason: null,
            calculatedAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          mockCompositeScores.push(row);
          return { returning: () => [row] };
        },
      }),
      update: () => ({
        set: (data: any) => ({
          where: () => {
            if (mockCompositeScores[0]) {
              Object.assign(mockCompositeScores[0], data);
            }
            const updatedRow = mockCompositeScores[0] || {
              id: '550e8400-e29b-41d4-a716-446655440004',
              ...data,
            };
            return { returning: () => [updatedRow] };
          },
        }),
      }),
    },
  };
});


describe('Service 13: Scoring & Rubric Engine Rules', () => {
  const fellowId = '550e8400-e29b-41d4-a716-446655440000';
  const ownerUser: AuthActor = { clerkUserId: 'clerk_user_fellow_1', roles: ['fellow'] };
  const attackerUser: AuthActor = { clerkUserId: 'clerk_user_attacker', roles: ['fellow'] };
  const adminUser: AuthActor = { clerkUserId: 'clerk_admin', roles: ['admin'] };

  beforeEach(() => {
    mockCompositeScores.length = 0;
    vi.restoreAllMocks();
  });

  describe('Composite Stage Weighting (0% Baseline / 25% M1 / 50% M2 / 25% M3)', () => {
    it('calculates weighted composite score correctly across active modules', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      const result = await calculateCandidateCompositeScore(ownerUser, { fellowProfileId: fellowId });

      // Baseline: 80 * 0.00 = 0 (Prerequisite pass/fail gate only)
      // Mod 1: 88 * 0.25 = 22
      // Mod 2: 90 * 0.50 = 45
      // Mod 3: 88 * 0.25 = 22
      // Sum = 22 + 45 + 22 = 89%
      expect(result.overallCompositeScore).toBe(89);
      expect(result.assignedTier).toBe('tier_1_global');
    });

    it('rejects candidate if Module 3 Authenticity Gate fails regardless of composite score', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      mockMod3.authenticityPassed = false;
      mockMod3.authenticityNotes = 'Proxy defense detected';

      const result = await calculateCandidateCompositeScore(ownerUser, { fellowProfileId: fellowId });

      expect(result.assignedTier).toBe('tier_4_rejected');
      expect(result.isRedFlagged).toBe(true);
      expect(result.redFlagDetails.authenticityFailed).toBe(true);

      // reset mock
      delete mockMod3.authenticityPassed;
      delete mockMod3.authenticityNotes;
    });
  });

  describe('Rule 5 Security Authorization Policy', () => {
    it('blocks an unauthorized fellow from calculating or reading another candidate composite score', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async (actor) => {
        if (actor.clerkUserId !== 'clerk_user_fellow_1') {
          throw new Error('Unauthorized access: actor cannot access record of fellow');
        }
      });

      await expect(
        calculateCandidateCompositeScore(attackerUser, { fellowProfileId: fellowId })
      ).rejects.toThrow('Unauthorized access');
    });

    it('blocks a non-admin user from applying tier overrides', async () => {
      await expect(
        overrideCandidateTierAndScore(ownerUser, {
          fellowProfileId: fellowId,
          newTier: 'tier_1_global',
          reason: 'Manual promotion attempt by candidate',
        })
      ).rejects.toThrow(/does not have required role/i);
    });
  });

  describe('Admin Tier Overrides & Audit Log Integration', () => {
    it('applies manual tier override and logs compliance audit event', async () => {
      const spyAudit = vi.spyOn(auditService, 'logAuditEvent').mockResolvedValue({} as any);

      const overridden = await overrideCandidateTierAndScore(adminUser, {
        fellowProfileId: fellowId,
        newTier: 'tier_1_global',
        overrideScore: 95,
        reason: 'Exceptional senior engineering candidate with validated background.',
      });

      expect(overridden.assignedTier).toBe('tier_1_global');
      expect(overridden.overrideApplied).toBe(true);
      expect(spyAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CANDIDATE_TIER_OVERRIDE',
          targetId: fellowId,
          severity: 'warning',
        })
      );
    });
  });
});
