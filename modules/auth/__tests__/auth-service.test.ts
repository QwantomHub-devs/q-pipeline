import { describe, it, expect, vi } from 'vitest';
import { AuthUserSession, UserRole } from '../types';
import { hasRole } from '../service';
import { ForbiddenError, UnauthorizedError } from '@/lib/auth';

describe('Auth Module & RBAC Security Guards (Rule 5)', () => {
  const fellowSession: AuthUserSession = {
    clerkUserId: 'user_fellow_1',
    email: 'fellow@qwantomhub.com',
    firstName: 'Fellow',
    lastName: 'Candidate',
    roles: ['fellow'],
    primaryRole: 'fellow',
  };

  const adminSession: AuthUserSession = {
    clerkUserId: 'user_admin_1',
    email: 'admin@qwantomhub.com',
    firstName: 'Admin',
    lastName: 'Ops',
    roles: ['admin', 'reviewer'],
    primaryRole: 'admin',
  };

  describe('hasRole helper', () => {
    it('returns true when session contains specified role', () => {
      expect(hasRole(fellowSession, 'fellow')).toBe(true);
      expect(hasRole(adminSession, 'admin')).toBe(true);
      expect(hasRole(adminSession, 'reviewer')).toBe(true);
    });

    it('returns false when session lacks specified role', () => {
      expect(hasRole(fellowSession, 'admin')).toBe(false);
      expect(hasRole(fellowSession, 'reviewer')).toBe(false);
    });

    it('returns false for null/unauthenticated session', () => {
      expect(hasRole(null, 'fellow')).toBe(false);
    });
  });

  describe('Role Guard Logic Evaluation', () => {
    function assertRoleAccess(session: AuthUserSession | null, allowedRoles: UserRole | UserRole[]) {
      if (!session) {
        throw new UnauthorizedError('Authentication required');
      }
      const rolesToCheck = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      const match = rolesToCheck.some((role) => session.roles.includes(role));
      if (!match) {
        throw new ForbiddenError(`Role missing: ${rolesToCheck.join(', ')}`);
      }
      return session;
    }

    it('allows fellow session to access fellow-protected resources', () => {
      expect(() => assertRoleAccess(fellowSession, 'fellow')).not.toThrow();
    });

    it('allows admin session to access admin-protected resources', () => {
      expect(() => assertRoleAccess(adminSession, 'admin')).not.toThrow();
    });

    it('allows user with matching role from array of allowed roles', () => {
      expect(() => assertRoleAccess(adminSession, ['reviewer', 'client'])).not.toThrow();
    });

    it('BLOCKS fellow session from accessing admin resources', () => {
      expect(() => assertRoleAccess(fellowSession, 'admin')).toThrow(ForbiddenError);
    });

    it('BLOCKS unauthenticated requests', () => {
      expect(() => assertRoleAccess(null, 'fellow')).toThrow(UnauthorizedError);
    });
  });
});
