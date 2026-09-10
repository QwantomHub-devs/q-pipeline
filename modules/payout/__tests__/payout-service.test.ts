import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import {
  linkBankAccount,
  requestPayout,
  listFellowBankAccounts,
  listFellowPayouts,
  processPaystackWebhookEvent,
  _resetPayoutStoreForTesting,
} from '../payout-service';
import { postLedgerEntry, getOrCreateWallet, _resetWalletStoreForTesting } from '@/modules/wallet/wallet-service';
import { AuthActor } from '@/modules/identity/types';
import * as authLib from '@/lib/auth';

// Mock audit service
vi.mock('../../audit/service', () => ({
  logAuditEvent: vi.fn().mockResolvedValue({}),
}));

describe('Service 19: Fellow Payout / Disbursement (Paystack API Integration)', () => {
  const fellowProfileId = '550e8400-e29b-41d4-a716-446655440000';
  const fellowProfileIdB = '660e8400-e29b-41d4-a716-446655440001';
  const ownerUser: AuthActor = { clerkUserId: 'clerk_user_fellow_1', roles: ['fellow'] };
  const ownerUserB: AuthActor = { clerkUserId: 'clerk_user_fellow_2', roles: ['fellow'] };
  const attackerUser: AuthActor = { clerkUserId: 'clerk_user_attacker', roles: ['fellow'] };
  const adminUser: AuthActor = { clerkUserId: 'clerk_admin', roles: ['admin'] };

  beforeEach(() => {
    _resetPayoutStoreForTesting();
    _resetWalletStoreForTesting();
    vi.restoreAllMocks();
  });

  describe('Bank Account Validation & Linking', () => {
    it('resolves bank account and creates Paystack transfer recipient when account name matches fellow identity', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      const bankAccount = await linkBankAccount(ownerUser, {
        fellowProfileId,
        bankCode: '058',
        bankName: 'Guaranty Trust Bank',
        accountNumber: '0123456789',
      });

      expect(bankAccount.id).toBeDefined();
      expect(bankAccount.accountName).toBe('ADA LOVELACE');
      expect(bankAccount.recipientCode).toMatch(/^RCP_/);
      expect(bankAccount.isDefault).toBe(true);
    });

    it('Anti-Fraud Security: blocks linking bank account if resolved holder name does not match registered fellow name', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      await expect(
        linkBankAccount(ownerUser, {
          fellowProfileId,
          bankCode: '058',
          bankName: 'Guaranty Trust Bank',
          accountNumber: '9999999999', // Triggers mock resolution returning 'UNAUTHORIZED THIRD PARTY HOLDER'
        })
      ).rejects.toThrow(/Fraud protection security alert/);
    });

    it('Rule 5 Security: blocks unauthorized fellow from linking bank account for another fellow', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async (actor) => {
        if (actor.clerkUserId !== 'clerk_user_fellow_1') {
          throw new Error('Unauthorized access: actor cannot access record of fellow');
        }
      });

      await expect(
        linkBankAccount(attackerUser, {
          fellowProfileId,
          bankCode: '058',
          bankName: 'Guaranty Trust Bank',
          accountNumber: '0123456789',
        })
      ).rejects.toThrow(/unauthorized/i);
    });

  });

  describe('Payout Request & Double-Entry Ledger Debiting', () => {
    it('executes payout transfer, debits fellow wallet in Service 18, and records Paystack reference', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      // Fund fellow wallet with $500 stipend
      await postLedgerEntry(adminUser, {
        fellowProfileId,
        entryType: 'credit',
        category: 'sme_stipend_credit',
        amount: 500,
        description: 'SME Build Stipend',
      });

      const bankAccount = await linkBankAccount(ownerUser, {
        fellowProfileId,
        bankCode: '058',
        bankName: 'Guaranty Trust Bank',
        accountNumber: '0123456789',
      });

      const disbursement = await requestPayout(ownerUser, {
        fellowProfileId,
        bankAccountId: bankAccount.id,
        amount: 200,
      });

      expect(disbursement.id).toBeDefined();
      expect(disbursement.amount).toBe(200);
      expect(disbursement.status).toBe('success');
      expect(disbursement.paystackReference).toMatch(/^PAYOUT-/);

      // Verify wallet balance debited to $300
      const wallet = await getOrCreateWallet(ownerUser, fellowProfileId);
      expect(wallet.availableBalance).toBe(300);
    });

    it('Idempotency Protection: prevents duplicate submission double-payouts and double-debits', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      await postLedgerEntry(adminUser, {
        fellowProfileId,
        entryType: 'credit',
        category: 'sme_stipend_credit',
        amount: 500,
        description: 'Initial stipend',
      });

      const bankAccount = await linkBankAccount(ownerUser, {
        fellowProfileId,
        bankCode: '058',
        bankName: 'Guaranty Trust Bank',
        accountNumber: '0123456789',
      });

      const idempotencyKey = 'IDEM-PAYOUT-KEY-999';

      // First payout request
      const disbursement1 = await requestPayout(ownerUser, {
        fellowProfileId,
        bankAccountId: bankAccount.id,
        amount: 150,
        idempotencyKey,
      });

      // Second identical payout request with same idempotencyKey
      const disbursement2 = await requestPayout(ownerUser, {
        fellowProfileId,
        bankAccountId: bankAccount.id,
        amount: 150,
        idempotencyKey,
      });

      expect(disbursement1.id).toBe(disbursement2.id);

      // Wallet should only be debited ONCE ($500 - $150 = $350)
      const wallet = await getOrCreateWallet(ownerUser, fellowProfileId);
      expect(wallet.availableBalance).toBe(350);
    });

    it('Overdraft Protection: blocks payout request exceeding available balance', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      // Fund wallet with $100
      await postLedgerEntry(adminUser, {
        fellowProfileId,
        entryType: 'credit',
        category: 'sme_stipend_credit',
        amount: 100,
        description: 'Initial stipend',
      });

      const bankAccount = await linkBankAccount(ownerUser, {
        fellowProfileId,
        bankCode: '058',
        bankName: 'Guaranty Trust Bank',
        accountNumber: '0123456789',
      });

      await expect(
        requestPayout(ownerUser, {
          fellowProfileId,
          bankAccountId: bankAccount.id,
          amount: 250, // Exceeds $100 balance
        })
      ).rejects.toThrow(/Insufficient funds/);
    });

    it('Gateway Error Auto-Refund: refunds fellow wallet if transfer gateway fails', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      await postLedgerEntry(adminUser, {
        fellowProfileId,
        entryType: 'credit',
        category: 'sme_stipend_credit',
        amount: 400,
        description: 'Initial balance',
      });

      const bankAccount = await linkBankAccount(ownerUser, {
        fellowProfileId,
        bankCode: '058',
        bankName: 'Guaranty Trust Bank',
        accountNumber: '0123456789',
      });

      // Pass a custom client that throws a gateway error
      const failingClient: any = {
        resolveBankAccount: vi.fn(),
        createTransferRecipient: vi.fn(),
        initiateTransfer: vi.fn().mockRejectedValue(new Error('Bank network host unreachable')),
      };

      await expect(
        requestPayout(
          ownerUser,
          {
            fellowProfileId,
            bankAccountId: bankAccount.id,
            amount: 150,
          },
          failingClient
        )
      ).rejects.toThrow(/Payout transfer failed/);

      // Wallet balance should remain $400 after auto-refund
      const wallet = await getOrCreateWallet(ownerUser, fellowProfileId);
      expect(wallet.availableBalance).toBe(400);
    });
  });

  describe('Paystack Webhook & Asynchronous Transfer Finalization', () => {
    it('processes transfer.failed webhook callback and automatically refunds fellow wallet', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async () => {});

      await postLedgerEntry(adminUser, {
        fellowProfileId,
        entryType: 'credit',
        category: 'sme_stipend_credit',
        amount: 500,
        description: 'Stipend',
      });

      const bankAccount = await linkBankAccount(ownerUser, {
        fellowProfileId,
        bankCode: '058',
        bankName: 'Guaranty Trust Bank',
        accountNumber: '0123456789',
      });

      const pendingClient: any = {
        resolveBankAccount: vi.fn(),
        createTransferRecipient: vi.fn(),
        initiateTransfer: vi.fn().mockResolvedValue({
          transferCode: 'TRF_PENDING_01',
          reference: 'PAYOUT-WEBHOOK-TEST-01',
          status: 'processing',
          amount: 200,
        }),
      };

      const disbursement = await requestPayout(
        ownerUser,
        {
          fellowProfileId,
          bankAccountId: bankAccount.id,
          amount: 200,
        },
        pendingClient
      );

      // Balance is $300 while processing
      let wallet = await getOrCreateWallet(ownerUser, fellowProfileId);
      expect(wallet.availableBalance).toBe(300);

      // Simulate incoming Paystack transfer.failed webhook callback
      const webhookPayload = JSON.stringify({
        event: 'transfer.failed',
        data: {
          reference: disbursement.paystackReference,
          transfer_code: 'TRF_PENDING_01',
          amount: 20000,
          currency: 'NGN',
          status: 'failed',
          reason: 'Beneficiary account frozen',
        },
      });

      const webhookResult = await processPaystackWebhookEvent(webhookPayload);
      expect(webhookResult.success).toBe(true);

      // Balance is automatically refunded back to $500
      wallet = await getOrCreateWallet(ownerUser, fellowProfileId);
      expect(wallet.availableBalance).toBe(500);
    });
  });

  describe('Rule 5 Security & Explicit Fellow Isolation', () => {
    it('verifies explicit Fellow A vs Fellow B bank accounts and payout history isolation', async () => {
      vi.spyOn(authLib, 'assertCanAccessFellowRecord').mockImplementation(async (actor, fId) => {
        if (actor.clerkUserId === 'clerk_user_fellow_1' && fId !== fellowProfileId) {
          throw new Error('Unauthorized: Fellow A cannot access Fellow B record');
        }
        if (actor.clerkUserId === 'clerk_user_fellow_2' && fId !== fellowProfileIdB) {
          throw new Error('Unauthorized: Fellow B cannot access Fellow A record');
        }
      });

      // Fellow A links bank account
      await linkBankAccount(ownerUser, {
        fellowProfileId,
        bankCode: '058',
        bankName: 'Guaranty Trust Bank',
        accountNumber: '1111111111',
      });

      // Fellow B links bank account
      await linkBankAccount(ownerUserB, {
        fellowProfileId: fellowProfileIdB,
        bankCode: '033',
        bankName: 'UBA',
        accountNumber: '2222222222',
      });

      // Fellow A lists bank accounts
      const banksA = await listFellowBankAccounts(ownerUser, fellowProfileId);
      expect(banksA.length).toBe(1);
      expect(banksA[0].accountNumber).toBe('1111111111');

      // Fellow A attempts to list Fellow B bank accounts (Blocked)
      await expect(listFellowBankAccounts(ownerUser, fellowProfileIdB)).rejects.toThrow(
        /unauthorized/i
      );

      // Fellow B lists bank accounts
      const banksB = await listFellowBankAccounts(ownerUserB, fellowProfileIdB);
      expect(banksB.length).toBe(1);
      expect(banksB[0].accountNumber).toBe('2222222222');

      // Fellow B attempts to list Fellow A bank accounts (Blocked)
      await expect(listFellowBankAccounts(ownerUserB, fellowProfileId)).rejects.toThrow(
        /unauthorized/i
      );
    });
  });
});

