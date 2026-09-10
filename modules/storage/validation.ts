import { z } from 'zod';
import { BUCKET_CONFIGS, StorageBucket } from './types';

export const generateUploadUrlSchema = z
  .object({
    bucket: z.enum(['resumes', 'certificates', 'contracts', 'module3_videos']),
    fileName: z
      .string()
      .min(1, 'Filename is required')
      .max(255)
      .transform((f) => f.replace(/[^a-zA-Z0-9_.-]/g, '_')),
    fileSizeBytes: z.number().positive('File size must be positive'),
    mimeType: z.string().min(1, 'MIME type is required'),
    targetClerkUserId: z.string().min(1, 'Target user ID is required'),
  })
  .superRefine((data, ctx) => {
    const config = BUCKET_CONFIGS[data.bucket as StorageBucket];
    if (!config) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unknown storage bucket: ${data.bucket}`,
        path: ['bucket'],
      });
      return;
    }

    if (data.fileSizeBytes > config.maxSizeBytes) {
      const maxMb = (config.maxSizeBytes / (1024 * 1024)).toFixed(0);
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `File size exceeds maximum allowed limit of ${maxMb}MB for bucket ${data.bucket}`,
        path: ['fileSizeBytes'],
      });
    }

    if (!config.allowedMimeTypes.includes(data.mimeType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid MIME type '${data.mimeType}'. Allowed: ${config.allowedMimeTypes.join(', ')}`,
        path: ['mimeType'],
      });
    }
  });
