'use server';

import { auth } from '@clerk/nextjs/server';
import { SubmitIntakeInput } from './types';
import * as intakeService from './service';
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

export async function submitIntakeAction(input: SubmitIntakeInput) {
  const actor = await getAuthenticatedActor();
  return intakeService.submitApplicantIntake(input, actor);
}

export async function checkMyEligibilityAction(cohortWindow: string) {
  const actor = await getAuthenticatedActor();
  return intakeService.checkEligibility(actor.clerkUserId, cohortWindow);
}
