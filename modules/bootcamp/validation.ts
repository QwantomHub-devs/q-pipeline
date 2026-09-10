import { z } from 'zod';

export const createTrackSchema = z.object({
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100)
    .regex(/^[a-z0-9_-]+$/, 'Slug must contain only lowercase letters, numbers, hyphens, and underscores'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateTrackSchema = z.object({
  id: z.string().uuid('Invalid track ID'),
  name: z.string().min(2).max(255).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const createCohortSchema = z.object({
  name: z.string().min(2, 'Cohort name required').max(255),
  trackSlug: z.string().min(2, 'Track slug required'),
  capacity: z.number().int().min(1, 'Capacity must be at least 1 slot').default(30),
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional(),
  description: z.string().optional(),
});

export const updateCohortStatusSchema = z.object({
  cohortId: z.string().uuid(),
  status: z.enum(['upcoming', 'active', 'completed', 'cancelled']),
});

export const enrollFellowSchema = z.object({
  fellowProfileId: z.string().uuid('Invalid fellow profile ID'),
  cohortId: z.string().uuid('Invalid cohort ID'),
});

export const createMilestoneSchema = z.object({
  cohortId: z.string().uuid(),
  title: z.string().min(2).max(255),
  description: z.string().optional(),
  weekNumber: z.number().int().min(1).max(52),
  dueDate: z.string().or(z.date()).optional(),
});

export const submitMilestoneSchema = z.object({
  enrollmentId: z.string().uuid(),
  milestoneId: z.string().uuid(),
  submissionUrl: z.string().url('Must be a valid submission URL (e.g. GitHub repo or PR)'),
});

export const gradeMilestoneSchema = z.object({
  progressId: z.string().uuid(),
  status: z.enum(['approved', 'revision_needed']),
  feedback: z.string().optional(),
});
