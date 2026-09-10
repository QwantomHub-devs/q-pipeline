'use server';

import { auth } from '@clerk/nextjs/server';
import { AuditQueryOptions, LogAuditEventInput } from './types';
import * as auditService from './service';
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

export async function getAuditLogsAction(options?: AuditQueryOptions) {
  const actor = await getAdminActor();
  return auditService.queryAuditLogs(options || {}, actor);
}

export async function logAuditEventAction(input: LogAuditEventInput) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized: Authentication required to log audit event');
  }

  return auditService.logAuditEvent({
    ...input,
    actorClerkUserId: userId,
  });
}
