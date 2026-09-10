'use server';
// Note: using server action style functions with Rule 5 explicit authorization checks

import { getCurrentAuthUser } from '../auth/service';
import {
  addToBench,
  updateBenchStatus,
  assignBenchFellowToProject,
  completeBenchAssignment,
  listBenchPool,
  getFellowBenchOverview,
} from './bench-service';
import {
  AddToBenchInput,
  UpdateBenchStatusInput,
  AssignBenchProjectInput,
  CompleteBenchAssignmentInput,
  BenchStatus,
} from './types';

function isAdminUser(user: { roles: string[]; primaryRole: string }): boolean {
  return user.primaryRole === 'admin' || user.roles.includes('admin');
}

/**
 * Server action: Enroll candidate fellow into bench pool (Admin only)
 */
export async function addToBenchAction(input: AddToBenchInput) {
  const user = await getCurrentAuthUser();
  if (!user || !isAdminUser(user)) {
    throw new Error('Unauthorized: Admin privilege required to enroll fellows into the bench pool.');
  }

  const benchFellow = await addToBench(user.clerkUserId, input);
  return { success: true, benchFellow };
}

/**
 * Server action: Update bench fellow availability status (Admin only)
 */
export async function updateBenchStatusAction(input: UpdateBenchStatusInput) {
  const user = await getCurrentAuthUser();
  if (!user || !isAdminUser(user)) {
    throw new Error('Unauthorized: Admin privilege required to update bench status.');
  }

  const benchFellow = await updateBenchStatus(user.clerkUserId, input);
  return { success: true, benchFellow };
}

/**
 * Server action: Assign bench fellow to SME project (Admin only)
 */
export async function assignBenchProjectAction(input: AssignBenchProjectInput) {
  const user = await getCurrentAuthUser();
  if (!user || !isAdminUser(user)) {
    throw new Error('Unauthorized: Admin privilege required to assign bench projects.');
  }

  const assignment = await assignBenchFellowToProject(user.clerkUserId, input);
  return { success: true, assignment };
}

/**
 * Server action: Complete bench project assignment & credit stipend (Admin only)
 */
export async function completeBenchAssignmentAction(input: CompleteBenchAssignmentInput) {
  const user = await getCurrentAuthUser();
  if (!user || !isAdminUser(user)) {
    throw new Error('Unauthorized: Admin privilege required to complete bench assignments.');
  }

  const assignment = await completeBenchAssignment(user.clerkUserId, input);
  return { success: true, assignment };
}

/**
 * Server action: List bench pool candidates (Admin only)
 */
export async function listBenchPoolAction(options?: { status?: BenchStatus }) {
  const user = await getCurrentAuthUser();
  if (!user || !isAdminUser(user)) {
    throw new Error('Unauthorized: Admin privilege required to list bench pool.');
  }

  const list = await listBenchPool(options);
  return { success: true, benchFellows: list };
}

/**
 * Server action: Fetch fellow bench overview (Rule 5 record-level check)
 */
export async function getFellowBenchOverviewAction(fellowId?: string) {
  const user = await getCurrentAuthUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const isAdmin = isAdminUser(user);

  // Rule 5: Non-admin fellows can ONLY query their own bench record
  if (!isAdmin) {
    if (fellowId && fellowId !== user.clerkUserId) {
      throw new Error('Unauthorized: You can only access your own bench record.');
    }
  }

  const targetId = isAdmin ? (fellowId || user.clerkUserId) : user.clerkUserId;
  const overview = await getFellowBenchOverview(targetId);

  return { success: true, ...overview };
}
