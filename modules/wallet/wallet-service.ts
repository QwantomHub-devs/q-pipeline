import {
  FellowWallet,
  LedgerEntry,
  WalletReconciliationResult,
  PostLedgerEntryInput,
  PostLedgerEntrySchema,
  AdminAdjustmentEntryInput,
  AdminAdjustmentEntrySchema,
  LedgerCategory,
  PartnerRemittance,
  RemittanceLineItem,
  RemittanceIngestionResult,
  IngestPartnerRemittanceInput,
  IngestPartnerRemittanceSchema,
} from './types';
import { AuthActor } from '../identity/types';
import { assertCanAccessFellowRecord, requireRole } from '@/lib/auth';
import { logAuditEvent } from '../audit/service';

// In-memory state store for development & testing
const walletsStore = new Map<string, FellowWallet>();
const ledgerStore = new Map<string, LedgerEntry>();
const partnerRemittancesStore = new Map<string, PartnerRemittance>();
const remittanceLineItemsStore = new Map<string, RemittanceLineItem>();


/**
 * Get or initialize a fellow wallet (Rule 5 record-level access check)
 */
export async function getOrCreateWallet(
  actor: AuthActor,
  fellowProfileId: string
): Promise<FellowWallet> {
  await assertCanAccessFellowRecord(actor, fellowProfileId);

  // Check if wallet exists
  for (const wallet of walletsStore.values()) {
    if (wallet.fellowProfileId === fellowProfileId) {
      return wallet;
    }
  }

  // Create new active wallet
  const walletId = crypto.randomUUID();
  const now = new Date().toISOString();

  const newWallet: FellowWallet = {
    id: walletId,
    fellowProfileId,
    currency: 'USD',
    availableBalance: 0,
    pendingBalance: 0,
    totalLifetimeEarned: 0,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  walletsStore.set(walletId, newWallet);
  return newWallet;
}

/**
 * Post an immutable ledger entry (credit or debit) with double-entry reconciliation checks
 */
export async function postLedgerEntry(
  actor: AuthActor,
  rawInput: PostLedgerEntryInput
): Promise<{ wallet: FellowWallet; entry: LedgerEntry }> {
  const input = PostLedgerEntrySchema.parse(rawInput);
  await assertCanAccessFellowRecord(actor, input.fellowProfileId);

  const wallet = await getOrCreateWallet(actor, input.fellowProfileId);

  if (wallet.status === 'frozen') {
    throw new Error(`Wallet for fellow '${input.fellowProfileId}' is frozen. Cannot post transaction.`);
  }

  // Double-entry check: if debit, verify sufficient available balance
  if (input.entryType === 'debit' && wallet.availableBalance < input.amount) {
    throw new Error(
      `Insufficient funds: Attempted debit of $${input.amount}, but available balance is $${wallet.availableBalance}.`
    );
  }

  const now = new Date().toISOString();
  const entryId = crypto.randomUUID();

  const delta = input.entryType === 'credit' ? input.amount : -input.amount;
  const newAvailableBalance = wallet.availableBalance + delta;
  const newLifetimeEarned =
    input.entryType === 'credit' ? wallet.totalLifetimeEarned + input.amount : wallet.totalLifetimeEarned;

  const entry: LedgerEntry = {
    id: entryId,
    walletId: wallet.id,
    fellowProfileId: input.fellowProfileId,
    entryType: input.entryType,
    category: input.category as LedgerCategory,
    amount: input.amount,
    runningBalance: newAvailableBalance,
    description: input.description,
    referenceId: input.referenceId,
    postedBy: actor.clerkUserId,
    postedAt: now,
  };

  ledgerStore.set(entryId, entry);

  // Update wallet balances
  const updatedWallet: FellowWallet = {
    ...wallet,
    availableBalance: newAvailableBalance,
    totalLifetimeEarned: newLifetimeEarned,
    updatedAt: now,
  };
  walletsStore.set(wallet.id, updatedWallet);

  // Log compliance audit event per Rule 5
  await logAuditEvent({
    actorClerkUserId: actor.clerkUserId,
    action: 'WALLET_LEDGER_ENTRY_POSTED',
    targetType: 'fellow_wallet',
    targetId: wallet.id,
    metadata: {
      fellowProfileId: input.fellowProfileId,
      entryType: input.entryType,
      category: input.category,
      amount: input.amount,
      runningBalance: newAvailableBalance,
    },
  });

  return { wallet: updatedWallet, entry };
}

/**
 * Admin post manual adjustment ledger entry
 */
export async function adminPostAdjustmentEntry(
  actor: AuthActor,
  rawInput: AdminAdjustmentEntryInput
): Promise<{ wallet: FellowWallet; entry: LedgerEntry }> {
  requireRole(actor, 'admin');
  const input = AdminAdjustmentEntrySchema.parse(rawInput);

  const category: LedgerCategory = input.entryType === 'credit' ? 'adjustment_credit' : 'fee_debit';

  return postLedgerEntry(actor, {
    fellowProfileId: input.fellowProfileId,
    entryType: input.entryType,
    category,
    amount: input.amount,
    description: `Admin Manual Adjustment: ${input.reason}`,
    referenceId: input.referenceId,
  });
}

/**
 * Reconcile wallet available balance against immutable ledger sum
 */
export async function reconcileWalletLedger(
  actor: AuthActor,
  walletId: string
): Promise<WalletReconciliationResult> {
  let wallet: FellowWallet | undefined;
  for (const w of walletsStore.values()) {
    if (w.id === walletId || w.fellowProfileId === walletId) {
      wallet = w;
      break;
    }
  }

  if (!wallet) {
    throw new Error(`Wallet with ID '${walletId}' not found.`);
  }

  await assertCanAccessFellowRecord(actor, wallet.fellowProfileId);

  let sumCredits = 0;
  let sumDebits = 0;

  for (const entry of ledgerStore.values()) {
    if (entry.walletId === wallet.id || entry.fellowProfileId === wallet.fellowProfileId) {
      if (entry.entryType === 'credit') {
        sumCredits += entry.amount;
      } else {
        sumDebits += entry.amount;
      }
    }
  }

  const calculatedBalance = sumCredits - sumDebits;
  const isReconciled = calculatedBalance === wallet.availableBalance;
  const discrepancy = wallet.availableBalance - calculatedBalance;

  return {
    walletId: wallet.id,
    fellowProfileId: wallet.fellowProfileId,
    availableBalance: wallet.availableBalance,
    sumCredits,
    sumDebits,
    calculatedBalance,
    isReconciled,
    discrepancy,
  };
}

/**
 * Fetch fellow ledger entry history with authorization check (Rule 5)
 */
export async function listFellowLedgerEntries(
  actor: AuthActor,
  fellowProfileId: string,
  options?: { category?: LedgerCategory }
): Promise<LedgerEntry[]> {
  await assertCanAccessFellowRecord(actor, fellowProfileId);

  let entries = Array.from(ledgerStore.values()).filter(
    (e) => e.fellowProfileId === fellowProfileId
  );

  if (options?.category) {
    entries = entries.filter((e) => e.category === options.category);
  }

  return entries.sort((a, b) => b.postedAt.localeCompare(a.postedAt));
}

/**
 * List all fellow wallets for Admin Ledger Governance Console
 */
export async function listAllWalletsForAdmin(
  actor: AuthActor
): Promise<Array<FellowWallet & { reconciliation: WalletReconciliationResult }>> {
  requireRole(actor, 'admin');

  const result: Array<FellowWallet & { reconciliation: WalletReconciliationResult }> = [];

  for (const wallet of walletsStore.values()) {
    const reconciliation = await reconcileWalletLedger(actor, wallet.id);
    result.push({
      ...wallet,
      reconciliation,
    });
  }

  return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Admin Partner Wire Remittance Breakdown Ingestion & Reconciliation Matching Engine
 * Matches bank wire remittance line items against fellow placements, calculates withholding tax,
 * and automatically posts net credits to target fellow wallets.
 */
export async function ingestPartnerRemittance(
  actor: AuthActor,
  rawInput: IngestPartnerRemittanceInput
): Promise<RemittanceIngestionResult> {
  requireRole(actor, 'admin');
  const input = IngestPartnerRemittanceSchema.parse(rawInput);

  // Check duplicate bank wire reference
  for (const existing of partnerRemittancesStore.values()) {
    if (existing.bankReference.toUpperCase() === input.bankReference.toUpperCase()) {
      throw new Error(`Partner wire remittance with reference code '${input.bankReference}' has already been processed.`);
    }
  }

  // Calculate gross sum and verify total amount match
  const lineItemGrossTotal = input.lineItems.reduce((acc, item) => acc + item.grossAmount, 0);
  if (lineItemGrossTotal !== input.totalAmount) {
    throw new Error(
      `Remittance total mismatch: Bank wire total is $${input.totalAmount}, but line items sum to $${lineItemGrossTotal}.`
    );
  }

  const now = new Date().toISOString();
  const remittanceId = crypto.randomUUID();

  const withholdingRateDecimal = (input.withholdingTaxRatePercent ?? 5) / 100;
  let totalWithholdingTax = 0;
  let totalNetCredited = 0;
  let matchedPlacementsCount = 0;

  const processedLineItems: RemittanceLineItem[] = [];

  for (const item of input.lineItems) {
    const withholdingTax = Math.round(item.grossAmount * withholdingRateDecimal);
    const netAmount = item.grossAmount - withholdingTax;
    totalWithholdingTax += withholdingTax;
    totalNetCredited += netAmount;

    if (item.placementId) {
      matchedPlacementsCount += 1;
    }

    // Post net credit to target fellow wallet
    const { entry } = await postLedgerEntry(actor, {
      fellowProfileId: item.fellowProfileId,
      entryType: 'credit',
      category: 'bootcamp_stipend_credit',
      amount: netAmount,
      description: `Partner Wire Remittance (${input.partnerName}, Ref: ${input.bankReference}, Gross: $${item.grossAmount}, WHT ${input.withholdingTaxRatePercent}%: -$${withholdingTax})`,
      referenceId: item.placementId || remittanceId,
    });

    const lineItemId = crypto.randomUUID();
    const lineItemRecord: RemittanceLineItem = {
      id: lineItemId,
      remittanceId,
      fellowProfileId: item.fellowProfileId,
      placementId: item.placementId,
      grossAmount: item.grossAmount,
      withholdingTax,
      netAmount,
      matchedStatus: 'matched',
      postedLedgerEntryId: entry.id,
      createdAt: now,
    };

    remittanceLineItemsStore.set(lineItemId, lineItemRecord);
    processedLineItems.push(lineItemRecord);
  }

  const remittanceRecord: PartnerRemittance = {
    id: remittanceId,
    partnerName: input.partnerName,
    bankReference: input.bankReference,
    totalAmount: input.totalAmount,
    currency: 'USD',
    remittanceDate: now,
    status: 'processed',
    createdAdminUserId: actor.clerkUserId,
    createdAt: now,
  };

  partnerRemittancesStore.set(remittanceId, remittanceRecord);

  await logAuditEvent({
    actorClerkUserId: actor.clerkUserId,
    action: 'PARTNER_REMITTANCE_INGESTED',
    targetType: 'partner_remittance',
    targetId: remittanceId,
    metadata: {
      partnerName: input.partnerName,
      bankReference: input.bankReference,
      totalAmount: input.totalAmount,
      totalNetCredited,
      totalWithholdingTax,
      lineItemsCount: input.lineItems.length,
    },
  });

  return {
    remittance: remittanceRecord,
    lineItems: processedLineItems,
    totalGrossProcessed: input.totalAmount,
    totalWithholdingTax,
    totalNetCredited,
    matchedPlacementsCount,
  };
}

/**
 * List all partner wire remittances for admin console audit
 */
export async function listPartnerRemittancesForAdmin(
  actor: AuthActor
): Promise<Array<PartnerRemittance & { lineItems: RemittanceLineItem[] }>> {
  requireRole(actor, 'admin');

  const result: Array<PartnerRemittance & { lineItems: RemittanceLineItem[] }> = [];

  for (const rem of partnerRemittancesStore.values()) {
    const lineItems = Array.from(remittanceLineItemsStore.values()).filter(
      (l) => l.remittanceId === rem.id
    );
    result.push({
      ...rem,
      lineItems,
    });
  }

  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Reset state for testing
 */
export function _resetWalletStoreForTesting(): void {
  walletsStore.clear();
  ledgerStore.clear();
  partnerRemittancesStore.clear();
  remittanceLineItemsStore.clear();
}
