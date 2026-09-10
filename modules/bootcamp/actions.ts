'use server';

import { auth } from '@clerk/nextjs/server';
import { AuthActor } from '@/modules/identity/types';
import {
  listBootcampTracks,
  createBootcampTrack,
  updateBootcampTrack,
  deleteBootcampTrack,
  listCohortsForAdmin,
  createCohort,
  updateCohortStatus,
  enrollFellowInCohort,
  createMilestoneForCohort,
  submitMilestoneProgress,
  gradeMilestoneProgress,
  getFellowBootcampDashboardData,
} from './service';

async function getAuthenticatedActor(): Promise<AuthActor> {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    throw new Error('Unauthorized: User is not authenticated');
  }

  const roles = (sessionClaims?.metadata as { roles?: string[] })?.roles || ['fellow'];
  return {
    clerkUserId: userId,
    roles,
  };
}

export async function getMyBootcampDashboardAction(fellowProfileId: string) {
  const actor = await getAuthenticatedActor();
  return getFellowBootcampDashboardData(actor, fellowProfileId);
}

export async function listTracksAction() {
  const actor = await getAuthenticatedActor();
  return listBootcampTracks(actor);
}

export async function createTrackAction(data: { slug: string; name: string; description?: string; isActive?: boolean }) {
  const actor = await getAuthenticatedActor();
  return createBootcampTrack(actor, data);
}

export async function updateTrackAction(data: { id: string; name?: string; description?: string; isActive?: boolean }) {
  const actor = await getAuthenticatedActor();
  return updateBootcampTrack(actor, data);
}

export async function deleteTrackAction(trackId: string) {
  const actor = await getAuthenticatedActor();
  return deleteBootcampTrack(actor, trackId);
}

export async function listCohortsAdminAction() {
  const actor = await getAuthenticatedActor();
  return listCohortsForAdmin(actor);
}

export async function createCohortAction(data: {
  name: string;
  trackSlug: string;
  capacity?: number;
  startDate?: string;
  endDate?: string;
  description?: string;
}) {
  const actor = await getAuthenticatedActor();
  return createCohort(actor, data);
}

export async function updateCohortStatusAction(data: { cohortId: string; status: 'upcoming' | 'active' | 'completed' | 'cancelled' }) {
  const actor = await getAuthenticatedActor();
  return updateCohortStatus(actor, data);
}

export async function enrollFellowAction(data: { fellowProfileId: string; cohortId: string }) {
  const actor = await getAuthenticatedActor();
  return enrollFellowInCohort(actor, data);
}

export async function createMilestoneAction(data: { cohortId: string; title: string; description?: string; weekNumber: number; dueDate?: string }) {
  const actor = await getAuthenticatedActor();
  return createMilestoneForCohort(actor, data);
}

export async function submitMilestoneAction(data: { enrollmentId: string; milestoneId: string; submissionUrl: string }) {
  const actor = await getAuthenticatedActor();
  return submitMilestoneProgress(actor, data);
}

export async function gradeMilestoneAction(data: { progressId: string; status: 'approved' | 'revision_needed'; feedback?: string }) {
  const actor = await getAuthenticatedActor();
  return gradeMilestoneProgress(actor, data);
}
