'use server';

import { auth } from '@clerk/nextjs/server';
import { getFellowProfileByClerkId } from '../identity/service';
import {
  linkBankAccount,
  requestPayout,
  listFellowBankAccounts,
  listFellowPayouts,
  listAllPayoutsForAdmin,
} from './payout-service';
import { defaultPaystackClient } from './paystack-client';
import {
  createPayoutSchedule,
  listPayoutSchedules,
  togglePayoutScheduleStatus,
  listScheduledDisbursementsForFellow,
  processScheduledPayoutsBatch,
  listPayoutScheduleExecutions,
} from './payout-scheduling-service';
import {
  BankAccount,
  PayoutDisbursement,
  LinkBankAccountInput,
  RequestPayoutInput,
  PaystackBank,
  PayoutSchedule,
  PayoutScheduleExecution,
  CreatePayoutScheduleInput,
  PayoutScheduleStatus,
} from './types';
import { AuthActor } from '../identity/types';

/**
 * Server Action: Link validated local bank account via Paystack NUBAN Resolution (Rule 5 check)
 */
export async function linkBankAccountAction(input: Omit<LinkBankAccountInput, 'fellowProfileId'>): Promise<{
  success: boolean;
  bankAccount?: BankAccount;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const requestingUser: AuthActor = { clerkUserId: userId, roles: ['fellow'] };
    const profile = await getFellowProfileByClerkId(userId, requestingUser);
    if (!profile) {
      return { success: false, error: 'Fellow profile spine not found' };
    }

    const bankAccount = await linkBankAccount(requestingUser, {
      ...input,
      fellowProfileId: profile.id,
    });

    return { success: true, bankAccount };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to link bank account' };
  }
}

/**
 * Server Action: Request fellow micro-stipend payout disbursement (Rule 5 check)
 */
export async function requestPayoutAction(input: Omit<RequestPayoutInput, 'fellowProfileId'>): Promise<{
  success: boolean;
  disbursement?: PayoutDisbursement;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const requestingUser: AuthActor = { clerkUserId: userId, roles: ['fellow'] };
    const profile = await getFellowProfileByClerkId(userId, requestingUser);
    if (!profile) {
      return { success: false, error: 'Fellow profile spine not found' };
    }

    const disbursement = await requestPayout(requestingUser, {
      ...input,
      fellowProfileId: profile.id,
    });

    return { success: true, disbursement };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to process payout disbursement' };
  }
}

/**
 * Server Action: Get authenticated fellow's linked bank accounts (Rule 5 check)
 */
export async function getMyBankAccountsAction(): Promise<{
  success: boolean;
  bankAccounts?: BankAccount[];
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const requestingUser: AuthActor = { clerkUserId: userId, roles: ['fellow'] };
    const profile = await getFellowProfileByClerkId(userId, requestingUser);
    if (!profile) {
      return { success: false, error: 'Fellow profile spine not found' };
    }

    const bankAccounts = await listFellowBankAccounts(requestingUser, profile.id);
    return { success: true, bankAccounts };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch bank accounts' };
  }
}

/**
 * Server Action: Get authenticated fellow's payout history (Rule 5 check)
 */
export async function getMyPayoutsAction(): Promise<{
  success: boolean;
  payouts?: PayoutDisbursement[];
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const requestingUser: AuthActor = { clerkUserId: userId, roles: ['fellow'] };
    const profile = await getFellowProfileByClerkId(userId, requestingUser);
    if (!profile) {
      return { success: false, error: 'Fellow profile spine not found' };
    }

    const payouts = await listFellowPayouts(requestingUser, profile.id);
    return { success: true, payouts };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch payout history' };
  }
}

/**
 * Server Action: Fetch list of supported banks from Paystack
 */
export async function getSupportedBanksAction(): Promise<{
  success: boolean;
  banks?: PaystackBank[];
  error?: string;
}> {
  try {
    const banks = await defaultPaystackClient.fetchSupportedBanks();
    return { success: true, banks };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch supported bank roster' };
  }
}

/**
 * Server Action: Admin list system-wide payout disbursements (Admin only)
 */
export async function adminListPayoutsAction(): Promise<{
  success: boolean;
  payouts?: Array<PayoutDisbursement & { bankAccount?: BankAccount }>;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const adminUser: AuthActor = { clerkUserId: userId, roles: ['admin'] };
    const payouts = await listAllPayoutsForAdmin(adminUser);
    return { success: true, payouts };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to list payouts for governance' };
  }
}

/**
 * Server Action: Admin create recurring fellow stipend payout schedule
 */
export async function createPayoutScheduleAction(input: CreatePayoutScheduleInput): Promise<{
  success: boolean;
  schedule?: PayoutSchedule;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const adminUser: AuthActor = { clerkUserId: userId, roles: ['admin'] };
    const schedule = await createPayoutSchedule(adminUser, input);
    return { success: true, schedule };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create payout schedule' };
  }
}

/**
 * Server Action: Admin list all configured payout schedules
 */
export async function listPayoutSchedulesAction(): Promise<{
  success: boolean;
  schedules?: PayoutSchedule[];
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const adminUser: AuthActor = { clerkUserId: userId, roles: ['admin'] };
    const schedules = await listPayoutSchedules(adminUser);
    return { success: true, schedules };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to list payout schedules' };
  }
}

/**
 * Server Action: Admin toggle payout schedule active/paused status
 */
export async function togglePayoutScheduleStatusAction(
  scheduleId: string,
  newStatus: PayoutScheduleStatus
): Promise<{
  success: boolean;
  schedule?: PayoutSchedule;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const adminUser: AuthActor = { clerkUserId: userId, roles: ['admin'] };
    const schedule = await togglePayoutScheduleStatus(adminUser, scheduleId, newStatus);
    return { success: true, schedule };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to toggle schedule status' };
  }
}

/**
 * Server Action: Admin trigger execution of scheduled payout batch
 */
export async function processScheduledPayoutsBatchAction(scheduleId?: string): Promise<{
  success: boolean;
  executions?: PayoutScheduleExecution[];
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const adminUser: AuthActor = { clerkUserId: userId, roles: ['admin'] };
    const executions = await processScheduledPayoutsBatch(adminUser, scheduleId);
    return { success: true, executions };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to execute scheduled payout batch' };
  }
}

/**
 * Server Action: Admin list past scheduled batch execution logs
 */
export async function listPayoutScheduleExecutionsAction(): Promise<{
  success: boolean;
  executions?: PayoutScheduleExecution[];
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const adminUser: AuthActor = { clerkUserId: userId, roles: ['admin'] };
    const executions = await listPayoutScheduleExecutions(adminUser);
    return { success: true, executions };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to list scheduled payout batch executions' };
  }
}

/**
 * Server Action: Fellow get applicable scheduled disbursement rules
 */
export async function getMyScheduledDisbursementsAction(): Promise<{
  success: boolean;
  schedules?: PayoutSchedule[];
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const requestingUser: AuthActor = { clerkUserId: userId, roles: ['fellow'] };
    const profile = await getFellowProfileByClerkId(userId, requestingUser);
    if (!profile) {
      return { success: false, error: 'Fellow profile spine not found' };
    }

    const schedules = await listScheduledDisbursementsForFellow(requestingUser, profile.id);
    return { success: true, schedules };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch fellow scheduled disbursements' };
  }
}
