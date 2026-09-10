'use server';

import { auth } from '@clerk/nextjs/server';
import {
  createPlacement,
  updatePlacementStatus,
  submitPerformanceReview,
  submitMilestoneReport,
  listPlacementsForFellow,
  listAllPlacementsForAdmin,
  getPlacementMetrics,
} from './placements-service';
import {
  CreatePlacementInput,
  UpdatePlacementStatusInput,
  SubmitPerformanceReviewInput,
  SubmitMilestoneReportInput,
  PlacementStatus,
} from './types';
import { AuthActor } from '../identity/types';

async function getAuthActor(): Promise<AuthActor> {
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

/**
 * Server Action: Create new placement (Admin only)
 */
export async function createPlacementAction(input: CreatePlacementInput) {
  const actor = await getAuthActor();
  return await createPlacement(actor, input);
}

/**
 * Server Action: Update placement status & tenure (Admin only)
 */
export async function updatePlacementStatusAction(input: UpdatePlacementStatusInput) {
  const actor = await getAuthActor();
  return await updatePlacementStatus(actor, input);
}

/**
 * Server Action: Submit client partner performance review
 */
export async function submitPerformanceReviewAction(input: SubmitPerformanceReviewInput) {
  const actor = await getAuthActor();
  return await submitPerformanceReview(actor, input);
}

/**
 * Server Action: Submit fellow milestone report
 */
export async function submitMilestoneReportAction(input: SubmitMilestoneReportInput) {
  const actor = await getAuthActor();
  return await submitMilestoneReport(actor, input);
}

/**
 * Server Action: Fetch fellow's active & past placements (Fellow Rule 5 record check)
 */
export async function getMyPlacementsAction(fellowProfileId: string) {
  const actor = await getAuthActor();
  return await listPlacementsForFellow(actor, fellowProfileId);
}

/**
 * Server Action: Fetch all placements across platform for Admin Placement Governance Console
 */
export async function listAllPlacementsAction(statusFilter?: PlacementStatus) {
  const actor = await getAuthActor();
  return await listAllPlacementsForAdmin(actor, statusFilter);
}

/**
 * Server Action: Fetch placement summary metrics (Admin only)
 */
export async function getPlacementMetricsAction() {
  const actor = await getAuthActor();
  return await getPlacementMetrics(actor);
}
