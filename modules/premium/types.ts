import { z } from 'zod';

export type EligibilityStatus = 'eligible' | 'ineligible' | 'pending_review';
export type ShortlistStatus = 'proposed' | 'shortlisted' | 'nominated' | 'accepted' | 'declined';

export interface PremiumEligibilityGate {
  id: string;
  fellowProfileId: string;
  eligibilityStatus: EligibilityStatus;
  scoreThresholdMet: boolean;
  tierConfirmed: boolean;
  contractSigned: boolean;
  authenticityPassed: boolean;
  eligibilityReason?: string;
  evaluatedAt: string;
  createdAt: string;
  // Included populated fellow details when queried
  fellowName?: string;
  fellowEmail?: string;
  fellowStage?: string;
  fellowTier?: string;
}

export interface PremiumShortlist {
  id: string;
  fellowProfileId: string;
  shortlistName: string;
  status: ShortlistStatus;
  notes?: string;
  curatedBy: string;
  submittedAt?: string;
  createdAt: string;
  // Included populated fellow details when queried
  fellowName?: string;
  fellowEmail?: string;
}

export const EvaluateEligibilitySchema = z.object({
  fellowProfileId: z.string().min(1, 'Fellow Profile ID is required'),
  forceReevaluate: z.boolean().optional().default(false),
});

export const CurateShortlistSchema = z.object({
  fellowProfileId: z.string().min(1, 'Fellow Profile ID is required'),
  shortlistName: z.string().min(3, 'Shortlist name must be at least 3 characters'),
  notes: z.string().optional(),
});

export const UpdateShortlistStatusSchema = z.object({
  shortlistId: z.string().min(1, 'Shortlist ID is required'),
  status: z.enum(['proposed', 'shortlisted', 'nominated', 'accepted', 'declined']),
  notes: z.string().optional(),
});

export type EvaluateEligibilityInput = z.input<typeof EvaluateEligibilitySchema>;
export type CurateShortlistInput = z.input<typeof CurateShortlistSchema>;
export type UpdateShortlistStatusInput = z.input<typeof UpdateShortlistStatusSchema>;
