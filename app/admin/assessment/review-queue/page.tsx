'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { CodeReviewSubmission, RubricCriterionScores } from '@/modules/assessment/types';
import {
  getModule1ReviewQueueAction,
  finalizeModule1GradingAction,
} from '@/modules/assessment/actions';

export default function Module1ReviewQueuePage() {
  const [queue, setQueue] = useState<CodeReviewSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<CodeReviewSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Rubric Calibration Slider States
  const [scores, setScores] = useState<RubricCriterionScores>({
    issuesIdentified: 0,
    severityRanking: 0,
    fixQuality: 0,
    reasoningClarity: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from('.gsap-header', { y: -20, opacity: 0, duration: 0.6, ease: 'power3.out' });
      gsap.from('.gsap-[row]', { y: 20, opacity: 0, duration: 0.4, stagger: 0.1, ease: 'power3.out' });
    },
    { scope: containerRef, dependencies: [loading] }
  );

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const res = await getModule1ReviewQueueAction();
      if (res.success && res.data) {
        setQueue(res.data);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const handleSelectSubmission = (sub: CodeReviewSubmission) => {
    setSelectedSubmission(sub);
    // Anti-Anchoring Bias: If already graded, load final score. If pending, start sliders un-anchored (0) so admins grade independently from the LLM reference rationale.
    setScores(
      sub.status === 'graded'
        ? sub.criterionScores
        : {
            issuesIdentified: 0,
            severityRanking: 0,
            fixQuality: 0,
            reasoningClarity: 0,
          }
    );
  };

  const handleFinalizeGrading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    setSubmitting(true);
    setErrorMessage(null);
    const res = await finalizeModule1GradingAction(selectedSubmission.id, scores);
    if (res.success && res.data) {
      // Update queue locally
      setQueue((prev) => prev.map((item) => (item.id === res.data!.id ? res.data! : item)));
      setSelectedSubmission(res.data);
    } else {
      setErrorMessage(res.error || 'Failed to finalize grading');
    }
    setSubmitting(false);
  };

  const calculateTotal = (s: RubricCriterionScores) =>
    s.issuesIdentified + s.severityRanking + s.fixQuality + s.reasoningClarity;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[var(--qh-bg)] text-[var(--qh-ink)] font-sans antialiased pb-16"
    >
      <AppHeader
        title="QPipeline Admin Ops"
        subtitle="Module 1 — AI Code Review Calibration Queue"
        backLink={{ href: '/admin', label: '← Back to Admin Ops' }}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 pt-8">
        <div className="gsap-header mb-8">
          <h1 className="text-2xl font-extrabold text-[var(--qh-ink-deep)] tracking-tight">
            Module 1 LLM & Human Review Calibration Queue
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Review candidate AI Code Review submissions side-by-side with LLM pre-grading rationales and calibrate 0–4 criterion scores.
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-[var(--qh-surface)]">
            Loading submission queue...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Queue Table */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-[var(--qh-surface)] shadow-sm overflow-hidden">
              <div className="p-4 bg-[var(--qh-bg)]/40 border-b border-[var(--qh-surface)] font-bold text-xs text-[var(--qh-ink-deep)] flex justify-between items-center">
                <span>Submissions ({queue.length})</span>
                <span className="text-[10px] text-slate-500 font-normal">LLM Pre-Graded</span>
              </div>

              <div className="divide-y divide-[var(--qh-surface)] max-h-[600px] overflow-y-auto">
                {queue.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No submissions in review queue.
                  </div>
                ) : (
                  queue.map((sub) => (
                    <div
                      key={sub.id}
                      onClick={() => handleSelectSubmission(sub)}
                      className={`p-4 cursor-pointer transition-colors text-xs flex items-center justify-between ${
                        selectedSubmission?.id === sub.id
                          ? 'bg-[var(--qh-surface)]/50 border-l-4 border-[var(--qh-accent-deep)]'
                          : 'hover:bg-[var(--qh-bg)]/30'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-[var(--qh-ink-deep)]">
                          Profile ID: {sub.fellowProfileId.slice(0, 8)}...
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Scenario: {sub.assignment?.slug || 'PR Diff'}
                        </div>
                        {sub.isLate && (
                          <span className="text-[10px] text-rose-600 font-bold">⚠️ Late Submission</span>
                        )}
                      </div>

                      <div className="text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            sub.status === 'graded'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {sub.status === 'graded' ? `${sub.finalScore}/16 Graded` : `Draft: ${sub.draftScore}/16`}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Calibration Drawer */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-[var(--qh-surface)] shadow-sm space-y-6">
              {!selectedSubmission ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  Select a submission from the queue to inspect and calibrate rubric scores.
                </div>
              ) : (
                <div className="space-y-6 text-xs">
                  <div className="flex items-center justify-between border-b border-[var(--qh-surface)] pb-4">
                    <div>
                      <h2 className="text-base font-bold text-[var(--qh-ink-deep)]">
                        Calibrate Submission • {selectedSubmission.id.slice(0, 8)}
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Candidate Profile UUID: {selectedSubmission.fellowProfileId}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-[var(--qh-ink-deep)]">
                        {calculateTotal(scores)} / 16
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Composite Score</div>
                    </div>
                  </div>

                  {/* Automated Heuristic Pre-Check Rationale */}
                  {selectedSubmission.llmEvaluation && (
                    <div className="p-4 bg-[var(--qh-bg)] border border-[var(--qh-surface)] rounded-xl space-y-1">
                      <div className="font-bold text-[var(--qh-ink-deep)] text-xs">⚡ Automated Heuristic Pre-Check (Local Reference)</div>
                      <p className="text-slate-700 text-[11px] leading-relaxed">
                        {selectedSubmission.llmEvaluation.rationale}
                      </p>
                    </div>
                  )}

                  {/* Candidate Submitted Issues */}
                  <div>
                    <h3 className="font-bold text-[var(--qh-ink-deep)] mb-3">
                      Candidate Reported Bug Findings ({selectedSubmission.identifiedIssues.length})
                    </h3>
                    <div className="space-y-3">
                      {selectedSubmission.identifiedIssues.map((bug, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 bg-[var(--qh-bg)]/40 rounded-xl border border-[var(--qh-surface)] space-y-1"
                        >
                          <div className="flex justify-between font-semibold">
                            <span className="uppercase text-[10px] text-[var(--qh-accent-deep)]">
                              Category: {bug.bugCategory}
                            </span>
                            <span className="uppercase text-[10px] text-rose-700">
                              Severity: {bug.severityRank}
                            </span>
                          </div>
                          <div>
                            <strong className="text-slate-700">Proposed Fix:</strong> {bug.proposedFix}
                          </div>
                          <div>
                            <strong className="text-slate-700">Reasoning:</strong> {bug.reasoning}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rubric Calibration Form */}
                  {errorMessage && (
                    <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
                      {errorMessage}
                    </div>
                  )}

                  <form onSubmit={handleFinalizeGrading} className="pt-4 border-t border-[var(--qh-surface)] space-y-4">
                    <h3 className="font-bold text-[var(--qh-ink-deep)]">
                      Admin 0–4 Rubric Calibration Sliders
                    </h3>

                    {/* Criterion 1 */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span>1. Issues Identified (0-4)</span>
                        <span className="font-bold text-[var(--qh-accent-deep)]">{scores.issuesIdentified} / 4</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={4}
                        value={scores.issuesIdentified}
                        onChange={(e) => setScores({ ...scores, issuesIdentified: Number(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    {/* Criterion 2 */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span>2. Severity Ranking (0-4)</span>
                        <span className="font-bold text-[var(--qh-accent-deep)]">{scores.severityRanking} / 4</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={4}
                        value={scores.severityRanking}
                        onChange={(e) => setScores({ ...scores, severityRanking: Number(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    {/* Criterion 3 */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span>3. Fix Quality (0-4)</span>
                        <span className="font-bold text-[var(--qh-accent-deep)]">{scores.fixQuality} / 4</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={4}
                        value={scores.fixQuality}
                        onChange={(e) => setScores({ ...scores, fixQuality: Number(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    {/* Criterion 4 */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span>4. Reasoning Clarity (0-4)</span>
                        <span className="font-bold text-[var(--qh-accent-deep)]">{scores.reasoningClarity} / 4</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={4}
                        value={scores.reasoningClarity}
                        onChange={(e) => setScores({ ...scores, reasoningClarity: Number(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 bg-[var(--qh-accent-deep)] hover:bg-[var(--qh-ink)] text-white font-semibold rounded-xl shadow-md transition-colors disabled:opacity-50"
                    >
                      {submitting ? 'Finalizing...' : 'Finalize Grade & Update Candidate Stage ➔'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
