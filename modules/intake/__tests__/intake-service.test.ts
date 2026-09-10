import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthActor } from '@/modules/identity/types';
import { SubmitIntakeInput } from '../types';
import * as intakeService from '../service';
import { db } from '@/lib/db';
import * as identityService from '@/modules/identity/service';
import { ForbiddenError } from '@/lib/auth';

// Mock DB client
vi.mock('@/lib/db', () => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
  };
  return { db: mockDb };
});

// Mock Identity Service
vi.mock('@/modules/identity/service', () => ({
  getFellowProfileByClerkId: vi.fn(),
  createFellowProfile: vi.fn(),
}));

describe('Intake Module Service & Eligibility Engine (Rule 5)', () => {
  const fellowActor: AuthActor = {
    clerkUserId: 'user_clerk_intake_1',
    roles: ['fellow'],
  };

  const otherActor: AuthActor = {
    clerkUserId: 'user_clerk_other',
    roles: ['fellow'],
  };

  const validSubmitInput: SubmitIntakeInput = {
    firstName: 'Chukwuemeka',
    lastName: 'Applicant',
    email: 'applicant@qwantomhub.com',
    cohortWindow: '2026-Q3',
    outreachChannel: 'nysc_camp',
    primaryTrack: 'fullstack_ai',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkEligibility', () => {
    it('returns isEligible=true when no prior application exists in cohort window', async () => {
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      const result = await intakeService.checkEligibility('user_clerk_intake_1', '2026-Q3');
      expect(result.isEligible).toBe(true);
    });

    it('returns isEligible=false when duplicate application exists in cohort window', async () => {
      const mockExisting = [{ id: 'intake-999', cohortWindow: '2026-Q3' }];
      const mockLimit = vi.fn().mockResolvedValue(mockExisting);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      const result = await intakeService.checkEligibility('user_clerk_intake_1', '2026-Q3');
      expect(result.isEligible).toBe(false);
      expect(result.reason).toContain('already submitted an application');
    });
  });

  describe('submitApplicantIntake', () => {
    it('successfully submits intake and provisions profile spine', async () => {
      // Mock no existing intake
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      // Mock identity profile fetch
      (identityService.getFellowProfileByClerkId as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'fellow-uuid-111',
        clerkUserId: 'user_clerk_intake_1',
      });

      // Mock intake insertion
      const mockCreatedIntake = {
        id: 'intake-uuid-222',
        fellowId: 'fellow-uuid-111',
        clerkUserId: 'user_clerk_intake_1',
        cohortWindow: '2026-Q3',
        outreachChannel: 'nysc_camp',
        status: 'eligible',
      };
      const mockReturning = vi.fn().mockResolvedValue([mockCreatedIntake]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: mockValues });

      const result = await intakeService.submitApplicantIntake(validSubmitInput, fellowActor);

      expect(result.id).toBe('intake-uuid-222');
      expect(result.status).toBe('eligible');
    });

    it('rejects duplicate submission with IntakeConflictError', async () => {
      // Mock existing intake
      const mockLimit = vi.fn().mockResolvedValue([{ id: 'intake-999' }]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      await expect(
        intakeService.submitApplicantIntake(validSubmitInput, fellowActor)
      ).rejects.toThrow('already submitted an application');
    });
  });

  describe('getIntakeByFellowId (Rule 5 Security)', () => {
    it('BLOCKS unauthorized actor from fetching another candidate intake record', async () => {
      const mockIntake = {
        id: 'intake-1',
        fellowId: 'fellow-1',
        clerkUserId: 'user_clerk_intake_1',
      };
      const mockLimit = vi.fn().mockResolvedValue([mockIntake]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      await expect(
        intakeService.getIntakeByFellowId('fellow-1', otherActor)
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
