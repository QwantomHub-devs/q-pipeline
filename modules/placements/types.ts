import { z } from 'zod';

export type PlacementStatus = 'pending_start' | 'active' | 'completed' | 'extended' | 'terminated';
export type ReviewerType = 'client' | 'fellow_self' | 'admin';
export type MilestoneStatus = 'submitted' | 'approved' | 'rejected';

export interface FellowPlacement {
  id: string;
  fellowProfileId: string;
  opportunityId?: string;
  contractId?: string;
  clientName: string;
  clientContactEmail: string;
  roleTitle: string;
  monthlyCompensation: number;
  billingRate: number;
  currency: string;
  startDate: string;
  endDate: string;
  status: PlacementStatus;
  terminationReason?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PlacementPerformanceReview {
  id: string;
  placementId: string;
  fellowProfileId: string;
  reviewerType: ReviewerType;
  reviewerName: string;
  technicalVelocityScore: number;
  codeQualityScore: number;
  communicationScore: number;
  reliabilityScore: number;
  overallRating: number;
  isLowPerformanceFlagged: boolean;
  feedbackNotes: string;
  reviewDate: string;
  createdAt: string;
}

export interface PlacementMilestoneReport {
  id: string;
  placementId: string;
  fellowProfileId: string;
  title: string;
  deliverablesSummary: string;
  hoursBilled: number;
  status: MilestoneStatus;
  submittedAt: string;
  reviewedAt?: string;
}

export interface PlacementSummaryMetrics {
  totalPlacements: number;
  activePlacementsCount: number;
  completedPlacementsCount: number;
  averageClientRating: number;
  retentionRatePercent: number;
  lowPerformanceAlertCount: number;
}

// Zod Validation Schemas
export const CreatePlacementSchema = z.object({
  fellowProfileId: z.string().min(1, 'Fellow Profile ID is required'),
  opportunityId: z.string().optional(),
  contractId: z.string().optional(),
  clientName: z.string().min(2, 'Client name must be at least 2 characters'),
  clientContactEmail: z.string().email('Invalid client contact email'),
  roleTitle: z.string().min(2, 'Role title must be at least 2 characters'),
  monthlyCompensation: z.number().positive('Monthly compensation must be positive'),
  billingRate: z.number().min(0, 'Billing rate cannot be negative').optional().default(0),
  currency: z.string().default('USD'),
  startDate: z.string().min(8, 'Start date is required'),
  endDate: z.string().min(8, 'End date is required'),
  status: z.enum(['pending_start', 'active', 'completed', 'extended', 'terminated']).optional().default('active'),
  metadata: z.record(z.any()).optional(),
});

export const UpdatePlacementStatusSchema = z.object({
  placementId: z.string().min(1, 'Placement ID is required'),
  status: z.enum(['pending_start', 'active', 'completed', 'extended', 'terminated']),
  endDate: z.string().optional(),
  terminationReason: z.string().optional(),
});

export const SubmitPerformanceReviewSchema = z.object({
  placementId: z.string().min(1, 'Placement ID is required'),
  fellowProfileId: z.string().min(1, 'Fellow Profile ID is required'),
  reviewerType: z.enum(['client', 'fellow_self', 'admin']).default('client'),
  reviewerName: z.string().min(2, 'Reviewer name is required'),
  technicalVelocityScore: z.number().min(1).max(5),
  codeQualityScore: z.number().min(1).max(5),
  communicationScore: z.number().min(1).max(5),
  reliabilityScore: z.number().min(1).max(5),
  feedbackNotes: z.string().min(5, 'Feedback notes must be at least 5 characters'),
  reviewDate: z.string().optional(),
});

export const SubmitMilestoneReportSchema = z.object({
  placementId: z.string().min(1, 'Placement ID is required'),
  fellowProfileId: z.string().min(1, 'Fellow Profile ID is required'),
  title: z.string().min(3, 'Report title must be at least 3 characters'),
  deliverablesSummary: z.string().min(10, 'Deliverables summary must be at least 10 characters'),
  hoursBilled: z.number().min(0, 'Hours billed cannot be negative'),
});

export type CreatePlacementInput = z.input<typeof CreatePlacementSchema>;
export type UpdatePlacementStatusInput = z.infer<typeof UpdatePlacementStatusSchema>;
export type SubmitPerformanceReviewInput = z.input<typeof SubmitPerformanceReviewSchema>;
export type SubmitMilestoneReportInput = z.infer<typeof SubmitMilestoneReportSchema>;
