'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useUser } from '@clerk/nextjs';
import { getMyWalletAction, getMyLedgerEntriesAction } from '@/modules/wallet/actions';
import {
  getMyBankAccountsAction,
  getMyPayoutsAction,
  getSupportedBanksAction,
  linkBankAccountAction,
  requestPayoutAction,
  getMyScheduledDisbursementsAction,
} from '@/modules/payout/actions';
import { FellowWallet, LedgerEntry } from '@/modules/wallet/types';
import { BankAccount, PayoutDisbursement, PaystackBank, PayoutSchedule } from '@/modules/payout/types';

export default function FellowWalletPage() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<FellowWallet | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [payouts, setPayouts] = useState<PayoutDisbursement[]>([]);
  const [schedules, setSchedules] = useState<PayoutSchedule[]>([]);
  const [supportedBanks, setSupportedBanks] = useState<PaystackBank[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal visibility states
  const [showLinkBankModal, setShowLinkBankModal] = useState(false);
  const [showRequestPayoutModal, setShowRequestPayoutModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [bankForm, setBankForm] = useState({
    bankCode: '',
    bankName: '',
    accountNumber: '',
  });

  const [payoutForm, setPayoutForm] = useState({
    bankAccountId: '',
    amount: 100,
  });

  useEffect(() => {
    loadData();
  }, [user, isLoaded]);

  async function loadData() {
    if (!isLoaded || !user) return;
    try {
      setLoading(true);
      const [walletRes, entriesRes, banksRes, payoutsRes, supportedBanksRes, schedulesRes] = await Promise.all([
        getMyWalletAction(),
        getMyLedgerEntriesAction(),
        getMyBankAccountsAction(),
        getMyPayoutsAction(),
        getSupportedBanksAction(),
        getMyScheduledDisbursementsAction(),
      ]);

      if (walletRes.success && walletRes.wallet) {
        setWallet(walletRes.wallet);
      }
      if (entriesRes.success && entriesRes.entries) {
        setEntries(entriesRes.entries);
      }
      if (banksRes.success && banksRes.bankAccounts) {
        setBankAccounts(banksRes.bankAccounts);
        if (banksRes.bankAccounts.length > 0) {
          const defaultAcc = banksRes.bankAccounts.find((b) => b.isDefault) || banksRes.bankAccounts[0];
          setPayoutForm((prev) => ({ ...prev, bankAccountId: defaultAcc.id }));
        }
      }
      if (payoutsRes.success && payoutsRes.payouts) {
        setPayouts(payoutsRes.payouts);
      }
      if (schedulesRes.success && schedulesRes.schedules) {
        setSchedules(schedulesRes.schedules);
      }
      if (supportedBanksRes.success && supportedBanksRes.banks) {
        setSupportedBanks(supportedBanksRes.banks);
        if (supportedBanksRes.banks.length > 0) {
          setBankForm((prev) => ({
            ...prev,
            bankCode: supportedBanksRes.banks![0].code,
            bankName: supportedBanksRes.banks![0].name,
          }));
        }
      }
    } catch (err: any) {
      console.error('Failed to load wallet data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleLinkBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedBank = supportedBanks.find((b) => b.code === bankForm.bankCode);
      const bankName = selectedBank ? selectedBank.name : bankForm.bankName;

      const res = await linkBankAccountAction({
        bankCode: bankForm.bankCode,
        bankName,
        accountNumber: bankForm.accountNumber,
      });

      if (res.success && res.bankAccount) {
        setNotification({
          type: 'success',
          message: `Bank Account (${res.bankAccount.accountName} - ${res.bankAccount.bankName}) successfully validated and linked via Paystack!`,
        });
        setShowLinkBankModal(false);
        setBankForm({ bankCode: supportedBanks[0]?.code || '', bankName: supportedBanks[0]?.name || '', accountNumber: '' });
        loadData();
      } else {
        setNotification({ type: 'error', message: res.error || 'Failed to validate bank account' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error linking bank account' });
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;

    if (payoutForm.amount > wallet.availableBalance) {
      setNotification({ type: 'error', message: `Insufficient funds: Requested $${payoutForm.amount}, but available balance is $${wallet.availableBalance}` });
      return;
    }

    try {
      const res = await requestPayoutAction({
        bankAccountId: payoutForm.bankAccountId,
        amount: Number(payoutForm.amount),
      });

      if (res.success && res.disbursement) {
        setNotification({
          type: 'success',
          message: `Payout disbursement of $${res.disbursement.amount} initiated via Paystack Transfer API! Reference: ${res.disbursement.paystackReference}`,
        });
        setShowRequestPayoutModal(false);
        loadData();
      } else {
        setNotification({ type: 'error', message: res.error || 'Payout transfer failed' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error executing payout transfer' });
    }
  };

  const filteredEntries = entries.filter((e) => {
    if (categoryFilter === 'all') return true;
    return e.category === categoryFilter;
  });

  return (
    <div className="min-h-screen bg-[var(--qh-bg)] text-[var(--qh-ink)] flex flex-col font-[family-name:var(--font-poppins)]">
      <AppHeader
        title="Fellow Wallet & Payout Disbursement Portal"
        subtitle="Double-entry transaction audit log, micro-stipend earnings, and local bank payouts via Paystack"
        badge={{ label: 'Phase 2 Service 19', variant: 'accent' }}
        backLink={{ href: '/bench', label: '← Bench Portal' }}
      />

      <main className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 space-y-8">
        {notification && (
          <div
            className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="font-bold text-xs uppercase ml-4">
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-xs text-[var(--qh-slate-600)] space-x-2 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-t-[var(--qh-accent-main)] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
            <span>Loading fellow wallet balance & payout history...</span>
          </div>
        ) : !wallet ? (
          <div className="p-12 text-center bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] max-w-xl mx-auto space-y-4 shadow-sm">
            <h2 className="text-xl font-bold text-[var(--qh-ink)]">Wallet Not Initialized</h2>
            <p className="text-xs text-[var(--qh-slate-600)]">
              Your identity profile has not yet been linked to an active fellow wallet.
            </p>
          </div>
        ) : (
          <>
            {/* Wallet Balance Metrics & Actions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-6 bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] shadow-sm space-y-3">
                <span className="text-[10px] font-bold text-[var(--qh-slate-600)] uppercase tracking-wider block">
                  Available Payout Balance
                </span>
                <div className="text-3xl font-extrabold text-emerald-600">
                  ${wallet.availableBalance.toLocaleString()}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRequestPayoutModal(true)}
                    disabled={wallet.availableBalance <= 0 || bankAccounts.length === 0}
                    className="w-full py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
                  >
                    Request Payout
                  </button>
                </div>
              </div>

              <div className="p-6 bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-[var(--qh-slate-600)] uppercase tracking-wider block">
                  Pending Balance
                </span>
                <div className="text-3xl font-extrabold text-amber-600">
                  ${wallet.pendingBalance.toLocaleString()}
                </div>
                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full inline-block font-semibold">
                  Awaiting Milestone Verification
                </span>
              </div>

              <div className="p-6 bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-[var(--qh-slate-600)] uppercase tracking-wider block">
                  Total Lifetime Earned
                </span>
                <div className="text-3xl font-extrabold text-[var(--qh-ink)]">
                  ${wallet.totalLifetimeEarned.toLocaleString()}
                </div>
                <span className="text-[10px] text-[var(--qh-slate-600)] block font-medium">
                  Cumulative Stipends & Bonuses
                </span>
              </div>

              <div className="p-6 bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] shadow-sm space-y-3">
                <span className="text-[10px] font-bold text-[var(--qh-slate-600)] uppercase tracking-wider block">
                  Linked Payout Bank Accounts
                </span>
                <div className="text-xl font-bold text-[var(--qh-ink)]">
                  {bankAccounts.length} Linked
                </div>
                <button
                  onClick={() => setShowLinkBankModal(true)}
                  className="w-full py-2 bg-[var(--qh-accent-main)] text-white text-xs font-bold rounded-xl hover:opacity-90 shadow-sm"
                >
                  + Link Bank Account
                </button>
              </div>
            </div>

            {/* Upcoming Scheduled Disbursements Section */}
            {schedules.length > 0 && (
              <div className="bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--qh-border)] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--qh-ink)]">Upcoming Scheduled Stipend Disbursements</h3>
                    <p className="text-xs text-[var(--qh-slate-600)]">
                      Automated recurring disbursements scheduled by QwantomHub ops
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 uppercase">
                    Active Schedule
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {schedules.map((s) => (
                    <div key={s.id} className="p-4 bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-[var(--qh-ink)]">{s.title}</div>
                        <div className="text-[11px] text-[var(--qh-slate-600)]">
                          Frequency: <span className="font-semibold capitalize text-[var(--qh-ink)]">{s.frequency}</span>
                        </div>
                        <div className="text-[10px] text-emerald-600 font-mono font-bold">
                          Next Disbursement: {new Date(s.nextRunAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-extrabold text-[var(--qh-ink)] font-mono">
                          ${s.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Bank Accounts Roster */}
            <div className="bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--qh-border)] pb-3">
                <h3 className="text-sm font-bold text-[var(--qh-ink)]">Validated Paystack Bank Accounts</h3>
                <span className="text-xs text-[var(--qh-slate-600)]">NUBAN verified for direct transfers</span>
              </div>

              {bankAccounts.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--qh-slate-600)] italic">
                  No bank accounts linked yet. Click "+ Link Bank Account" to validate your local NUBAN account.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bankAccounts.map((b) => (
                    <div key={b.id} className="p-4 bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-[var(--qh-ink)]">{b.accountName}</div>
                        <div className="text-[11px] text-[var(--qh-slate-600)] font-medium">
                          {b.bankName} — <span className="font-mono font-bold text-[var(--qh-ink)]">{b.accountNumber}</span>
                        </div>
                        <div className="text-[10px] text-emerald-600 font-mono">
                          Recipient Code: {b.recipientCode}
                        </div>
                      </div>
                      {b.isDefault && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full uppercase">
                          Default
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ledger Activity Stream */}
            <div className="bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--qh-border)] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[var(--qh-ink)]">Immutable Double-Entry Ledger Log</h3>
                  <p className="text-xs text-[var(--qh-slate-600)]">
                    Audit trail of all stipend credits, adjustments, and payout debits
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--qh-slate-600)] font-medium">Filter Category:</span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-[var(--qh-bg)] text-xs border border-[var(--qh-border)] rounded-lg px-3 py-1.5 font-medium text-[var(--qh-ink)] focus:outline-none"
                  >
                    <option value="all">All Categories</option>
                    <option value="sme_stipend_credit">SME Stipend Credit</option>
                    <option value="bootcamp_stipend_credit">Bootcamp Stipend Credit</option>
                    <option value="bonus_credit">Bonus Credit</option>
                    <option value="disbursement_debit">Disbursement Debit</option>
                    <option value="adjustment_credit">Adjustment Credit</option>
                  </select>
                </div>
              </div>

              {filteredEntries.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--qh-slate-600)] italic">
                  No ledger entries recorded matching the selected filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--qh-border)] text-[var(--qh-slate-600)] uppercase font-semibold text-[10px]">
                        <th className="py-3 px-4">Posted Date</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4 text-right">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--qh-border)]">
                      {filteredEntries.map((entry) => {
                        const isCredit = entry.entryType === 'credit';
                        return (
                          <tr key={entry.id} className="hover:bg-[var(--qh-bg)]/50 transition-colors">
                            <td className="py-3 px-4 font-mono text-[var(--qh-slate-600)]">
                              {new Date(entry.postedAt).toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  isCredit ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                                }`}
                              >
                                {entry.entryType}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-[var(--qh-ink)]">
                              {entry.category.replace(/_/g, ' ')}
                            </td>
                            <td className="py-3 px-4 text-[var(--qh-slate-600)] max-w-xs truncate">
                              {entry.description}
                            </td>
                            <td className={`py-3 px-4 text-right font-bold ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isCredit ? '+' : '-'}${entry.amount.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-[var(--qh-ink)]">
                              ${entry.runningBalance.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Link Bank Account Modal */}
      {showLinkBankModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--qh-surface-card)] border border-[var(--qh-border)] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--qh-border)] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--qh-ink)]">
                  Link & Validate Local Bank Account
                </h3>
                <p className="text-[11px] text-[var(--qh-slate-600)]">
                  Instant Paystack NUBAN Account Name Resolution
                </p>
              </div>
              <button
                onClick={() => setShowLinkBankModal(false)}
                className="text-xs font-bold text-[var(--qh-slate-600)] hover:text-[var(--qh-ink)] uppercase"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleLinkBankAccount} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[var(--qh-slate-600)] mb-1">Select Bank</label>
                <select
                  required
                  value={bankForm.bankCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    const b = supportedBanks.find((x) => x.code === code);
                    setBankForm({ ...bankForm, bankCode: code, bankName: b ? b.name : '' });
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                >
                  {supportedBanks.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--qh-slate-600)] mb-1">NUBAN Account Number</label>
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  placeholder="e.g. 0123456789"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)] font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--qh-border)]">
                <button
                  type="button"
                  onClick={() => setShowLinkBankModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--qh-slate-600)] hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90 shadow-sm"
                >
                  Validate & Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Payout Modal */}
      {showRequestPayoutModal && wallet && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--qh-surface-card)] border border-[var(--qh-border)] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--qh-border)] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--qh-ink)]">
                  Request Micro-Stipend Payout
                </h3>
                <p className="text-[11px] text-[var(--qh-slate-600)]">
                  Direct NGN bank transfer via Paystack Transfer API
                </p>
              </div>
              <button
                onClick={() => setShowRequestPayoutModal(false)}
                className="text-xs font-bold text-[var(--qh-slate-600)] hover:text-[var(--qh-ink)] uppercase"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleRequestPayout} className="space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] flex justify-between items-center">
                <span className="text-emerald-800 font-semibold">Available Balance:</span>
                <span className="font-bold text-emerald-900 font-mono text-sm">${wallet.availableBalance}</span>
              </div>

              <div>
                <label className="block font-semibold text-[var(--qh-slate-600)] mb-1">Select Bank Account</label>
                <select
                  required
                  value={payoutForm.bankAccountId}
                  onChange={(e) => setPayoutForm({ ...payoutForm, bankAccountId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} ({b.accountNumber}) — {b.accountName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--qh-slate-600)] mb-1">Payout Amount ($)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={wallet.availableBalance}
                  value={payoutForm.amount}
                  onChange={(e) => setPayoutForm({ ...payoutForm, amount: Number(e.target.value) })}
                  placeholder="e.g. 100"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--qh-border)]">
                <button
                  type="button"
                  onClick={() => setShowRequestPayoutModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--qh-slate-600)] hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 shadow-sm"
                >
                  Transfer Payout Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
