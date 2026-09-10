import { z } from 'zod';

export const logAuditEventSchema = z.object({
  actorClerkUserId: z.string().min(1, 'Actor user ID is required'),
  actorEmail: z.string().email().nullable().optional(),
  action: z.string().min(1, 'Action is required').max(100),
  targetType: z.string().min(1, 'Target type is required').max(100),
  targetId: z.string().min(1, 'Target ID is required').max(255),
  severity: z.enum(['info', 'warning', 'critical']).default('info'),
  metadata: z.record(z.unknown()).default({}),
});
