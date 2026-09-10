'use server';
// Note: using server action style functions with Rule 5 explicit authorization checks

import { getCurrentAuthUser } from '../auth/service';
import {
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  listOpportunities,
  getOpportunityById,
  findMatchesForOpportunity,
  findMatchesForFellow,
  updateMatchStatus,
  listMatches,
} from './matching-service';
import {
  CreateOpportunityInput,
  UpdateOpportunityInput,
  UpdateMatchStatusInput,
  PlacementTier,
  MatchStatus,
} from './types';

function isAdminUser(user: { roles: string[]; primaryRole: string }): boolean {
  return user.primaryRole === 'admin' || user.roles.includes('admin');
}

/**
 * Server action: Create client placement opportunity (Admin only)
 */
export async function createOpportunityAction(input: CreateOpportunityInput) {
  const user = await getCurrentAuthUser();
  if (!user || !isAdminUser(user)) {
    throw new Error('Unauthorized: Admin privilege required to create opportunities.');
  }

  const opportunity = await createOpportunity(user.clerkUserId, input);
  return { success: true, opportunity };
}

/**
 * Server action: Update client placement opportunity (Admin only)
 */
export async function updateOpportunityAction(opportunityId: string, input: UpdateOpportunityInput) {
  const user = await getCurrentAuthUser();
  if (!user || !isAdminUser(user)) {
    throw new Error('Unauthorized: Admin privilege required to update opportunities.');
  }

  const opportunity = await updateOpportunity(user.clerkUserId, opportunityId, input);
  return { success: true, opportunity };
}

/**
 * Server action: Delete opportunity (Admin only)
 */
export async function deleteOpportunityAction(opportunityId: string) {
  const user = await getCurrentAuthUser();
  if (!user || !isAdminUser(user)) {
    throw new Error('Unauthorized: Admin privilege required to delete opportunities.');
  }

  await deleteOpportunity(user.clerkUserId, opportunityId);
  return { success: true };
}

/**
 * Server action: Fetch opportunities list
 */
export async function getOpportunitiesListAction(options?: {
  status?: 'open' | 'filled' | 'closed';
  opportunityType?: string;
  requiredTier?: PlacementTier;
}) {
  const user = await getCurrentAuthUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const opportunities = await listOpportunities(options);
  return { success: true, opportunities };
}

/**
 * Server action: Run algorithmic matching engine for an opportunity (Admin only)
 */
export async function runMatchingForOpportunityAction(opportunityId: string) {
  const user = await getCurrentAuthUser();
  if (!user || !isAdminUser(user)) {
    throw new Error('Unauthorized: Admin privilege required to execute candidate matching.');
  }

  const matches = await findMatchesForOpportunity(user.clerkUserId, opportunityId);
  return { success: true, matches };
}

/**
 * Server action: Update match status (Admin only)
 */
export async function updateMatchStatusAction(input: UpdateMatchStatusInput) {
  const user = await getCurrentAuthUser();
  if (!user || !isAdminUser(user)) {
    throw new Error('Unauthorized: Admin privilege required to update match status.');
  }

  const match = await updateMatchStatus(user.clerkUserId, input);
  return { success: true, match };
}

/**
 * Server action: Fetch matches for fellow candidate (Rule 5 record-level check)
 */
export async function getFellowOpportunitiesAction(fellowId?: string) {
  const user = await getCurrentAuthUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const isAdmin = isAdminUser(user);

  // Rule 5: Non-admin fellows can ONLY query their own matched opportunities
  if (!isAdmin) {
    if (fellowId && fellowId !== user.clerkUserId) {
      throw new Error('Unauthorized: You can only view opportunities matched to your profile.');
    }
  }

  const targetId = isAdmin ? (fellowId || user.clerkUserId) : user.clerkUserId;
  const matches = await findMatchesForFellow(targetId);

  return { success: true, matches };
}
