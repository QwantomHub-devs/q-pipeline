'use server';

import { auth } from '@clerk/nextjs/server';
import { CandidateFilterOptions, ManualOverrideInput } from './types';
import * as adminService from './service';
import { AuthActor } from '@/modules/identity/types';

async function getAdminActor(): Promise<AuthActor> {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    throw new Error('Unauthorized: Authentication required');
  }

  const roles = (sessionClaims?.metadata as { roles?: string[] })?.roles || ['fellow'];
  if (!roles.includes('admin')) {
    throw new Error('Forbidden: Admin privileges required');
  }

  return {
    clerkUserId: userId,
    roles,
  };
}

export async function getAdminDashboardDataAction(options?: CandidateFilterOptions) {
  const actor = await getAdminActor();
  const metrics = await adminService.getFunnelMetrics(actor);
  const candidates = await adminService.listCandidates(options || {}, actor);

  return {
    metrics,
    candidates,
  };
}

export async function executeManualOverrideAction(input: ManualOverrideInput) {
  const actor = await getAdminActor();
  return adminService.executeManualOverride(input, actor);
}
