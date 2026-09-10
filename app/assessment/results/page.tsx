'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { CandidateCompositeScore, CandidatePlacementTier } from '@/modules/assessment/types';
import {
  getMyCompositeScoreAction,
  calculateMyCompositeScoreAction,
} from '@/modules/assessment/actions';

export default function CandidateAssessmentResultsPage() {
  const [scoreRecord, setScoreRecord] = useState<CandidateCompositeScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
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
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.12,
        ease: 'power3.out',
      });
    },
    { scope: containerRef, dependencies: [loading] }
  );

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const res = await getMyCompositeScoreAction();
      if (res.success && res.data) {
        setScoreRecord(res.data);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const handleCalculateScore = async () => {
    setCalculating(true);
    setErrorMessage(null);
    const res = await calculateMyCompositeScoreAction();
    if (res.success && res.data) {
      setScoreRecord(res.data);
    } else {
      setErrorMessage(res.error || 'Failed to calculate candidate composite score');
    }
    setCalculating(false);
  };

  const renderTierBadge = (tier: CandidatePlacementTier) => {
    switch (tier) {
      case 'tier_1_global':
        return (
          <div className="inline-flex items-center space-x-2 bg-emerald-950/80 border border-emerald-500/50 px-4 py-2 rounded-full text-emerald-300 shadow-lg shadow-emerald-950/50">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">Tier 1 — Global Placement (Premium)</span>
          </div>
        );
      case 'tier_2_regional':
        return (
          <div className="inline-flex items-center space-x-2 bg-blue-950/80 border border-blue-500/50 px-4 py-2 rounded-full text-blue-300 shadow-lg shadow-blue-950/50">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">Tier 2 — Regional Direct Placement</span>
          </div>
        );
      case 'tier_3_bench':
        return (
          <div className="inline-flex items-center space-x-2 bg-amber-950/80 border border-amber-500/50 px-4 py-2 rounded-full text-amber-300 shadow-lg shadow-amber-950/50">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">Tier 3 — Farm System & Bench Upskilling</span>
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center space-x-2 bg-red-950/80 border border-red-500/50 px-4 py-2 rounded-full text-red-300">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Tier 4 — Ineligible / Remediation Required</span>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--qh-bg-dark)] text-white flex items-center justify-center p-6">
        <div className="flex items-center space-x-3 text-[var(--qh-ink-muted)]">
          <div className="w-5 h-5 border-2 border-t-[var(--qh-accent-primary)] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
          <span>Calculating composite score matrix...</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-[var(--qh-bg-dark)] text-white font-[family-name:var(--font-poppins)]">
      <AppHeader
        title="QPipeline Talent Platform"
        subtitle="Candidate Assessment Results & Tier Matrix"
        backLink={{ href: '/bootcamp', label: 'Bootcamp Workspace →' }}
      />

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="gsap-hero mb-8">
          <div className="inline-flex items-center space-x-2 bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-full px-4 py-1.5 text-xs text-[var(--qh-accent-glow)] mb-4">
            <span className="w-2 h-2 rounded-full bg-[var(--qh-accent-primary)] animate-pulse" />
            <span>Master Synthesis Engine — Multi-Stage Score Integration</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Assessment Results & Placement Tier
          </h2>
          <p className="text-sm text-[var(--qh-ink-muted)] max-w-3xl leading-relaxed">
            Your final composite score combines performance from your Baseline Coding Screen (15%), AI Code Review (25%), Timed Build Sandbox (35%), and Recorded Explanation Intake (25%).
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-sm">
            {errorMessage}
          </div>
        )}

        {/* State 1: Score Record Not Yet Calculated */}
        {!scoreRecord ? (
          <div className="gsap-card bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl p-8 max-w-2xl mx-auto text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-[var(--qh-accent-primary)]/10 border border-[var(--qh-accent-primary)]/30 flex items-center justify-center mx-auto text-2xl">
              📊
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Synthesize Your Composite Score</h3>
              <p className="text-sm text-[var(--qh-ink-muted)] leading-relaxed">
                Calculate your aggregate percentage across completed assessment stages and determine your placement tier eligibility.
              </p>
            </div>
            <div>
              <button
                onClick={handleCalculateScore}
                disabled={calculating}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[var(--qh-accent-primary)] hover:bg-[var(--qh-accent-deep)] text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-[var(--qh-accent-glow)]/20 disabled:opacity-50"
              >
                {calculating ? 'Calculating Composite Matrix...' : 'Calculate My Composite Score'}
              </button>
            </div>
          </div>
        ) : (
          /* State 2: Score Display & Tier Badge */
          <div className="space-y-8">
            {/* Top Score Banner */}
            <div className="gsap-card bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-3 text-center md:text-left">
                {renderTierBadge(scoreRecord.assignedTier)}
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  Master Composite Performance Matrix
                </h3>
                <p className="text-xs text-[var(--qh-ink-muted)] max-w-xl">
                  {scoreRecord.overrideApplied
                    ? `Admin Override Applied: ${scoreRecord.overrideReason}`
                    : 'Automated tier placement computed from weighted stage scores and security red-flag checks.'}
                </p>
              </div>

              <div className="text-center md:text-right border-t md:border-t-0 md:border-l border-[var(--qh-border)] pt-4 md:pt-0 md:pl-8">
                <span className="text-xs font-medium text-[var(--qh-ink-muted)] uppercase tracking-wider">
                  Overall Score
                </span>
                <div className="text-5xl font-extrabold text-[var(--qh-accent-glow)] font-mono tracking-tight mt-1">
                  {scoreRecord.overallCompositeScore}%
                </div>
                <button
                  onClick={handleCalculateScore}
                  disabled={calculating}
                  className="mt-3 text-xs text-[var(--qh-accent-primary)] hover:underline block mx-auto md:ml-auto"
                >
                  {calculating ? 'Recalculating...' : '🔄 Recalculate Score'}
                </button>
              </div>
            </div>

            {/* Stage Breakdown Cards (4 Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1: Baseline Screen (15%) */}
              <div className="gsap-card bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--qh-ink-muted)] uppercase">Stage 0 (15%)</span>
                  <span className="text-sm font-bold text-white font-mono">{scoreRecord.baselineScore}%</span>
                </div>
                <h4 className="text-sm font-bold text-white">Fundamentals Screen</h4>
                <p className="text-[11px] text-[var(--qh-ink-muted)]">Multiple-choice quiz & GitHub Actions coding screen.</p>
              </div>

              {/* Card 2: Module 1 AI Code Review (25%) */}
              <div className="gsap-card bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--qh-ink-muted)] uppercase">Module 1 (25%)</span>
                  <span className="text-sm font-bold text-white font-mono">{scoreRecord.module1Score}%</span>
                </div>
                <h4 className="text-sm font-bold text-white">AI Code Review</h4>
                <p className="text-[11px] text-[var(--qh-ink-muted)]">Bug identification & reasoning clarity in PR diffs.</p>
              </div>

              {/* Card 3: Module 2 Timed AI Build Sandbox (35%) */}
              <div className="gsap-card bg-[var(--qh-card-bg)] border border-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--qh-ink-muted)] uppercase">Module 2 (35%)</span>
                  <span className="text-sm font-bold text-white font-mono">{scoreRecord.module2Score}%</span>
                </div>
                <h4 className="text-sm font-bold text-white">Timed Build Sandbox</h4>
                <p className="text-[11px] text-[var(--qh-ink-muted)]">Codespace feature execution, trap handling & telemetry.</p>
              </div>

              {/* Card 4: Module 3 Recorded Video Explanation (25%) */}
              <div className="gsap-card bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--qh-ink-muted)] uppercase">Module 3 (25%)</span>
                  <span className="text-sm font-bold text-white font-mono">{scoreRecord.module3Score}%</span>
                </div>
                <h4 className="text-sm font-bold text-white">Recorded Explanation</h4>
                <p className="text-[11px] text-[var(--qh-ink-muted)]">3-minute video technical defense & AI transparency.</p>
              </div>
            </div>

            {/* Red Flag Status Banner */}
            {scoreRecord.isRedFlagged && (
              <div className="gsap-card p-5 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-center space-x-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <strong className="block text-white mb-0.5">Security / Telemetry Flag Triggered</strong>
                  <span>Your submission triggered a trap or red-flag condition. Placement tier is capped at Tier 3 pending human admin review.</span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
