import { describe, it, expect } from 'vitest';
import { AuthActor } from '@/modules/identity/types';
import { FileUploadRequest } from '../types';
import * as storageService from '../service';
import { generateUploadUrlSchema } from '../validation';
import { ForbiddenError } from '@/lib/auth';

describe('Storage Module & Supabase Signed URL Generator (Rule 5)', () => {
  const fellowActor: AuthActor = {
    clerkUserId: 'user_clerk_storage_1',
    roles: ['fellow'],
  };

  const otherActor: AuthActor = {
    clerkUserId: 'user_clerk_other',
    roles: ['fellow'],
  };

  const validResumeRequest: FileUploadRequest = {
    bucket: 'resumes',
    fileName: 'chukwuemeka_cv.pdf',
    fileSizeBytes: 2 * 1024 * 1024, // 2MB
    mimeType: 'application/pdf',
    targetClerkUserId: 'user_clerk_storage_1',
  };

  describe('Validation Schemas (generateUploadUrlSchema)', () => {
    it('validates a valid resume upload request payload', () => {
      const result = generateUploadUrlSchema.parse(validResumeRequest);
      expect(result.bucket).toBe('resumes');
      expect(result.fileName).toBe('chukwuemeka_cv.pdf');
    });

    it('rejects file sizes exceeding bucket maximum (e.g. >10MB for resumes)', () => {
      const oversizedRequest: FileUploadRequest = {
        ...validResumeRequest,
        fileSizeBytes: 12 * 1024 * 1024, // 12MB (exceeds 10MB limit)
      };

      expect(() => generateUploadUrlSchema.parse(oversizedRequest)).toThrow(/exceeds maximum allowed limit/);
    });

    it('rejects invalid MIME types for specific bucket', () => {
      const invalidMimeRequest: FileUploadRequest = {
        ...validResumeRequest,
        mimeType: 'video/mp4', // MP4 not allowed in resumes bucket
      };

      expect(() => generateUploadUrlSchema.parse(invalidMimeRequest)).toThrow(/Invalid MIME type/);
    });
  });

  describe('generateSignedUploadUrl', () => {
    it('generates a signed upload URL for authorized fellow', async () => {
      const result = await storageService.generateSignedUploadUrl(validResumeRequest, fellowActor);

      expect(result.signedUrl).toContain('/storage/v1/object/upload/sign/resumes/');
      expect(result.path).toContain('user_clerk_storage_1/');
      expect(result.token).toBeDefined();
    });

    it('BLOCKS unauthorized actor from requesting upload URL for another user (Rule 5)', async () => {
      await expect(
        storageService.generateSignedUploadUrl(validResumeRequest, otherActor)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('generateSignedDownloadUrl', () => {
    it('generates signed download URL for file owner', async () => {
      const result = await storageService.generateSignedDownloadUrl(
        'contracts',
        'user_clerk_storage_1/contract.pdf',
        'user_clerk_storage_1',
        fellowActor
      );

      expect(result.signedUrl).toContain('/storage/v1/object/sign/contracts/');
      expect(result.expiresAt).toBeGreaterThan(Date.now());
    });

    it('BLOCKS unauthorized actor from requesting download URL for another user (Rule 5)', async () => {
      await expect(
        storageService.generateSignedDownloadUrl(
          'contracts',
          'user_clerk_storage_1/contract.pdf',
          'user_clerk_storage_1',
          otherActor
        )
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
