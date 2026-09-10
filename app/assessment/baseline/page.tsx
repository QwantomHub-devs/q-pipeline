'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { BaselineAssessmentRecord } from '@/modules/assessment/types';
import { getMyBaselineAssessmentAction, initiateBaselineAction } from '@/modules/assessment/actions';

export default function BaselineAssessmentPage() {
  const [assessment, setAssessment] = useState<BaselineAssessmentRecord | null>(null);
  const [githubUsername, setGithubUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from('.gsap-hero', {
        y: -20,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      });
      gsap.from('.gsap-card', {
        y: 30,
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
      const res = await getMyBaselineAssessmentAction();
      if (res.success && res.data) {
        setAssessment(res.data);
        if (res.data.githubUsername) {
          setGithubUsername(res.data.githubUsername);
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUsername.trim()) return;

    setSubmitting(true);
    setErrorMessage(null);
    const res = await initiateBaselineAction(githubUsername.trim());
    if (res.success && res.data) {
      setAssessment(res.data);
    } else {
      setErrorMessage(res.error || 'Failed to initiate baseline screen');
    }
    setSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            ✓ Stage 0 Passed
          </span>
        );
      case 'failed':
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 border border-rose-300">
            ✕ Did Not Pass
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
            ⟳ Screen In Progress
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-300">
            Not Started
          </span>
        );
    }
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[var(--qh-bg)] text-[var(--qh-ink)] font-sans antialiased pb-16"
    >
      <AppHeader
        title="QPipeline Candidate Portal"
        subtitle="Fundamentals Coding Screen & Baseline Assessment"
        backLink={{ href: '/assessment/results', label: '← Score Matrix' }}
      />

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 pt-10">
        {/* Hero Section */}
        <div className="gsap-hero bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-[var(--qh-surface)] shadow-xl mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--qh-accent-deep)] bg-[var(--qh-surface)]/40 px-2.5 py-1 rounded-md">
                  Stage 0 Screening
                </span>
                {assessment && getStatusBadge(assessment.status)}
              </div>
              <h1 className="text-3xl font-extrabold text-[var(--qh-ink-deep)] tracking-tight">
                Fundamentals Coding Screen
              </h1>
              <p className="text-sm text-slate-600 mt-1 max-w-xl">
                Standardized baseline check testing core language mechanics, algorithmic fundamentals, and code execution rigor.
              </p>
            </div>

            {assessment && (
              <div className="flex items-center gap-6 bg-[var(--qh-bg)]/50 p-4 rounded-xl border border-[var(--qh-surface)]">
                <div className="text-center">
                  <div className="text-2xl font-black text-[var(--qh-ink-deep)]">
                    {assessment.compositeScore}%
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Composite Score
                  </div>
                </div>
                <div className="h-8 w-px bg-[var(--qh-surface)]" />
                <div className="text-center">
                  <div className="text-sm font-semibold text-[var(--qh-ink-deep)]">
                    {assessment.quizScore}%
                  </div>
                  <div className="text-[10px] uppercase font-medium text-slate-500">Quiz (40%)</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-[var(--qh-ink-deep)]">
                    {assessment.codingScore}%
                  </div>
                  <div className="text-[10px] uppercase font-medium text-slate-500">Coding (60%)</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-[var(--qh-surface)]">
            Loading assessment status...
          </div>
        ) : (
          <div className="space-y-8">
            {/* Step 0: GitHub Username Setup */}
            {!assessment || !assessment.githubRepoUrl ? (
              <div className="gsap-card bg-white rounded-2xl p-8 border border-[var(--qh-surface)] shadow-sm">
                <h2 className="text-lg font-bold text-[var(--qh-ink-deep)] mb-2">
                  Initiate Stage 0 Screening
                </h2>
                <p className="text-sm text-slate-600 mb-6">
                  Provide your GitHub username to link your standardized Codespaces test repository.
                </p>

                {errorMessage && (
                  <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
                    {errorMessage}
                  </div>
                )}

                <form onSubmit={handleInitiate} className="flex flex-col sm:flex-row gap-4 max-w-md">
                  <input
                    type="text"
                    value={githubUsername}
                    onChange={(e) => setGithubUsername(e.target.value)}
                    placeholder="e.g. octocat"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--qh-surface)] bg-[var(--qh-bg)]/30 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--qh-accent)]"
                    required
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-[var(--qh-accent-deep)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--qh-ink)] transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Initiating...' : 'Start Assessment'}
                  </button>
                </form>
              </div>
            ) : null}

            {/* Assessment Steps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Fundamentals Quiz */}
              <div className="gsap-card bg-white rounded-2xl p-6 border border-[var(--qh-surface)] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--qh-accent-deep)] bg-[var(--qh-bg)] px-2.5 py-1 rounded-md">
                      Step 1 • Multiple Choice
                    </span>
                    {assessment && getStatusBadge(assessment.quizStatus)}
                  </div>
                  <h3 className="text-lg font-bold text-[var(--qh-ink-deep)] mb-2">
                    Fundamentals Quiz
                  </h3>
                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                    10 questions on data structures, algorithmic complexity, language mechanics, and async memory execution.
                  </p>

                  {assessment && assessment.feedback.quizSummary && (
                    <div className="p-3 bg-[var(--qh-bg)]/50 rounded-xl border border-[var(--qh-surface)] mb-4 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Correct Answers:</span>
                        <span className="font-bold text-[var(--qh-ink-deep)]">
                          {assessment.feedback.quizSummary.correctAnswers} / {assessment.feedback.quizSummary.totalQuestions}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Score:</span>
                        <span className="font-bold text-[var(--qh-accent-deep)]">
                          {assessment.quizScore}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <a
                  href="https://forms.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 bg-[var(--qh-bg)] hover:bg-[var(--qh-surface)] text-[var(--qh-ink-deep)] font-semibold text-xs rounded-xl border border-[var(--qh-surface)] text-center transition-colors block"
                >
                  Launch Google Forms Quiz ↗
                </a>
              </div>

              {/* Card 2: GitHub Classroom Sandbox */}
              <div className="gsap-card bg-white rounded-2xl p-6 border border-[var(--qh-surface)] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--qh-accent-deep)] bg-[var(--qh-bg)] px-2.5 py-1 rounded-md">
                      Step 2 • Practical Code
                    </span>
                    {assessment && getStatusBadge(assessment.codingStatus)}
                  </div>
                  <h3 className="text-lg font-bold text-[var(--qh-ink-deep)] mb-2">
                    Codespaces Devcontainer Task
                  </h3>
                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                    Solve 3 coding tasks in a standardized Docker devcontainer. Tests are automatically executed via GitHub Actions on push.
                  </p>

                  {assessment && assessment.githubRepoUrl && (
                    <div className="p-3 bg-[var(--qh-bg)]/50 rounded-xl border border-[var(--qh-surface)] mb-4 text-xs space-y-1">
                      <div className="flex justify-between truncate">
                        <span className="text-slate-600 shrink-0">Repository:</span>
                        <span className="font-mono text-[11px] text-[var(--qh-accent-deep)] truncate ml-2">
                          {assessment.githubRepoUrl}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Automated Grade:</span>
                        <span className="font-bold text-[var(--qh-accent-deep)]">
                          {assessment.codingScore}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {assessment?.githubRepoUrl ? (
                  <a
                    href={assessment.githubRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 bg-[var(--qh-accent-deep)] hover:bg-[var(--qh-ink)] text-white font-semibold text-xs rounded-xl text-center transition-colors block"
                  >
                    Open GitHub Repository ↗
                  </a>
                ) : (
                  <button
                    disabled
                    className="w-full py-2.5 px-4 bg-slate-100 text-slate-400 font-semibold text-xs rounded-xl text-center cursor-not-allowed block"
                  >
                    Set GitHub Username Above
                  </button>
                )}
              </div>
            </div>

            {/* Test Results Breakdown */}
            {assessment && assessment.feedback.testResults && assessment.feedback.testResults.length > 0 && (
              <div className="gsap-card bg-white rounded-2xl p-6 border border-[var(--qh-surface)] shadow-sm">
                <h3 className="text-base font-bold text-[var(--qh-ink-deep)] mb-4">
                  GitHub Actions Test Execution Feedback
                </h3>
                <div className="space-y-3">
                  {assessment.feedback.testResults.map((test, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                        test.passed
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50/60 border-rose-200 text-rose-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{test.passed ? '✓ PASS' : '✕ FAIL'}</span>
                        <span className="font-mono">{test.name}</span>
                      </div>
                      {test.durationMs && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {test.durationMs}ms
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
