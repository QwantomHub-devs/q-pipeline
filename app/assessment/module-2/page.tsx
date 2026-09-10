'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { BuildSandboxSubmission, BuildSandboxTicket } from '@/modules/assessment/types';
import {
  getMyModule2SubmissionAction,
  startModule2Action,
  submitModule2Action,
} from '@/modules/assessment/actions';

export default function Module2BuildSandboxPage() {
  const [submission, setSubmission] = useState<BuildSandboxSubmission | null>(null);
  const [ticket, setTicket] = useState<BuildSandboxTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const [repositoryUrlInput, setRepositoryUrlInput] = useState('');

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
      const res = await getMyModule2SubmissionAction();
      if (res.success && res.data) {
        setSubmission(res.data);
        if (res.data.ticket) {
          setTicket(res.data.ticket);
        }
        if (res.data.repositoryUrl) {
          setRepositoryUrlInput(res.data.repositoryUrl);
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // Timer Countdown Logic (90 min hard limit)
  useEffect(() => {
    if (!submission || submission.status !== 'in_progress') return;

    const startedAtMs = new Date(submission.startedAt).getTime();
    const durationMs = 90 * 60 * 1000;

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - startedAtMs;
      const remainingMs = Math.max(0, durationMs - elapsedMs);
      const remainingSec = Math.floor(remainingMs / 1000);
      setTimeLeftSeconds(remainingSec);
    }, 1000);

    return () => clearInterval(interval);
  }, [submission]);

  const handleStart = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    const res = await startModule2Action();
    if (res.success && res.data) {
      setSubmission(res.data.submission);
      setTicket(res.data.ticket);
    } else {
      setErrorMessage(res.error || 'Failed to start Module 2 assessment');
    }
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!submission) return;
    setSubmitting(true);
    setErrorMessage(null);

    const res = await submitModule2Action(submission.id, repositoryUrlInput || undefined);
    if (res.success && res.data) {
      setSubmission(res.data);
    } else {
      setErrorMessage(res.error || 'Failed to submit Module 2 assessment');
    }
    setSubmitting(false);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--qh-bg-dark)] text-white flex items-center justify-center p-6">
        <div className="flex items-center space-x-3 text-[var(--qh-ink-muted)]">
          <div className="w-5 h-5 border-2 border-t-[var(--qh-accent-primary)] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
          <span>Loading Module 2 Build Sandbox workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-[var(--qh-bg-dark)] text-white font-[family-name:var(--font-poppins)]">
      <AppHeader
        title="QPipeline Talent Platform"
        subtitle="Module 2 — Timed AI-Assisted Build Sandbox"
        backLink={{ href: '/assessment/results', label: '← Score Matrix' }}
      />

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="gsap-hero mb-8">
          <div className="inline-flex items-center space-x-2 bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-full px-4 py-1.5 text-xs text-[var(--qh-accent-glow)] mb-4">
            <span className="w-2 h-2 rounded-full bg-[var(--qh-accent-primary)] animate-pulse" />
            <span>Assessment Module 2 — Real-World Scenario Execution</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Timed AI-Assisted Build Sandbox
          </h2>
          <p className="text-sm text-[var(--qh-ink-muted)] max-w-3xl leading-relaxed">
            Execute a realistic feature ticket inside a standardized GitHub Codespace environment with AI coding assistance. Telemetry measures your verification behavior, trap handling, security awareness, and code quality.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-sm">
            {errorMessage}
          </div>
        )}

        {/* State 1: Not Started */}
        {!submission && (
          <div className="gsap-pane bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl p-8 max-w-3xl mx-auto text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-[var(--qh-accent-primary)]/10 border border-[var(--qh-accent-primary)]/30 flex items-center justify-center mx-auto text-2xl">
              💻
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Ready to Start Module 2?</h3>
              <p className="text-sm text-[var(--qh-ink-muted)] leading-relaxed">
                You will have <span className="text-white font-medium">90 minutes (+3 min network grace)</span> to solve an architecture & backend sync ticket. You can use Copilot / AI assistants in Codespaces, but automated telemetry monitors code verification, test runs, and planted secret leaks.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={handleStart}
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[var(--qh-accent-primary)] hover:bg-[var(--qh-accent-deep)] text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-[var(--qh-accent-glow)]/20 disabled:opacity-50"
              >
                {submitting ? 'Initializing Sandbox Ticket...' : 'Start 90-Minute Build Sandbox'}
              </button>
            </div>
          </div>
        )}

        {/* State 2: In Progress */}
        {submission && submission.status === 'in_progress' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Pane: Ticket & Codespace Link */}
            <div className="lg:col-span-2 space-y-6">
              <div className="gsap-pane bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--qh-accent-primary)]/10 text-[var(--qh-accent-glow)] border border-[var(--qh-accent-primary)]/30">
                    {ticket?.ticketCode || 'TICKET-204'}
                  </span>
                  <span className="text-xs text-[var(--qh-ink-muted)]">
                    Started: {new Date(submission.startedAt).toLocaleTimeString()}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white">{ticket?.title || 'Distributed Inventory Sync Ticket'}</h3>
                <p className="text-sm text-[var(--qh-ink-muted)] leading-relaxed">
                  {ticket?.scenarioDescription}
                </p>

                <div className="pt-4 border-t border-[var(--qh-border)] flex flex-wrap items-center gap-4">
                  <a
                    href={ticket?.codespaceTemplateUrl || 'https://github.com/codespaces/new'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all"
                  >
                    <span>Launch GitHub Codespace</span>
                    <span>↗</span>
                  </a>
                  <span className="text-xs text-[var(--qh-ink-muted)]">
                    Includes devcontainer pre-configured with telemetry extension.
                  </span>
                </div>
              </div>

              {/* Planted Traps & Telemetry Notice */}
              <div className="gsap-pane bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl p-6 space-y-3">
                <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
                  <span className="text-amber-400">⚠️</span>
                  <span>Assessment Criteria & Telemetry Rules</span>
                </h4>
                <ul className="text-xs text-[var(--qh-ink-muted)] space-y-2 list-disc list-inside">
                  <li>
                    <strong className="text-white">Verification Behavior (30%):</strong> Run tests and verify AI code outputs. Relying on AI without running tests triggers an auto red-flag.
                  </li>
                  <li>
                    <strong className="text-white">Security Awareness (15%):</strong> Inspect for planted client secrets. Never paste secret tokens into external LLM prompts.
                  </li>
                  <li>
                    <strong className="text-white">Code Quality & Correctness (40%):</strong> Clean architecture, error handling, and robust typing.
                  </li>
                </ul>
              </div>

              {/* Submission Form */}
              <div className="gsap-pane bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl p-6 space-y-4">
                <h4 className="text-sm font-semibold text-white">Submit Completed Repository</h4>
                <p className="text-xs text-[var(--qh-ink-muted)]">
                  Provide your completed repository link once you commit your solution in Codespaces.
                </p>
                <div>
                  <label className="block text-xs font-medium text-[var(--qh-ink-muted)] mb-1">
                    GitHub Repository URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={repositoryUrlInput}
                    onChange={(e) => setRepositoryUrlInput(e.target.value)}
                    placeholder="https://github.com/your-username/my-sandbox-submission"
                    className="w-full bg-[var(--qh-bg-dark)] border border-[var(--qh-border)] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--qh-accent-primary)]"
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-[var(--qh-accent-primary)] hover:bg-[var(--qh-accent-deep)] text-white font-medium text-sm transition-all disabled:opacity-50"
                >
                  {submitting ? 'Submitting Sandbox Work...' : 'Finalize & Submit Build Sandbox'}
                </button>
              </div>
            </div>

            {/* Right Pane: Countdown & Info */}
            <div className="space-y-6">
              <div className="gsap-pane bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl p-6 text-center space-y-3">
                <span className="text-xs font-medium text-[var(--qh-ink-muted)] uppercase tracking-wider">
                  Remaining Hard Timer
                </span>
                <div className="text-4xl font-extrabold font-mono text-[var(--qh-accent-glow)] tracking-tight">
                  {timeLeftSeconds !== null ? formatTimer(timeLeftSeconds) : '90:00'}
                </div>
                <p className="text-xs text-[var(--qh-ink-muted)]">
                  Includes a 3-minute grace window for repository pushes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* State 3: Submitted / Graded */}
        {submission && submission.status !== 'in_progress' && (
          <div className="gsap-pane bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl p-8 max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--qh-border)] pb-4">
              <div>
                <span className="text-xs font-medium text-[var(--qh-ink-muted)] uppercase">Status</span>
                <h3 className="text-xl font-bold text-white capitalize">{submission.status}</h3>
              </div>
              <div className="text-right">
                <span className="text-xs font-medium text-[var(--qh-ink-muted)] uppercase">Weighted Score</span>
                <div className="text-2xl font-extrabold text-[var(--qh-accent-glow)]">
                  {submission.status === 'graded' ? `${submission.weightedScore}%` : 'Pending Review'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs text-[var(--qh-ink-muted)]">
              <div>
                <span className="block text-[var(--qh-ink-muted)]">Submitted At:</span>
                <strong className="text-white">{submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'N/A'}</strong>
              </div>
              <div>
                <span className="block text-[var(--qh-ink-muted)]">Time Spent:</span>
                <strong className="text-white">{submission.timeSpentSeconds ? `${Math.round(submission.timeSpentSeconds / 60)} min` : 'N/A'}</strong>
              </div>
              <div>
                <span className="block text-[var(--qh-ink-muted)]">Planted Secret Trap:</span>
                <strong className={submission.plantedTrapTriggered ? 'text-amber-400' : 'text-emerald-400'}>
                  {submission.plantedTrapTriggered ? 'Triggered / Leaked' : 'Passed Cleanly'}
                </strong>
              </div>
              <div>
                <span className="block text-[var(--qh-ink-muted)]">Auto Red-Flag Rule:</span>
                <strong className={submission.autoRedFlagTriggered ? 'text-red-400' : 'text-emerald-400'}>
                  {submission.autoRedFlagTriggered ? 'Triggered (Blind AI Trust)' : 'Clean'}
                </strong>
              </div>
            </div>

            {submission.status === 'graded' && (
              <div className="p-4 rounded-xl bg-[var(--qh-bg-dark)] border border-[var(--qh-border)] space-y-2">
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Rubric Calibration Breakdown</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>Correctness: <strong className="text-white">{submission.criterionScores.correctness}/4</strong></div>
                  <div>Verification: <strong className="text-white">{submission.criterionScores.verificationBehavior}/4</strong></div>
                  <div>Security: <strong className="text-white">{submission.criterionScores.securityAwareness}/4</strong></div>
                  <div>Code Quality: <strong className="text-white">{submission.criterionScores.codeQuality}/4</strong></div>
                  <div>Efficiency: <strong className="text-white">{submission.criterionScores.efficiency}/4</strong></div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
