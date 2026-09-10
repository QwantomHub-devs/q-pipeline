import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthActor } from '../types';
import { assertCanAccessFellowRecord, ForbiddenError, UnauthorizedError } from '@/lib/auth';

describe('Identity Authorization & Record-level Security Checks (Rule 5)', () => {
  const fellowActorA: AuthActor = {
    clerkUserId: 'user_clerk_A',
    roles: ['fellow'],
  };

  const fellowActorB: AuthActor = {
    clerkUserId: 'user_clerk_B',
    roles: ['fellow'],
  };

  const adminActor: AuthActor = {
    clerkUserId: 'user_clerk_admin',
    roles: ['admin'],
  };

  it('allows a fellow user to access their own record', () => {
    expect(() => assertCanAccessFellowRecord(fellowActorA, 'user_clerk_A')).not.toThrow();
  });

  it('allows an admin user to access any fellow record', () => {
    expect(() => assertCanAccessFellowRecord(adminActor, 'user_clerk_A')).not.toThrow();
    expect(() => assertCanAccessFellowRecord(adminActor, 'user_clerk_B')).not.toThrow();
  });

  it('BLOCKS a fellow from accessing another fellow record (Rule 5 violation test)', () => {
    expect(() => assertCanAccessFellowRecord(fellowActorA, 'user_clerk_B')).toThrow(ForbiddenError);
    expect(() => assertCanAccessFellowRecord(fellowActorB, 'user_clerk_A')).toThrow(ForbiddenError);
  });

  it('BLOCKS unauthenticated requests', () => {
    const unauthActor = { clerkUserId: '', roles: [] } as unknown as AuthActor;
    expect(() => assertCanAccessFellowRecord(unauthActor, 'user_clerk_A')).toThrow(UnauthorizedError);
  });
});
