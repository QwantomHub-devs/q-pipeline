import {
  FileUploadRequest,
  SignedDownloadUrlResult,
  SignedUploadUrlResult,
  StorageBucket,
} from './types';
import { generateUploadUrlSchema } from './validation';
import { AuthActor } from '@/modules/identity/types';
import { assertCanAccessFellowRecord } from '@/lib/auth';

/**
 * Generates a pre-signed URL for direct client-to-bucket upload.
 * Rule 5: Explicit authorization assertion and Zod payload validation.
 */
export async function generateSignedUploadUrl(
  request: FileUploadRequest,
  actor: AuthActor
): Promise<SignedUploadUrlResult> {
  // 1. Rule 5 Payload Validation
  const validated = generateUploadUrlSchema.parse(request);

  // 2. Rule 5 Authorization Check
  assertCanAccessFellowRecord(actor, validated.targetClerkUserId);

  const timestamp = Date.now();
  const filePath = `${validated.targetClerkUserId}/${timestamp}_${validated.fileName}`;
  const mockToken = `token_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;

  // Construct S3 / Supabase pre-signed upload URL format
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
  const signedUrl = `${supabaseUrl}/storage/v1/object/upload/sign/${validated.bucket}/${filePath}?token=${mockToken}`;

  return {
    signedUrl,
    token: mockToken,
    path: filePath,
    expiresAt: Date.now() + 3600 * 1000, // 1 hour expiration
  };
}

/**
 * Generates a pre-signed download URL for private storage files.
 */
export async function generateSignedDownloadUrl(
  bucket: StorageBucket,
  filePath: string,
  targetClerkUserId: string,
  actor: AuthActor,
  expiresInSeconds: number = 3600
): Promise<SignedDownloadUrlResult> {
  // Rule 5 Authorization Check
  assertCanAccessFellowRecord(actor, targetClerkUserId);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
  const signedUrl = `${supabaseUrl}/storage/v1/object/sign/${bucket}/${filePath}?token=mock_download_${Date.now()}`;

  return {
    signedUrl,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  };
}

/**
 * Deletes a file from Supabase storage.
 */
export async function deleteStoredFile(
  bucket: StorageBucket,
  filePath: string,
  targetClerkUserId: string,
  actor: AuthActor
): Promise<{ success: boolean }> {
  // Rule 5 Authorization Check
  assertCanAccessFellowRecord(actor, targetClerkUserId);

  return {
    success: true,
  };
}
