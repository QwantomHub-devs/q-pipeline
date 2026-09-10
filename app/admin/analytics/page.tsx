'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import {
  getExecutiveAnalyticsOverviewAction,
  getMetabaseConnectionDetailsAction,
} from '@/modules/analytics/actions';
import {
  ExecutiveAnalyticsOverview,
  MetabaseConnectionDetails,
} from '@/modules/analytics/types';

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<ExecutiveAnalyticsOverview | null>(null);
  const [metabaseDetails, setMetabaseDetails] = useState<MetabaseConnectionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedQueryIndex, setCopiedQueryIndex] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, metabaseRes] = await Promise.all([
        getExecutiveAnalyticsOverviewAction(),
        getMetabaseConnectionDetailsAction(),
      ]);

      if (overviewRes.success && overviewRes.analytics) {
        setAnalytics(overviewRes.analytics);
      }
      if (metabaseRes.success && metabaseRes.details) {
        setMetabaseDetails(metabaseRes.details);
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to load analytics dashboard' });
    } finally {
      setLoading(false);
    }
  };

  const copySqlToClipboard = (sql: string, index: number) => {
    navigator.clipboard.writeText(sql);
    setCopiedQueryIndex(index);
    setTimeout(() => setCopiedQueryIndex(null), 2500);
  };

  return (
    <div className="min-h-screen bg-[var(--qh-bg)] text-[var(--qh-ink)] flex flex-col font-[family-name:var(--font-poppins)]">
      <AppHeader
        title="Executive Operations Analytics & Metabase BI Console"
        subtitle="End-to-end talent pipeline conversion, quality signals, bench health, and Metabase SQL BI reporting"
        badge={{ label: 'Phase 2 Service 20', variant: 'accent' }}
        backLink={{ href: '/admin', label: '← Back to Admin Panel' }}
      />

      <main className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 space-y-8">
        {notification && (
          <div
            className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
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

        {loading || !analytics ? (
          <div className="p-12 text-center text-xs text-[var(--qh-slate-600)] space-x-2 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-t-[var(--qh-accent-main)] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
            <span>Executing SQL aggregations across Supabase database tables...</span>
          </div>
        ) : (
          <>
            {/* North Star Placement Target Banner */}
            <div className="bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] p-6 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                      ★ Platform North Star Metric
                    </span>
                    <span className="text-xs text-[var(--qh-slate-600)]">Annual Target: 60 Global Placements</span>
                  </div>
                  <h2 className="text-xl font-bold text-[var(--qh-ink)] mt-1">
                    Global Placement Velocity: {analytics.northStar.currentGlobalPlacementsCount} / {analytics.northStar.annualTargetGlobalPlacements} Placements
                  </h2>
                  <p className="text-xs text-[var(--qh-slate-600)]">
                    Tracking cumulative global placement retention and talent monetization pipeline
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-extrabold text-amber-600 font-mono">
                    {analytics.northStar.targetProgressPercent}%
                  </div>
                  <span className="text-[10px] font-semibold text-[var(--qh-slate-600)] uppercase block">
                    Annual Goal Achievement
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[var(--qh-bg)] rounded-full h-3 overflow-hidden border border-[var(--qh-border)]">
                <div
                  className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${Math.min(analytics.northStar.targetProgressPercent, 100)}%` }}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-[var(--qh-border)] text-xs">
                <div>
                  <span className="text-[10px] text-[var(--qh-slate-600)] uppercase font-semibold block">Global Placements</span>
                  <strong className="text-sm font-bold text-emerald-600 font-mono">{analytics.northStar.currentGlobalPlacementsCount} Active</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--qh-slate-600)] uppercase font-semibold block">Regional Placements</span>
                  <strong className="text-sm font-bold text-[var(--qh-ink)] font-mono">{analytics.northStar.currentRegionalPlacementsCount} Active</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--qh-slate-600)] uppercase font-semibold block">Placement Retention</span>
                  <strong className="text-sm font-bold text-emerald-600 font-mono">{analytics.northStar.placementRetentionRatePercent}%</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--qh-slate-600)] uppercase font-semibold block">Avg Time to First Placement</span>
                  <strong className="text-sm font-bold text-[var(--qh-ink)] font-mono">{analytics.northStar.averageTimeToFirstPlacementDays} Days</strong>
                </div>
              </div>
            </div>

            {/* Pipeline Funnel Conversion Stream */}
            <div className="bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] p-6 shadow-sm space-y-6">
              <div className="border-b border-[var(--qh-border)] pb-4">
                <h3 className="text-base font-bold text-[var(--qh-ink)]">End-to-End Talent Pipeline Funnel Conversion</h3>
                <p className="text-xs text-[var(--qh-slate-600)]">
                  Candidate progression and conversion rate drop-off across Discover, Assess, Bootcamp, Bench, and Placement
                </p>
              </div>

              <div className="space-y-4">
                {analytics.funnel.stages.map((stage, idx) => (
                  <div key={stage.stage} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[var(--qh-ink)]">{idx + 1}. {stage.label}</span>
                      <div className="space-x-3 font-mono">
                        <span className="text-[var(--qh-ink)] font-bold">{stage.count} candidates</span>
                        <span className="text-emerald-600 font-semibold">({stage.conversionFromPreviousPercent}% conversion)</span>
                      </div>
                    </div>
                    <div className="w-full bg-[var(--qh-bg)] rounded-full h-2.5 overflow-hidden border border-[var(--qh-border)] flex">
                      <div
                        className="bg-[var(--qh-accent-main)] h-full transition-all duration-300"
                        style={{ width: `${Math.min((stage.count / analytics.funnel.totalApplicants) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quality Signals & Authenticity Gate Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assessment Tier Mix */}
              <div className="bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] p-6 shadow-sm space-y-4">
                <div className="border-b border-[var(--qh-border)] pb-3">
                  <h3 className="text-sm font-bold text-[var(--qh-ink)]">Assessment Quality & Tier Mix</h3>
                  <p className="text-[11px] text-[var(--qh-slate-600)]">
                    Tier 1 Global (85%+), Tier 2 Regional (65-84%), and Rejected breakdown
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Tier 1 Global</span>
                    <div className="text-2xl font-extrabold text-emerald-700 font-mono">{analytics.quality.tier1GlobalCount}</div>
                    <span className="text-[10px] text-emerald-600 font-medium">85%+ Composite</span>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block">Tier 2 Regional</span>
                    <div className="text-2xl font-extrabold text-amber-700 font-mono">{analytics.quality.tier2RegionalCount}</div>
                    <span className="text-[10px] text-amber-600 font-medium">65%-84% Composite</span>
                  </div>

                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-rose-800 uppercase block">Rejected / Below 65%</span>
                    <div className="text-2xl font-extrabold text-rose-700 font-mono">{analytics.quality.rejectedCount}</div>
                    <span className="text-[10px] text-rose-600 font-medium">&lt;65% Composite</span>
                  </div>
                </div>

                <div className="p-3 bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--qh-slate-600)] font-medium">Authenticity Gate Fail Rate:</span>
                    <span className="font-bold text-rose-600 font-mono">{analytics.quality.authenticityFailRatePercent}% ({analytics.quality.authenticityDisqualifiedCount} Disqualified)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--qh-slate-600)] font-medium">Average Composite Score:</span>
                    <span className="font-bold text-[var(--qh-ink)] font-mono">{analytics.quality.averageCompositeScore}%</span>
                  </div>
                </div>
              </div>

              {/* Bench Health & Operational Velocity */}
              <div className="bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] p-6 shadow-sm space-y-4">
                <div className="border-b border-[var(--qh-border)] pb-3">
                  <h3 className="text-sm font-bold text-[var(--qh-ink)]">Bench Pool & Financial Ledger Velocity</h3>
                  <p className="text-[11px] text-[var(--qh-slate-600)]">
                    Bench duration, SME project assignment rate, and Paystack payout success rate
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] space-y-1">
                    <span className="text-[10px] font-bold text-[var(--qh-slate-600)] uppercase block">Average Days on Bench</span>
                    <div className="text-2xl font-extrabold text-[var(--qh-ink)] font-mono">{analytics.bench.averageDaysOnBench} Days</div>
                    <span className="text-[10px] text-emerald-600 font-medium">Healthy Turnaround</span>
                  </div>

                  <div className="p-3 bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] space-y-1">
                    <span className="text-[10px] font-bold text-[var(--qh-slate-600)] uppercase block">SME Project Assignment Rate</span>
                    <div className="text-2xl font-extrabold text-emerald-600 font-mono">{analytics.bench.projectAssignmentRatePercent}%</div>
                    <span className="text-[10px] text-[var(--qh-slate-600)] font-medium">{analytics.bench.assignedToSmeProjects} Active Projects</span>
                  </div>
                </div>

                <div className="p-3 bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--qh-slate-600)] font-medium">Total Lifetime Stipends Credited:</span>
                    <span className="font-bold text-emerald-600 font-mono">${analytics.financial.totalLifetimeStipendsCredited.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--qh-slate-600)] font-medium">Paystack Payout Transfer Success Rate:</span>
                    <span className="font-bold text-emerald-600 font-mono">{analytics.financial.payoutSuccessRatePercent}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--qh-slate-600)] font-medium">Double-Entry Wallet Reconciliation Status:</span>
                    <span className="font-bold text-emerald-600 font-mono">✓ {analytics.financial.reconciledWalletsCount} / {analytics.financial.activeWalletsCount} Reconciled</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Metabase Direct SQL BI Hub */}
            {metabaseDetails && (
              <div className="bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--qh-border)] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-[var(--qh-ink)]">Metabase Direct Postgres SQL BI Hub</h3>
                    <p className="text-xs text-[var(--qh-slate-600)]">
                      Connect your self-hosted Metabase instance directly to the Supabase read replica
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600 border border-emerald-200 self-start sm:self-auto">
                    ✓ Direct Database SQL Read Replica Active
                  </span>
                </div>

                <div className="p-4 bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] space-y-2 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                    <div>Host: <strong className="text-[var(--qh-ink)]">{metabaseDetails.hostUrl}</strong></div>
                    <div>Database: <strong className="text-[var(--qh-ink)]">{metabaseDetails.databaseName}</strong></div>
                    <div>Connection Type: <strong className="text-[var(--qh-ink)]">{metabaseDetails.connectionType}</strong></div>
                  </div>
                  <div className="text-[11px] text-[var(--qh-slate-600)] pt-1">
                    Available Tables for Metabase Dashboards: <span className="font-mono text-[var(--qh-ink)] font-semibold">{metabaseDetails.tablesAvailable.join(', ')}</span>
                  </div>
                </div>

                {/* Pre-built SQL Queries */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-[var(--qh-ink)] uppercase tracking-wider">
                    Recommended Metabase Dashboard SQL Templates
                  </h4>

                  <div className="space-y-4">
                    {metabaseDetails.recommendedSqlQueries.map((q, idx) => (
                      <div key={idx} className="p-4 bg-[var(--qh-bg)] border border-[var(--qh-border)] rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-[var(--qh-ink)]">{q.title}</span>
                            <p className="text-[11px] text-[var(--qh-slate-600)]">{q.description}</p>
                          </div>
                          <button
                            onClick={() => copySqlToClipboard(q.sql, idx)}
                            className="px-3 py-1 bg-[var(--qh-accent-main)] text-white text-[11px] font-semibold rounded-lg hover:opacity-90 shadow-sm"
                          >
                            {copiedQueryIndex === idx ? '✓ Copied SQL!' : 'Copy SQL Query'}
                          </button>
                        </div>
                        <pre className="p-3 bg-black/90 text-emerald-400 font-mono text-[11px] rounded-lg overflow-x-auto border border-black">
                          {q.sql}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
