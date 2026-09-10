'use server';

import { getCurrentAuthUser } from '../auth/service';
import {
  evaluateFellowEligibility,
  getFellowEligibilityOverview,
  curateShortlist,
  updateShortlistStatus,
  listEligibleFellows,
  listShortlists,
} from './service';
import {
  EvaluateEligibilityInput,
  CurateShortlistInput,
  UpdateShortlistStatusInput,
  EligibilityStatus,
} from './types';

function isAdminUser(user: { roles: string[]; primaryRole: string }): boolean {
  return user.primaryRole === 'admin' || user.roles.includes('admin');
}

/**
 * Server action: Evaluate fellow eligibility for Premium Global Track
 */
export async function evaluateEligibilityAction(fellowProfileId?: string) {
  const user = await getCurrentAuthUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const isAdmin = isAdminUser(user);

  // Rule 5: Non-admin can only evaluate eligibility for themselves
  if (!isAdmin && fellowProfileId && fellowProfileId !== user.clerkUserId) {
    throw new Error('Unauthorized: You can only evaluate your own Premium eligibility.');
  }

  const targetId = isAdmin ? (fellowProfileId || user.clerkUserId) : user.clerkUserId;
  const gate = await evaluateFellowEligibility(user.clerkUserId, {
    fellowProfileId: targetId,
    forceReevaluate: true,
  });

  return { success: true, gate };
}

/**
 * Server action: Get current fellow eligibility & shortlist overview (Rule 5 record-level check)
 */
export async function getFellowEligibilityAction(fellowProfileId?: string) {
  const user = await getCurrentAuthUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const isAdmin = isAdminUser(user);

  // Rule 5: Fellow A cannot query Fellow B's eligibility details
  if (!isAdmin && fellowProfileId && fellowProfileId !== user.clerkUserId) {
    throw new Error('Unauthorized: You can only access your own Premium eligibility status.');
  }

  const targetId = isAdmin ? (fellowProfileId || user.clerkUserId) : user.clerkUserId;
  const overview = await getFellowEligibilityOverview(targetId);

  return { success: true, ...overview };
}

/**
 * Server action: Curate fellow into a Seelicongate partner shortlist (Admin only)
 */
export async function curateShortlistAction(input: CurateShortlistInput) {
  const user = await getCurrentAuthUser();
  if (!user || !isAdminUser(user)) {
    throw new Error('Unauthorized: Admin privilege required to curate candidate shortlists.');
  }

  const shortlist = await curateShortlist(user.clerkUserId, input);
  return { success: true, shortlist };
}

/**
 * Server action: Update nomination status of shortlist entry (Admin only)
 */
export async function updateShortlistStatusAction(input: UpdateShortlistStatusInput) {
  const user = await getCurrentAuthUser();
  if (!user || !isAdminUser(user)) {
    throw new Error('Unauthorized: Admin privilege required to update nomination status.');
  }

  const shortlist = await updateShortlistStatus(user.clerkUserId, input);
  return { success: true, shortlist };
}

/**
 * Server action: List all eligible candidates (Admin only)
 */
export async function listEligibleFellowsAction(options?: { status?: EligibilityStatus }) {
  const user = await getCurrentAuthUser();
  if (!user || !isAdminUser(user)) {
    throw new Error('Unauthorized: Admin privilege required to list eligible candidates.');
  }

  const gates = await listEligibleFellows(options);
  return { success: true, gates };
}

/**
 * Server action: List shortlists
 */
export async function listShortlistsAction(options?: { status?: string; shortlistName?: string }) {
  const user = await getCurrentAuthUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const shortlists = await listShortlists(options);
  return { success: true, shortlists };
}
