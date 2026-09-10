export type OutreachChannel =
  | 'nysc_camp'
  | 'university'
  | '3mtt'
  | 'partner_org'
  | 'social_media'
  | 'direct'
  | 'referral';

export type NyscStatus =
  | 'serving'
  | 'completed'
  | 'exempt'
  | 'not_applicable';

export type IntakeStatus =
  | 'submitted'
  | 'eligible'
  | 'ineligible'
  | 'duplicate';

export interface ApplicantIntake {
  id: string;
  fellowId: string;
  clerkUserId: string;
  cohortWindow: string;
  outreachChannel: OutreachChannel;
  nyscStatus: NyscStatus | null;
  university: string | null;
  yearsOfExperience: number;
  primaryTrack: string;
  status: IntakeStatus;
  eligibilityNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmitIntakeInput {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  country?: string;
  cohortWindow: string;
  outreachChannel: OutreachChannel;
  nyscStatus?: NyscStatus;
  university?: string;
  yearsOfExperience?: number;
  primaryTrack: string;
  bio?: string;
  githubHandle?: string;
  linkedinUrl?: string;
}

export interface EligibilityCheckResult {
  isEligible: boolean;
  reason?: string;
  existingIntakeId?: string;
}
