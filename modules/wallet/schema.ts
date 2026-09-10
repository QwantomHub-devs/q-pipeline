import {
  pgTable,
  uuid,
  text,
  integer,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { fellowProfiles } from '../identity/schema';

export const fellowWallets = pgTable('fellow_wallets', {
  id: uuid('id').defaultRandom().primaryKey(),
  fellowProfileId: uuid('fellow_profile_id')
    .notNull()
    .unique()
    .references(() => fellowProfiles.id, { onDelete: 'cascade' }),
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  availableBalance: integer('available_balance').notNull().default(0), // Balance in cents / currency units
  pendingBalance: integer('pending_balance').notNull().default(0), // Uncleared pending earnings in cents
  totalLifetimeEarned: integer('total_lifetime_earned').notNull().default(0), // Cumulative credits sum in cents
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'active' | 'frozen' | 'closed'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const ledgerEntries = pgTable('ledger_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  walletId: uuid('wallet_id')
    .notNull()
    .references(() => fellowWallets.id, { onDelete: 'cascade' }),
  fellowProfileId: uuid('fellow_profile_id')
    .notNull()
    .references(() => fellowProfiles.id, { onDelete: 'cascade' }),
  entryType: varchar('entry_type', { length: 20 }).notNull(), // 'credit' | 'debit'
  category: varchar('category', { length: 50 }).notNull(), // 'sme_stipend_credit' | 'bootcamp_stipend_credit' | 'bonus_credit' | 'disbursement_debit' | 'adjustment_credit' | 'fee_debit'
  amount: integer('amount').notNull(), // Positive amount in cents
  runningBalance: integer('running_balance').notNull(), // Balance after entry execution
  description: text('description').notNull(),
  referenceId: text('reference_id'), // ID of triggering match, project, or payout
  postedBy: text('posted_by').notNull(), // Clerk User ID of system process or admin
  postedAt: timestamp('posted_at', { withTimezone: true }).defaultNow().notNull(),
});

export const partnerRemittances = pgTable('partner_remittances', {
  id: uuid('id').defaultRandom().primaryKey(),
  partnerName: text('partner_name').notNull(),
  bankReference: text('bank_reference').notNull().unique(),
  totalAmount: integer('total_amount').notNull(), // Gross total incoming wire in cents / currency units
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  remittanceDate: timestamp('remittance_date', { withTimezone: true }).defaultNow().notNull(),
  status: varchar('status', { length: 50 }).notNull().default('processed'), // 'processed' | 'partial' | 'failed'
  createdAdminUserId: text('created_admin_user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const remittanceLineItems = pgTable('remittance_line_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  remittanceId: uuid('remittance_id')
    .notNull()
    .references(() => partnerRemittances.id, { onDelete: 'cascade' }),
  fellowProfileId: uuid('fellow_profile_id')
    .notNull()
    .references(() => fellowProfiles.id, { onDelete: 'cascade' }),
  placementId: text('placement_id'), // Reference ID from Service 16 fellow_matches / opportunities
  grossAmount: integer('gross_amount').notNull(),
  withholdingTax: integer('withholding_tax').notNull().default(0), // 5% standard withholding tax
  netAmount: integer('net_amount').notNull(),
  matchedStatus: varchar('matched_status', { length: 50 }).notNull().default('matched'),
  postedLedgerEntryId: uuid('posted_ledger_entry_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type FellowWalletRow = InferSelectModel<typeof fellowWallets>;
export type NewFellowWalletRow = InferInsertModel<typeof fellowWallets>;
export type LedgerEntryRow = InferSelectModel<typeof ledgerEntries>;
export type NewLedgerEntryRow = InferInsertModel<typeof ledgerEntries>;
export type PartnerRemittanceRow = InferSelectModel<typeof partnerRemittances>;
export type NewPartnerRemittanceRow = InferInsertModel<typeof partnerRemittances>;
export type RemittanceLineItemRow = InferSelectModel<typeof remittanceLineItems>;
export type NewRemittanceLineItemRow = InferInsertModel<typeof remittanceLineItems>;
