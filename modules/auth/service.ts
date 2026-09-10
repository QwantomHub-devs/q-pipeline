import { auth, currentUser } from '@clerk/nextjs/server';
import { AuthUserSession, UserRole } from './types';
import { ForbiddenError, UnauthorizedError } from '@/lib/auth';

/**
 * Retrieves the currently authenticated user's session context from Clerk.
 */
export async function getCurrentAuthUser(): Promise<AuthUserSession | null> {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return null;
  }

  const user = await currentUser();
  const rawRoles = (sessionClaims?.metadata as { roles?: string[] })?.roles;
  const roles: UserRole[] = (rawRoles && Array.isArray(rawRoles) && rawRoles.length > 0)
    ? (rawRoles as UserRole[])
    : ['fellow'];

  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  const firstName = user?.firstName ?? null;
  const lastName = user?.lastName ?? null;

  return {
    clerkUserId: userId,
    email,
    firstName,
    lastName,
    roles,
    primaryRole: roles[0] || 'fellow',
  };
}

/**
 * Server guard: Enforces that a request is authenticated.
 * Throws UnauthorizedError if no active user session exists.
 */
export async function requireAuth(): Promise<AuthUserSession> {
  const user = await getCurrentAuthUser();
  if (!user) {
    throw new UnauthorizedError('Authentication required to access this resource');
  }
  return user;
}

/**
 * Server guard: Enforces that the authenticated user possesses at least one of the specified allowed roles.
 * Rule 5 explicit authorization guard.
 */
export async function requireRole(allowedRoles: UserRole | UserRole[]): Promise<AuthUserSession> {
  const user = await requireAuth();
  const rolesToCheck = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  const hasMatchingRole = rolesToCheck.some((role) => user.roles.includes(role));

  if (!hasMatchingRole) {
    throw new ForbiddenError(
      `Access denied: Required role (${rolesToCheck.join(', ')}) missing. User has roles: (${user.roles.join(', ')})`
    );
  }

  return user;
}

/**
 * Utility helper: Checks if a given AuthUserSession contains a specified role.
 */
export function hasRole(session: AuthUserSession | null, role: UserRole): boolean {
  if (!session) return false;
  return session.roles.includes(role);
}
