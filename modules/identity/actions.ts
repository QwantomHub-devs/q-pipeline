'use server';

import { auth } from '@clerk/nextjs/server';
import { AuthActor, CreateFellowProfileInput, UpdateFellowProfileInput } from './types';
import * as identityService from './service';

async function getAuthenticatedActor(): Promise<AuthActor> {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    throw new Error('Unauthorized: User is not authenticated');
  }

  // Extract roles from metadata or default to fellow
  const roles = (sessionClaims?.metadata as { roles?: string[] })?.roles || ['fellow'];

  return {
    clerkUserId: userId,
    roles,
  };
}

export async function createMyProfile(
  input: Omit<CreateFellowProfileInput, 'clerkUserId'>
) {
  const actor = await getAuthenticatedActor();
  return identityService.createFellowProfile(
    {
      ...input,
      clerkUserId: actor.clerkUserId,
    },
    actor
  );
}

export async function getMyProfile() {
  const actor = await getAuthenticatedActor();
  return identityService.getFellowProfileByClerkId(actor.clerkUserId, actor);
}

export async function updateMyProfile(
  fellowId: string,
  input: UpdateFellowProfileInput
) {
  const actor = await getAuthenticatedActor();
  return identityService.updateFellowProfile(fellowId, input, actor);
}
