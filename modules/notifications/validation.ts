import { z } from 'zod';

export const sendEmailSchema = z.object({
  to: z
    .string()
    .transform((e) => e.trim().toLowerCase())
    .pipe(z.string().email('Invalid email address')),
  subject: z.string().min(1, 'Subject is required').max(200),
  htmlContent: z.string().min(1, 'HTML content is required'),
  textContent: z.string().optional(),
  senderName: z.string().optional(),
  senderEmail: z.string().email().optional(),
});

export const sendSMSOptionsSchema = z.object({
  to: z.string().min(5, 'Phone number must be at least 5 digits').max(20),
  message: z.string().min(1, 'Message text is required').max(480),
});

export const sendWhatsAppOptionsSchema = z.object({
  to: z.string().min(5, 'Phone number must be at least 5 digits').max(20),
  message: z.string().min(1, 'Message text is required').max(1000),
  mediaUrl: z.string().url('Invalid media URL').optional(),
});
