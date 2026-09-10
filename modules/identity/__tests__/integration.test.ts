import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthActor, CreateFellowProfileInput, UpdateFellowProfileInput } from '../types';
import * as identityService from '../service';
import { db } from '@/lib/db';

// Mock the database client for integration test assertions
vi.mock('@/lib/db', () => {
  const mockDb = {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  };
  return { db: mockDb };
});

describe('Identity Module Integration Tests (Database Operations)', () => {
  const actor: AuthActor = {
    clerkUserId: 'clerk_user_int_123',
    roles: ['fellow'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully creates a fellow profile in the database', async () => {
    const mockCreatedProfile = {
      id: 'uuid-1234-5678',
      clerkUserId: 'clerk_user_int_123',
      email: 'fellow@qwantomhub.com',
      firstName: 'Chukwuemeka',
      lastName: 'Pipeline',
      phoneNumber: '+2348001112223',
      country: 'NG',
      stage: 'applicant',
      tier: 'none',
      bio: null,
      githubHandle: null,
      linkedinUrl: null,
      skills: ['TypeScript'],
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockReturning = vi.fn().mockResolvedValue([mockCreatedProfile]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: mockValues });

    const input: CreateFellowProfileInput = {
      clerkUserId: 'clerk_user_int_123',
      email: 'fellow@qwantomhub.com',
      firstName: 'Chukwuemeka',
      lastName: 'Pipeline',
      phoneNumber: '+2348001112223',
      skills: ['TypeScript'],
    };

    const result = await identityService.createFellowProfile(input, actor);

    expect(db.insert).toHaveBeenCalled();
    expect(result.id).toBe('uuid-1234-5678');
    expect(result.email).toBe('fellow@qwantomhub.com');
  });

  it('successfully updates a fellow profile in the database', async () => {
    const existingProfile = {
      id: 'uuid-1234-5678',
      clerkUserId: 'clerk_user_int_123',
      email: 'fellow@qwantomhub.com',
      firstName: 'Chukwuemeka',
      lastName: 'Pipeline',
      country: 'NG',
      stage: 'applicant',
      tier: 'none',
      skills: [],
      metadata: {},
    };

    const updatedProfile = {
      ...existingProfile,
      bio: 'Senior Engineer',
    };

    // Mock select current profile
    const mockLimit = vi.fn().mockResolvedValue([existingProfile]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

    // Mock update profile
    const mockUpdateReturning = vi.fn().mockResolvedValue([updatedProfile]);
    const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
    const mockSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: mockSet });

    const updateInput: UpdateFellowProfileInput = {
      bio: 'Senior Engineer',
    };

    const result = await identityService.updateFellowProfile('uuid-1234-5678', updateInput, actor);

    expect(db.update).toHaveBeenCalled();
    expect(result.bio).toBe('Senior Engineer');
  });
});
