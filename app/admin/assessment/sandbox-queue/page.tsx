'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { BuildSandboxSubmission, Module2RubricScores } from '@/modules/assessment/types';
import {
  getModule2SandboxQueueAction,
  finalizeModule2GradingAction,
} from '@/modules/assessment/actions';
import { calculateModule2WeightedScore, detectAutoRedFlag } from '@/modules/assessment/types';

export default function Module2SandboxQueuePage() {
  const [queue, setQueue] = useState<BuildSandboxSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<BuildSandboxSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Rubric Calibration Sliders
  const [scores, setScores] = useState<Module2RubricScores>({
    correctness: 0,
    verificationBehavior: 0,
    securityAwareness: 0,
    codeQuality: 0,
    efficiency: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from('.gsap-header', { y: -20, opacity: 0, duration: 0.6, ease: 'power3.out' });
      gsap.from('.gsap-row', { y: 20, opacity: 0, duration: 0.4, stagger: 0.1, ease: 'power3.out' });
    },
    { scope: containerRef, dependencies: [loading] }
  );

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const res = await getModule2SandboxQueueAction();
      if (res.success && res.data) {
        setQueue(res.data);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const handleSelectSubmission = (sub: BuildSandboxSubmission) => {
    setSelectedSubmission(sub);
    // Anti-Anchoring Bias: If already graded, load final score. If pending, start sliders un-anchored (0).
    setScores(
      sub.status === 'graded'
        ? sub.criterionScores
        : {
            correctness: 0,
            verificationBehavior: 0,
            securityAwareness: 0,
            codeQuality: 0,
            efficiency: 0,
          }
    );
  };

  const handleFinalizeGrading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    setSubmitting(true);
    setErrorMessage(null);
    const res = await finalizeModule2GradingAction(selectedSubmission.id, scores);
    if (res.success && res.data) {
      setQueue((prev) => prev.map((item) => (item.id === res.data!.id ? res.data! : item)));
      setSelectedSubmission(res.data);
    } else {
      setErrorMessage(res.error || 'Failed to finalize grading');
    }
    setSubmitting(false);
  };

  const currentWeightedScore = calculateModule2WeightedScore(scores);
  const currentAutoRedFlag = detectAutoRedFlag(scores);

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[var(--qh-bg-dark)] text-white font-[family-name:var(--font-poppins)] antialiased pb-16"
    >
      <AppHeader
        title="QPipeline Admin Ops"
        subtitle="Module 2 — Build Sandbox Telemetry Queue"
        backLink={{ href: '/admin', label: '← Dashboard' }}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="gsap-header mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--qh-card-bg)] border border-[var(--qh-border)] text-xs text-[var(--qh-accent-glow)] mb-2">
            <span className="w-2 h-2 rounded-full bg-[var(--qh-accent-primary)] animate-pulse" />
            Admin Telemetry & Calibration Workspace
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Module 2 — Build Sandbox Calibration Queue
          </h2>
          <p className="text-xs text-[var(--qh-ink-muted)] max-w-2xl mt-1">
            Review candidate Codespace telemetry timelines, secret leak flags, and calibrate 0-100% weighted rubric scores.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center p-12 text-xs text-[var(--qh-ink-muted)] space-x-3">
            <div className="w-4 h-4 border-2 border-t-[var(--qh-accent-primary)] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
            <span>Loading sandbox submission queue...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Submissions Table */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--qh-border)] flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Candidate Submissions ({queue.length})
                  </h3>
                </div>

                {queue.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[var(--qh-ink-muted)]">
                    No Module 2 build sandbox submissions found.
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--qh-border)]">
                    {queue.map((sub) => {
                      const isSelected = selectedSubmission?.id === sub.id;
                      return (
                        <div
                          key={sub.id}
                          onClick={() => handleSelectSubmission(sub)}
                          className={`gsap-row p-4 transition-all cursor-pointer hover:bg-[var(--qh-bg-dark)]/60 ${
                            isSelected
                              ? 'bg-[var(--qh-bg-dark)] border-l-4 border-l-[var(--qh-accent-primary)]'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono font-medium text-white">
                              Fellow #{sub.fellowProfileId.substring(0, 8)}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                sub.status === 'graded'
                                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                                  : sub.status === 'submitted'
                                  ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                                  : 'bg-blue-950/60 text-blue-400 border border-blue-800/40'
                              }`}
                            >
                              {sub.status}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--qh-ink-muted)]">
                            <span>Score: <strong className="text-white">{sub.status === 'graded' ? `${sub.weightedScore}%` : 'Pending'}</strong></span>
                            <span>•</span>
                            <span>Trap: <strong className={sub.plantedTrapTriggered ? 'text-amber-400' : 'text-emerald-400'}>{sub.plantedTrapTriggered ? 'Leaked Secret' : 'Clean'}</strong></span>
                            <span>•</span>
                            <span>Red Flag: <strong className={sub.autoRedFlagTriggered ? 'text-red-400' : 'text-emerald-400'}>{sub.autoRedFlagTriggered ? 'Triggered' : 'Clean'}</strong></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Telemetry Log Drawer & Calibration Workspace */}
            <div className="lg:col-span-6 space-y-6">
              {selectedSubmission ? (
                <div className="bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl p-6 space-y-6">
                  {/* Header info */}
                  <div className="border-b border-[var(--qh-border)] pb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Submission #{selectedSubmission.id.substring(0, 8)}
                      </h3>
                      <p className="text-xs text-[var(--qh-ink-muted)]">
                        Started: {new Date(selectedSubmission.startedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-[var(--qh-ink-muted)]">Live Score Preview</span>
                      <div className="text-xl font-extrabold text-[var(--qh-accent-glow)]">
                        {currentWeightedScore}%
                      </div>
                    </div>
                  </div>

                  {/* Telemetry Log Timeline Inspector */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center justify-between">
                      <span>Codespace Telemetry Log Timeline</span>
                      <span className="text-[10px] text-[var(--qh-ink-muted)] font-normal">
                        ({selectedSubmission.telemetryEvents.length} events logged)
                      </span>
                    </h4>

                    <div className="max-h-48 overflow-y-auto bg-[var(--qh-bg-dark)] border border-[var(--qh-border)] rounded-xl p-3 space-y-2 font-mono text-[11px]">
                      {selectedSubmission.telemetryEvents.length === 0 ? (
                        <div className="text-[var(--qh-ink-muted)] text-[10px]">No telemetry events recorded yet.</div>
                      ) : (
                        selectedSubmission.telemetryEvents.map((ev, idx) => (
                          <div key={idx} className="flex items-start justify-between border-b border-[var(--qh-border)]/40 pb-1">
                            <span className="text-emerald-400">[{ev.eventType}]</span>
                            <span className="text-[var(--qh-ink-muted)] text-[10px]">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Anti-Anchoring Calibration Sliders */}
                  <form onSubmit={handleFinalizeGrading} className="space-y-4 pt-2">
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                      Weighted Rubric Calibration
                    </h4>

                    {/* Correctness (25%) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <label className="text-[var(--qh-ink-muted)]">Correctness (25% max)</label>
                        <span className="font-bold text-white">{scores.correctness} / 4</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="4"
                        value={scores.correctness}
                        onChange={(e) => setScores({ ...scores, correctness: parseInt(e.target.value) })}
                        className="w-full accent-[var(--qh-accent-primary)]"
                      />
                    </div>

                    {/* Verification behavior (30%) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <label className="text-[var(--qh-ink-muted)]">Verification Behavior (30% max)</label>
                        <span className="font-bold text-white">{scores.verificationBehavior} / 4</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="4"
                        value={scores.verificationBehavior}
                        onChange={(e) => setScores({ ...scores, verificationBehavior: parseInt(e.target.value) })}
                        className="w-full accent-[var(--qh-accent-primary)]"
                      />
                    </div>

                    {/* Security awareness (15%) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <label className="text-[var(--qh-ink-muted)]">Security Awareness (15% max)</label>
                        <span className="font-bold text-white">{scores.securityAwareness} / 4</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="4"
                        value={scores.securityAwareness}
                        onChange={(e) => setScores({ ...scores, securityAwareness: parseInt(e.target.value) })}
                        className="w-full accent-[var(--qh-accent-primary)]"
                      />
                    </div>

                    {/* Code quality (15%) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <label className="text-[var(--qh-ink-muted)]">Code Quality (15% max)</label>
                        <span className="font-bold text-white">{scores.codeQuality} / 4</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="4"
                        value={scores.codeQuality}
                        onChange={(e) => setScores({ ...scores, codeQuality: parseInt(e.target.value) })}
                        className="w-full accent-[var(--qh-accent-primary)]"
                      />
                    </div>

                    {/* Efficiency (15%) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <label className="text-[var(--qh-ink-muted)]">Efficiency (15% max)</label>
                        <span className="font-bold text-white">{scores.efficiency} / 4</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="4"
                        value={scores.efficiency}
                        onChange={(e) => setScores({ ...scores, efficiency: parseInt(e.target.value) })}
                        className="w-full accent-[var(--qh-accent-primary)]"
                      />
                    </div>

                    {/* Auto Red Flag Notice */}
                    {currentAutoRedFlag && (
                      <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center space-x-2">
                        <span>🚨</span>
                        <span>Auto Red-Flag Rule Active: High efficiency paired with 0 verification behavior.</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 rounded-xl bg-[var(--qh-accent-primary)] hover:bg-[var(--qh-accent-deep)] text-white font-medium text-xs transition-all disabled:opacity-50"
                    >
                      {submitting ? 'Saving Calibration...' : 'Finalize Calibration & Save Score'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl p-12 text-center text-xs text-[var(--qh-ink-muted)]">
                  Select a submission from the left queue to inspect telemetry and calibrate rubric scores.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
