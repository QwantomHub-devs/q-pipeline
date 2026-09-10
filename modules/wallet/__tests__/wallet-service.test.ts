import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getOrCreateWallet,
  postLedgerEntry,
  adminPostAdjustmentEntry,
  reconcileWalletLedger,
  listFellowLedgerEntries,
  ingestPartnerRemittance,
  listPartnerRemittancesForAdmin,
  _resetWalletStoreForTesting,
} from '../wallet-service';
import { completeBenchAssignment, addToBench, assignBenchFellowToProject } from '@/modules/bench/bench-service';
import { AuthActor } from '@/modules/identity/types';
import * as authLib from '@/lib/auth';

// Mock dependencies
vi.mock('../../audit/service', () => ({
  logAuditEvent: vi.fn().mockResolvedValue({}),
}));

describe('Service 18: Wallet & Internal Ledger Reconciliation', () => {
  const fellowProfileId = '550e8400-e29b-41d4-a716-446655440000';
  const fellowProfileIdB = '660e8400-e29b-41d4-a716-446655440001';
  const ownerUser: AuthActor = { clerkUserId: 'clerk_user_fellow_1', roles: ['fellow'] };
  const ownerUserB: AuthActor = { clerkUserId: 'clerk_user_fellow_2', roles: ['fellow'] };
  const attackerUser: AuthActor = { clerkUserId: 'clerk_user_attacker', roles: ['fellow'] };
  const adminUser: AuthActor = { clerkUserId: 'clerk_admin', roles: ['admin'] };

  beforeEach(() => {
    _resetWalletStoreForTesting();
    vi.restoreAllMocks();
  });

  describe('Wallet Initialization & Access Controls', () => {
    it('initializes a new fellow wallet with zero balance', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      const wallet = await getOrCreateWallet(ownerUser, fellowProfileId);

      expect(wallet.id).toBeDefined();
      expect(wallet.fellowProfileId).toBe(fellowProfileId);
      expect(wallet.availableBalance).toBe(0);
      expect(wallet.status).toBe('active');
    });

    it('Rule 5 Security: blocks an unauthorized fellow from querying another fellow wallet', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async (actor) => {
        if (actor.clerkUserId !== 'clerk_user_fellow_1') {
          throw new Error('Unauthorized access: actor cannot access record of fellow');
        }
      });

      await expect(getOrCreateWallet(attackerUser, fellowProfileId)).rejects.toThrow(
        /Unauthorized access/
      );
    });

    it('Rule 5 Security: verifies explicit Fellow A vs Fellow B wallet & ledger isolation', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async (actor, fId) => {
        if (actor.clerkUserId === 'clerk_user_fellow_1' && fId !== fellowProfileId) {
          throw new Error('Unauthorized: Fellow A cannot access Fellow B record');
        }
        if (actor.clerkUserId === 'clerk_user_fellow_2' && fId !== fellowProfileIdB) {
          throw new Error('Unauthorized: Fellow B cannot access Fellow A record');
        }
      });

      // Initialize wallets for both fellows
      await getOrCreateWallet(ownerUser, fellowProfileId);
      await getOrCreateWallet(ownerUserB, fellowProfileIdB);

      // Post credit to Fellow A
      await postLedgerEntry(adminUser, {
        fellowProfileId,
        entryType: 'credit',
        category: 'sme_stipend_credit',
        amount: 500,
        description: 'Stipend Fellow A',
      });

      // Post credit to Fellow B
      await postLedgerEntry(adminUser, {
        fellowProfileId: fellowProfileIdB,
        entryType: 'credit',
        category: 'sme_stipend_credit',
        amount: 800,
        description: 'Stipend Fellow B',
      });

      // Fellow A reads their ledger
      const entriesA = await listFellowLedgerEntries(ownerUser, fellowProfileId);
      expect(entriesA.length).toBe(1);
      expect(entriesA[0].amount).toBe(500);

      // Fellow A attempts to read Fellow B ledger (Blocked)
      await expect(listFellowLedgerEntries(ownerUser, fellowProfileIdB)).rejects.toThrow(
        /Unauthorized: Fellow A cannot access Fellow B record/
      );

      // Fellow B reads their ledger
      const entriesB = await listFellowLedgerEntries(ownerUserB, fellowProfileIdB);
      expect(entriesB.length).toBe(1);
      expect(entriesB[0].amount).toBe(800);

      // Fellow B attempts to read Fellow A ledger (Blocked)
      await expect(listFellowLedgerEntries(ownerUserB, fellowProfileId)).rejects.toThrow(
        /Unauthorized: Fellow B cannot access Fellow A record/
      );
    });
  });

  describe('Immutable Double-Entry Ledger Posting', () => {
    it('posts a credit transaction and updates available balance and total lifetime earned', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      const { wallet, entry } = await postLedgerEntry(ownerUser, {
        fellowProfileId,
        entryType: 'credit',
        category: 'sme_stipend_credit',
        amount: 250,
        description: 'SME Build Project Stipend Completion Credit',
        referenceId: 'match-101',
      });

      expect(entry.id).toBeDefined();
      expect(entry.amount).toBe(250);
      expect(entry.runningBalance).toBe(250);
      expect(wallet.availableBalance).toBe(250);
      expect(wallet.totalLifetimeEarned).toBe(250);
    });

    it('blocks debit transaction if available balance is insufficient (overdraft protection)', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      // First credit $100
      await postLedgerEntry(ownerUser, {
        fellowProfileId,
        entryType: 'credit',
        category: 'sme_stipend_credit',
        amount: 100,
        description: 'Initial credit',
      });

      // Attempt to debit $200 (should fail)
      await expect(
        postLedgerEntry(ownerUser, {
          fellowProfileId,
          entryType: 'debit',
          category: 'disbursement_debit',
          amount: 200,
          description: 'Payout disbursement',
        })
      ).rejects.toThrow(/Insufficient funds/);
    });

    it('executes valid debit transaction and updates running balance correctly', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      await postLedgerEntry(ownerUser, {
        fellowProfileId,
        entryType: 'credit',
        category: 'sme_stipend_credit',
        amount: 500,
        description: 'Stipend credit',
      });

      const { wallet, entry } = await postLedgerEntry(ownerUser, {
        fellowProfileId,
        entryType: 'debit',
        category: 'disbursement_debit',
        amount: 200,
        description: 'Local channel bank payout disbursement',
      });

      expect(entry.runningBalance).toBe(300);
      expect(wallet.availableBalance).toBe(300);
      expect(wallet.totalLifetimeEarned).toBe(500); // Lifetime earned remains unchanged on debits
    });
  });

  describe('Partner Wire Remittance Breakdown Matching Engine', () => {
    it('ingests a partner bank wire remittance, calculates 5% WHT, and credits target fellow wallet net amount', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      const result = await ingestPartnerRemittance(adminUser, {
        partnerName: 'Acme Global Partners',
        bankReference: 'WIRE-2026-0908-100',
        totalAmount: 10000,
        withholdingTaxRatePercent: 5,
        lineItems: [
          {
            fellowProfileId,
            grossAmount: 10000,
            placementId: 'match-placement-88',
          },
        ],
      });

      expect(result.remittance.id).toBeDefined();
      expect(result.totalGrossProcessed).toBe(10000);
      expect(result.totalWithholdingTax).toBe(500); // 5% of $10,000 = $500
      expect(result.totalNetCredited).toBe(9500); // $10,000 - $500 = $9,500

      // Verify fellow wallet balance
      const wallet = await getOrCreateWallet(ownerUser, fellowProfileId);
      expect(wallet.availableBalance).toBe(9500);
      expect(wallet.totalLifetimeEarned).toBe(9500);

      // Verify remittance in audit list
      const remittances = await listPartnerRemittancesForAdmin(adminUser);
      expect(remittances.length).toBe(1);
      expect(remittances[0].partnerName).toBe('Acme Global Partners');
    });

    it('rejects partner remittance if wire total does not match line items gross sum', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      await expect(
        ingestPartnerRemittance(adminUser, {
          partnerName: 'Acme Global Partners',
          bankReference: 'WIRE-2026-MISMATCH',
          totalAmount: 10000,
          withholdingTaxRatePercent: 5,
          lineItems: [
            {
              fellowProfileId,
              grossAmount: 8000, // $8,000 != $10,000 total
            },
          ],
        })
      ).rejects.toThrow(/Remittance total mismatch/);
    });

    it('prevents duplicate processing of bank wire reference code', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      await ingestPartnerRemittance(adminUser, {
        partnerName: 'Acme Global Partners',
        bankReference: 'WIRE-DUP-01',
        totalAmount: 2000,
        withholdingTaxRatePercent: 5,
        lineItems: [
          {
            fellowProfileId,
            grossAmount: 2000,
          },
        ],
      });

      await expect(
        ingestPartnerRemittance(adminUser, {
          partnerName: 'Acme Global Partners',
          bankReference: 'WIRE-DUP-01',
          totalAmount: 2000,
          withholdingTaxRatePercent: 5,
          lineItems: [
            {
              fellowProfileId,
              grossAmount: 2000,
            },
          ],
        })
      ).rejects.toThrow(/already been processed/);
    });
  });

  describe('Service 17 Bench Direct Wallet Integration', () => {
    it('automatically posts a wallet credit when a bench assignment is marked completed', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      await addToBench('clerk_admin', { fellowProfileId });
      const assignment = await assignBenchFellowToProject('clerk_admin', {
        fellowProfileId,
        opportunityId: 'opp-bench-101',
        roleTitle: 'Frontend Engineer',
        stipendAmount: 350,
      });

      await completeBenchAssignment('clerk_admin', {
        matchId: assignment.id,
        stipendEarned: 350,
      });

      const wallet = await getOrCreateWallet(ownerUser, fellowProfileId);
      expect(wallet.availableBalance).toBe(350);

      const entries = await listFellowLedgerEntries(ownerUser, fellowProfileId);
      expect(entries.length).toBe(1);
      expect(entries[0].category).toBe('sme_stipend_credit');
      expect(entries[0].amount).toBe(350);
    });
  });

  describe('Double-Entry Ledger Reconciliation Integrity', () => {
    it('verifies that Sum(Credits) - Sum(Debits) equals available balance', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      // Credit 300
      await postLedgerEntry(ownerUser, {
        fellowProfileId,
        entryType: 'credit',
        category: 'sme_stipend_credit',
        amount: 300,
        description: 'Project 1 credit',
      });

      // Credit 200
      await postLedgerEntry(ownerUser, {
        fellowProfileId,
        entryType: 'credit',
        category: 'bonus_credit',
        amount: 200,
        description: 'Performance bonus',
      });

      // Debit 150
      await postLedgerEntry(ownerUser, {
        fellowProfileId,
        entryType: 'debit',
        category: 'disbursement_debit',
        amount: 150,
        description: 'Payout 1',
      });

      const reconciliation = await reconcileWalletLedger(ownerUser, fellowProfileId);

      expect(reconciliation.sumCredits).toBe(500);
      expect(reconciliation.sumDebits).toBe(150);
      expect(reconciliation.calculatedBalance).toBe(350);
      expect(reconciliation.availableBalance).toBe(350);
      expect(reconciliation.isReconciled).toBe(true);
      expect(reconciliation.discrepancy).toBe(0);
    });
  });

  describe('Admin Manual Adjustment Controls', () => {
    it('allows admin to post manual adjustment entry with compliance logging', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      const { wallet, entry } = await adminPostAdjustmentEntry(adminUser, {
        fellowProfileId,
        entryType: 'credit',
        amount: 150,
        reason: 'Authorized reimbursement for external cloud environment charges',
      });

      expect(entry.category).toBe('adjustment_credit');
      expect(entry.amount).toBe(150);
      expect(wallet.availableBalance).toBe(150);
    });
  });
});

