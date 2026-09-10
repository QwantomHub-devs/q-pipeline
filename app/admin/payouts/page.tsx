'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import {
  adminListPayoutsAction,
  createPayoutScheduleAction,
  listPayoutSchedulesAction,
  togglePayoutScheduleStatusAction,
  processScheduledPayoutsBatchAction,
  listPayoutScheduleExecutionsAction,
} from '@/modules/payout/actions';
import {
  PayoutDisbursement,
  BankAccount,
  PayoutSchedule,
  PayoutScheduleExecution,
  PayoutScheduleTargetGroup,
  PayoutScheduleFrequency,
} from '@/modules/payout/types';

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Array<PayoutDisbursement & { bankAccount?: BankAccount }>>([]);
  const [schedules, setSchedules] = useState<PayoutSchedule[]>([]);
  const [executions, setExecutions] = useState<PayoutScheduleExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingBatch, setProcessingBatch] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [targetGroup, setTargetGroup] = useState<PayoutScheduleTargetGroup>('all_bench');
  const [amount, setAmount] = useState('50');
  const [frequency, setFrequency] = useState<PayoutScheduleFrequency>('weekly');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payoutRes, scheduleRes, execRes] = await Promise.all([
        adminListPayoutsAction(),
        listPayoutSchedulesAction(),
        listPayoutScheduleExecutionsAction(),
      ]);

      if (payoutRes.success && payoutRes.payouts) setPayouts(payoutRes.payouts);
      if (scheduleRes.success && scheduleRes.schedules) setSchedules(scheduleRes.schedules);
      if (execRes.success && execRes.executions) setExecutions(execRes.executions);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to fetch payout records' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    try {
      const res = await createPayoutScheduleAction({
        title,
        targetGroup,
        amount: Number(amount),
        frequency,
      });

      if (res.success && res.schedule) {
        setSchedules([res.schedule, ...schedules]);
        setIsModalOpen(false);
        setTitle('');
        setNotification({ type: 'success', message: `Payout schedule '${res.schedule.title}' created successfully` });
      } else {
        setNotification({ type: 'error', message: res.error || 'Failed to create payout schedule' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error creating schedule' });
    }
  };

  const handleToggleStatus = async (scheduleId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const res = await togglePayoutScheduleStatusAction(scheduleId, newStatus);
      if (res.success && res.schedule) {
        setSchedules(schedules.map((s) => (s.id === scheduleId ? res.schedule! : s)));
        setNotification({ type: 'success', message: `Schedule status updated to ${newStatus}` });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to toggle status' });
    }
  };

  const handleRunBatchNow = async (scheduleId?: string) => {
    setProcessingBatch(true);
    try {
      const res = await processScheduledPayoutsBatchAction(scheduleId);
      if (res.success && res.executions) {
        setExecutions([...res.executions, ...executions]);
        setNotification({
          type: 'success',
          message: `Scheduled payout batch executed successfully! (${res.executions.length} batch runs completed)`,
        });
        fetchData();
      } else {
        setNotification({ type: 'error', message: res.error || 'Failed to execute scheduled batch' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Batch execution error' });
    } finally {
      setProcessingBatch(false);
    }
  };

  const totalDisbursed = payouts
    .filter((p) => p.status === 'success')
    .reduce((acc, p) => acc + p.amount, 0);
  const pendingCount = payouts.filter((p) => p.status === 'processing' || p.status === 'pending').length;
  const failedCount = payouts.filter((p) => p.status === 'failed' || p.status === 'reversed').length;

  return (
    <div className="min-h-screen bg-[var(--qh-bg)] text-[var(--qh-ink)] flex flex-col font-[family-name:var(--font-poppins)]">
      <AppHeader
        title="Admin Payout & Scheduled Disbursement Governance"
        subtitle="Manage automated stipend schedules, trigger batch payouts, and audit Paystack transfer records"
        badge={{ label: 'Phase 3 Service 21', variant: 'accent' }}
        backLink={{ href: '/admin/wallet', label: '← Wallet Governance' }}
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

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-6 bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-[var(--qh-slate-600)] uppercase tracking-wider block">
              Total Successful Payouts
            </span>
            <div className="text-3xl font-extrabold text-emerald-600">
              ${totalDisbursed.toLocaleString()}
            </div>
            <span className="text-[10px] text-[var(--qh-slate-600)] block font-medium">
              Executed Bank Transfers
            </span>
          </div>

          <div className="p-6 bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-[var(--qh-slate-600)] uppercase tracking-wider block">
              Active Payout Schedules
            </span>
            <div className="text-3xl font-extrabold text-[var(--qh-ink)]">
              {schedules.filter((s) => s.status === 'active').length}
            </div>
            <span className="text-[10px] text-[var(--qh-slate-600)] block font-medium">
              Recurring Stipend Rules
            </span>
          </div>

          <div className="p-6 bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-[var(--qh-slate-600)] uppercase tracking-wider block">
              Pending / Processing
            </span>
            <div className="text-3xl font-extrabold text-amber-600">
              {pendingCount}
            </div>
            <span className="text-[10px] text-[var(--qh-slate-600)] block font-medium">
              Awaiting Gateway Verification
            </span>
          </div>

          <div className="p-6 bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-[var(--qh-slate-600)] uppercase tracking-wider block">
              Batch Execution Runs
            </span>
            <div className="text-3xl font-extrabold text-blue-600">
              {executions.length}
            </div>
            <span className="text-[10px] text-[var(--qh-slate-600)] block font-medium">
              Scheduled Batches Completed
            </span>
          </div>
        </div>

        {/* Automated Payout Scheduler Section */}
        <div className="bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--qh-border)] pb-4">
            <div>
              <h3 className="text-base font-bold text-[var(--qh-ink)]">Automated Payout Scheduler</h3>
              <p className="text-xs text-[var(--qh-slate-600)]">
                Configure recurring micro-stipend payout rules for active bench and cohort fellows
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleRunBatchNow()}
                disabled={processingBatch}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-2 disabled:opacity-50"
              >
                <span>{processingBatch ? 'Executing Batch...' : '⚡ Run Due Batches Now'}</span>
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-[var(--qh-accent-main)] hover:bg-[var(--qh-accent-hover)] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                + Create Payout Schedule
              </button>
            </div>
          </div>

          {schedules.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--qh-slate-600)] italic">
              No recurring payout schedules configured. Click "+ Create Payout Schedule" to set up weekly bench stipends.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--qh-border)] text-[var(--qh-slate-600)] uppercase font-semibold text-[10px]">
                    <th className="py-3 px-4">Schedule Title</th>
                    <th className="py-3 px-4">Target Pool</th>
                    <th className="py-3 px-4 text-right">Stipend Amount</th>
                    <th className="py-3 px-4">Frequency</th>
                    <th className="py-3 px-4">Next Scheduled Run</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--qh-border)]">
                  {schedules.map((s) => (
                    <tr key={s.id} className="hover:bg-[var(--qh-bg)]/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-[var(--qh-ink)]">{s.title}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200">
                          {s.targetGroup === 'all_bench' ? 'All Active Bench Fellows' : 'Specific Fellow Profile'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[var(--qh-ink)]">
                        ${s.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono capitalize text-[var(--qh-slate-600)]">{s.frequency}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[var(--qh-slate-600)]">
                        {new Date(s.nextRunAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            s.status === 'active'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              : 'bg-amber-50 text-amber-600 border border-amber-200'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleToggleStatus(s.id, s.status)}
                          className="text-[11px] font-semibold text-[var(--qh-slate-600)] hover:underline"
                        >
                          {s.status === 'active' ? 'Pause' : 'Resume'}
                        </button>
                        <button
                          onClick={() => handleRunBatchNow(s.id)}
                          className="text-[11px] font-bold text-emerald-600 hover:underline"
                        >
                          Run Now
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Batch Executions Audit Log Drawer */}
        {executions.length > 0 && (
          <div className="bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[var(--qh-ink)]">Scheduled Batch Execution Audit Logs</h3>
            <div className="space-y-4">
              {executions.map((exec) => (
                <div key={exec.id} className="p-4 bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-[var(--qh-ink)]">{exec.batchReference}</span>
                    <span className="text-[10px] text-[var(--qh-slate-600)] font-mono">
                      Executed: {new Date(exec.executedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs font-mono">
                    <span className="text-emerald-600 font-bold">✓ Disbursed: {exec.successfulDisbursementsCount}</span>
                    <span className="text-amber-600 font-bold">⚠️ Skipped Overdraft: {exec.skippedOverdraftCount}</span>
                    <span className="text-slate-600 font-bold">ℹ️ Skipped No Account: {exec.skippedNoAccountCount}</span>
                    <span className="text-slate-800 font-bold ml-auto">Total: ${exec.totalDisbursedAmount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payout Disbursements Audit Roster */}
        <div className="bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--qh-border)] pb-4">
            <div>
              <h3 className="text-base font-bold text-[var(--qh-ink)]">Paystack Disbursement Audit Roster</h3>
              <p className="text-xs text-[var(--qh-slate-600)]">
                Real-time log of fellow payout requests, Paystack transfer codes, and bank resolution references
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-[var(--qh-slate-600)] flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-t-[var(--qh-accent-main)] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
              <span>Fetching Paystack payout disbursement records...</span>
            </div>
          ) : payouts.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--qh-slate-600)] italic">
              No payout disbursement records found in system.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--qh-border)] text-[var(--qh-slate-600)] uppercase font-semibold text-[10px]">
                    <th className="py-3 px-4">Paystack Reference</th>
                    <th className="py-3 px-4">Fellow Profile ID</th>
                    <th className="py-3 px-4">Bank Account</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Requested At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--qh-border)]">
                  {payouts.map((p) => {
                    const isSuccess = p.status === 'success';
                    const isFailed = p.status === 'failed' || p.status === 'reversed';
                    return (
                      <tr key={p.id} className="hover:bg-[var(--qh-bg)]/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[var(--qh-ink)]">
                          {p.paystackReference}
                          {p.paystackTransferCode && (
                            <span className="block text-[10px] text-[var(--qh-slate-600)] font-normal">
                              Code: {p.paystackTransferCode}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[var(--qh-slate-600)]">
                          #{p.fellowProfileId.substring(0, 8)}...
                        </td>
                        <td className="py-3 px-4 text-[var(--qh-ink)]">
                          {p.bankAccount ? (
                            <div>
                              <div className="font-semibold">{p.bankAccount.accountName}</div>
                              <div className="text-[10px] text-[var(--qh-slate-600)]">
                                {p.bankAccount.bankName} ({p.bankAccount.accountNumber})
                              </div>
                            </div>
                          ) : (
                            <span className="font-mono text-[var(--qh-slate-600)]">#{p.bankAccountId.substring(0, 8)}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[var(--qh-ink)] font-mono">
                          ${p.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              isSuccess
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                : isFailed
                                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                : 'bg-amber-50 text-amber-600 border border-amber-200'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[var(--qh-slate-600)] font-mono text-[11px]">
                          {new Date(p.requestedAt).toLocaleString()}
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

      {/* Create Payout Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] p-6 max-w-md w-full shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--qh-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--qh-ink)]">Create Automated Payout Schedule</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--qh-slate-600)] uppercase tracking-wider block">
                  Schedule Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly Bench Micro-Stipend"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[var(--qh-bg)] border border-[var(--qh-border)] rounded-xl text-xs text-[var(--qh-ink)] focus:outline-none focus:border-[var(--qh-accent-main)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--qh-slate-600)] uppercase tracking-wider block">
                  Target Group
                </label>
                <select
                  value={targetGroup}
                  onChange={(e) => setTargetGroup(e.target.value as PayoutScheduleTargetGroup)}
                  className="w-full px-4 py-2.5 bg-[var(--qh-bg)] border border-[var(--qh-border)] rounded-xl text-xs text-[var(--qh-ink)] focus:outline-none focus:border-[var(--qh-accent-main)]"
                >
                  <option value="all_bench">All Active Bench Fellows</option>
                  <option value="all_cohort">All Bootcamp Cohort Fellows</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--qh-slate-600)] uppercase tracking-wider block">
                  Stipend Amount ($)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[var(--qh-bg)] border border-[var(--qh-border)] rounded-xl text-xs font-mono text-[var(--qh-ink)] focus:outline-none focus:border-[var(--qh-accent-main)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--qh-slate-600)] uppercase tracking-wider block">
                  Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as PayoutScheduleFrequency)}
                  className="w-full px-4 py-2.5 bg-[var(--qh-bg)] border border-[var(--qh-border)] rounded-xl text-xs text-[var(--qh-ink)] focus:outline-none focus:border-[var(--qh-accent-main)]"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[var(--qh-border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-[var(--qh-slate-600)] hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[var(--qh-accent-main)] hover:bg-[var(--qh-accent-hover)] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Save Schedule Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
