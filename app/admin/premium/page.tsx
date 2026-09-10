'use client';

import React, { useState, useEffect } from 'react';
import AppHeader from '@/components/AppHeader';
import { PremiumEligibilityGate, PremiumShortlist } from '@/modules/premium/types';
import {
  listEligibleFellowsAction,
  listShortlistsAction,
  evaluateEligibilityAction,
  curateShortlistAction,
  updateShortlistStatusAction,
} from '@/modules/premium/actions';

export default function AdminPremiumPage() {
  const [gates, setGates] = useState<PremiumEligibilityGate[]>([]);
  const [shortlists, setShortlists] = useState<PremiumShortlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCurateModal, setShowCurateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedGate, setSelectedGate] = useState<PremiumEligibilityGate | null>(null);
  const [selectedShortlist, setSelectedShortlist] = useState<PremiumShortlist | null>(null);

  const [curateForm, setCurateForm] = useState({
    shortlistName: 'Seelicongate Global AI Engineering Cohort Q4',
    notes: '',
  });

  const [statusForm, setStatusForm] = useState({
    status: 'nominated' as 'proposed' | 'shortlisted' | 'nominated' | 'accepted' | 'declined',
    notes: '',
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const gatesRes = await listEligibleFellowsAction();
      if (gatesRes.success && gatesRes.gates) {
        setGates(gatesRes.gates);
      }
      const shortlistsRes = await listShortlistsAction();
      if (shortlistsRes.success && shortlistsRes.shortlists) {
        setShortlists(shortlistsRes.shortlists);
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to load premium data' });
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateFellow = async (fellowProfileId: string) => {
    try {
      const res = await evaluateEligibilityAction(fellowProfileId);
      if (res.success && res.gate) {
        setNotification({
          type: 'success',
          message: `Evaluated fellow '${res.gate.fellowName}': status is now ${res.gate.eligibilityStatus.toUpperCase()}.`,
        });
        fetchData();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Evaluation failed' });
    }
  };

  const handleCurateShortlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGate) return;

    try {
      const res = await curateShortlistAction({
        fellowProfileId: selectedGate.fellowProfileId,
        shortlistName: curateForm.shortlistName,
        notes: curateForm.notes,
      });

      if (res.success && res.shortlist) {
        setNotification({
          type: 'success',
          message: `Candidate '${selectedGate.fellowName}' curated into shortlist '${res.shortlist.shortlistName}'.`,
        });
        setShowCurateModal(false);
        setCurateForm({ shortlistName: 'Seelicongate Global AI Engineering Cohort Q4', notes: '' });
        fetchData();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Shortlisting failed' });
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShortlist) return;

    try {
      const res = await updateShortlistStatusAction({
        shortlistId: selectedShortlist.id,
        status: statusForm.status,
        notes: statusForm.notes,
      });

      if (res.success && res.shortlist) {
        setNotification({
          type: 'success',
          message: `Nomination status updated to '${res.shortlist.status.toUpperCase()}'.`,
        });
        setShowStatusModal(false);
        fetchData();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Status update failed' });
    }
  };

  const filteredGates = gates.filter((g) => {
    if (filterStatus === 'all') return true;
    return g.eligibilityStatus === filterStatus;
  });

  return (
    <div className="min-h-screen bg-[var(--qh-bg)] text-[var(--qh-ink)]">
      <AppHeader
        title="Seelicongate Premium Track Governance"
        subtitle="Gate Top Tier candidates, curate shortlists, and manage global partner nominations"
        badge={{ label: 'Phase 4 Service 25', variant: 'accent' }}
        backLink={{ href: '/admin', label: '← Back to Admin Panel' }}
      />

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

        {/* Top Metric Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="p-5 bg-[var(--qh-surface-card)] rounded-xl border border-[var(--qh-border)] shadow-sm">
            <p className="text-xs font-semibold text-[var(--qh-slate-600)] uppercase tracking-wider">Eligible Candidates</p>
            <h3 className="text-2xl font-bold mt-1 text-[var(--qh-ink)]">
              {gates.filter((g) => g.eligibilityStatus === 'eligible').length}
            </h3>
            <p className="text-xs text-emerald-600 mt-1">Qualified Top Tier fellows</p>
          </div>

          <div className="p-5 bg-[var(--qh-surface-card)] rounded-xl border border-[var(--qh-border)] shadow-sm">
            <p className="text-xs font-semibold text-[var(--qh-slate-600)] uppercase tracking-wider">Shortlisted</p>
            <h3 className="text-2xl font-bold mt-1 text-[var(--qh-ink)]">{shortlists.length}</h3>
            <p className="text-xs text-[var(--qh-slate-600)] mt-1">Curated candidates</p>
          </div>

          <div className="p-5 bg-[var(--qh-surface-card)] rounded-xl border border-[var(--qh-border)] shadow-sm">
            <p className="text-xs font-semibold text-[var(--qh-slate-600)] uppercase tracking-wider">Nominated</p>
            <h3 className="text-2xl font-bold mt-1 text-[var(--qh-accent-deep)]">
              {shortlists.filter((s) => s.status === 'nominated').length}
            </h3>
            <p className="text-xs text-[var(--qh-slate-600)] mt-1">Submitted to Seelicongate</p>
          </div>

          <div className="p-5 bg-[var(--qh-surface-card)] rounded-xl border border-[var(--qh-border)] shadow-sm">
            <p className="text-xs font-semibold text-[var(--qh-slate-600)] uppercase tracking-wider">Accepted</p>
            <h3 className="text-2xl font-bold mt-1 text-emerald-600">
              {shortlists.filter((s) => s.status === 'accepted').length}
            </h3>
            <p className="text-xs text-[var(--qh-slate-600)] mt-1">Confirmed partner placements</p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--qh-slate-600)]">Filter Status:</span>
            {['all', 'eligible', 'ineligible', 'pending_review'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterStatus === st
                    ? 'bg-[var(--qh-accent-main)] text-white'
                    : 'bg-[var(--qh-surface-card)] text-[var(--qh-slate-600)] border border-[var(--qh-border)] hover:border-[var(--qh-accent-main)]'
                }`}
              >
                {st === 'all' ? 'All Candidates' : st.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Candidate Eligibility Table */}
        <div className="bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] shadow-sm overflow-hidden mb-8">
          <div className="p-5 border-b border-[var(--qh-border)] flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-[var(--qh-ink)]">Candidate Premium Gate Roster</h3>
              <p className="text-xs text-[var(--qh-slate-600)]">Evaluated fellows and eligibility criteria status</p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-[var(--qh-slate-600)]">Loading gate roster...</div>
          ) : filteredGates.length === 0 ? (
            <div className="p-12 text-center text-sm text-[var(--qh-slate-600)]">No candidates matching filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[var(--qh-bg)] text-[var(--qh-slate-600)] font-semibold border-b border-[var(--qh-border)]">
                    <th className="p-4">Candidate Name</th>
                    <th className="p-4">Gate Status</th>
                    <th className="p-4">Top Tier</th>
                    <th className="p-4">Score (≥70%)</th>
                    <th className="p-4">Contract</th>
                    <th className="p-4">Evaluated</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--qh-border)]">
                  {filteredGates.map((gate) => (
                    <tr key={gate.id} className="hover:bg-[var(--qh-bg)]/50 transition-colors">
                      <td className="p-4 font-bold text-[var(--qh-ink)]">
                        {gate.fellowName}
                        <div className="text-[11px] font-normal text-[var(--qh-slate-600)]">{gate.fellowEmail}</div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${
                            gate.eligibilityStatus === 'eligible'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : gate.eligibilityStatus === 'ineligible'
                              ? 'bg-rose-500/10 text-rose-600'
                              : 'bg-amber-500/10 text-amber-600'
                          }`}
                        >
                          {gate.eligibilityStatus.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4">{gate.tierConfirmed ? '✓ Yes' : '✗ No'}</td>
                      <td className="p-4">{gate.scoreThresholdMet ? '✓ Met' : '✗ Below'}</td>
                      <td className="p-4">{gate.contractSigned ? '✓ Signed' : '✗ Pending'}</td>
                      <td className="p-4 text-[11px] font-mono text-[var(--qh-slate-600)]">
                        {new Date(gate.evaluatedAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleEvaluateFellow(gate.fellowProfileId)}
                          className="px-2.5 py-1 bg-[var(--qh-bg)] text-[var(--qh-ink)] border border-[var(--qh-border)] hover:border-[var(--qh-accent-main)] rounded-lg font-semibold transition-colors"
                        >
                          Re-evaluate
                        </button>
                        {gate.eligibilityStatus === 'eligible' && (
                          <button
                            onClick={() => {
                              setSelectedGate(gate);
                              setShowCurateModal(true);
                            }}
                            className="px-2.5 py-1 bg-[var(--qh-accent-main)] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity shadow-sm"
                          >
                            + Curate Shortlist
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Shortlist Governance Section */}
        <div className="bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] shadow-sm p-6">
          <h3 className="font-bold text-base text-[var(--qh-ink)] mb-1">Seelicongate Shortlists & Nominations</h3>
          <p className="text-xs text-[var(--qh-slate-600)] mb-4">Manage submitted candidate nominations for partner openings</p>

          {shortlists.length === 0 ? (
            <p className="text-xs text-[var(--qh-slate-600)] py-4">No candidates shortlisted yet.</p>
          ) : (
            <div className="space-y-3">
              {shortlists.map((sl) => (
                <div
                  key={sl.id}
                  className="p-4 bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] flex items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="font-bold text-sm text-[var(--qh-ink)]">{sl.fellowName}</h4>
                    <p className="text-xs text-[var(--qh-slate-600)]">
                      Track: <span className="font-semibold text-[var(--qh-ink)]">{sl.shortlistName}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        sl.status === 'accepted'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : sl.status === 'nominated'
                          ? 'bg-indigo-500/10 text-indigo-600'
                          : sl.status === 'declined'
                          ? 'bg-rose-500/10 text-rose-600'
                          : 'bg-amber-500/10 text-amber-600'
                      }`}
                    >
                      {sl.status.toUpperCase()}
                    </span>

                    <button
                      onClick={() => {
                        setSelectedShortlist(sl);
                        setStatusForm({ status: sl.status, notes: sl.notes || '' });
                        setShowStatusModal(true);
                      }}
                      className="px-3 py-1 bg-[var(--qh-surface-card)] border border-[var(--qh-border)] text-xs font-semibold rounded-lg hover:border-[var(--qh-accent-main)]"
                    >
                      Update Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Curate Shortlist Modal */}
      {showCurateModal && selectedGate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--qh-surface-card)] w-full max-w-md rounded-2xl border border-[var(--qh-border)] p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[var(--qh-ink)] mb-1">
              Curate {selectedGate.fellowName} for Shortlist
            </h2>
            <p className="text-xs text-[var(--qh-slate-600)] mb-4">
              Nominate candidate for Seelicongate global placement track.
            </p>

            <form onSubmit={handleCurateShortlist} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Shortlist Track Name</label>
                <input
                  type="text"
                  required
                  value={curateForm.shortlistName}
                  onChange={(e) => setCurateForm({ ...curateForm, shortlistName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Curator Notes (Optional)</label>
                <textarea
                  rows={3}
                  value={curateForm.notes}
                  onChange={(e) => setCurateForm({ ...curateForm, notes: e.target.value })}
                  placeholder="Notes on candidate fit, skills, or specific partner request..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--qh-border)]">
                <button
                  type="button"
                  onClick={() => setShowCurateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--qh-slate-600)] hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90 shadow-sm"
                >
                  Add to Shortlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Nomination Status Modal */}
      {showStatusModal && selectedShortlist && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--qh-surface-card)] w-full max-w-md rounded-2xl border border-[var(--qh-border)] p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[var(--qh-ink)] mb-1">Update Nomination Status</h2>
            <p className="text-xs text-[var(--qh-slate-600)] mb-4">
              Update partner feedback for {selectedShortlist.fellowName}.
            </p>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Status</label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                >
                  <option value="proposed">Proposed</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="nominated">Nominated to Seelicongate</option>
                  <option value="accepted">Accepted by Partner</option>
                  <option value="declined">Declined</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Status Notes</label>
                <textarea
                  rows={2}
                  value={statusForm.notes}
                  onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
                  placeholder="Partner feedback or interview outcome..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--qh-border)]">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--qh-slate-600)] hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90 shadow-sm"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
