import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createPlacement,
  updatePlacementStatus,
  submitPerformanceReview,
  submitMilestoneReport,
  listPlacementsForFellow,
  listAllPlacementsForAdmin,
  getPlacementMetrics,
  _resetPlacementsStoreForTesting,
} from '../placements-service';
import { AuthActor } from '@/modules/identity/types';
import * as auth from '@/lib/auth';
import * as identityService from '@/modules/identity/service';

// Mock audit service
vi.mock('../../audit/service', () => ({
  logAuditEvent: vi.fn().mockResolvedValue({}),
}));

describe('Service 23: Placement Tracking & Performance (BUILD)', () => {
  const fellowProfileIdA = '550e8400-e29b-41d4-a716-446655440000';
  const fellowProfileIdB = '660e8400-e29b-41d4-a716-446655440001';

  const fellowUserA: AuthActor = { clerkUserId: 'clerk_user_fellow_1', roles: ['fellow'] };
  const fellowUserB: AuthActor = { clerkUserId: 'clerk_user_fellow_2', roles: ['fellow'] };
  const adminUser: AuthActor = { clerkUserId: 'clerk_admin', roles: ['admin'] };

  beforeEach(() => {
    _resetPlacementsStoreForTesting();
    vi.restoreAllMocks();
  });

  describe('Placement Creation & Identity Stage Synchronization', () => {
    it('allows admin to create a placement and syncs fellow stage to "placed"', async () => {
      const stageSpy = vi.spyOn(identityService, 'updateFellowStageAndTier').mockResolvedValue({} as any);

      const placement = await createPlacement(adminUser, {
        fellowProfileId: fellowProfileIdA,
        clientName: 'Seelicongate Global',
        clientContactEmail: 'eng@seelicongate.com',
        roleTitle: 'Senior AI Engineer',
        monthlyCompensation: 3500,
        billingRate: 5000,
        startDate: '2026-09-01',
        endDate: '2027-03-01',
        status: 'active',
      });

      expect(placement.id).toBeDefined();
      expect(placement.fellowProfileId).toBe(fellowProfileIdA);
      expect(placement.clientName).toBe('Seelicongate Global');
      expect(placement.status).toBe('active');
      expect(stageSpy).toHaveBeenCalledWith(fellowProfileIdA, 'placed', 'top_tier', adminUser);
    });

    it('blocks non-admin users from creating placements', async () => {
      await expect(
        createPlacement(fellowUserA, {
          fellowProfileId: fellowProfileIdA,
          clientName: 'Unauthorized Client',
          clientContactEmail: 'test@client.com',
          roleTitle: 'Engineer',
          monthlyCompensation: 2000,
          startDate: '2026-09-01',
          endDate: '2027-03-01',
        })
      ).rejects.toThrow(/required role/i);
    });
  });

  describe('Placement Status Transitions & Stage Sync', () => {
    it('updates placement status to completed and syncs identity stage to "alumni"', async () => {
      const stageSpy = vi.spyOn(identityService, 'updateFellowStageAndTier').mockResolvedValue({} as any);

      const placement = await createPlacement(adminUser, {
        fellowProfileId: fellowProfileIdA,
        clientName: 'Blaccgate Engineering',
        clientContactEmail: 'contact@blaccgate.com',
        roleTitle: 'Lead Backend Developer',
        monthlyCompensation: 4000,
        startDate: '2026-03-01',
        endDate: '2026-09-01',
      });

      const updated = await updatePlacementStatus(adminUser, {
        placementId: placement.id,
        status: 'completed',
      });

      expect(updated.status).toBe('completed');
      expect(stageSpy).toHaveBeenCalledWith(fellowProfileIdA, 'alumni', 'top_tier', adminUser);
    });

    it('updates placement status to terminated and syncs identity stage back to "fellow"', async () => {
      const stageSpy = vi.spyOn(identityService, 'updateFellowStageAndTier').mockResolvedValue({} as any);

      const placement = await createPlacement(adminUser, {
        fellowProfileId: fellowProfileIdA,
        clientName: 'Regional Tech Ltd',
        clientContactEmail: 'hr@regionaltech.com',
        roleTitle: 'Frontend Engineer',
        monthlyCompensation: 2500,
        startDate: '2026-08-01',
        endDate: '2027-02-01',
      });

      const updated = await updatePlacementStatus(adminUser, {
        placementId: placement.id,
        status: 'terminated',
        terminationReason: 'Client budget reorganization',
      });

      expect(updated.status).toBe('terminated');
      expect(updated.terminationReason).toBe('Client budget reorganization');
      expect(stageSpy).toHaveBeenCalledWith(fellowProfileIdA, 'fellow', 'standard', adminUser);
    });
  });

  describe('Client Performance Reviews & Low Rating Auto-Flagging', () => {
    it('ingests client performance review, calculates overall score, and flags low ratings (< 3.0)', async () => {
      const placement = await createPlacement(adminUser, {
        fellowProfileId: fellowProfileIdA,
        clientName: 'Seelicongate Global',
        clientContactEmail: 'eng@seelicongate.com',
        roleTitle: 'Senior AI Engineer',
        monthlyCompensation: 3500,
        startDate: '2026-09-01',
        endDate: '2027-03-01',
      });

      // High review
      const highReview = await submitPerformanceReview(adminUser, {
        placementId: placement.id,
        fellowProfileId: fellowProfileIdA,
        reviewerType: 'client',
        reviewerName: 'Engineering Director',
        technicalVelocityScore: 5,
        codeQualityScore: 5,
        communicationScore: 4,
        reliabilityScore: 5,
        feedbackNotes: 'Exceeds all delivery benchmarks.',
      });

      expect(highReview.overallRating).toBe(4.75);
      expect(highReview.isLowPerformanceFlagged).toBe(false);

      // Low review (< 3.0)
      const lowReview = await submitPerformanceReview(adminUser, {
        placementId: placement.id,
        fellowProfileId: fellowProfileIdA,
        reviewerType: 'client',
        reviewerName: 'Project Manager',
        technicalVelocityScore: 2,
        codeQualityScore: 2,
        communicationScore: 3,
        reliabilityScore: 2,
        feedbackNotes: 'Missed sprint deadlines and low velocity.',
      });

      expect(lowReview.overallRating).toBe(2.25);
      expect(lowReview.isLowPerformanceFlagged).toBe(true);
    });
  });

  describe('Milestone Deliverable Submissions', () => {
    it('allows fellow to submit milestone progress report for their active placement', async () => {
      vi.spyOn(auth, 'assertCanAccessFellowRecord').mockResolvedValue(undefined);

      const placement = await createPlacement(adminUser, {
        fellowProfileId: fellowProfileIdA,
        clientName: 'Seelicongate Global',
        clientContactEmail: 'eng@seelicongate.com',
        roleTitle: 'Senior AI Engineer',
        monthlyCompensation: 3500,
        startDate: '2026-09-01',
        endDate: '2027-03-01',
      });

      const milestone = await submitMilestoneReport(fellowUserA, {
        placementId: placement.id,
        fellowProfileId: fellowProfileIdA,
        title: 'Sprint 12 Migration Deliverables',
        deliverablesSummary: 'Merged 14 microservice pull requests with 99.4% unit test coverage.',
        hoursBilled: 42.5,
      });

      expect(milestone.id).toBeDefined();
      expect(milestone.title).toBe('Sprint 12 Migration Deliverables');
      expect(milestone.hoursBilled).toBe(42.5);
      expect(milestone.status).toBe('submitted');
    });
  });

  describe('Placement Metrics Aggregation', () => {
    it('calculates total placements, active count, avg rating, retention rate %, and alert counts', async () => {
      const p1 = await createPlacement(adminUser, {
        fellowProfileId: fellowProfileIdA,
        clientName: 'Client Alpha',
        clientContactEmail: 'a@alpha.com',
        roleTitle: 'Engineer',
        monthlyCompensation: 3000,
        startDate: '2026-01-01',
        endDate: '2026-06-01',
        status: 'active',
      });

      const p2 = await createPlacement(adminUser, {
        fellowProfileId: fellowProfileIdB,
        clientName: 'Client Beta',
        clientContactEmail: 'b@beta.com',
        roleTitle: 'DevOps Lead',
        monthlyCompensation: 4000,
        startDate: '2026-02-01',
        endDate: '2026-08-01',
        status: 'completed',
      });

      await submitPerformanceReview(adminUser, {
        placementId: p1.id,
        fellowProfileId: fellowProfileIdA,
        reviewerName: 'Client A Lead',
        technicalVelocityScore: 5,
        codeQualityScore: 5,
        communicationScore: 5,
        reliabilityScore: 5,
        feedbackNotes: 'Flawless work.',
      });

      const metrics = await getPlacementMetrics(adminUser);

      expect(metrics.totalPlacements).toBe(2);
      expect(metrics.activePlacementsCount).toBe(1);
      expect(metrics.completedPlacementsCount).toBe(1);
      expect(metrics.averageClientRating).toBe(5.0);
      expect(metrics.retentionRatePercent).toBe(100.0);
      expect(metrics.lowPerformanceAlertCount).toBe(0);
    });
  });

  describe('Rule 5 Security & Explicit Fellow Isolation', () => {
    it('blocks Fellow A from viewing Fellow B placement history', async () => {
      await createPlacement(adminUser, {
        fellowProfileId: fellowProfileIdB,
        clientName: 'Private Client',
        clientContactEmail: 'private@client.com',
        roleTitle: 'Architect',
        monthlyCompensation: 5000,
        startDate: '2026-01-01',
        endDate: '2026-12-01',
      });

      vi.spyOn(auth, 'assertCanAccessFellowRecord').mockImplementation(async (actor, profileId) => {
        if (profileId !== '550e8400-e29b-41d4-a716-446655440000') {
          throw new Error('Unauthorized: actor cannot access fellow record');
        }
      });

      await expect(listPlacementsForFellow(fellowUserA, fellowProfileIdB)).rejects.toThrow(/unauthorized/i);
    });
  });
});
