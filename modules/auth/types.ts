export type UserRole = 'fellow' | 'reviewer' | 'admin' | 'client' | 'partner';

export interface AuthUserSession {
  clerkUserId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  roles: UserRole[];
  primaryRole: UserRole;
}
