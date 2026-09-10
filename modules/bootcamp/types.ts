export type CohortStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';
export type EnrollmentStatus = 'enrolled' | 'in_progress' | 'graduated' | 'dropped';
export type MilestoneStatus = 'pending' | 'submitted' | 'approved' | 'revision_needed';

export interface BootcampTrack {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Cohort {
  id: string;
  name: string;
  trackSlug: string;
  status: CohortStatus;
  capacity: number;
  startDate: Date | null;
  endDate: Date | null;
  description: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  // Computed fields
  enrolledCount?: number;
  availableSlots?: number;
  trackName?: string;
}

export interface BootcampEnrollment {
  id: string;
  fellowProfileId: string;
  cohortId: string;
  status: EnrollmentStatus;
  currentWeek: number;
  enrolledAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BootcampMilestone {
  id: string;
  cohortId: string;
  title: string;
  description: string | null;
  weekNumber: number;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FellowMilestoneProgress {
  id: string;
  enrollmentId: string;
  milestoneId: string;
  status: MilestoneStatus;
  submissionUrl: string | null;
  feedback: string | null;
  gradedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Included fields
  milestoneTitle?: string;
  weekNumber?: number;
}

export interface FellowBootcampDashboardData {
  enrollment: BootcampEnrollment | null;
  cohort: Cohort | null;
  track: BootcampTrack | null;
  milestones: Array<BootcampMilestone & { progress?: FellowMilestoneProgress }>;
}
