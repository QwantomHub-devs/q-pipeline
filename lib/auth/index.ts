import { AuthActor } from '@/modules/identity/types';

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized: Access denied to this resource') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Forbidden: Insufficient permissions') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Asserts that the actor is authorized to access or mutate the given fellow record.
 * Rule 5: Explicit record-level authorization check.
 */
export function assertCanAccessFellowRecord(actor: AuthActor, targetClerkUserId: string): void {
  if (!actor || !actor.clerkUserId) {
    throw new UnauthorizedError('User is not authenticated');
  }

  const isAdmin = actor.roles.includes('admin');
  const isOwner = actor.clerkUserId === targetClerkUserId;

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError(`User ${actor.clerkUserId} is not authorized to access record for ${targetClerkUserId}`);
  }
}

/**
 * Asserts that the actor has a specific required role (e.g. 'admin').
 */
export function requireRole(actor: AuthActor, role: 'admin' | 'fellow'): void {
  if (!actor || !actor.clerkUserId) {
    throw new UnauthorizedError('User is not authenticated');
  }
  if (!actor.roles.includes(role)) {
    throw new ForbiddenError(`User ${actor.clerkUserId} does not have required role: ${role}`);
  }
}
