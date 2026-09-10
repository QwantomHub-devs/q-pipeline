'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { BenchFellow, BenchAssignment, BenchStatus } from '@/modules/bench/types';
import {
  addToBenchAction,
  updateBenchStatusAction,
  assignBenchProjectAction,
  completeBenchAssignmentAction,
  listBenchPoolAction,
} from '@/modules/bench/actions';

export default function AdminBenchPage() {
  const [benchFellows, setBenchFellows] = useState<BenchFellow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [showAddBenchModal, setShowAddBenchModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const [selectedBenchFellow, setSelectedBenchFellow] = useState<BenchFellow | null>(null);

  // Clean empty form state for enrolling fellow into bench
  const [newBench, setNewBench] = useState({
    fellowId: '',
    notes: '',
  });

  // Clean empty form state for assigning bench fellow to SME project
  const [assignForm, setAssignForm] = useState({
    projectId: '',
    projectTitle: '',
    clientName: '',
    roleTitle: '',
    stipendAmount: 250,
    notes: '',
  });

  // Clean empty form state for completing assignment
  const [completeForm, setCompleteForm] = useState({
    assignmentId: '',
    stipendEarned: 250,
    feedback: '',
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchBenchPool();
  }, []);

  const fetchBenchPool = async () => {
    setLoading(true);
    try {
      const res = await listBenchPoolAction();
      if (res.success && res.benchFellows) {
        setBenchFellows(res.benchFellows);
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to load bench pool' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToBench = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await addToBenchAction({
        fellowProfileId: newBench.fellowId,
        notes: newBench.notes,
      });

      if (res.success && res.benchFellow) {
        setNotification({
          type: 'success',
          message: `Fellow '${res.benchFellow.fullName}' enrolled into the bench pool.`,
        });
        setShowAddBenchModal(false);
        setNewBench({ fellowId: '', notes: '' });
        fetchBenchPool();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to enroll fellow into bench' });
    }
  };

  const handleAssignProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBenchFellow) return;

    try {
      const res = await assignBenchProjectAction({
        fellowProfileId: selectedBenchFellow.fellowProfileId,
        opportunityId: assignForm.projectId || crypto.randomUUID(),
        roleTitle: assignForm.roleTitle || assignForm.projectTitle || 'SME Developer',
        stipendAmount: Number(assignForm.stipendAmount),
        notes: assignForm.notes,
      });

      if (res.success && res.assignment) {
        setNotification({
          type: 'success',
          message: `Bench fellow '${selectedBenchFellow.fullName}' assigned to '${assignForm.projectTitle}'.`,
        });
        setShowAssignModal(false);
        setAssignForm({
          projectId: '',
          projectTitle: '',
          clientName: '',
          roleTitle: '',
          stipendAmount: 250,
          notes: '',
        });
        fetchBenchPool();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to assign SME project' });
    }
  };

  const handleUpdateStatus = async (benchFellowId: string, status: BenchStatus) => {
    try {
      const res = await updateBenchStatusAction({ benchFellowId, status });
      if (res.success) {
        setNotification({ type: 'success', message: `Bench status updated to '${status}'.` });
        fetchBenchPool();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to update bench status' });
    }
  };

  const filteredBenchFellows = benchFellows.filter((b) => {
    if (selectedStatusFilter === 'all') return true;
    return b.status === selectedStatusFilter;
  });

  return (
    <div className="min-h-screen bg-[var(--qh-bg)] text-[var(--qh-ink)]">
      <AppHeader
        title="Bench & Farm-System Governance Console"
        subtitle="Manage fellow waiting pools, SME internal build project assignments, and micro-stipends"
        badge={{ label: 'Phase 2 Service 17', variant: 'accent' }}
        backLink={{ href: '/admin', label: '← Back to Admin Panel' }}
      >
        <button
          onClick={() => setShowAddBenchModal(true)}
          className="px-4 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-sm"
        >
          + Enroll Fellow to Bench
        </button>
      </AppHeader>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {notification && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm flex items-center justify-between border ${
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

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="p-5 bg-[var(--qh-surface-card)] rounded-xl border border-[var(--qh-border)] shadow-sm">
            <p className="text-xs font-semibold text-[var(--qh-slate-600)] uppercase tracking-wider">Total Bench Pool</p>
            <h3 className="text-2xl font-bold mt-1 text-[var(--qh-ink)]">{benchFellows.length}</h3>
            <p className="text-xs text-emerald-600 mt-1">Farm-system fellows</p>
          </div>

          <div className="p-5 bg-[var(--qh-surface-card)] rounded-xl border border-[var(--qh-border)] shadow-sm">
            <p className="text-xs font-semibold text-[var(--qh-slate-600)] uppercase tracking-wider">Available Fellows</p>
            <h3 className="text-2xl font-bold mt-1 text-[var(--qh-ink)]">
              {benchFellows.filter((b) => b.status === 'available').length}
            </h3>
            <p className="text-xs text-[var(--qh-slate-600)] mt-1">Ready for SME projects</p>
          </div>

          <div className="p-5 bg-[var(--qh-surface-card)] rounded-xl border border-[var(--qh-border)] shadow-sm">
            <p className="text-xs font-semibold text-[var(--qh-slate-600)] uppercase tracking-wider">Active SME Projects</p>
            <h3 className="text-2xl font-bold mt-1 text-[var(--qh-ink)]">
              {benchFellows.filter((b) => b.status === 'assigned_project').length}
            </h3>
            <p className="text-xs text-[var(--qh-slate-600)] mt-1">Ongoing build assignments</p>
          </div>

          <div className="p-5 bg-[var(--qh-surface-card)] rounded-xl border border-[var(--qh-border)] shadow-sm">
            <p className="text-xs font-semibold text-[var(--qh-slate-600)] uppercase tracking-wider">Total Stipends Earned</p>
            <h3 className="text-2xl font-bold mt-1 text-[var(--qh-accent-deep)]">
              ${benchFellows.reduce((acc, b) => acc + b.totalStipendEarned, 0).toLocaleString()}
            </h3>
            <p className="text-xs text-[var(--qh-slate-600)] mt-1">Accrued project payouts</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs font-semibold text-[var(--qh-slate-600)]">Filter Status:</span>
          {[
            { id: 'all', label: 'All Pool' },
            { id: 'available', label: 'Available' },
            { id: 'assigned_project', label: 'On SME Project' },
            { id: 'in_bootcamp', label: 'In Bootcamp' },
            { id: 'placed_external', label: 'Placed External' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedStatusFilter(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedStatusFilter === item.id
                  ? 'bg-[var(--qh-accent-main)] text-white'
                  : 'bg-[var(--qh-surface-card)] text-[var(--qh-slate-600)] border border-[var(--qh-border)] hover:border-[var(--qh-accent-main)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Roster Table */}
        {loading ? (
          <div className="p-12 text-center text-sm text-[var(--qh-slate-600)]">Loading bench roster...</div>
        ) : filteredBenchFellows.length === 0 ? (
          <div className="p-12 text-center bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] space-y-3">
            <p className="text-sm font-semibold text-[var(--qh-slate-600)]">No bench fellows in the pool.</p>
            <p className="text-xs text-[var(--qh-slate-600)]">
              Click &quot;+ Enroll Fellow to Bench&quot; to add candidate fellows awaiting cohort or client slots.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredBenchFellows.map((fellow) => {
              const isAvailable = fellow.status === 'available';

              return (
                <div
                  key={fellow.id}
                  className="bg-[var(--qh-surface-card)] p-6 rounded-2xl border border-[var(--qh-border)] shadow-sm hover:border-[var(--qh-accent-main)] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[var(--qh-accent-main)]/10 text-[var(--qh-accent-deep)] flex items-center justify-center font-bold text-lg border border-[var(--qh-accent-main)]/20">
                          {fellow.fullName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-[var(--qh-ink)]">{fellow.fullName}</h3>
                          <p className="text-xs text-[var(--qh-slate-600)]">{fellow.email}</p>
                          <p className="text-[11px] text-[var(--qh-slate-600)] font-mono mt-0.5">ID: {fellow.fellowId}</p>
                        </div>
                      </div>

                      <select
                        value={fellow.status}
                        onChange={(e) => handleUpdateStatus(fellow.id, e.target.value as BenchStatus)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase border ${
                          fellow.status === 'available'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-300'
                            : fellow.status === 'assigned_project'
                            ? 'bg-blue-500/10 text-blue-600 border-blue-300'
                            : 'bg-slate-500/10 text-slate-600 border-slate-300'
                        }`}
                      >
                        <option value="available">Available</option>
                        <option value="assigned_project">Assigned Project</option>
                        <option value="in_bootcamp">In Bootcamp</option>
                        <option value="placed_external">Placed External</option>
                        <option value="offboarded">Offboarded</option>
                      </select>
                    </div>

                    {fellow.currentProjectTitle && (
                      <div className="mb-4 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs">
                        <span className="font-bold text-blue-800 block mb-0.5">Active SME Project Assignment</span>
                        <span className="text-blue-900 font-semibold">{fellow.currentProjectTitle}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] text-xs">
                      <div>
                        <span className="text-[var(--qh-slate-600)] block font-semibold">Projects Completed</span>
                        <span className="font-bold text-[var(--qh-ink)]">{fellow.totalProjectsCompleted} Projects</span>
                      </div>
                      <div>
                        <span className="text-[var(--qh-slate-600)] block font-semibold">Stipends Accrued</span>
                        <span className="font-bold text-emerald-600">${fellow.totalStipendEarned.toLocaleString()}</span>
                      </div>
                    </div>

                    {fellow.notes && (
                      <p className="text-xs text-[var(--qh-slate-600)] mb-4 italic">&quot;{fellow.notes}&quot;</p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--qh-border)]">
                    <button
                      disabled={!isAvailable}
                      onClick={() => {
                        setSelectedBenchFellow(fellow);
                        setShowAssignModal(true);
                      }}
                      className="px-3 py-1.5 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {isAvailable ? 'Assign to SME Project' : 'Project Active'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Enroll Fellow to Bench Modal */}
      {showAddBenchModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--qh-surface-card)] w-full max-w-md rounded-2xl border border-[var(--qh-border)] p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-[var(--qh-ink)]">Enroll Candidate to Bench</h2>
            <p className="text-xs text-[var(--qh-slate-600)]">
              Add a candidate fellow awaiting bootcamp or client placement into the farm-system bench pool.
            </p>

            <form onSubmit={handleAddToBench} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Candidate Fellow ID</label>
                <input
                  type="text"
                  required
                  value={newBench.fellowId}
                  onChange={(e) => setNewBench({ ...newBench, fellowId: e.target.value })}
                  placeholder="e.g. candidate_id or clerk_id"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Notes / Background</label>
                <textarea
                  rows={2}
                  value={newBench.notes}
                  onChange={(e) => setNewBench({ ...newBench, notes: e.target.value })}
                  placeholder="Notes on assessment tier, skill readiness..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--qh-border)]">
                <button
                  type="button"
                  onClick={() => setShowAddBenchModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--qh-slate-600)] hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90 shadow-sm"
                >
                  Enroll to Bench
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign SME Project Modal */}
      {showAssignModal && selectedBenchFellow && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--qh-surface-card)] w-full max-w-md rounded-2xl border border-[var(--qh-border)] p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-[var(--qh-ink)]">
              Assign {selectedBenchFellow.fullName} to SME Project
            </h2>
            <p className="text-xs text-[var(--qh-slate-600)]">
              Assign bench fellow to an internal build project with a micro-stipend payout.
            </p>

            <form onSubmit={handleAssignProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Project ID / Code</label>
                <input
                  type="text"
                  required
                  value={assignForm.projectId}
                  onChange={(e) => setAssignForm({ ...assignForm, projectId: e.target.value })}
                  placeholder="e.g. sme-build-payment-integration"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Project Title</label>
                <input
                  type="text"
                  required
                  value={assignForm.projectTitle}
                  onChange={(e) => setAssignForm({ ...assignForm, projectTitle: e.target.value })}
                  placeholder="e.g. FinTech Merchant Payment Portal"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Client / SME Name</label>
                  <input
                    type="text"
                    value={assignForm.clientName}
                    onChange={(e) => setAssignForm({ ...assignForm, clientName: e.target.value })}
                    placeholder="e.g. QwantomHub Partner SME"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Stipend Amount ($)</label>
                  <input
                    type="number"
                    min={0}
                    value={assignForm.stipendAmount}
                    onChange={(e) => setAssignForm({ ...assignForm, stipendAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Role Title</label>
                <input
                  type="text"
                  required
                  value={assignForm.roleTitle}
                  onChange={(e) => setAssignForm({ ...assignForm, roleTitle: e.target.value })}
                  placeholder="e.g. Fullstack Developer"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--qh-border)]">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--qh-slate-600)] hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90 shadow-sm"
                >
                  Assign Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
