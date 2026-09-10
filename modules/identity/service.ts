import { db } from '@/lib/db';
import { fellowProfiles } from '@/modules/identity/schema';
import {
  AuthActor,
  CreateFellowProfileInput,
  FellowProfile,
  UpdateFellowProfileInput,
  FellowStage,
  FellowTier,
} from '@/modules/identity/types';
import { createFellowProfileSchema, updateFellowProfileSchema } from '@/modules/identity/validation';
import { assertCanAccessFellowRecord, ForbiddenError, UnauthorizedError } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Creates a new Fellow Profile.
 * Can be called during applicant intake or user onboarding.
 */
export async function createFellowProfile(
  input: CreateFellowProfileInput,
  actor: AuthActor
): Promise<FellowProfile> {
  // 1. Rule 5 Input Validation
  const validated = createFellowProfileSchema.parse(input);

  // 2. Rule 5 Authorization: Actor must be creating their own profile or be an admin
  assertCanAccessFellowRecord(actor, validated.clerkUserId);

  // 3. Database insertion
  const [created] = await db
    .insert(fellowProfiles)
    .values({
      clerkUserId: validated.clerkUserId,
      email: validated.email,
      firstName: validated.firstName,
      lastName: validated.lastName,
      phoneNumber: validated.phoneNumber ?? null,
      country: validated.country,
      bio: validated.bio ?? null,
      githubHandle: validated.githubHandle ?? null,
      linkedinUrl: validated.linkedinUrl || null,
      skills: validated.skills,
      metadata: validated.metadata,
      stage: 'applicant',
      tier: 'none',
    })
    .returning();

  return created as FellowProfile;
}

/**
 * Retrieves a Fellow Profile by UUID with explicit record authorization check.
 */
export async function getFellowProfileById(
  fellowId: string,
  actor: AuthActor
): Promise<FellowProfile> {
  const [profile] = await db
    .select()
    .from(fellowProfiles)
    .where(eq(fellowProfiles.id, fellowId))
    .limit(1);

  if (!profile) {
    throw new NotFoundError(`Fellow profile with ID ${fellowId} not found`);
  }

  // Rule 5: Record-level authorization check
  assertCanAccessFellowRecord(actor, profile.clerkUserId);

  return profile as FellowProfile;
}

/**
 * Retrieves a Fellow Profile by Clerk User ID with explicit record authorization check.
 */
export async function getFellowProfileByClerkId(
  clerkUserId: string,
  actor: AuthActor
): Promise<FellowProfile> {
  // Rule 5: Record-level authorization check
  assertCanAccessFellowRecord(actor, clerkUserId);

  const [profile] = await db
    .select()
    .from(fellowProfiles)
    .where(eq(fellowProfiles.clerkUserId, clerkUserId))
    .limit(1);

  if (!profile) {
    throw new NotFoundError(`Fellow profile for Clerk user ${clerkUserId} not found`);
  }

  return profile as FellowProfile;
}

/**
 * Updates a Fellow Profile with server-side validation and record-level authorization checks.
 */
export async function updateFellowProfile(
  fellowId: string,
  input: UpdateFellowProfileInput,
  actor: AuthActor
): Promise<FellowProfile> {
  // 1. Fetch current profile
  const [current] = await db
    .select()
    .from(fellowProfiles)
    .where(eq(fellowProfiles.id, fellowId))
    .limit(1);

  if (!current) {
    throw new NotFoundError(`Fellow profile with ID ${fellowId} not found`);
  }

  // 2. Rule 5: Authorization check (only owner or admin)
  assertCanAccessFellowRecord(actor, current.clerkUserId);

  // 3. Rule 5: Server-side input validation (disallows tampering with stage/tier)
  const validated = updateFellowProfileSchema.parse(input);

  // 4. Perform update
  const [updated] = await db
    .update(fellowProfiles)
    .set({
      ...validated,
      updatedAt: new Date(),
    })
    .where(eq(fellowProfiles.id, fellowId))
    .returning();

  return updated as FellowProfile;
}

/**
 * Updates fellow stage and tier. Restricted to Admin actors only.
 */
export async function updateFellowStageAndTier(
  fellowId: string,
  stage: FellowStage,
  tier: FellowTier,
  actor: AuthActor
): Promise<FellowProfile> {
  if (!actor || !actor.roles.includes('admin')) {
    throw new ForbiddenError('Only admin users can update fellow stage and tier');
  }

  const [updated] = await db
    .update(fellowProfiles)
    .set({
      stage,
      tier,
      updatedAt: new Date(),
    })
    .where(eq(fellowProfiles.id, fellowId))
    .returning();

  if (!updated) {
    throw new NotFoundError(`Fellow profile with ID ${fellowId} not found`);
  }

  return updated as FellowProfile;
}
