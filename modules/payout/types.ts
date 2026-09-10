import { z } from 'zod';

export type PayoutStatus = 'pending' | 'processing' | 'success' | 'failed' | 'reversed';

export interface BankAccount {
  id: string;
  fellowProfileId: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  recipientCode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutDisbursement {
  id: string;
  fellowProfileId: string;
  walletId: string;
  ledgerEntryId?: string;
  amount: number;
  currency: string;
  bankAccountId: string;
  paystackTransferCode?: string;
  paystackReference: string;
  status: PayoutStatus;
  failureReason?: string;
  requestedAt: string;
  processedAt?: string;
}

export interface PaystackBank {
  name: string;
  code: string;
  active: boolean;
}

export interface PaystackResolveBankResult {
  accountNumber: string;
  accountName: string;
  bankCode: string;
}

export interface PaystackTransferRecipientResult {
  recipientCode: string;
  name: string;
  accountNumber: string;
  bankCode: string;
}

export interface PaystackTransferResult {
  transferCode: string;
  reference: string;
  status: PayoutStatus;
  amount: number;
}

export interface PaystackWebhookEvent {
  event: 'transfer.success' | 'transfer.failed' | 'transfer.reversed' | string;
  data: {
    reference: string;
    transfer_code: string;
    amount: number;
    currency: string;
    status: string;
    reason?: string;
  };
}

// Zod payload schemas for Rule 5 input validation
export const LinkBankAccountSchema = z.object({
  fellowProfileId: z.string().uuid('Invalid Fellow Profile UUID'),
  bankCode: z.string().min(2, 'Bank code is required'),
  bankName: z.string().min(2, 'Bank name is required'),
  accountNumber: z.string().min(8, 'Account number must be at least 8 digits').max(20),
});

export const RequestPayoutSchema = z.object({
  fellowProfileId: z.string().uuid('Invalid Fellow Profile UUID'),
  bankAccountId: z.string().uuid('Invalid Bank Account UUID'),
  amount: z.number().positive('Payout amount must be positive'),
  idempotencyKey: z.string().optional(), // Client-provided or generated idempotency key for deduplication
  notes: z.string().optional(),
});

export const AdminRetryPayoutSchema = z.object({
  disbursementId: z.string().uuid('Invalid Disbursement UUID'),
  action: z.enum(['retry', 'refund']),
  reason: z.string().min(5, 'Reason must be provided'),
});

export type PayoutScheduleTargetGroup = 'all_bench' | 'all_cohort' | 'specific_fellow';
export type PayoutScheduleFrequency = 'weekly' | 'biweekly' | 'monthly';
export type PayoutScheduleStatus = 'active' | 'paused' | 'completed';

export interface PayoutSchedule {
  id: string;
  title: string;
  fellowProfileId?: string;
  targetGroup: PayoutScheduleTargetGroup;
  amount: number;
  frequency: PayoutScheduleFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  nextRunAt: string;
  status: PayoutScheduleStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutScheduleLogItem {
  fellowProfileId: string;
  fellowName?: string;
  status: 'disbursed' | 'skipped_overdraft' | 'skipped_no_account' | 'failed';
  disbursementId?: string;
  paystackReference?: string;
  amount?: number;
  reason?: string;
}

export interface PayoutScheduleExecution {
  id: string;
  scheduleId: string;
  batchReference: string;
  totalFellowsTargeted: number;
  totalDisbursedAmount: number;
  successfulDisbursementsCount: number;
  failedDisbursementsCount: number;
  skippedOverdraftCount: number;
  skippedNoAccountCount: number;
  status: 'in_progress' | 'completed' | 'failed';
  executionLogs: PayoutScheduleLogItem[];
  executedAt: string;
}

export const CreatePayoutScheduleSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  fellowProfileId: z.string().uuid().optional(),
  targetGroup: z.enum(['all_bench', 'all_cohort', 'specific_fellow']),
  amount: z.number().positive('Stipend amount must be positive'),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
  dayOfWeek: z.number().min(1).max(7).optional().default(1),
  dayOfMonth: z.number().min(1).max(31).optional().default(1),
});

export type LinkBankAccountInput = z.input<typeof LinkBankAccountSchema>;
export type RequestPayoutInput = z.input<typeof RequestPayoutSchema>;
export type AdminRetryPayoutInput = z.input<typeof AdminRetryPayoutSchema>;
export type CreatePayoutScheduleInput = z.input<typeof CreatePayoutScheduleSchema>;

