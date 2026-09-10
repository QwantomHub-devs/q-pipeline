'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import {
  adminReconcileWalletsAction,
  adminPostAdjustmentAction,
  adminIngestPartnerRemittanceAction,
  adminListPartnerRemittancesAction,
} from '@/modules/wallet/actions';
import {
  FellowWallet,
  WalletReconciliationResult,
  PartnerRemittance,
  RemittanceLineItem,
} from '@/modules/wallet/types';

export default function AdminWalletPage() {
  const [wallets, setWallets] = useState<Array<FellowWallet & { reconciliation: WalletReconciliationResult }>>([]);
  const [remittances, setRemittances] = useState<Array<PartnerRemittance & { lineItems: RemittanceLineItem[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showRemittanceModal, setShowRemittanceModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<FellowWallet | null>(null);

  // Clean empty adjustment form state
  const [adjustmentForm, setAdjustmentForm] = useState({
    entryType: 'credit' as 'credit' | 'debit',
    amount: 100,
    reason: '',
  });

  // Partner wire remittance ingestion form state
  const [remittanceForm, setRemittanceForm] = useState({
    partnerName: '',
    bankReference: '',
    totalAmount: 1000,
    withholdingTaxRatePercent: 5,
    fellowProfileId: '',
    placementId: '',
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [walletRes, remRes] = await Promise.all([
        adminReconcileWalletsAction(),
        adminListPartnerRemittancesAction(),
      ]);
      if (walletRes.success && walletRes.wallets) {
        setWallets(walletRes.wallets);
      }
      if (remRes.success && remRes.remittances) {
        setRemittances(remRes.remittances);
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to load wallet & remittance data' });
    } finally {
      setLoading(false);
    }
  };

  const handleIngestRemittance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remittanceForm.fellowProfileId) {
      setNotification({ type: 'error', message: 'Target Fellow Profile ID is required' });
      return;
    }

    try {
      const res = await adminIngestPartnerRemittanceAction({
        partnerName: remittanceForm.partnerName,
        bankReference: remittanceForm.bankReference,
        totalAmount: Number(remittanceForm.totalAmount),
        withholdingTaxRatePercent: Number(remittanceForm.withholdingTaxRatePercent),
        lineItems: [
          {
            fellowProfileId: remittanceForm.fellowProfileId,
            grossAmount: Number(remittanceForm.totalAmount),
            placementId: remittanceForm.placementId || undefined,
          },
        ],
      });

      if (res.success && res.result) {
        setNotification({
          type: 'success',
          message: `Partner Wire Remittance (${remittanceForm.bankReference}) successfully ingested! Net $${res.result.totalNetCredited} credited to fellow wallet ($${res.result.totalWithholdingTax} tax withheld).`,
        });
        setShowRemittanceModal(false);
        setRemittanceForm({
          partnerName: '',
          bankReference: '',
          totalAmount: 1000,
          withholdingTaxRatePercent: 5,
          fellowProfileId: '',
          placementId: '',
        });
        fetchData();
      } else {
        setNotification({ type: 'error', message: res.error || 'Failed to ingest partner wire remittance' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to ingest remittance' });
    }
  };


  const handlePostAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet) return;

    try {
      const res = await adminPostAdjustmentAction({
        fellowProfileId: selectedWallet.fellowProfileId,
        entryType: adjustmentForm.entryType,
        amount: Number(adjustmentForm.amount),
        reason: adjustmentForm.reason,
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: `Manual ${adjustmentForm.entryType} adjustment of $${adjustmentForm.amount} posted to fellow wallet.`,
        });
        setShowAdjustmentModal(false);
        setAdjustmentForm({ entryType: 'credit', amount: 100, reason: '' });
        fetchData();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to post adjustment' });
    }
  };

  const totalSystemLiabilities = wallets.reduce((acc, w) => acc + w.availableBalance, 0);
  const totalLifetimePaid = wallets.reduce((acc, w) => acc + w.totalLifetimeEarned, 0);
  const totalDiscrepancies = wallets.filter((w) => !w.reconciliation.isReconciled).length;

  return (
    <div className="min-h-screen bg-[var(--qh-bg)] text-[var(--qh-ink)] flex flex-col font-[family-name:var(--font-poppins)]">
      <AppHeader
        title="Admin Wallet & Ledger Governance Console"
        subtitle="Double-entry reconciliation engine, wallet audit logs, and manual adjustment controls"
        badge={{ label: 'Phase 2 Service 18', variant: 'accent' }}
        backLink={{ href: '/admin', label: '← Back to Admin Panel' }}
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

        {/* System Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-6 bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-[var(--qh-slate-600)] uppercase tracking-wider block">
              Total System Liabilities
            </span>
            <div className="text-3xl font-extrabold text-[var(--qh-ink)]">
              ${totalSystemLiabilities.toLocaleString()}
            </div>
            <span className="text-[10px] text-[var(--qh-slate-600)] block font-medium">
              Available Fellow Balances
            </span>
          </div>

          <div className="p-6 bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-[var(--qh-slate-600)] uppercase tracking-wider block">
              Cumulative Lifetime Stipends
            </span>
            <div className="text-3xl font-extrabold text-emerald-600">
              ${totalLifetimePaid.toLocaleString()}
            </div>
            <span className="text-[10px] text-[var(--qh-slate-600)] block font-medium">
              Total Lifetime Credits Posted
            </span>
          </div>

          <div className="p-6 bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-[var(--qh-slate-600)] uppercase tracking-wider block">
              Active Wallets
            </span>
            <div className="text-3xl font-extrabold text-[var(--qh-ink)]">
              {wallets.length}
            </div>
            <span className="text-[10px] text-[var(--qh-slate-600)] block font-medium">
              Enrolled Fellow Accounts
            </span>
          </div>

          <div className="p-6 bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-[var(--qh-slate-600)] uppercase tracking-wider block">
              Ledger Discrepancies
            </span>
            <div className={`text-3xl font-extrabold ${totalDiscrepancies > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {totalDiscrepancies}
            </div>
            <span className="text-[10px] text-[var(--qh-slate-600)] block font-medium">
              {totalDiscrepancies === 0 ? '✓ All Wallets Reconciled' : '⚠️ Audit Discrepancies Detected'}
            </span>
          </div>
        </div>

        {/* Wallets Audit Roster */}
        <div className="bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--qh-border)] pb-4">
            <div>
              <h3 className="text-base font-bold text-[var(--qh-ink)]">Fellow Wallet Roster & Ledger Audit Stream</h3>
              <p className="text-xs text-[var(--qh-slate-600)]">
                Live double-entry reconciliation checking: Available Balance vs Sum(Credits) - Sum(Debits)
              </p>
            </div>
            <button
              onClick={() => setShowRemittanceModal(true)}
              className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 shadow-sm flex items-center space-x-1"
            >
              <span>+ Ingest Partner Wire Remittance</span>
            </button>
          </div>


          {loading ? (
            <div className="p-12 text-center text-xs text-[var(--qh-slate-600)] flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-t-[var(--qh-accent-main)] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
              <span>Running system-wide double-entry wallet reconciliation...</span>
            </div>
          ) : wallets.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--qh-slate-600)] italic">
              No fellow wallets found in the system.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--qh-border)] text-[var(--qh-slate-600)] uppercase font-semibold text-[10px]">
                    <th className="py-3 px-4">Fellow Profile ID</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Available Balance</th>
                    <th className="py-3 px-4 text-right">Calculated Ledger Sum</th>
                    <th className="py-3 px-4 text-center">Reconciliation</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--qh-border)]">
                  {wallets.map((w) => {
                    const isReconciled = w.reconciliation.isReconciled;
                    return (
                      <tr key={w.id} className="hover:bg-[var(--qh-bg)]/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-[var(--qh-ink)] font-semibold">
                          #{w.fellowProfileId.substring(0, 8)}...
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600 border border-emerald-200">
                            {w.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 font-mono">
                          ${w.availableBalance.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[var(--qh-ink)] font-semibold">
                          ${w.reconciliation.calculatedBalance.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              isReconciled
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                : 'bg-rose-50 text-rose-600 border border-rose-200 animate-pulse'
                            }`}
                          >
                            {isReconciled ? '✓ Reconciled' : `⚠️ Discrepancy ($${w.reconciliation.discrepancy})`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedWallet(w);
                              setShowAdjustmentModal(true);
                            }}
                            className="px-3 py-1 bg-[var(--qh-accent-main)] text-white text-[11px] font-semibold rounded-lg hover:opacity-90 shadow-sm"
                          >
                            Post Adjustment
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Manual Adjustment Modal */}
      {showAdjustmentModal && selectedWallet && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--qh-surface-card)] border border-[var(--qh-border)] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--qh-border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--qh-ink)]">
                Post Manual Adjustment Entry
              </h3>
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="text-xs font-bold text-[var(--qh-slate-600)] hover:text-[var(--qh-ink)] uppercase"
              >
                Close
              </button>
            </div>

            <form onSubmit={handlePostAdjustment} className="space-y-4 text-xs">
              <div className="p-3 bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] text-[11px]">
                Target Fellow Profile: <strong className="font-mono text-[var(--qh-ink)]">#{selectedWallet.fellowProfileId}</strong>
              </div>

              <div>
                <label className="block font-semibold text-[var(--qh-slate-600)] mb-1">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentForm({ ...adjustmentForm, entryType: 'credit' })}
                    className={`py-2 rounded-lg font-semibold text-xs border ${
                      adjustmentForm.entryType === 'credit'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'bg-[var(--qh-bg)] border-[var(--qh-border)] text-[var(--qh-slate-600)]'
                    }`}
                  >
                    + Credit (Add Money)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentForm({ ...adjustmentForm, entryType: 'debit' })}
                    className={`py-2 rounded-lg font-semibold text-xs border ${
                      adjustmentForm.entryType === 'debit'
                        ? 'bg-rose-50 border-rose-500 text-rose-700'
                        : 'bg-[var(--qh-bg)] border-[var(--qh-border)] text-[var(--qh-slate-600)]'
                    }`}
                  >
                    - Debit (Deduct Money)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[var(--qh-slate-600)] mb-1">Amount ($)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={adjustmentForm.amount}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: Number(e.target.value) })}
                  placeholder="e.g. 100"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--qh-slate-600)] mb-1">Reason / Justification</label>
                <textarea
                  required
                  rows={3}
                  value={adjustmentForm.reason}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                  placeholder="Provide audit compliance justification (min 10 chars)..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--qh-border)]">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--qh-slate-600)] hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90 shadow-sm"
                >
                  Post Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Ingest Partner Wire Remittance Modal */}
      {showRemittanceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--qh-surface-card)] border border-[var(--qh-border)] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--qh-border)] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--qh-ink)]">
                  Ingest Partner Wire Remittance Breakdown
                </h3>
                <p className="text-[11px] text-[var(--qh-slate-600)]">
                  Match bank wire against fellow placements & calculate tax withholding
                </p>
              </div>
              <button
                onClick={() => setShowRemittanceModal(false)}
                className="text-xs font-bold text-[var(--qh-slate-600)] hover:text-[var(--qh-ink)] uppercase"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleIngestRemittance} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--qh-slate-600)] mb-1">Partner Organization</label>
                  <input
                    type="text"
                    required
                    value={remittanceForm.partnerName}
                    onChange={(e) => setRemittanceForm({ ...remittanceForm, partnerName: e.target.value })}
                    placeholder="e.g. SiliconGate Partner"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--qh-slate-600)] mb-1">Bank Wire Ref Code</label>
                  <input
                    type="text"
                    required
                    value={remittanceForm.bankReference}
                    onChange={(e) => setRemittanceForm({ ...remittanceForm, bankReference: e.target.value })}
                    placeholder="e.g. WIRE-2026-0908-01"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--qh-slate-600)] mb-1">Total Wire Amount ($)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={remittanceForm.totalAmount}
                    onChange={(e) => setRemittanceForm({ ...remittanceForm, totalAmount: Number(e.target.value) })}
                    placeholder="e.g. 1000"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--qh-slate-600)] mb-1">Withholding Tax (% WHT)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={50}
                    value={remittanceForm.withholdingTaxRatePercent}
                    onChange={(e) => setRemittanceForm({ ...remittanceForm, withholdingTaxRatePercent: Number(e.target.value) })}
                    placeholder="5"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[var(--qh-slate-600)] mb-1">Target Fellow Profile ID</label>
                <input
                  type="text"
                  required
                  value={remittanceForm.fellowProfileId}
                  onChange={(e) => setRemittanceForm({ ...remittanceForm, fellowProfileId: e.target.value })}
                  placeholder="UUID of fellow profile receiving net payout"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)] font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--qh-slate-600)] mb-1">Placement Match ID (Optional)</label>
                <input
                  type="text"
                  value={remittanceForm.placementId}
                  onChange={(e) => setRemittanceForm({ ...remittanceForm, placementId: e.target.value })}
                  placeholder="Service 16 opportunity/match ID reference"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)] font-mono"
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] space-y-1">
                <div className="font-bold text-emerald-800">Remittance Breakdown Preview:</div>
                <div className="flex justify-between text-emerald-700">
                  <span>Gross Wire Breakdown:</span>
                  <span className="font-mono">${remittanceForm.totalAmount}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Tax Withheld ({remittanceForm.withholdingTaxRatePercent}% WHT):</span>
                  <span className="font-mono">-${Math.round(remittanceForm.totalAmount * (remittanceForm.withholdingTaxRatePercent / 100))}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-900 border-t border-emerald-200 pt-1">
                  <span>Net Fellow Wallet Credit:</span>
                  <span className="font-mono">${remittanceForm.totalAmount - Math.round(remittanceForm.totalAmount * (remittanceForm.withholdingTaxRatePercent / 100))}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--qh-border)]">
                <button
                  type="button"
                  onClick={() => setShowRemittanceModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--qh-slate-600)] hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 shadow-sm"
                >
                  Ingest & Credit Wallet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

