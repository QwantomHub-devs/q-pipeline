import {
  pgTable,
  uuid,
  text,
  integer,
  varchar,
  boolean,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { fellowProfiles } from '../identity/schema';
import { fellowWallets } from '../wallet/schema';

export const payoutBankAccounts = pgTable('payout_bank_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  fellowProfileId: uuid('fellow_profile_id')
    .notNull()
    .references(() => fellowProfiles.id, { onDelete: 'cascade' }),
  bankCode: varchar('bank_code', { length: 20 }).notNull(),
  bankName: varchar('bank_name', { length: 100 }).notNull(),
  accountNumber: varchar('account_number', { length: 30 }).notNull(),
  accountName: varchar('account_name', { length: 150 }).notNull(),
  recipientCode: varchar('recipient_code', { length: 100 }).notNull(), // Paystack Transfer Recipient Code e.g. RCP_123456
  isDefault: boolean('is_default').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const payoutDisbursements = pgTable('payout_disbursements', {
  id: uuid('id').defaultRandom().primaryKey(),
  fellowProfileId: uuid('fellow_profile_id')
    .notNull()
    .references(() => fellowProfiles.id, { onDelete: 'cascade' }),
  walletId: uuid('wallet_id')
    .notNull()
    .references(() => fellowWallets.id, { onDelete: 'cascade' }),
  ledgerEntryId: uuid('ledger_entry_id'), // Associated disbursement_debit ledger entry ID
  amount: integer('amount').notNull(), // Amount in cents / currency units
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  bankAccountId: uuid('bank_account_id')
    .notNull()
    .references(() => payoutBankAccounts.id, { onDelete: 'restrict' }),
  paystackTransferCode: varchar('paystack_transfer_code', { length: 100 }), // Paystack transfer code e.g. TRF_123456
  paystackReference: varchar('paystack_reference', { length: 100 }).notNull().unique(), // Unique payout reference ID
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'processing' | 'success' | 'failed' | 'reversed'
  failureReason: text('failure_reason'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
});

export const payoutSchedules = pgTable('payout_schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  fellowProfileId: uuid('fellow_profile_id').references(() => fellowProfiles.id, { onDelete: 'cascade' }), // Optional: target specific fellow or null for pool-wide
  targetGroup: varchar('target_group', { length: 50 }).notNull().default('all_bench'), // 'all_bench' | 'all_cohort' | 'specific_fellow'
  amount: integer('amount').notNull(), // Amount in cents/units
  frequency: varchar('frequency', { length: 50 }).notNull().default('weekly'), // 'weekly' | 'biweekly' | 'monthly'
  dayOfWeek: integer('day_of_week').default(1), // 1 = Monday, 7 = Sunday
  dayOfMonth: integer('day_of_month').default(1), // 1..31
  nextRunAt: timestamp('next_run_at', { withTimezone: true }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'active' | 'paused' | 'completed'
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const payoutScheduleExecutions = pgTable('payout_schedule_executions', {
  id: uuid('id').defaultRandom().primaryKey(),
  scheduleId: uuid('schedule_id')
    .notNull()
    .references(() => payoutSchedules.id, { onDelete: 'cascade' }),
  batchReference: varchar('batch_reference', { length: 100 }).notNull().unique(),
  totalFellowsTargeted: integer('total_fellows_targeted').notNull().default(0),
  totalDisbursedAmount: integer('total_disbursed_amount').notNull().default(0),
  successfulDisbursementsCount: integer('successful_disbursements_count').notNull().default(0),
  failedDisbursementsCount: integer('failed_disbursements_count').notNull().default(0),
  skippedOverdraftCount: integer('skipped_overdraft_count').notNull().default(0),
  skippedNoAccountCount: integer('skipped_no_account_count').notNull().default(0),
  status: varchar('status', { length: 50 }).notNull().default('completed'), // 'in_progress' | 'completed' | 'failed'
  executionLogs: jsonb('execution_logs').notNull().default([]),
  executedAt: timestamp('executed_at', { withTimezone: true }).defaultNow().notNull(),
});

export type PayoutBankAccountRow = InferSelectModel<typeof payoutBankAccounts>;
export type NewPayoutBankAccountRow = InferInsertModel<typeof payoutBankAccounts>;
export type PayoutDisbursementRow = InferSelectModel<typeof payoutDisbursements>;
export type NewPayoutDisbursementRow = InferInsertModel<typeof payoutDisbursements>;
export type PayoutScheduleRow = InferSelectModel<typeof payoutSchedules>;
export type NewPayoutScheduleRow = InferInsertModel<typeof payoutSchedules>;
export type PayoutScheduleExecutionRow = InferSelectModel<typeof payoutScheduleExecutions>;
export type NewPayoutScheduleExecutionRow = InferInsertModel<typeof payoutScheduleExecutions>;
