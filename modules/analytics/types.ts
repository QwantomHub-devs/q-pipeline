export interface FunnelStageMetric {
  stage: string;
  label: string;
  count: number;
  conversionFromPreviousPercent: number;
  dropoffPercent: number;
}

export interface PipelineFunnelMetrics {
  totalApplicants: number;
  baselineCompleted: number;
  module1Completed: number;
  module2Completed: number;
  module3Completed: number;
  bootcampEnrolled: number;
  benchPoolCount: number;
  totalPlacedCount: number;
  stages: FunnelStageMetric[];
}

export interface QualityMetrics {
  totalAssessed: number;
  tier1GlobalCount: number;
  tier2RegionalCount: number;
  rejectedCount: number;
  authenticityDisqualifiedCount: number;
  authenticityFailRatePercent: number;
  averageCompositeScore: number;
  averageModule1Score: number;
  averageModule2Score: number;
  averageModule3Score: number;
}

export interface BenchHealthMetrics {
  totalOnBench: number;
  availableOnBench: number;
  assignedToSmeProjects: number;
  averageDaysOnBench: number;
  projectAssignmentRatePercent: number;
  totalProjectsCompleted: number;
}

export interface FinancialAnalytics {
  totalSystemLiabilities: number;
  totalLifetimeStipendsCredited: number;
  totalPayoutsDisbursed: number;
  payoutSuccessRatePercent: number;
  activeWalletsCount: number;
  reconciledWalletsCount: number;
  discrepanciesCount: number;
}

export interface NorthStarPlacementMetrics {
  annualTargetGlobalPlacements: number; // 60 Global Placements / Year
  currentGlobalPlacementsCount: number;
  currentRegionalPlacementsCount: number;
  targetProgressPercent: number;
  placementRetentionRatePercent: number;
  averageTimeToFirstPlacementDays: number;
}

export interface ExecutiveAnalyticsOverview {
  funnel: PipelineFunnelMetrics;
  quality: QualityMetrics;
  bench: BenchHealthMetrics;
  financial: FinancialAnalytics;
  northStar: NorthStarPlacementMetrics;
  generatedAt: string;
}

export interface MetabaseConnectionDetails {
  hostUrl: string;
  databaseName: string;
  connectionType: 'Postgres (Direct Read Replica)';
  tablesAvailable: string[];
  recommendedSqlQueries: Array<{
    title: string;
    description: string;
    sql: string;
  }>;
}
