import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthActor } from '@/modules/identity/types';
import * as adminService from '../service';
import { db } from '@/lib/db';
import { ForbiddenError } from '@/lib/auth';
import * as identityService from '@/modules/identity/service';

// Mock DB client
vi.mock('@/lib/db', () => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'audit-log-1' }]),
      }),
    }),
  };
  return { db: mockDb };
});

// Mock Identity Service
vi.mock('@/modules/identity/service', () => ({
  getFellowProfileById: vi.fn(),
  updateFellowStageAndTier: vi.fn(),
}));

describe('Admin Module Operations & RBAC Guards (Rule 5)', () => {
  const adminActor: AuthActor = {
    clerkUserId: 'user_admin_ops_1',
    roles: ['admin'],
  };

  const fellowActor: AuthActor = {
    clerkUserId: 'user_fellow_1',
    roles: ['fellow'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFunnelMetrics', () => {
    it('aggregates pipeline stage and tier metrics for admin actors', async () => {
      const mockProfiles = [
        { id: '1', stage: 'applicant', tier: 'none' },
        { id: '2', stage: 'training', tier: 'standard' },
        { id: '3', stage: 'placed', tier: 'top_tier' },
        { id: '4', stage: 'fellow', tier: 'top_tier' },
      ];

      const mockFrom = vi.fn().mockResolvedValue(mockProfiles);
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      const metrics = await adminService.getFunnelMetrics(adminActor);

      expect(metrics.totalApplicants).toBe(4);
      expect(metrics.totalFellows).toBe(2); // fellow + placed
      expect(metrics.stageCounts.placed).toBe(1);
      expect(metrics.tierCounts.top_tier).toBe(2);
    });

    it('BLOCKS non-admin actors from reading funnel metrics (Rule 5)', async () => {
      await expect(adminService.getFunnelMetrics(fellowActor)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('listCandidates', () => {
    it('returns candidate profiles for admin actors', async () => {
      const mockResults = [
        { id: '1', firstName: 'Chukwuemeka', lastName: 'Dev', stage: 'applicant', tier: 'none' },
      ];

      const mockLimit = vi.fn().mockResolvedValue(mockResults);
      const mockFrom = vi.fn().mockReturnValue({ limit: mockLimit });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      const candidates = await adminService.listCandidates({}, adminActor);
      expect(candidates).toHaveLength(1);
      expect(candidates[0].firstName).toBe('Chukwuemeka');
    });

    it('BLOCKS non-admin actors from listing candidates', async () => {
      await expect(adminService.listCandidates({}, fellowActor)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('executeManualOverride', () => {
    it('executes stage and tier override for admin actor', async () => {
      (identityService.getFellowProfileById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'fellow-1',
        stage: 'applicant',
        tier: 'none',
      });

      (identityService.updateFellowStageAndTier as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'fellow-1',
        stage: 'fellow',
        tier: 'top_tier',
      });

      const result = await adminService.executeManualOverride(
        {
          fellowId: 'fellow-1',
          stage: 'fellow',
          tier: 'top_tier',
          reason: 'Passed all Module 1-3 assessments',
        },
        adminActor
      );

      expect(identityService.updateFellowStageAndTier).toHaveBeenCalledWith(
        'fellow-1',
        'fellow',
        'top_tier',
        adminActor
      );
      expect(result.stage).toBe('fellow');
    });

    it('BLOCKS non-admin actor from executing manual override', async () => {
      await expect(
        adminService.executeManualOverride(
          {
            fellowId: 'fellow-1',
            stage: 'fellow',
            reason: 'Unauthorized override attempt',
          },
          fellowActor
        )
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
