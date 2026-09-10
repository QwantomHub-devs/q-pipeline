'use server';

import { auth } from '@clerk/nextjs/server';
import { getFellowProfileByClerkId } from '../identity/service';
import {
  getOrCreateWallet,
  postLedgerEntry,
  adminPostAdjustmentEntry,
  reconcileWalletLedger,
  listFellowLedgerEntries,
  listAllWalletsForAdmin,
  ingestPartnerRemittance,
  listPartnerRemittancesForAdmin,
} from './wallet-service';
import {
  FellowWallet,
  LedgerEntry,
  WalletReconciliationResult,
  PostLedgerEntryInput,
  AdminAdjustmentEntryInput,
  IngestPartnerRemittanceInput,
  PartnerRemittance,
  RemittanceLineItem,
  RemittanceIngestionResult,
  LedgerCategory,
} from './types';
import { AuthActor } from '../identity/types';

/**
 * Server Action: Retrieve authenticated fellow wallet & balance overview (Rule 5 check)
 */
export async function getMyWalletAction(): Promise<{
  success: boolean;
  wallet?: FellowWallet;
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

    const wallet = await getOrCreateWallet(requestingUser, profile.id);
    return { success: true, wallet };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch wallet overview' };
  }
}

/**
 * Server Action: Fetch authenticated fellow ledger transaction history (Rule 5 check)
 */
export async function getMyLedgerEntriesAction(categoryFilter?: LedgerCategory): Promise<{
  success: boolean;
  entries?: LedgerEntry[];
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

    const entries = await listFellowLedgerEntries(requestingUser, profile.id, {
      category: categoryFilter,
    });
    return { success: true, entries };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch ledger transactions' };
  }
}

/**
 * Server Action: Admin list system-wide wallets & reconciliation audit (Admin only)
 */
export async function adminReconcileWalletsAction(): Promise<{
  success: boolean;
  wallets?: Array<FellowWallet & { reconciliation: WalletReconciliationResult }>;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const adminUser: AuthActor = { clerkUserId: userId, roles: ['admin'] };
    const wallets = await listAllWalletsForAdmin(adminUser);
    return { success: true, wallets };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reconcile wallets' };
  }
}

/**
 * Server Action: Admin post manual adjustment ledger entry (Admin only)
 */
export async function adminPostAdjustmentAction(input: AdminAdjustmentEntryInput): Promise<{
  success: boolean;
  wallet?: FellowWallet;
  entry?: LedgerEntry;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const adminUser: AuthActor = { clerkUserId: userId, roles: ['admin'] };
    const result = await adminPostAdjustmentEntry(adminUser, input);
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to post manual adjustment' };
  }
}

/**
 * Server Action: Admin ingest partner wire remittance breakdown (Admin only)
 */
export async function adminIngestPartnerRemittanceAction(
  input: IngestPartnerRemittanceInput
): Promise<{
  success: boolean;
  result?: RemittanceIngestionResult;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const adminUser: AuthActor = { clerkUserId: userId, roles: ['admin'] };
    const result = await ingestPartnerRemittance(adminUser, input);
    return { success: true, result };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to ingest partner wire remittance' };
  }
}

/**
 * Server Action: Admin list partner wire remittances (Admin only)
 */
export async function adminListPartnerRemittancesAction(): Promise<{
  success: boolean;
  remittances?: Array<PartnerRemittance & { lineItems: RemittanceLineItem[] }>;
  error?: string;
}> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: 'Unauthorized: Authentication required' };
    }

    const adminUser: AuthActor = { clerkUserId: userId, roles: ['admin'] };
    const remittances = await listPartnerRemittancesForAdmin(adminUser);
    return { success: true, remittances };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch partner remittances' };
  }
}

