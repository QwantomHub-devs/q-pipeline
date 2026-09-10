'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { getAdminDashboardDataAction, executeManualOverrideAction } from '@/modules/admin/actions';
import { AdminFunnelMetrics, CandidateSummary } from '@/modules/admin/types';
import { FellowStage, FellowTier } from '@/modules/identity/types';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminFunnelMetrics | null>(null);
  const [candidates, setCandidates] = useState<CandidateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateSummary | null>(null);
  const [overrideStage, setOverrideStage] = useState<FellowStage>('applicant');
  const [overrideTier, setOverrideTier] = useState<FellowTier>('none');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideSuccess, setOverrideSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await getAdminDashboardDataAction({
        search: searchTerm || undefined,
        stage: (selectedStage as FellowStage) || undefined,
        tier: (selectedTier as FellowTier) || undefined,
      });
      setMetrics(data.metrics);
      setCandidates(data.candidates);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed loading admin dashboard data';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [searchTerm, selectedStage, selectedTier]);

  useGSAP(
    () => {
      if (cardsRef.current) {
        gsap.fromTo(
          cardsRef.current.children,
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.35, stagger: 0.08, ease: 'power2.out' }
        );
      }
    },
    { dependencies: [metrics], scope: containerRef }
  );

  const handleOpenOverride = (cand: CandidateSummary) => {
    setSelectedCandidate(cand);
    setOverrideStage(cand.stage);
    setOverrideTier(cand.tier);
    setOverrideReason('');
    setOverrideSuccess(null);
  };

  const handleExecuteOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    try {
      await executeManualOverrideAction({
        fellowId: selectedCandidate.id,
        stage: overrideStage,
        tier: overrideTier,
        reason: overrideReason || 'Admin ops override',
      });
      setOverrideSuccess(`Updated ${selectedCandidate.firstName} ${selectedCandidate.lastName}'s profile successfully.`);
      setSelectedCandidate(null);
      fetchDashboardData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Override failed';
      setErrorMessage(msg);
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col bg-[var(--qh-bg)] text-[var(--qh-ink)]">
      <AppHeader
        title="QwantomHub Admin Operations"
        subtitle="Pipeline Funnel Metrics & Stage Governance"
        badge={{ label: 'Ops Admin', variant: 'accent' }}
      />

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--qh-ink)]">
              Talent Pipeline Operations
            </h1>
            <p className="text-sm text-[var(--qh-muted)]">
              Funnel conversion, candidate cohort tracking, and manual overrides.
            </p>
          </div>
        </div>

        {overrideSuccess && (
          <div className="p-4 rounded-lg bg-green-100 text-green-800 text-sm font-semibold border border-green-200">
            {overrideSuccess}
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-lg bg-red-100 text-red-800 text-sm font-semibold border border-red-200">
            {errorMessage}
          </div>
        )}

        {/* Funnel Metrics Cards */}
        {metrics && (
          <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-[var(--qh-surface)] border border-[var(--qh-accent)] shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--qh-muted)] block mb-1">
                Total Applicants
              </span>
              <span className="text-3xl font-extrabold text-[var(--qh-ink)]">
                {metrics.totalApplicants}
              </span>
            </div>

            <div className="p-5 rounded-xl bg-[var(--qh-surface)] border border-[var(--qh-accent)] shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--qh-muted)] block mb-1">
                Active Fellows
              </span>
              <span className="text-3xl font-extrabold text-[var(--qh-ink)]">
                {metrics.totalFellows}
              </span>
            </div>

            <div className="p-5 rounded-xl bg-[var(--qh-surface)] border border-[var(--qh-accent)] shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--qh-muted)] block mb-1">
                Top Tier Talent
              </span>
              <span className="text-3xl font-extrabold text-[var(--qh-accent-deep)]">
                {metrics.tierCounts.top_tier || 0}
              </span>
            </div>

            <div className="p-5 rounded-xl bg-[var(--qh-surface)] border border-[var(--qh-accent)] shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--qh-muted)] block mb-1">
                Placed Talent
              </span>
              <span className="text-3xl font-extrabold text-[var(--qh-ink)]">
                {metrics.stageCounts.placed || 0}
              </span>
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <div className="p-4 rounded-xl bg-[var(--qh-surface)] border border-[var(--qh-accent)] flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="Search candidate name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 rounded-md bg-[var(--qh-bg)] text-[var(--qh-ink-deep)] border border-[var(--qh-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--qh-ink)] text-sm"
          />

          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-3 py-2 rounded-md bg-[var(--qh-bg)] text-[var(--qh-ink-deep)] border border-[var(--qh-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--qh-ink)] text-sm"
          >
            <option value="">All Stages</option>
            <option value="applicant">Applicant</option>
            <option value="training">Training</option>
            <option value="assessing">Assessing</option>
            <option value="fellow">Fellow</option>
            <option value="placed">Placed</option>
            <option value="alumni">Alumni</option>
          </select>

          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="px-3 py-2 rounded-md bg-[var(--qh-bg)] text-[var(--qh-ink-deep)] border border-[var(--qh-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--qh-ink)] text-sm"
          >
            <option value="">All Tiers</option>
            <option value="top_tier">Top Tier</option>
            <option value="standard">Standard</option>
            <option value="none">None</option>
            <option value="not_selected">Not Selected</option>
          </select>
        </div>

        {/* Candidate Table */}
        <div className="bg-[var(--qh-surface)] rounded-xl border border-[var(--qh-accent)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--qh-accent)] text-[var(--qh-ink)] uppercase text-xs font-bold border-b border-[var(--qh-accent-deep)]">
                <tr>
                  <th className="px-6 py-3">Candidate</th>
                  <th className="px-6 py-3">Country</th>
                  <th className="px-6 py-3">Pipeline Stage</th>
                  <th className="px-6 py-3">Tier</th>
                  <th className="px-6 py-3 text-right">Ops Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--qh-bg)]">
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-[var(--qh-muted)] font-medium">
                      {loading ? 'Loading candidates...' : 'No candidate profiles found matching filter.'}
                    </td>
                  </tr>
                ) : (
                  candidates.map((cand) => (
                    <tr key={cand.id} className="hover:bg-[var(--qh-bg)] transition-colors">
                      <td className="px-6 py-4 font-semibold text-[var(--qh-ink)]">
                        <div>{cand.firstName} {cand.lastName}</div>
                        <div className="text-xs text-[var(--qh-muted)] font-normal">{cand.email}</div>
                      </td>
                      <td className="px-6 py-4 uppercase font-bold text-xs">{cand.country}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--qh-bg)] text-[var(--qh-ink)]">
                          {cand.stage}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            cand.tier === 'top_tier'
                              ? 'bg-[var(--qh-accent-deep)] text-white'
                              : 'bg-[var(--qh-bg)] text-[var(--qh-muted)]'
                          }`}
                        >
                          {cand.tier}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenOverride(cand)}
                          className="px-3 py-1.5 rounded-md bg-[var(--qh-ink)] text-white text-xs font-semibold hover:bg-[var(--qh-accent-deep)] transition-colors"
                        >
                          Manual Override
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Override Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--qh-surface)] rounded-xl border border-[var(--qh-accent)] max-w-md w-full p-6 shadow-xl space-y-4">
            <h2 className="text-xl font-extrabold text-[var(--qh-ink)]">
              Manual Override: {selectedCandidate.firstName} {selectedCandidate.lastName}
            </h2>
            <p className="text-xs text-[var(--qh-muted)]">
              Manually update candidate pipeline stage and tier classification.
            </p>

            <form onSubmit={handleExecuteOverride} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-[var(--qh-muted)]">
                  Pipeline Stage
                </label>
                <select
                  value={overrideStage}
                  onChange={(e) => setOverrideStage(e.target.value as FellowStage)}
                  className="w-full px-3 py-2 rounded-md bg-[var(--qh-bg)] text-[var(--qh-ink-deep)] border border-[var(--qh-accent)] text-sm"
                >
                  <option value="applicant">Applicant</option>
                  <option value="training">Training</option>
                  <option value="assessing">Assessing</option>
                  <option value="fellow">Fellow</option>
                  <option value="placed">Placed</option>
                  <option value="alumni">Alumni</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[var(--qh-muted)]">
                  Tier Classification
                </label>
                <select
                  value={overrideTier}
                  onChange={(e) => setOverrideTier(e.target.value as FellowTier)}
                  className="w-full px-3 py-2 rounded-md bg-[var(--qh-bg)] text-[var(--qh-ink-deep)] border border-[var(--qh-accent)] text-sm"
                >
                  <option value="none">None</option>
                  <option value="top_tier">Top Tier</option>
                  <option value="standard">Standard</option>
                  <option value="not_selected">Not Selected</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[var(--qh-muted)]">
                  Audit Reason *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Manual cohort advancement approval"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-[var(--qh-bg)] text-[var(--qh-ink-deep)] border border-[var(--qh-accent)] text-sm"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  className="px-4 py-2 rounded-md bg-[var(--qh-bg)] text-[var(--qh-ink)] text-sm font-medium hover:bg-[var(--qh-accent)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-[var(--qh-ink)] text-white text-sm font-medium hover:bg-[var(--qh-accent-deep)] transition-colors"
                >
                  Save Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
