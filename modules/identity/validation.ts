import { z } from 'zod';

export const createFellowProfileSchema = z.object({
  clerkUserId: z.string().min(1, 'clerkUserId is required'),
  email: z
    .string()
    .transform((e) => e.trim().toLowerCase())
    .pipe(z.string().email('Invalid email address')),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phoneNumber: z.string().max(50).nullable().optional(),
  country: z.string().min(2).max(10).default('NG'),
  bio: z.string().max(2000).nullable().optional(),
  githubHandle: z.string().max(100).nullable().optional(),
  linkedinUrl: z.string().url('Invalid LinkedIn URL').or(z.literal('')).nullable().optional(),
  skills: z.array(z.string().max(50)).default([]),
  metadata: z.record(z.unknown()).default({}),
});

export const updateFellowProfileSchema = z.object({
  firstName: z.string().min(1, 'First name cannot be empty').max(100).optional(),
  lastName: z.string().min(1, 'Last name cannot be empty').max(100).optional(),
  phoneNumber: z.string().max(50).nullable().optional(),
  country: z.string().min(2).max(10).optional(),
  bio: z.string().max(2000).nullable().optional(),
  githubHandle: z.string().max(100).nullable().optional(),
  linkedinUrl: z.string().url('Invalid LinkedIn URL').or(z.literal('')).nullable().optional(),
  skills: z.array(z.string().max(50)).optional(),
  metadata: z.record(z.unknown()).optional(),
}).strict(); // Disallows illegal fields like stage, tier, clerkUserId, id
