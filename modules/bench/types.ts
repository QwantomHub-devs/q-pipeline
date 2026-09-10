import { z } from 'zod';

export type BenchStatus = 'bench' | 'training' | 'placed' | 'alumni' | 'rejected' | 'available' | 'assigned_project' | 'offboarded';

export interface BenchFellow {
  id: string;
  fellowProfileId: string;
  fellowId: string; // alias for fellowProfileId
  clerkUserId: string;
  fullName: string;
  email: string;
  lifecycleStage: string; // Authoritative stage from fellowProfiles.stage ('bench', 'training', 'placed', etc.)
  status: string; // alias for lifecycleStage
  currentOpportunityId?: string;
  currentProjectId?: string; // alias for currentOpportunityId
  currentOpportunityTitle?: string;
  currentProjectTitle?: string; // alias for currentOpportunityTitle
  daysOnBench: number;
  totalProjectsCompleted: number;
  totalStipendEarned: number; // Ledger-tracked micro-stipend total
  notes?: string;
  enrolledAt: string;
  updatedAt: string;
}

export interface BenchAssignment {
  id: string; // fellow_match ID from Service 16 matching engine
  fellowProfileId: string;
  opportunityId: string;
  projectTitle: string;
  clientName?: string;
  roleTitle: string;
  stipendAmount: number;
  status: 'suggested' | 'shortlisted' | 'client_accepted' | 'rejected' | 'placed' | 'assigned' | 'active' | 'completed';
  assignedBy?: string;
  notes?: string;
  assignedAt: string;
  completedAt?: string;
}

/**
 * Standardized ledger transaction event for Service 18 (Wallet & Internal Ledger Reconciliation)
 */
export interface StipendLedgerTransaction {
  fellowProfileId: string;
  amount: number;
  transactionType: 'sme_stipend_credit';
  description: string;
  referenceId: string; // match ID or opportunity ID
  timestamp: string;
}

// Zod schemas for Rule 5 input validation
export const AddToBenchSchema = z.object({
  fellowProfileId: z.string().min(1, 'Fellow profile ID is required'),
  fellowId: z.string().optional(),
  notes: z.string().optional(),
});

export const UpdateBenchStatusSchema = z.object({
  benchFellowId: z.string().min(1, 'Bench Fellow ID is required'),
  status: z.string(),
  notes: z.string().optional(),
});

export const AssignBenchProjectSchema = z.object({
  fellowProfileId: z.string().min(1, 'Fellow profile ID is required'),
  opportunityId: z.string().min(1, 'Opportunity ID is required'),
  roleTitle: z.string().min(2, 'Role Title is required').optional(),
  stipendAmount: z.number().min(0, 'Stipend amount must be non-negative').default(250),
  notes: z.string().optional(),
});

export const CompleteBenchAssignmentSchema = z.object({
  matchId: z.string().min(1, 'Match ID is required'),
  stipendEarned: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export type AddToBenchInput = z.input<typeof AddToBenchSchema>;
export type UpdateBenchStatusInput = z.input<typeof UpdateBenchStatusSchema>;
export type AssignBenchProjectInput = z.input<typeof AssignBenchProjectSchema>;
export type CompleteBenchAssignmentInput = z.input<typeof CompleteBenchAssignmentSchema>;
