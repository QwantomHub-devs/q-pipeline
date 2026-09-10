'use client';

import React, { useState, useEffect } from 'react';
import AppHeader from '@/components/AppHeader';
import { PremiumEligibilityGate, PremiumShortlist } from '@/modules/premium/types';
import {
  getFellowEligibilityAction,
  evaluateEligibilityAction,
} from '@/modules/premium/actions';

export default function FellowPremiumPage() {
  const [gate, setGate] = useState<PremiumEligibilityGate | null>(null);
  const [shortlists, setShortlists] = useState<PremiumShortlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadEligibilityData();
  }, []);

  const loadEligibilityData = async () => {
    setLoading(true);
    try {
      const res = await getFellowEligibilityAction();
      if (res.success) {
        setGate(res.gate || null);
        setShortlists(res.shortlists || []);
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to load eligibility overview' });
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateEligibility = async () => {
    setEvaluating(true);
    try {
      const res = await evaluateEligibilityAction();
      if (res.success && res.gate) {
        setGate(res.gate);
        setNotification({
          type: res.gate.eligibilityStatus === 'eligible' ? 'success' : 'error',
          message:
            res.gate.eligibilityStatus === 'eligible'
              ? 'Congratulations! You are ELIGIBLE for the Seelicongate Premium Global Placement Track.'
              : `Eligibility check result: ${res.gate.eligibilityStatus.toUpperCase()}. ${res.gate.eligibilityReason}`,
        });
        loadEligibilityData();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Evaluation failed' });
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--qh-bg)] text-[var(--qh-ink)]">
      <AppHeader
        title="Seelicongate Premium Global Placement Track"
        subtitle="Tier 1 Global Partner Placements, Deel Payroll, Loan Financing & Work-Tool Integration"
        badge={{ label: 'Phase 4 Service 25', variant: 'accent' }}
        backLink={{ href: '/', label: '← Dashboard' }}
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

        {loading ? (
          <div className="p-12 text-center text-sm text-[var(--qh-slate-600)]">Checking eligibility records...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Eligibility Gate Status */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-[var(--qh-surface-card)] p-6 rounded-2xl border border-[var(--qh-border)] shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-[var(--qh-slate-600)] uppercase tracking-wider">
                    Eligibility Gate Status
                  </h3>
                  {gate && (
                    <span
                      className={`px-3 py-1 text-xs font-bold rounded-full ${
                        gate.eligibilityStatus === 'eligible'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-200'
                          : gate.eligibilityStatus === 'ineligible'
                          ? 'bg-rose-500/10 text-rose-600 border border-rose-200'
                          : 'bg-amber-500/10 text-amber-600 border border-amber-200'
                      }`}
                    >
                      {gate.eligibilityStatus.toUpperCase()}
                    </span>
                  )}
                </div>

                {gate ? (
                  <div className="space-y-4">
                    <p className="text-xs text-[var(--qh-slate-600)] leading-relaxed italic">
                      &quot;{gate.eligibilityReason}&quot;
                    </p>

                    {/* Criteria Breakdown List */}
                    <div className="p-4 bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] space-y-3">
                      <h4 className="text-xs font-bold text-[var(--qh-ink)] mb-2">Gate Qualification Criteria</h4>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--qh-slate-600)]">Top Tier Classification:</span>
                        <span className={`font-semibold ${gate.tierConfirmed ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {gate.tierConfirmed ? '✓ Confirmed' : '✗ Pending'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--qh-slate-600)]">Assessment Score (≥ 70%):</span>
                        <span className={`font-semibold ${gate.scoreThresholdMet ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {gate.scoreThresholdMet ? '✓ Passed' : '✗ Below Threshold'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--qh-slate-600)]">Signed Onboarding Contract:</span>
                        <span className={`font-semibold ${gate.contractSigned ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {gate.contractSigned ? '✓ Verified' : '✗ Required'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--qh-slate-600)]">Authenticity & Anti-Cheat Audit:</span>
                        <span className={`font-semibold ${gate.authenticityPassed ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {gate.authenticityPassed ? '✓ Clean Audit' : '✗ Under Review'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleEvaluateEligibility}
                      disabled={evaluating}
                      className="w-full py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-sm"
                    >
                      {evaluating ? 'Evaluating Gate...' : '🔄 Re-evaluate Eligibility Status'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-3">
                    <p className="text-xs text-[var(--qh-slate-600)]">
                      Your profile has not been evaluated for the Premium Global Placement Track yet.
                    </p>
                    <button
                      onClick={handleEvaluateEligibility}
                      disabled={evaluating}
                      className="px-4 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-sm"
                    >
                      {evaluating ? 'Running Gate Check...' : '✨ Run Eligibility Gate Check'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Seelicongate Shortlist & Nomination Pipeline */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[var(--qh-surface-card)] p-6 rounded-2xl border border-[var(--qh-border)] shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-base text-[var(--qh-ink)]">Seelicongate Partner Nominations</h3>
                    <p className="text-xs text-[var(--qh-slate-600)]">Curated shortlists and active application status</p>
                  </div>
                </div>

                {shortlists.length === 0 ? (
                  <div className="p-8 text-center bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] text-xs text-[var(--qh-slate-600)] space-y-2">
                    <p className="font-semibold text-[var(--qh-ink)]">No active partner nominations.</p>
                    <p>
                      When you qualify for the Premium Track, QwantomHub reviewers will curate your profile into shortlists for open global roles with Seelicongate partners.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {shortlists.map((shortlist) => (
                      <div
                        key={shortlist.id}
                        className="p-5 bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--qh-accent-deep)]">
                              Global Partner Track
                            </span>
                            <h4 className="font-bold text-base text-[var(--qh-ink)]">{shortlist.shortlistName}</h4>
                          </div>

                          <span
                            className={`px-3 py-1 text-xs font-bold rounded-full ${
                              shortlist.status === 'accepted'
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-200'
                                : shortlist.status === 'nominated'
                                ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-200'
                                : shortlist.status === 'declined'
                                ? 'bg-rose-500/10 text-rose-600 border border-rose-200'
                                : 'bg-amber-500/10 text-amber-600 border border-amber-200'
                            }`}
                          >
                            {shortlist.status.toUpperCase()}
                          </span>
                        </div>

                        {shortlist.notes && (
                          <p className="text-xs text-[var(--qh-slate-600)] italic">&quot;{shortlist.notes}&quot;</p>
                        )}

                        {/* Nomination Stage Timeline */}
                        <div className="pt-3 border-t border-[var(--qh-border)] flex items-center justify-between text-xs text-[var(--qh-slate-600)]">
                          <div className="flex items-center gap-1.5 font-semibold text-[var(--qh-ink)]">
                            <span>1. Shortlisted</span> → <span>2. Nominated</span> → <span>3. Partner Acceptance</span>
                          </div>
                          <span className="text-[11px] font-mono">Curated: {new Date(shortlist.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
