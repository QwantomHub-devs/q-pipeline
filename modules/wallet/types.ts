import { z } from 'zod';

export type WalletStatus = 'active' | 'frozen' | 'closed';
export type LedgerEntryType = 'credit' | 'debit';
export type LedgerCategory =
  | 'sme_stipend_credit'
  | 'bootcamp_stipend_credit'
  | 'bonus_credit'
  | 'disbursement_debit'
  | 'adjustment_credit'
  | 'fee_debit';

export interface FellowWallet {
  id: string;
  fellowProfileId: string;
  currency: string;
  availableBalance: number; // in currency units ($ or cents converted)
  pendingBalance: number;
  totalLifetimeEarned: number;
  status: WalletStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerEntry {
  id: string;
  walletId: string;
  fellowProfileId: string;
  entryType: LedgerEntryType;
  category: LedgerCategory;
  amount: number;
  runningBalance: number;
  description: string;
  referenceId?: string;
  postedBy: string;
  postedAt: string;
}

export interface WalletReconciliationResult {
  walletId: string;
  fellowProfileId: string;
  availableBalance: number;
  sumCredits: number;
  sumDebits: number;
  calculatedBalance: number;
  isReconciled: boolean;
  discrepancy: number;
}

// Zod schemas for payload validation & Rule 5 compliance
export const PostLedgerEntrySchema = z.object({
  fellowProfileId: z.string().uuid('Invalid Fellow Profile UUID'),
  entryType: z.enum(['credit', 'debit']),
  category: z.enum([
    'sme_stipend_credit',
    'bootcamp_stipend_credit',
    'bonus_credit',
    'disbursement_debit',
    'adjustment_credit',
    'fee_debit',
  ]),
  amount: z.number().positive('Amount must be a positive number'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  referenceId: z.string().optional(),
});

export const AdminAdjustmentEntrySchema = z.object({
  fellowProfileId: z.string().uuid('Invalid Fellow Profile UUID'),
  entryType: z.enum(['credit', 'debit']),
  amount: z.number().positive('Amount must be positive'),
  reason: z.string().min(10, 'Adjustment reason must be at least 10 characters'),
  referenceId: z.string().optional(),
});

export interface PartnerRemittance {
  id: string;
  partnerName: string;
  bankReference: string;
  totalAmount: number;
  currency: string;
  remittanceDate: string;
  status: 'processed' | 'partial' | 'failed';
  createdAdminUserId: string;
  createdAt: string;
}

export interface RemittanceLineItem {
  id: string;
  remittanceId: string;
  fellowProfileId: string;
  placementId?: string;
  grossAmount: number;
  withholdingTax: number;
  netAmount: number;
  matchedStatus: 'matched' | 'unmatched_fellow' | 'unmatched_placement';
  postedLedgerEntryId?: string;
  createdAt: string;
}

export interface RemittanceIngestionResult {
  remittance: PartnerRemittance;
  lineItems: RemittanceLineItem[];
  totalGrossProcessed: number;
  totalWithholdingTax: number;
  totalNetCredited: number;
  matchedPlacementsCount: number;
}

export const RemittanceLineItemInputSchema = z.object({
  fellowProfileId: z.string().uuid('Invalid Fellow Profile UUID'),
  grossAmount: z.number().positive('Gross amount must be positive'),
  placementId: z.string().optional(),
});

export const IngestPartnerRemittanceSchema = z.object({
  partnerName: z.string().min(2, 'Partner name is required'),
  bankReference: z.string().min(3, 'Bank wire reference code is required'),
  totalAmount: z.number().positive('Total wire amount must be positive'),
  withholdingTaxRatePercent: z.number().min(0).max(50).default(5), // Default 5% withholding tax
  lineItems: z.array(RemittanceLineItemInputSchema).min(1, 'At least one fellow remittance line item is required'),
});

export type PostLedgerEntryInput = z.input<typeof PostLedgerEntrySchema>;
export type AdminAdjustmentEntryInput = z.input<typeof AdminAdjustmentEntrySchema>;
export type IngestPartnerRemittanceInput = z.input<typeof IngestPartnerRemittanceSchema>;
