import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthActor } from '@/modules/identity/types';
import { LogAuditEventInput } from '../types';
import * as auditService from '../service';
import { db } from '@/lib/db';
import { ForbiddenError } from '@/lib/auth';

// Mock DB client
vi.mock('@/lib/db', () => {
  const mockDb = {
    insert: vi.fn(),
    select: vi.fn(),
  };
  return { db: mockDb };
});

describe('Audit Module & Compliance Ledger (Rule 5)', () => {
  const adminActor: AuthActor = {
    clerkUserId: 'user_admin_audit_1',
    roles: ['admin'],
  };

  const fellowActor: AuthActor = {
    clerkUserId: 'user_fellow_1',
    roles: ['fellow'],
  };

  const sampleLogInput: LogAuditEventInput = {
    actorClerkUserId: 'user_admin_audit_1',
    action: 'stage_override',
    targetType: 'fellow_profile',
    targetId: 'fellow-uuid-100',
    severity: 'warning',
    metadata: {
      previousStage: 'applicant',
      newStage: 'fellow',
      reason: 'Passed all assessments',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logAuditEvent', () => {
    it('appends an immutable audit log entry', async () => {
      const mockCreatedEntry = {
        id: 'audit-log-1',
        ...sampleLogInput,
        createdAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([mockCreatedEntry]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: mockValues });

      const result = await auditService.logAuditEvent(sampleLogInput);

      expect(db.insert).toHaveBeenCalled();
      expect(result.id).toBe('audit-log-1');
      expect(result.action).toBe('stage_override');
    });

    it('rejects invalid payloads with Zod validation error', async () => {
      const invalidInput = {
        actorClerkUserId: '',
        action: '',
      } as unknown as LogAuditEventInput;

      await expect(auditService.logAuditEvent(invalidInput)).rejects.toThrow();
    });
  });

  describe('queryAuditLogs (Rule 5 Security)', () => {
    it('allows admin actors to query audit logs', async () => {
      const mockEntries = [
        {
          id: 'audit-log-1',
          actorClerkUserId: 'user_admin_audit_1',
          action: 'stage_override',
          targetType: 'fellow_profile',
          targetId: 'fellow-uuid-100',
          severity: 'warning',
          metadata: {},
          createdAt: new Date(),
        },
      ];

      const mockLimit = vi.fn().mockResolvedValue(mockEntries);
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: mockFrom });

      const results = await auditService.queryAuditLogs({}, adminActor);
      expect(results).toHaveLength(1);
      expect(results[0].action).toBe('stage_override');
    });

    it('BLOCKS non-admin actors from querying audit logs (Rule 5)', async () => {
      await expect(auditService.queryAuditLogs({}, fellowActor)).rejects.toThrow(ForbiddenError);
    });
  });
});
