'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { CandidateCompositeScore, CandidatePlacementTier } from '@/modules/assessment/types';
import {
  getAdminScoringMatrixAction,
  overrideCandidateTierAction,
} from '@/modules/assessment/actions';

type FilterTier = 'all' | CandidatePlacementTier | 'red_flagged';

export default function AdminScoringMatrixPage() {
  const [matrix, setMatrix] = useState<Array<CandidateCompositeScore & { fellowName?: string; fellowEmail?: string }>>([]);
  const [selectedRecord, setSelectedRecord] = useState<(CandidateCompositeScore & { fellowName?: string; fellowEmail?: string }) | null>(null);
  const [filter, setFilter] = useState<FilterTier>('all');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Override Form States
  const [overrideTier, setOverrideTier] = useState<CandidatePlacementTier>('tier_1_global');
  const [overrideScoreInput, setOverrideScoreInput] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from('.gsap-header', { y: -20, opacity: 0, duration: 0.6, ease: 'power3.out' });
      gsap.from('.gsap-row', { y: 20, opacity: 0, duration: 0.4, stagger: 0.08, ease: 'power3.out' });
    },
    { scope: containerRef, dependencies: [loading] }
  );

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const res = await getAdminScoringMatrixAction();
      if (res.success && res.data) {
        setMatrix(res.data);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const handleSelectRecord = (rec: CandidateCompositeScore & { fellowName?: string; fellowEmail?: string }) => {
    setSelectedRecord(rec);
    setOverrideTier(rec.assignedTier);
    setOverrideScoreInput(rec.overallCompositeScore.toString());
    setOverrideReason('');
  };

  const handleApplyOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    if (overrideReason.trim().length < 10) {
      setErrorMessage('Override reason must be at least 10 characters for compliance logging.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const scoreVal = overrideScoreInput ? parseInt(overrideScoreInput) : undefined;
    const res = await overrideCandidateTierAction(
      selectedRecord.fellowProfileId,
      overrideTier,
      overrideReason,
      scoreVal
    );

    if (res.success && res.data) {
      setMatrix((prev) =>
        prev.map((item) =>
          item.fellowProfileId === res.data!.fellowProfileId
            ? { ...item, ...res.data! }
            : item
        )
      );
      setSelectedRecord({ ...selectedRecord, ...res.data! });
    } else {
      setErrorMessage(res.error || 'Failed to apply candidate tier override');
    }
    setSubmitting(false);
  };

  const filteredMatrix = matrix.filter((rec) => {
    if (filter === 'all') return true;
    if (filter === 'red_flagged') return rec.isRedFlagged;
    return rec.assignedTier === filter;
  });

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[var(--qh-bg-dark)] text-white font-[family-name:var(--font-poppins)] antialiased pb-16"
    >
      <AppHeader
        title="QPipeline Admin Ops"
        subtitle="Service 13 — Candidate Scoring Matrix & Tier Governance"
        backLink={{ href: '/admin/bootcamp', label: 'Bootcamp Governance →' }}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="gsap-header mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--qh-card-bg)] border border-[var(--qh-border)] text-xs text-[var(--qh-accent-glow)] mb-2">
            <span className="w-2 h-2 rounded-full bg-[var(--qh-accent-primary)] animate-pulse" />
            Admin Tier Governance & Audit Logging
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Candidate Composite Leaderboard & Tier Override Matrix
          </h2>
          <p className="text-xs text-[var(--qh-ink-muted)] max-w-2xl mt-1">
            Governance dashboard for inspecting multi-module composite candidate scores, red flag alerts, and applying manual tier overrides with compliance audit logs.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-6 text-xs">
          {(['all', 'tier_1_global', 'tier_2_regional', 'tier_3_bench', 'tier_4_rejected', 'red_flagged'] as FilterTier[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl transition-all capitalize border ${
                filter === f
                  ? 'bg-[var(--qh-accent-primary)] text-white border-[var(--qh-accent-primary)] font-semibold'
                  : 'bg-[var(--qh-card-bg)] text-[var(--qh-ink-muted)] border-[var(--qh-border)] hover:text-white'
              }`}
            >
              {f.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-xs text-[var(--qh-ink-muted)] space-x-3">
            <div className="w-4 h-4 border-2 border-t-[var(--qh-accent-primary)] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
            <span>Loading candidate scoring matrix...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Leaderboard Table */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--qh-border)] flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Candidate Matrix ({filteredMatrix.length})
                  </h3>
                </div>

                {filteredMatrix.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[var(--qh-ink-muted)]">
                    No candidate records found matching this tier filter.
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--qh-border)]">
                    {filteredMatrix.map((rec) => {
                      const isSelected = selectedRecord?.id === rec.id;
                      return (
                        <div
                          key={rec.id}
                          onClick={() => handleSelectRecord(rec)}
                          className={`gsap-row p-4 transition-all cursor-pointer hover:bg-[var(--qh-bg-dark)]/60 ${
                            isSelected
                              ? 'bg-[var(--qh-bg-dark)] border-l-4 border-l-[var(--qh-accent-primary)]'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div>
                              <span className="text-xs font-bold text-white block">{rec.fellowName}</span>
                              <span className="text-[10px] text-[var(--qh-ink-muted)]">{rec.fellowEmail}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-extrabold text-[var(--qh-accent-glow)] font-mono">
                                {rec.overallCompositeScore}%
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--qh-ink-muted)]">
                            <span className="capitalize font-semibold text-white">
                              {rec.assignedTier.replace(/_/g, ' ')}
                            </span>
                            <span>•</span>
                            <span>Flagged: <strong className={rec.isRedFlagged ? 'text-amber-400' : 'text-emerald-400'}>{rec.isRedFlagged ? 'Yes' : 'Clean'}</strong></span>
                            <span>•</span>
                            <span>Override: <strong className={rec.overrideApplied ? 'text-purple-400' : 'text-emerald-400'}>{rec.overrideApplied ? 'Applied' : 'None'}</strong></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Override Form & Audit Governance Drawer */}
            <div className="lg:col-span-5 space-y-6">
              {selectedRecord ? (
                <div className="bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl p-6 space-y-6">
                  <div className="border-b border-[var(--qh-border)] pb-4">
                    <h3 className="text-sm font-bold text-white">{selectedRecord.fellowName}</h3>
                    <p className="text-xs text-[var(--qh-ink-muted)]">ID: #{selectedRecord.fellowProfileId.substring(0, 8)}</p>
                  </div>

                  {/* Stage Breakdown Matrix */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Stage Performance Breakdown</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-[var(--qh-bg-dark)] border border-[var(--qh-border)]">
                        Baseline (15%): <strong className="text-white block">{selectedRecord.baselineScore}%</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[var(--qh-bg-dark)] border border-[var(--qh-border)]">
                        Module 1 (25%): <strong className="text-white block">{selectedRecord.module1Score}%</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[var(--qh-bg-dark)] border border-[var(--qh-border)]">
                        Module 2 (35%): <strong className="text-white block">{selectedRecord.module2Score}%</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[var(--qh-bg-dark)] border border-[var(--qh-border)]">
                        Module 3 (25%): <strong className="text-white block">{selectedRecord.module3Score}%</strong>
                      </div>
                    </div>
                  </div>

                  {/* Admin Tier Override Form */}
                  <form onSubmit={handleApplyOverride} className="space-y-4 pt-2 border-t border-[var(--qh-border)]">
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center justify-between">
                      <span>Manual Tier Override</span>
                      <span className="text-[10px] text-amber-400 font-normal">Logs to Audit Trail</span>
                    </h4>

                    <div>
                      <label className="block text-xs font-medium text-[var(--qh-ink-muted)] mb-1">New Placement Tier</label>
                      <select
                        value={overrideTier}
                        onChange={(e) => setOverrideTier(e.target.value as CandidatePlacementTier)}
                        className="w-full bg-[var(--qh-bg-dark)] border border-[var(--qh-border)] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[var(--qh-accent-primary)]"
                      >
                        <option value="tier_1_global">Tier 1 — Global Placement (Premium)</option>
                        <option value="tier_2_regional">Tier 2 — Regional Direct Placement</option>
                        <option value="tier_3_bench">Tier 3 — Farm System / Bench Upskilling</option>
                        <option value="tier_4_rejected">Tier 4 — Ineligible / Rejected</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[var(--qh-ink-muted)] mb-1">Override Score (0-100% Optional)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={overrideScoreInput}
                        onChange={(e) => setOverrideScoreInput(e.target.value)}
                        className="w-full bg-[var(--qh-bg-dark)] border border-[var(--qh-border)] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[var(--qh-accent-primary)]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[var(--qh-ink-muted)] mb-1">Mandatory Override Reason (Min 10 chars)</label>
                      <textarea
                        rows={3}
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="Detail compliance reason for manual tier placement override..."
                        className="w-full bg-[var(--qh-bg-dark)] border border-[var(--qh-border)] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[var(--qh-accent-primary)]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || overrideReason.trim().length < 10}
                      className="w-full py-3 rounded-xl bg-[var(--qh-accent-primary)] hover:bg-[var(--qh-accent-deep)] text-white font-medium text-xs transition-all disabled:opacity-50"
                    >
                      {submitting ? 'Applying Override & Audit Log...' : 'Apply Tier Override & Log Audit Event'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl p-12 text-center text-xs text-[var(--qh-ink-muted)]">
                  Select a candidate from the leaderboard matrix to view stage breakdown and apply tier overrides.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
