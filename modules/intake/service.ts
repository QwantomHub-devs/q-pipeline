import { db } from '@/lib/db';
import { applicantIntakes } from '@/modules/intake/schema';
import { fellowProfiles } from '@/modules/identity/schema';
import {
  ApplicantIntake,
  EligibilityCheckResult,
  SubmitIntakeInput,
} from '@/modules/intake/types';
import { submitIntakeSchema } from '@/modules/intake/validation';
import { AuthActor } from '@/modules/identity/types';
import { assertCanAccessFellowRecord, ForbiddenError } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import * as identityService from '@/modules/identity/service';
import { sendIntakeConfirmationEmail } from '@/modules/notifications/service';

export class IntakeConflictError extends Error {
  constructor(message: string = 'Active intake application already exists for this cohort window') {
    super(message);
    this.name = 'IntakeConflictError';
  }
}

/**
 * Verifies candidate eligibility and checks for duplicate active applications within the cohort window.
 */
export async function checkEligibility(
  clerkUserId: string,
  cohortWindow: string
): Promise<EligibilityCheckResult> {
  const [existingIntake] = await db
    .select()
    .from(applicantIntakes)
    .where(
      and(
        eq(applicantIntakes.clerkUserId, clerkUserId),
        eq(applicantIntakes.cohortWindow, cohortWindow)
      )
    )
    .limit(1);

  if (existingIntake) {
    return {
      isEligible: false,
      reason: `You have already submitted an application for cohort window ${cohortWindow}`,
      existingIntakeId: existingIntake.id,
    };
  }

  return {
    isEligible: true,
  };
}

/**
 * Submits applicant intake data, provisions/links the fellow profile spine, and creates an intake record.
 */
export async function submitApplicantIntake(
  input: SubmitIntakeInput,
  actor: AuthActor
): Promise<ApplicantIntake> {
  // 1. Rule 5 Payload Validation
  const validated = submitIntakeSchema.parse(input);

  // 2. Rule 5 Authorization Check
  assertCanAccessFellowRecord(actor, actor.clerkUserId);

  // 3. Automated Eligibility Check
  const eligibility = await checkEligibility(actor.clerkUserId, validated.cohortWindow);
  if (!eligibility.isEligible) {
    throw new IntakeConflictError(eligibility.reason);
  }

  // 4. Ensure Fellow Profile Identity Spine exists or provision it
  let fellowProfile;
  try {
    fellowProfile = await identityService.getFellowProfileByClerkId(actor.clerkUserId, actor);
  } catch (err) {
    // If profile does not exist yet, provision it automatically from intake data
    fellowProfile = await identityService.createFellowProfile(
      {
        clerkUserId: actor.clerkUserId,
        email: validated.email,
        firstName: validated.firstName,
        lastName: validated.lastName,
        phoneNumber: validated.phoneNumber,
        country: validated.country,
        bio: validated.bio,
        githubHandle: validated.githubHandle,
        linkedinUrl: validated.linkedinUrl,
      },
      actor
    );
  }

  // 5. Create Applicant Intake database record
  const [createdIntake] = await db
    .insert(applicantIntakes)
    .values({
      fellowId: fellowProfile.id,
      clerkUserId: actor.clerkUserId,
      cohortWindow: validated.cohortWindow,
      outreachChannel: validated.outreachChannel,
      nyscStatus: validated.nyscStatus ?? 'not_applicable',
      university: validated.university ?? null,
      yearsOfExperience: validated.yearsOfExperience,
      primaryTrack: validated.primaryTrack,
      status: 'eligible',
      eligibilityNotes: 'Automated eligibility passed',
    })
    .returning();

  // 6. Dispatch Notification (Service 4 integration)
  try {
    await sendIntakeConfirmationEmail(
      validated.email,
      validated.firstName,
      validated.cohortWindow
    );
  } catch (err) {
    console.error('Failed to send intake confirmation notification:', err);
  }

  return createdIntake as ApplicantIntake;
}

/**
 * Retrieves an applicant intake record by Fellow ID with explicit Rule 5 record authorization.
 */
export async function getIntakeByFellowId(
  fellowId: string,
  actor: AuthActor
): Promise<ApplicantIntake | null> {
  const [intake] = await db
    .select()
    .from(applicantIntakes)
    .where(eq(applicantIntakes.fellowId, fellowId))
    .limit(1);

  if (!intake) {
    return null;
  }

  // Rule 5 Authorization Assertion
  assertCanAccessFellowRecord(actor, intake.clerkUserId);

  return intake as ApplicantIntake;
}
