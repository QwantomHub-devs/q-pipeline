'use server';
// Note: using server action style functions with Rule 5 explicit authorization checks

import { getCurrentAuthUser } from '../auth/service';
import {
  registerMentor,
  updateMentorProfile,
  deleteMentor,
  assignMentorToTarget,
  unassignMentor,
  scheduleSession,
  completeSession,
  listMentors,
  getFellowMentorshipOverview,
  getCohortMentorshipOverview,
} from './mentorship-service';
import {
  autoMatchFellow,
  listEnhancedMatches,
  getFellowEnhancedMatch,
  rebalanceWorkload,
} from './enhanced-matching-service';
import {
  RegisterMentorInput,
  UpdateMentorInput,
  AssignMentorInput,
  ScheduleSessionInput,
  CompleteSessionInput,
  AutoMatchFellowInput,
  RebalanceWorkloadInput,
} from './types';

function isAdminUser(user: { roles: string[]; primaryRole: string }): boolean {
  return user.primaryRole === 'admin' || user.roles.includes('admin');
}

/**
 * Server action: Register a mentor (Admin only)
 */
export async function registerMentorAction(input: RegisterMentorInput) {
  const user = await getCurrentAuthUser();
  if (!user || !isAdminUser(user)) {
    throw new Error('Unauthorized: Admin privilege required to register mentors.');
  }

  const mentor = await registerMentor(user.clerkUserId, input);
  return { success: true, mentor };
}

/**
 * Server action: Update mentor profile (Admin only)
 */
export async function updateMentorAction(mentorId: string, input: UpdateMentorInput) {
  const user = await getCurrentAuthUser();
  if (!user || !isAdminUser(user)) {
    throw new Error('Unauthorized: Admin privilege required to update mentor profiles.');
  }

  const mentor = await updateMentorProfile(user.clerkUserId, mentorId, input);
  return { success: true, mentor };
}

/**
 * Server action: Assign mentor to cohort or fellow (Admin only)
 */
export async function assignMentorAction(input: AssignMentorInput) {
  const user = await getCurrentAuthUser();
  if (!user || !isAdminUser(user)) {
    throw new Error('Unauthorized: Admin privilege required to assign mentors.');
  }

  const assignment = await assignMentorToTarget(user.clerkUserId, input);
  return { success: true, assignment };
}

/**
 * Server action: Auto-match fellow to optimal mentor (Admin or target Fellow)
 */
export async function autoMatchFellowAction(input: AutoMatchFellowInput) {
  const user = await getCurrentAuthUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const isAdmin = isAdminUser(user);

  // Rule 5: Non-admin can only trigger auto-matching for themselves
  if (!isAdmin && input.fellowProfileId !== user.clerkUserId) {
    throw new Error('Unauthorized: You can only auto-match for your own fellow profile.');
  }

  const match = await autoMatchFellow(user.clerkUserId, input);
  return { success: true, match };
}

/**
 * Server action: Get current fellow enhanced match with Rule 5 authorization check
 */
export async function getFellowEnhancedMatchAction(fellowProfileId?: string) {
  const user = await getCurrentAuthUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const isAdmin = isAdminUser(user);

  // Rule 5 check: Non-admin fellows can only view their own match
  if (!isAdmin && fellowProfileId && fellowProfileId !== user.clerkUserId) {
    throw new Error('Unauthorized: You can only view your own mentor match.');
  }

  const targetId = isAdmin ? (fellowProfileId || user.clerkUserId) : user.clerkUserId;
  const match = await getFellowEnhancedMatch(targetId);
  return { success: true, match };
}

/**
 * Server action: List enhanced matches (Admin or fellow)
 */
export async function listEnhancedMatchesAction(options?: {
  fellowProfileId?: string;
  mentorId?: string;
  status?: 'proposed' | 'active' | 'reassigned' | 'completed';
}) {
  const user = await getCurrentAuthUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const isAdmin = isAdminUser(user);

  // Rule 5: Non-admin can only view matches where they are the fellow
  const queryOptions = { ...options };
  if (!isAdmin) {
    queryOptions.fellowProfileId = user.clerkUserId;
  }

  const matches = await listEnhancedMatches(queryOptions);
  return { success: true, matches };
}

/**
 * Server action: Re-balance mentor workload (Admin only)
 */
export async function rebalanceWorkloadAction(input: RebalanceWorkloadInput) {
  const user = await getCurrentAuthUser();
  if (!user || !isAdminUser(user)) {
    throw new Error('Unauthorized: Admin privilege required to rebalance mentor workload.');
  }

  const result = await rebalanceWorkload(user.clerkUserId, input);
  return { success: true, ...result };
}

/**
 * Server action: Unassign mentor (Admin only)
 */
export async function unassignMentorAction(assignmentId: string) {
  const user = await getCurrentAuthUser();
  if (!user || !isAdminUser(user)) {
    throw new Error('Unauthorized: Admin privilege required to unassign mentors.');
  }

  const assignment = await unassignMentor(user.clerkUserId, assignmentId);
  return { success: true, assignment };
}

/**
 * Server action: Schedule mentor session (Admin or authorized fellow)
 */
export async function scheduleSessionAction(input: ScheduleSessionInput) {
  const user = await getCurrentAuthUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const isAdmin = isAdminUser(user);

  // Fellow can only schedule sessions for themselves or their own cohort
  if (!isAdmin) {
    if (input.targetType === 'fellow' && input.targetId !== user.clerkUserId) {
      throw new Error('Unauthorized: You cannot schedule a session for another fellow.');
    }
  }

  const session = await scheduleSession(user.clerkUserId, input);
  return { success: true, session };
}

/**
 * Server action: Complete session / Submit feedback (Admin or target Fellow)
 */
export async function submitSessionFeedbackAction(input: CompleteSessionInput) {
  const user = await getCurrentAuthUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const session = await completeSession(user.clerkUserId, input);
  return { success: true, session };
}

/**
 * Server action: Fetch mentors list
 */
export async function getMentorsListAction(options?: { status?: 'active' | 'inactive' | 'on_leave'; expertise?: string }) {
  const user = await getCurrentAuthUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const mentors = await listMentors(options);
  return { success: true, mentors };
}

/**
 * Server action: Fetch fellow mentorship overview (Rule 5 record-level check)
 */
export async function getFellowMentorshipAction(fellowId?: string) {
  const user = await getCurrentAuthUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const isAdmin = isAdminUser(user);

  // Rule 5: Ensure non-admin user can ONLY request their own mentorship data
  if (!isAdmin) {
    if (fellowId && fellowId !== user.clerkUserId) {
      throw new Error('Unauthorized: You can only access your own mentorship data.');
    }
  }

  const targetId = isAdmin ? (fellowId || user.clerkUserId) : user.clerkUserId;

  const data = await getFellowMentorshipOverview(targetId);
  return { success: true, ...data };
}

/**
 * Server action: Fetch cohort mentorship overview
 */
export async function getCohortMentorshipAction(cohortId: string) {
  const user = await getCurrentAuthUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const data = await getCohortMentorshipOverview(cohortId);
  return { success: true, ...data };
}

/**
 * Server action: Delete mentor (Admin only)
 */
export async function deleteMentorAction(mentorId: string) {
  const user = await getCurrentAuthUser();
  if (!user || !isAdminUser(user)) {
    throw new Error('Unauthorized: Admin privilege required to delete mentors.');
  }

  await deleteMentor(user.clerkUserId, mentorId);
  return { success: true };
}

