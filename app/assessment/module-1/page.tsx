'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { CodeReviewSubmission, IdentifiedBugInput, BugCategory, BugSeverity } from '@/modules/assessment/types';
import {
  getMyModule1SubmissionAction,
  startModule1Action,
  submitModule1ReviewAction,
} from '@/modules/assessment/actions';

export default function Module1AssessmentPage() {
  const [submission, setSubmission] = useState<CodeReviewSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);

  // Form State for Bug Findings
  const [bugCategory, setBugCategory] = useState<BugCategory>('security');
  const [severityRank, setSeverityRank] = useState<BugSeverity>('critical');
  const [proposedFix, setProposedFix] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [findings, setFindings] = useState<IdentifiedBugInput[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from('.gsap-hero', {
        y: -20,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      });
      gsap.from('.gsap-pane', {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.15,
        ease: 'power3.out',
      });
    },
    { scope: containerRef, dependencies: [loading] }
  );

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const res = await getMyModule1SubmissionAction();
      if (res.success && res.data) {
        setSubmission(res.data);
        if (res.data.identifiedIssues && res.data.identifiedIssues.length > 0) {
          setFindings(res.data.identifiedIssues);
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // Timer Countdown Logic
  useEffect(() => {
    if (!submission || submission.status !== 'in_progress') return;

    const startedAtMs = new Date(submission.startedAt).getTime();
    const durationMs = 30 * 60 * 1000;

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - startedAtMs;
      const remainingMs = Math.max(0, durationMs - elapsedMs);
      const remainingSec = Math.floor(remainingMs / 1000);
      setTimeLeftSeconds(remainingSec);

      if (remainingSec <= 0 && !submitting && findings.length > 0) {
        clearInterval(interval);
        handleAutoSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [submission, findings, submitting]);

  const handleStart = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    const res = await startModule1Action();
    if (res.success && res.data) {
      setSubmission(res.data);
    } else {
      setErrorMessage(res.error || 'Failed to start Module 1 assessment');
    }
    setSubmitting(false);
  };

  const handleAddFinding = () => {
    if (proposedFix.trim().length < 10 || reasoning.trim().length < 10) {
      setErrorMessage('Proposed fix and reasoning must each be at least 10 characters.');
      return;
    }
    if (findings.length >= 3) {
      setErrorMessage('You can report up to 3 bug findings for this pull request.');
      return;
    }

    setErrorMessage(null);
    setFindings((prev) => [
      ...prev,
      {
        bugCategory,
        severityRank,
        proposedFix: proposedFix.trim(),
        reasoning: reasoning.trim(),
      },
    ]);

    // Reset inputs
    setProposedFix('');
    setReasoning('');
  };

  const handleRemoveFinding = (index: number) => {
    setFindings((prev) => prev.filter((_, i) => i !== index));
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submission) return;
    if (findings.length === 0) {
      setErrorMessage('Please add at least 1 bug finding before submitting.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    const res = await submitModule1ReviewAction(submission.id, findings);
    if (res.success && res.data) {
      setSubmission(res.data);
    } else {
      setErrorMessage(res.error || 'Failed to submit review findings.');
    }
    setSubmitting(false);
  };

  const handleAutoSubmit = async () => {
    if (!submission || submitting || findings.length === 0) return;
    setSubmitting(true);
    const res = await submitModule1ReviewAction(submission.id, findings);
    if (res.success && res.data) {
      setSubmission(res.data);
    }
    setSubmitting(false);
  };

  const formatTimer = (seconds: number | null) => {
    if (seconds === null) return '30:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[var(--qh-bg)] text-[var(--qh-ink)] font-sans antialiased pb-16"
    >
      <AppHeader
        title="QPipeline Candidate Portal"
        subtitle="Module 1 — AI Code Review Assessment"
        backLink={{ href: '/assessment/results', label: '← Score Matrix' }}
      >
        {submission && submission.status === 'in_progress' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-mono font-bold text-xs">
            <span>⏱ Timer:</span>
            <span>{formatTimer(timeLeftSeconds)}</span>
          </div>
        )}
      </AppHeader>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 pt-8">
        {/* Hero Section */}
        <div className="gsap-hero bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-[var(--qh-surface)] shadow-xl mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--qh-accent-deep)] bg-[var(--qh-surface)]/40 px-2.5 py-1 rounded-md">
                  Module 1 Assessment
                </span>
                {submission && (
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                      submission.status === 'graded'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : submission.status === 'submitted'
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                  >
                    {submission.status === 'graded'
                      ? '✓ Graded'
                      : submission.status === 'submitted'
                      ? '⏳ Calibration Queue'
                      : '⟳ In Progress'}
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-extrabold text-[var(--qh-ink-deep)] tracking-tight">
                AI Code Review & Judgment Screening
              </h1>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                Spot 3 planted issues (Hallucination, Logic Bug, Security Vulnerability) in an AI-generated Pull Request diff and propose clean fixes.
              </p>
            </div>

            {submission && submission.status === 'graded' && (
              <div className="bg-[var(--qh-bg)]/60 p-4 rounded-xl border border-[var(--qh-surface)] text-center">
                <div className="text-3xl font-black text-[var(--qh-ink-deep)]">
                  {submission.finalScore} / 16
                </div>
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Final Rubric Score
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-[var(--qh-surface)]">
            Loading assessment scenario...
          </div>
        ) : !submission ? (
          /* Start Screen */
          <div className="gsap-pane bg-white rounded-2xl p-10 border border-[var(--qh-surface)] shadow-sm text-center max-w-xl mx-auto">
            <h2 className="text-xl font-bold text-[var(--qh-ink-deep)] mb-3">
              Ready to Begin Module 1?
            </h2>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              You will be assigned a randomized Pull Request scenario. You will have <strong>30 minutes</strong> to identify up to 3 planted issues, rank severity, propose code fixes, and explain root cause reasoning.
            </p>

            {errorMessage && (
              <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                {errorMessage}
              </div>
            )}

            <button
              onClick={handleStart}
              disabled={submitting}
              className="px-8 py-3 bg-[var(--qh-accent-deep)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--qh-ink)] transition-colors shadow-md disabled:opacity-50"
            >
              {submitting ? 'Starting...' : 'Start 30-Min Code Review ➔'}
            </button>
          </div>
        ) : (
          /* Assessment Workspace Grid */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Pane: PR Diff Viewer */}
            <div className="lg:col-span-7 gsap-pane bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
              <div className="bg-slate-900/90 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono text-slate-400">
                    Pull Request Diff • {submission.assignment?.slug}
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                    {submission.assignment?.title}
                  </h3>
                </div>
              </div>

              <div className="p-6 overflow-x-auto font-mono text-xs leading-relaxed text-slate-200 flex-1">
                <pre className="whitespace-pre">
                  {submission.assignment?.diffContent.split('\n').map((line, idx) => {
                    const isAddition = line.startsWith('+');
                    const isDeletion = line.startsWith('-');
                    const isHeader = line.startsWith('@@');

                    return (
                      <div
                        key={idx}
                        className={`flex gap-4 px-2 py-0.5 rounded ${
                          isAddition
                            ? 'bg-emerald-950/70 text-emerald-300'
                            : isDeletion
                            ? 'bg-rose-950/70 text-rose-300'
                            : isHeader
                            ? 'bg-indigo-950/60 text-indigo-300 font-bold'
                            : 'text-slate-300'
                        }`}
                      >
                        <span className="text-slate-600 select-none text-right w-6">
                          {idx + 1}
                        </span>
                        <span>{line}</span>
                      </div>
                    );
                  })}
                </pre>
              </div>
            </div>

            {/* Right Pane: Bug Findings Form & Review Queue Banner */}
            <div className="lg:col-span-5 gsap-pane space-y-6">
              {submission.status === 'submitted' || submission.status === 'graded' ? (
                <div className="bg-white rounded-2xl p-6 border border-[var(--qh-surface)] shadow-sm space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs leading-relaxed">
                    <strong>✓ Review Submitted:</strong> Your findings have been pre-evaluated by our LLM engine and routed to the <strong>Admin Calibration Review Queue</strong>.
                  </div>

                  <h3 className="text-sm font-bold text-[var(--qh-ink-deep)]">
                    Submitted Bug Findings ({submission.identifiedIssues.length})
                  </h3>

                  <div className="space-y-3">
                    {submission.identifiedIssues.map((bug, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-[var(--qh-bg)]/40 rounded-xl border border-[var(--qh-surface)] text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span className="uppercase text-[10px] tracking-wider text-[var(--qh-accent-deep)]">
                            {bug.bugCategory}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-rose-100 text-rose-800">
                            {bug.severityRank}
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
              ) : (
                /* Active Form */
                <div className="bg-white rounded-2xl p-6 border border-[var(--qh-surface)] shadow-sm space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-[var(--qh-ink-deep)]">
                      Report Identified PR Issue ({findings.length} / 3)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Flag a planted bug, rank severity, and write clean fix code.
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
                      {errorMessage}
                    </div>
                  )}

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block font-semibold mb-1 text-[var(--qh-ink-deep)]">
                        Bug Category
                      </label>
                      <select
                        value={bugCategory}
                        onChange={(e) => setBugCategory(e.target.value as BugCategory)}
                        className="w-full px-3 py-2 rounded-xl border border-[var(--qh-surface)] bg-[var(--qh-bg)]/30 font-medium focus:outline-none focus:ring-2 focus:ring-[var(--qh-accent)]"
                      >
                        <option value="security">Security Vulnerability (Secret leak / Auth bypass)</option>
                        <option value="logic">Subtle Logic Bug (Off-by-one / Wrong operator)</option>
                        <option value="hallucination">Hallucinated API Call (Non-existent method)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1 text-[var(--qh-ink-deep)]">
                        Severity Ranking
                      </label>
                      <select
                        value={severityRank}
                        onChange={(e) => setSeverityRank(e.target.value as BugSeverity)}
                        className="w-full px-3 py-2 rounded-xl border border-[var(--qh-surface)] bg-[var(--qh-bg)]/30 font-medium focus:outline-none focus:ring-2 focus:ring-[var(--qh-accent)]"
                      >
                        <option value="critical">Critical Priority (Immediate blocker / Leak)</option>
                        <option value="warning">Warning Priority (Logic defect)</option>
                        <option value="info">Info Priority (Hallucination / Minor)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1 text-[var(--qh-ink-deep)]">
                        Proposed Code Fix
                      </label>
                      <textarea
                        rows={3}
                        value={proposedFix}
                        onChange={(e) => setProposedFix(e.target.value)}
                        placeholder="Write clean, minimal replacement code snippet..."
                        className="w-full p-3 rounded-xl border border-[var(--qh-surface)] bg-[var(--qh-bg)]/30 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[var(--qh-accent)]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1 text-[var(--qh-ink-deep)]">
                        Root Cause Reasoning
                      </label>
                      <textarea
                        rows={3}
                        value={reasoning}
                        onChange={(e) => setReasoning(e.target.value)}
                        placeholder="Explain why this code is problematic and what root cause it causes..."
                        className="w-full p-3 rounded-xl border border-[var(--qh-surface)] bg-[var(--qh-bg)]/30 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--qh-accent)]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddFinding}
                      disabled={findings.length >= 3}
                      className="w-full py-2.5 bg-[var(--qh-bg)] hover:bg-[var(--qh-surface)] text-[var(--qh-ink-deep)] font-semibold rounded-xl border border-[var(--qh-surface)] transition-colors disabled:opacity-50"
                    >
                      + Add Finding ({findings.length} / 3)
                    </button>
                  </div>

                  {/* List of Added Findings */}
                  {findings.length > 0 && (
                    <div className="pt-4 border-t border-[var(--qh-surface)] space-y-3">
                      <h4 className="text-xs font-bold text-[var(--qh-ink-deep)]">
                        Added Findings Queue
                      </h4>
                      {findings.map((f, i) => (
                        <div
                          key={i}
                          className="p-3 bg-[var(--qh-bg)]/50 rounded-xl border border-[var(--qh-surface)] text-xs flex justify-between items-start"
                        >
                          <div>
                            <span className="uppercase text-[10px] font-bold text-[var(--qh-accent-deep)] mr-2">
                              {f.bugCategory}
                            </span>
                            <span className="font-semibold">{f.severityRank}</span>
                            <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                              {f.proposedFix}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveFinding(i)}
                            className="text-rose-600 text-xs hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ))}

                      <form onSubmit={handleManualSubmit} className="pt-2">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="w-full py-3 bg-[var(--qh-accent-deep)] hover:bg-[var(--qh-ink)] text-white font-semibold text-xs rounded-xl shadow-md transition-colors disabled:opacity-50"
                        >
                          {submitting ? 'Submitting Review...' : 'Submit Final Review Findings ➔'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
