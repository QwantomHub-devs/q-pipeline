import { FellowStage, FellowTier } from '@/modules/identity/types';

export interface AdminFunnelMetrics {
  totalApplicants: number;
  totalFellows: number;
  stageCounts: Record<FellowStage, number>;
  tierCounts: Record<FellowTier, number>;
}

export interface CandidateSummary {
  id: string;
  clerkUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  country: string;
  stage: FellowStage;
  tier: FellowTier;
  outreachChannel?: string;
  cohortWindow?: string;
  createdAt: Date;
}

export interface CandidateFilterOptions {
  search?: string;
  stage?: FellowStage;
  tier?: FellowTier;
  cohortWindow?: string;
  limit?: number;
  offset?: number;
}

export interface ManualOverrideInput {
  fellowId: string;
  stage?: FellowStage;
  tier?: FellowTier;
  reason: string;
}
