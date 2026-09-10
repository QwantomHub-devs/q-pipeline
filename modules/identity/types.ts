export type FellowStage =
  | 'applicant'
  | 'training'
  | 'assessing'
  | 'fellow'
  | 'placed'
  | 'alumni';

export type FellowTier =
  | 'none'
  | 'top_tier'
  | 'standard'
  | 'not_selected';

export interface FellowProfile {
  id: string;
  clerkUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  country: string;
  stage: FellowStage;
  tier: FellowTier;
  bio: string | null;
  githubHandle: string | null;
  linkedinUrl: string | null;
  skills: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFellowProfileInput {
  clerkUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  country?: string;
  bio?: string | null;
  githubHandle?: string | null;
  linkedinUrl?: string | null;
  skills?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateFellowProfileInput {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string | null;
  country?: string;
  bio?: string | null;
  githubHandle?: string | null;
  linkedinUrl?: string | null;
  skills?: string[];
  metadata?: Record<string, unknown>;
}

export interface AuthActor {
  clerkUserId: string;
  roles: string[];
}
