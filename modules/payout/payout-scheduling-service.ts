import {
  PayoutSchedule,
  PayoutScheduleExecution,
  PayoutScheduleLogItem,
  CreatePayoutScheduleInput,
  CreatePayoutScheduleSchema,
  PayoutScheduleStatus,
} from './types';
import { AuthActor } from '../identity/types';
import { assertCanAccessFellowRecord, requireRole } from '@/lib/auth';
import { logAuditEvent } from '../audit/service';
import { getOrCreateWallet } from '../wallet/wallet-service';
import { listBenchPool } from '../bench/bench-service';
import { getFellowProfileById } from '../identity/service';
import { listFellowBankAccounts, requestPayout } from './payout-service';
import crypto from 'crypto';

// In-memory state store for development, testing, and runtime persistence
const schedulesStore = new Map<string, PayoutSchedule>();
const executionsStore = new Map<string, PayoutScheduleExecution>();

/**
 * Calculate the next execution date based on frequency
 */
export function calculateNextRunDate(frequency: 'weekly' | 'biweekly' | 'monthly', fromDate = new Date()): Date {
  const next = new Date(fromDate.getTime());
  if (frequency === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else if (frequency === 'biweekly') {
    next.setDate(next.getDate() + 14);
  } else if (frequency === 'monthly') {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

/**
 * Admin creates a new recurring fellow payout schedule rule
 */
export async function createPayoutSchedule(
  actor: AuthActor,
  rawInput: CreatePayoutScheduleInput
): Promise<PayoutSchedule> {
  requireRole(actor, 'admin');

  const input = CreatePayoutScheduleSchema.parse(rawInput);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const nextRunAt = calculateNextRunDate(input.frequency).toISOString();

  const schedule: PayoutSchedule = {
    id,
    title: input.title,
    fellowProfileId: input.fellowProfileId,
    targetGroup: input.targetGroup,
    amount: input.amount,
    frequency: input.frequency,
    dayOfWeek: input.dayOfWeek,
    dayOfMonth: input.dayOfMonth,
    nextRunAt,
    status: 'active',
    createdBy: actor.clerkUserId,
    createdAt: now,
    updatedAt: now,
  };

  schedulesStore.set(id, schedule);

  await logAuditEvent({
    actorClerkUserId: actor.clerkUserId,
    action: 'PAYOUT_SCHEDULE_CREATED',
    targetType: 'payout_schedule',
    targetId: id,
    metadata: {
      title: input.title,
      targetGroup: input.targetGroup,
      amount: input.amount,
      frequency: input.frequency,
      nextRunAt,
    },
  });

  return schedule;
}

/**
 * Admin lists all configured payout schedules
 */
export async function listPayoutSchedules(actor: AuthActor): Promise<PayoutSchedule[]> {
  requireRole(actor, 'admin');
  return Array.from(schedulesStore.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Admin toggles status (active <-> paused) of a payout schedule
 */
export async function togglePayoutScheduleStatus(
  actor: AuthActor,
  scheduleId: string,
  newStatus: PayoutScheduleStatus
): Promise<PayoutSchedule> {
  requireRole(actor, 'admin');

  const schedule = schedulesStore.get(scheduleId);
  if (!schedule) {
    throw new Error(`Payout schedule with ID '${scheduleId}' not found`);
  }

  schedule.status = newStatus;
  schedule.updatedAt = new Date().toISOString();
  schedulesStore.set(scheduleId, schedule);

  await logAuditEvent({
    actorClerkUserId: actor.clerkUserId,
    action: 'PAYOUT_SCHEDULE_STATUS_TOGGLED',
    targetType: 'payout_schedule',
    targetId: scheduleId,
    metadata: { newStatus },
  });

  return schedule;
}

/**
 * Fellow views scheduled stipend disbursement rules applicable to their profile
 */
export async function listScheduledDisbursementsForFellow(
  actor: AuthActor,
  fellowProfileId: string
): Promise<PayoutSchedule[]> {
  assertCanAccessFellowRecord(actor, fellowProfileId);

  const activeSchedules = Array.from(schedulesStore.values()).filter(
    (s) => s.status === 'active'
  );

  return activeSchedules.filter(
    (s) => s.targetGroup === 'all_bench' || s.fellowProfileId === fellowProfileId
  );
}

/**
 * Admin triggers or system executes due scheduled payout batches with overdraft safety
 */
export async function processScheduledPayoutsBatch(
  actor: AuthActor,
  targetScheduleId?: string
): Promise<PayoutScheduleExecution[]> {
  requireRole(actor, 'admin');

  const now = new Date();
  const allSchedules = Array.from(schedulesStore.values());

  const dueSchedules = targetScheduleId
    ? allSchedules.filter((s) => s.id === targetScheduleId)
    : allSchedules.filter((s) => s.status === 'active' && new Date(s.nextRunAt) <= now);

  const executions: PayoutScheduleExecution[] = [];

  for (const schedule of dueSchedules) {
    const batchReference = `BATCH-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const logs: PayoutScheduleLogItem[] = [];

    let totalDisbursedAmount = 0;
    let successfulCount = 0;
    let failedCount = 0;
    let skippedOverdraftCount = 0;
    let skippedNoAccountCount = 0;

    // Resolve target fellows
    let targetFellowIds: string[] = [];
    if (schedule.targetGroup === 'specific_fellow' && schedule.fellowProfileId) {
      targetFellowIds = [schedule.fellowProfileId];
    } else {
      // Default 'all_bench': fetch bench fellows
      const benchPool = await listBenchPool().catch(() => []);
      targetFellowIds = benchPool.map((b) => b.fellowId);
    }

    // Fallback if bench pool is empty in mock/dev test environments
    if (targetFellowIds.length === 0 && schedule.fellowProfileId) {
      targetFellowIds = [schedule.fellowProfileId];
    }

    for (const fellowId of targetFellowIds) {
      let fellowName = 'Fellow';
      try {
        const profile = await getFellowProfileById(fellowId, actor);
        if (profile) {
          fellowName = `${profile.firstName} ${profile.lastName}`;
        }
      } catch {
        // Continue if profile look-up is mock
      }

      // 1. Verify default bank account exists
      const accounts = await listFellowBankAccounts(actor, fellowId).catch(() => []);
      const defaultAccount = accounts.find((a) => a.isDefault) || accounts[0];

      if (!defaultAccount) {
        skippedNoAccountCount++;
        logs.push({
          fellowProfileId: fellowId,
          fellowName,
          status: 'skipped_no_account',
          reason: 'No validated Paystack bank account linked to fellow profile',
        });
        continue;
      }

      // 2. Check wallet overdraft protection
      const wallet = await getOrCreateWallet(actor, fellowId);
      if (wallet.availableBalance < schedule.amount) {
        skippedOverdraftCount++;
        logs.push({
          fellowProfileId: fellowId,
          fellowName,
          status: 'skipped_overdraft',
          amount: schedule.amount,
          reason: `Insufficient wallet balance ($${wallet.availableBalance}) for stipend disbursement ($${schedule.amount})`,
        });
        continue;
      }

      // 3. Execute payout with idempotent reference key
      const idempotencyKey = `SCHED-${schedule.id}-${batchReference}-${fellowId}`;
      try {
        const payout = await requestPayout(actor, {
          fellowProfileId: fellowId,
          bankAccountId: defaultAccount.id,
          amount: schedule.amount,
          idempotencyKey,
          notes: `Scheduled Stipend: ${schedule.title}`,
        });

        successfulCount++;
        totalDisbursedAmount += schedule.amount;
        logs.push({
          fellowProfileId: fellowId,
          fellowName,
          status: 'disbursed',
          disbursementId: payout.id,
          paystackReference: payout.paystackReference,
          amount: schedule.amount,
        });
      } catch (err: any) {
        failedCount++;
        logs.push({
          fellowProfileId: fellowId,
          fellowName,
          status: 'failed',
          amount: schedule.amount,
          reason: err.message || 'Payout transfer failed',
        });
      }
    }

    // Advance nextRunAt
    const nextRunDate = calculateNextRunDate(schedule.frequency, now);
    schedule.nextRunAt = nextRunDate.toISOString();
    schedule.updatedAt = now.toISOString();
    schedulesStore.set(schedule.id, schedule);

    const execution: PayoutScheduleExecution = {
      id: crypto.randomUUID(),
      scheduleId: schedule.id,
      batchReference,
      totalFellowsTargeted: targetFellowIds.length,
      totalDisbursedAmount,
      successfulDisbursementsCount: successfulCount,
      failedDisbursementsCount: failedCount,
      skippedOverdraftCount,
      skippedNoAccountCount,
      status: failedCount === 0 ? 'completed' : 'failed',
      executionLogs: logs,
      executedAt: now.toISOString(),
    };

    executionsStore.set(execution.id, execution);
    executions.push(execution);

    await logAuditEvent({
      actorClerkUserId: actor.clerkUserId,
      action: 'PAYOUT_SCHEDULE_BATCH_EXECUTED',
      targetType: 'payout_schedule_execution',
      targetId: execution.id,
      metadata: {
        scheduleId: schedule.id,
        batchReference,
        totalTargeted: targetFellowIds.length,
        successfulCount,
        skippedOverdraftCount,
        skippedNoAccountCount,
      },
    });
  }

  return executions;
}

/**
 * Admin lists past batch execution logs
 */
export async function listPayoutScheduleExecutions(actor: AuthActor): Promise<PayoutScheduleExecution[]> {
  requireRole(actor, 'admin');
  return Array.from(executionsStore.values()).sort(
    (a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
  );
}
