import { z } from 'zod';

export interface Mentor {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  expertise: string[];
  bio?: string;
  avatarUrl?: string;
  maxMentees: number;
  activeMenteesCount: number;
  status: 'active' | 'inactive' | 'on_leave';
  createdAt: string;
  updatedAt: string;
}

export type AssignmentTargetType = 'cohort' | 'fellow';
export type AssignmentStatus = 'active' | 'completed' | 'cancelled';

export interface MentorAssignment {
  id: string;
  mentorId: string;
  targetType: AssignmentTargetType;
  targetId: string; // cohort_id or fellow_id
  targetName?: string;
  assignedBy: string; // admin user ID
  status: AssignmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type SessionStatus = 'scheduled' | 'completed' | 'cancelled';

export interface EnhancedMentorMatch {
  id: string;
  fellowProfileId: string;
  mentorId: string;
  compatibilityScore: number; // 0 - 100
  skillMatchScore: number; // 0 - 40
  experienceMatchScore: number; // 0 - 30
  capacityScore: number; // 0 - 20
  timezoneScore: number; // 0 - 10
  status: 'proposed' | 'active' | 'reassigned' | 'completed';
  matchedAt: string;
  createdAt: string;
  // Included populated mentor info when queried
  mentorName?: string;
  mentorCompany?: string;
  mentorRole?: string;
  mentorAvatarUrl?: string;
}

export interface MentorSession {
  id: string;
  mentorId: string;
  mentorName?: string;
  targetType: AssignmentTargetType;
  targetId: string; // fellow_id or cohort_id
  fellowId?: string;
  cohortId?: string;
  title: string;
  description?: string;
  meetingUrl: string;
  scheduledAt: string;
  durationMinutes: number;
  status: SessionStatus;
  mentorNotes?: string;
  fellowFeedbackScore?: number; // 1-5
  fellowFeedbackComments?: string;
  createdAt: string;
  updatedAt: string;
}

// Zod schemas for input validation (Rule 5)
export const RegisterMentorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  company: z.string().min(2, 'Company name is required'),
  role: z.string().min(2, 'Role/position is required'),
  expertise: z.array(z.string()).min(1, 'Select at least one area of expertise'),
  bio: z.string().optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional().or(z.literal('')),
  maxMentees: z.number().int().min(1, 'Max mentees must be at least 1').max(50).optional().default(5),
});

export const CreateMentorSchema = RegisterMentorSchema;

export const UpdateMentorSchema = RegisterMentorSchema.partial().extend({
  status: z.enum(['active', 'inactive', 'on_leave']).optional(),
});

export const AssignMentorSchema = z.object({
  mentorId: z.string().uuid('Invalid mentor ID'),
  targetType: z.enum(['cohort', 'fellow']),
  targetId: z.string().min(1, 'Target ID is required'),
  targetName: z.string().optional(),
  notes: z.string().optional(),
});

export const AutoMatchFellowSchema = z.object({
  fellowProfileId: z.string().min(1, 'Fellow Profile ID is required'),
  forceReassign: z.boolean().optional().default(false),
});

export const ScheduleSessionSchema = z.object({
  mentorId: z.string().uuid('Invalid mentor ID'),
  targetType: z.enum(['cohort', 'fellow']),
  targetId: z.string().min(1, 'Target ID is required'),
  fellowId: z.string().optional(),
  cohortId: z.string().optional(),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  meetingUrl: z.string().url('Must be a valid meeting URL (e.g. Google Meet, Zoom)'),
  scheduledAt: z.string().datetime('Must be a valid ISO date-time string'),
  durationMinutes: z.number().int().min(15).max(240).default(45),
});

export const CompleteSessionSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  mentorNotes: z.string().optional(),
  fellowFeedbackScore: z.number().int().min(1).max(5).optional(),
  fellowFeedbackComments: z.string().optional(),
});

export const SubmitSessionFeedbackSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  feedbackScore: z.number().int().min(1).max(5),
  feedbackComments: z.string().optional(),
});

export const RebalanceWorkloadSchema = z.object({
  mentorId: z.string().uuid('Invalid mentor ID'),
  reason: z.string().optional(),
});

export type RegisterMentorInput = z.input<typeof RegisterMentorSchema>;
export type CreateMentorInput = z.input<typeof CreateMentorSchema>;
export type UpdateMentorInput = z.input<typeof UpdateMentorSchema>;
export type AssignMentorInput = z.input<typeof AssignMentorSchema>;
export type AutoMatchFellowInput = z.input<typeof AutoMatchFellowSchema>;
export type ScheduleSessionInput = z.input<typeof ScheduleSessionSchema>;
export type CompleteSessionInput = z.input<typeof CompleteSessionSchema>;
export type SubmitSessionFeedbackInput = z.input<typeof SubmitSessionFeedbackSchema>;
export type RebalanceWorkloadInput = z.input<typeof RebalanceWorkloadSchema>;
