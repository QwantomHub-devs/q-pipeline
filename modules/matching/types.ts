import { z } from 'zod';

export type OpportunityType = 'faang_placement' | 'sme_build_project' | 'staffing_maintenance';
export type PlacementTier = 'Tier 1 Global' | 'Tier 2 Regional' | 'Tier 3 Bench' | 'Tier 4 Rejected';
export type MatchStatus = 'suggested' | 'shortlisted' | 'client_accepted' | 'rejected' | 'placed';

export interface Opportunity {
  id: string;
  title: string;
  clientName: string;
  opportunityType: OpportunityType;
  requiredSkills: string[];
  minScore: number; // 0 - 100
  requiredTier: PlacementTier;
  compensationRange: string;
  location: string;
  slotsAvailable: number;
  filledSlotsCount: number;
  status: 'open' | 'filled' | 'closed';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FellowMatch {
  id: string;
  opportunityId: string;
  fellowId: string;
  fellowName?: string;
  fellowEmail?: string;
  matchScore: number; // 0 - 100
  skillMatchPercent: number;
  tierEligible: boolean;
  status: MatchStatus;
  notes?: string;
  assignedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Zod schemas for Rule 5 input validation
export const CreateOpportunitySchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  clientName: z.string().min(2, 'Client name is required'),
  opportunityType: z.enum(['faang_placement', 'sme_build_project', 'staffing_maintenance']),
  requiredSkills: z.array(z.string()).min(1, 'At least one required skill is needed'),
  minScore: z.number().min(0).max(100).default(70),
  requiredTier: z.enum(['Tier 1 Global', 'Tier 2 Regional', 'Tier 3 Bench', 'Tier 4 Rejected']).default('Tier 2 Regional'),
  compensationRange: z.string().min(2, 'Compensation range is required'),
  location: z.string().default('Remote / Hybrid'),
  slotsAvailable: z.number().int().min(1, 'Slots must be at least 1').default(1),
  description: z.string().optional(),
});

export const UpdateOpportunitySchema = CreateOpportunitySchema.partial().extend({
  status: z.enum(['open', 'filled', 'closed']).optional(),
});

export const UpdateMatchStatusSchema = z.object({
  matchId: z.string().uuid('Invalid match ID'),
  status: z.enum(['suggested', 'shortlisted', 'client_accepted', 'rejected', 'placed']),
  notes: z.string().optional(),
});

export type CreateOpportunityInput = z.input<typeof CreateOpportunitySchema>;
export type UpdateOpportunityInput = z.input<typeof UpdateOpportunitySchema>;
export type UpdateMatchStatusInput = z.input<typeof UpdateMatchStatusSchema>;
