'use server';

import { auth } from '@clerk/nextjs/server';
import { FileUploadRequest, StorageBucket } from './types';
import * as storageService from './service';
import { AuthActor } from '@/modules/identity/types';

async function getAuthenticatedActor(): Promise<AuthActor> {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    throw new Error('Unauthorized: Authentication required');
  }

  const roles = (sessionClaims?.metadata as { roles?: string[] })?.roles || ['fellow'];

  return {
    clerkUserId: userId,
    roles,
  };
}

export async function getSignedUploadUrlAction(request: Omit<FileUploadRequest, 'targetClerkUserId'>) {
  const actor = await getAuthenticatedActor();
  return storageService.generateSignedUploadUrl(
    {
      ...request,
      targetClerkUserId: actor.clerkUserId,
    },
    actor
  );
}

export async function getSignedDownloadUrlAction(
  bucket: StorageBucket,
  filePath: string,
  targetClerkUserId: string
) {
  const actor = await getAuthenticatedActor();
  return storageService.generateSignedDownloadUrl(bucket, filePath, targetClerkUserId, actor);
}
