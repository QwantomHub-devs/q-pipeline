import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPipelineFunnelMetrics,
  getQualityAndAuthenticityMetrics,
  getBenchHealthMetrics,
  getFinancialAnalytics,
  getNorthStarPlacementMetrics,
  getExecutiveAnalyticsOverview,
  getMetabaseConnectionDetails,
} from '../analytics-service';
import { AuthActor } from '@/modules/identity/types';

// Mock wallet, payout, and bench services
vi.mock('../../wallet/wallet-service', () => ({
  listAllWalletsForAdmin: vi.fn().mockResolvedValue([
    { id: 'w-1', availableBalance: 250, totalLifetimeEarned: 500, reconciliation: { isReconciled: true } },
    { id: 'w-2', availableBalance: 400, totalLifetimeEarned: 800, reconciliation: { isReconciled: true } },
  ]),
  reconcileWalletLedger: vi.fn().mockResolvedValue({ isReconciled: true }),
}));

vi.mock('../../payout/payout-service', () => ({
  listAllPayoutsForAdmin: vi.fn().mockResolvedValue([
    { id: 'p-1', amount: 150, status: 'success' },
    { id: 'p-2', amount: 200, status: 'success' },
  ]),
}));

vi.mock('../../bench/bench-service', () => ({
  listBenchPool: vi.fn().mockResolvedValue([
    { id: 'b-1', status: 'available' },
    { id: 'b-2', status: 'assigned_project' },
  ]),
}));

describe('Service 20: Analytics & Reporting (Metabase SQL BI Architecture)', () => {
  const adminUser: AuthActor = { clerkUserId: 'clerk_admin', roles: ['admin'] };
  const fellowUser: AuthActor = { clerkUserId: 'clerk_fellow', roles: ['fellow'] };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Pipeline Funnel & Quality Aggregation', () => {
    it('computes end-to-end pipeline funnel metrics with conversion rates', async () => {
      const funnel = await getPipelineFunnelMetrics(adminUser);

      expect(funnel.totalApplicants).toBeGreaterThanOrEqual(0);
      expect(funnel.stages.length).toBe(8);
      expect(funnel.stages[0].stage).toBe('applicant');
      expect(funnel.stages[0].conversionFromPreviousPercent).toBe(100);
      expect(funnel.stages[1].conversionFromPreviousPercent).toBeLessThanOrEqual(100);
    });

    it('calculates assessment tier mix and authenticity gate disqualification rate', async () => {
      const quality = await getQualityAndAuthenticityMetrics(adminUser);

      expect(quality.totalAssessed).toBeGreaterThanOrEqual(0);
      expect(quality.tier1GlobalCount + quality.tier2RegionalCount + quality.rejectedCount).toBe(quality.totalAssessed);
      expect(quality.authenticityFailRatePercent).toBeGreaterThanOrEqual(0);
      expect(quality.averageCompositeScore).toBeDefined();
    });
  });

  describe('North Star Placement Velocity & Bench Health', () => {
    it('tracks annual target of 60 global placements/year progress', async () => {
      const northStar = await getNorthStarPlacementMetrics(adminUser);

      expect(northStar.annualTargetGlobalPlacements).toBe(60);
      expect(northStar.currentGlobalPlacementsCount).toBeGreaterThanOrEqual(0);
      expect(northStar.targetProgressPercent).toBeGreaterThanOrEqual(0);
    });

    it('computes bench health and project assignment rate', async () => {
      const bench = await getBenchHealthMetrics(adminUser);

      expect(bench.totalOnBench).toBe(2);
      expect(bench.availableOnBench).toBe(1);
      expect(bench.assignedToSmeProjects).toBe(1);
      expect(bench.projectAssignmentRatePercent).toBe(50); // 1 / 2 = 50%
    });
  });

  describe('Financial Velocity & Metabase Direct SQL Connection Details', () => {
    it('computes system liabilities and wallet reconciliation status across pool', async () => {
      const financial = await getFinancialAnalytics(adminUser);

      expect(financial.totalSystemLiabilities).toBe(650); // 250 + 400
      expect(financial.totalLifetimeStipendsCredited).toBe(1300); // 500 + 800
      expect(financial.totalPayoutsDisbursed).toBe(350); // 150 + 200
      expect(financial.payoutSuccessRatePercent).toBe(100);
      expect(financial.discrepanciesCount).toBe(0);
    });

    it('provides Metabase SQL connection details and recommended query templates', async () => {
      const details = await getMetabaseConnectionDetails(adminUser);

      expect(details.hostUrl).toBeDefined();
      expect(details.tablesAvailable.length).toBeGreaterThan(5);
      expect(details.recommendedSqlQueries.length).toBe(4);
      expect(details.recommendedSqlQueries[0].sql).toContain('annual_target');
    });

    it('aggregates master executive analytics overview', async () => {
      const overview = await getExecutiveAnalyticsOverview(adminUser);

      expect(overview.funnel).toBeDefined();
      expect(overview.quality).toBeDefined();
      expect(overview.bench).toBeDefined();
      expect(overview.financial).toBeDefined();
      expect(overview.northStar).toBeDefined();
      expect(overview.generatedAt).toBeDefined();
    });
  });

  describe('Rule 5 Security & Role Authorization', () => {
    it('blocks non-admin fellow user from accessing pipeline analytics', async () => {
      await expect(getExecutiveAnalyticsOverview(fellowUser)).rejects.toThrow(
        /does not have required role: admin/
      );
    });

    it('blocks non-admin fellow user from fetching Metabase SQL connection details', async () => {
      await expect(getMetabaseConnectionDetails(fellowUser)).rejects.toThrow(
        /does not have required role: admin/
      );
    });
  });
});

