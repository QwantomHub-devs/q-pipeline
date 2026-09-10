import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createPayoutSchedule,
  listPayoutSchedules,
  togglePayoutScheduleStatus,
  listScheduledDisbursementsForFellow,
  processScheduledPayoutsBatch,
  listPayoutScheduleExecutions,
} from '../payout-scheduling-service';
import { linkBankAccount } from '../payout-service';
import { postLedgerEntry } from '../../wallet/wallet-service';
import { AuthActor } from '@/modules/identity/types';

const fellowProfileIdA = '11111111-1111-4111-8111-111111111111';
const fellowProfileIdB = '22222222-2222-4222-8222-222222222222';
const fellowProfileIdNoAccount = '99999999-9999-4999-8999-999999999999';

// Mock dependencies
vi.mock('../../audit/service', () => ({
  logAuditEvent: vi.fn().mockResolvedValue({ id: 'audit-1' }),
}));

vi.mock('../../bench/bench-service', () => ({
  listBenchPool: vi.fn().mockResolvedValue([
    { id: 'b-1', fellowId: '11111111-1111-4111-8111-111111111111', status: 'available' },
    { id: 'b-2', fellowId: '22222222-2222-4222-8222-222222222222', status: 'assigned_project' },
  ]),
}));

vi.mock('../../identity/service', () => ({
  getFellowProfileById: vi.fn().mockImplementation((id: string) => {
    if (id === fellowProfileIdA) {
      return Promise.resolve({ id: fellowProfileIdA, clerkUserId: 'clerk_fellow_a', firstName: 'Ada', lastName: 'Lovelace' });
    }
    if (id === fellowProfileIdB) {
      return Promise.resolve({ id: fellowProfileIdB, clerkUserId: 'clerk_fellow_b', firstName: 'Amina', lastName: 'Yusuf' });
    }
    return Promise.resolve({ id: fellowProfileIdNoAccount, clerkUserId: 'clerk_no_account', firstName: 'Kofi', lastName: 'Mensah' });
  }),
}));

describe('Service 21: Automated Fellow Payout Scheduling (BUILD)', () => {
  const adminUser: AuthActor = { clerkUserId: 'clerk_admin', roles: ['admin'] };
  const fellowUserA: AuthActor = { clerkUserId: fellowProfileIdA, roles: ['fellow'] };
  const fellowUserB: AuthActor = { clerkUserId: fellowProfileIdB, roles: ['fellow'] };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Schedule Configuration & Rule Management', () => {
    it('allows admin to create a recurring bench stipend payout schedule', async () => {
      const schedule = await createPayoutSchedule(adminUser, {
        title: 'Weekly Bench Fellow Micro-Stipend',
        targetGroup: 'all_bench',
        amount: 50,
        frequency: 'weekly',
        dayOfWeek: 1,
      });

      expect(schedule.id).toBeDefined();
      expect(schedule.title).toBe('Weekly Bench Fellow Micro-Stipend');
      expect(schedule.targetGroup).toBe('all_bench');
      expect(schedule.amount).toBe(50);
      expect(schedule.status).toBe('active');
      expect(schedule.nextRunAt).toBeDefined();
    });

    it('allows admin to pause and resume a payout schedule', async () => {
      const schedule = await createPayoutSchedule(adminUser, {
        title: 'Monthly SME Project Stipend',
        targetGroup: 'all_bench',
        amount: 100,
        frequency: 'monthly',
      });

      const paused = await togglePayoutScheduleStatus(adminUser, schedule.id, 'paused');
      expect(paused.status).toBe('paused');

      const resumed = await togglePayoutScheduleStatus(adminUser, schedule.id, 'active');
      expect(resumed.status).toBe('active');
    });

    it('allows fellow to view active schedules applicable to their profile', async () => {
      const fellowSchedules = await listScheduledDisbursementsForFellow(fellowUserA, fellowProfileIdA);
      expect(Array.isArray(fellowSchedules)).toBe(true);
    });
  });

  describe('Batch Execution Engine & Overdraft Safety', () => {
    it('skips fellows with no linked bank account without failing the batch execution', async () => {
      const schedule = await createPayoutSchedule(adminUser, {
        title: 'Batch Run Test',
        targetGroup: 'specific_fellow',
        fellowProfileId: fellowProfileIdNoAccount,
        amount: 50,
        frequency: 'weekly',
      });

      const executions = await processScheduledPayoutsBatch(adminUser, schedule.id);

      expect(executions.length).toBe(1);
      expect(executions[0].skippedNoAccountCount).toBe(1);
      expect(executions[0].successfulDisbursementsCount).toBe(0);
      expect(executions[0].executionLogs[0].status).toBe('skipped_no_account');
    });

    it('skips fellows with insufficient wallet balance (overdraft protection)', async () => {
      // 1. Link bank account for fellow
      await linkBankAccount(fellowUserA, {
        fellowProfileId: fellowProfileIdA,
        bankCode: '057',
        bankName: 'Zenith Bank',
        accountNumber: '0123456789',
      });

      // Wallet balance is 0 initially (less than 500 amount)
      const schedule = await createPayoutSchedule(adminUser, {
        title: 'High Amount Stipend Test',
        targetGroup: 'specific_fellow',
        fellowProfileId: fellowProfileIdA,
        amount: 500,
        frequency: 'weekly',
      });

      const executions = await processScheduledPayoutsBatch(adminUser, schedule.id);

      expect(executions.length).toBe(1);
      expect(executions[0].skippedOverdraftCount).toBe(1);
      expect(executions[0].successfulDisbursementsCount).toBe(0);
      expect(executions[0].executionLogs[0].status).toBe('skipped_overdraft');
    });

    it('successfully processes stipend payout when bank account is linked and wallet is funded', async () => {
      // 1. Link bank account
      await linkBankAccount(fellowUserA, {
        fellowProfileId: fellowProfileIdA,
        bankCode: '057',
        bankName: 'Zenith Bank',
        accountNumber: '0123456789',
      });

      // 2. Fund fellow wallet via Service 18 double-entry ledger
      await postLedgerEntry(adminUser, {
        fellowProfileId: fellowProfileIdA,
        entryType: 'credit',
        amount: 200,
        category: 'sme_stipend_credit',
        description: 'Test Wallet Funding',
      });

      // 3. Create schedule for 75 amount (balance is 200 >= 75)
      const schedule = await createPayoutSchedule(adminUser, {
        title: 'Funded Stipend Test',
        targetGroup: 'specific_fellow',
        fellowProfileId: fellowProfileIdA,
        amount: 75,
        frequency: 'weekly',
      });

      const executions = await processScheduledPayoutsBatch(adminUser, schedule.id);

      expect(executions.length).toBe(1);
      expect(executions[0].successfulDisbursementsCount).toBe(1);
      expect(executions[0].totalDisbursedAmount).toBe(75);
      expect(executions[0].executionLogs[0].status).toBe('disbursed');
    });
  });

  describe('Rule 5 Security & Role Authorization', () => {
    it('blocks non-admin fellow user from creating a payout schedule', async () => {
      await expect(
        createPayoutSchedule(fellowUserA, {
          title: 'Unauthorized Schedule',
          targetGroup: 'all_bench',
          amount: 50,
          frequency: 'weekly',
        })
      ).rejects.toThrow(/Access denied|admin/i);
    });

    it('blocks non-admin fellow user from executing scheduled payout batches', async () => {
      await expect(processScheduledPayoutsBatch(fellowUserA)).rejects.toThrow(/Access denied|admin/i);
    });

    it('blocks Fellow B from viewing Fellow A scheduled disbursements', async () => {
      await expect(listScheduledDisbursementsForFellow(fellowUserB, fellowProfileIdA)).rejects.toThrow(
        /not authorized/i
      );
    });
  });
});
