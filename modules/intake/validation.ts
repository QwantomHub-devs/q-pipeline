import { z } from 'zod';

export const submitIntakeSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z
    .string()
    .transform((e) => e.trim().toLowerCase())
    .pipe(z.string().email('Invalid email address')),
  phoneNumber: z.string().max(50).optional(),
  country: z.string().min(2).max(10).default('NG'),
  cohortWindow: z.string().min(1, 'Cohort window is required'),
  outreachChannel: z.enum([
    'nysc_camp',
    'university',
    '3mtt',
    'partner_org',
    'social_media',
    'direct',
    'referral',
  ]),
  nyscStatus: z.enum(['serving', 'completed', 'exempt', 'not_applicable']).optional(),
  university: z.string().max(255).optional(),
  yearsOfExperience: z.number().min(0).max(50).default(0),
  primaryTrack: z.string().min(1, 'Primary track is required').max(100),
  bio: z.string().max(2000).optional(),
  githubHandle: z.string().max(100).optional(),
  linkedinUrl: z.string().url('Invalid LinkedIn URL').or(z.literal('')).optional(),
});
