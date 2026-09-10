'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useUser } from '@clerk/nextjs';
import { getMyProfile } from '@/modules/identity/actions';
import { getFellowOpportunitiesAction } from '@/modules/matching/actions';
import { FellowMatch, Opportunity } from '@/modules/matching/types';

export default function FellowOpportunitiesPage() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<(FellowMatch & { opportunity: Opportunity })[]>([]);
  const [fellowId, setFellowId] = useState<string | null>(null);
  const [expressedInterest, setExpressedInterest] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadData() {
      if (!isLoaded || !user) return;
      try {
        const spine = await getMyProfile();
        if (spine) {
          setFellowId(spine.id);
          const res = await getFellowOpportunitiesAction(spine.id);
          if (res.success && res.matches) {
            setMatches(res.matches);
          }
        }
      } catch (err) {
        console.error('Failed to load fellow opportunities:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user, isLoaded]);

  const toggleInterest = (opportunityId: string) => {
    setExpressedInterest((prev) => ({
      ...prev,
      [opportunityId]: !prev[opportunityId],
    }));
  };

  return (
    <div className="min-h-screen bg-[var(--qh-bg)] text-[var(--qh-ink)] flex flex-col">
      <AppHeader
        title="Opportunity Placement Explorer"
        subtitle="Matched client job postings, SME projects, and staffing gigs"
        badge={{ label: 'Matching Engine', variant: 'accent' }}
        backLink={{ href: '/assessment/results', label: '← My Score Card' }}
      />

      <main className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--qh-surface-card)] p-6 rounded-2xl border border-[var(--qh-border)] shadow-sm">
          <div>
            <h2 className="text-2xl font-extrabold text-[var(--qh-ink)]">Matched Opportunities</h2>
            <p className="text-xs text-[var(--qh-slate-600)] mt-1">
              Opportunities dynamically matched to your composite assessment score and tier qualification
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/bootcamp"
              className="px-4 py-2 bg-[var(--qh-surface-subtle)] text-[var(--qh-accent-deep)] text-xs font-semibold rounded-lg hover:bg-[var(--qh-accent-main)] hover:text-white transition-all"
            >
              My Bootcamp Workspace →
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-[var(--qh-slate-600)]">
            Analyzing candidate profile and matching opportunities...
          </div>
        ) : matches.length === 0 ? (
          <div className="p-12 text-center bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] max-w-2xl mx-auto space-y-4 shadow-sm">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              🎯
            </div>
            <h3 className="text-xl font-bold">No Matching Opportunities Available Yet</h3>
            <p className="text-xs text-[var(--qh-slate-600)] leading-relaxed">
              Once new client postings match your skill profile or placement tier, they will automatically appear here.
            </p>
            <Link
              href="/assessment/results"
              className="inline-block px-5 py-2.5 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-xl"
            >
              Review Pipeline Assessment Score
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {matches.map(({ opportunity, matchScore, skillMatchPercent, tierEligible, status }) => {
              const isInterested = Boolean(expressedInterest[opportunity.id]);

              return (
                <div
                  key={opportunity.id}
                  className="bg-[var(--qh-surface-card)] p-6 rounded-2xl border border-[var(--qh-border)] shadow-sm hover:border-[var(--qh-accent-main)] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase bg-[var(--qh-accent-main)]/10 text-[var(--qh-accent-deep)]">
                            {opportunity.opportunityType.replace('_', ' ')}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase bg-emerald-500/10 text-emerald-600">
                            {opportunity.status}
                          </span>
                        </div>
                        <h3 className="font-bold text-lg text-[var(--qh-ink)]">{opportunity.title}</h3>
                        <p className="text-xs text-[var(--qh-slate-600)]">
                          Client: <span className="font-semibold text-[var(--qh-ink)]">{opportunity.clientName}</span> |{' '}
                          {opportunity.location}
                        </p>
                      </div>

                      <div className="text-right bg-[var(--qh-bg)] px-3 py-1.5 rounded-xl border border-[var(--qh-border)]">
                        <span className="text-lg font-extrabold text-[var(--qh-accent-deep)]">{matchScore}%</span>
                        <span className="block text-[9px] text-[var(--qh-slate-600)] font-semibold uppercase">
                          Compatibility
                        </span>
                      </div>
                    </div>

                    {opportunity.description && (
                      <p className="text-xs text-[var(--qh-slate-600)] mb-4 leading-relaxed">
                        {opportunity.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] text-xs">
                      <div>
                        <span className="text-[var(--qh-slate-600)] block font-semibold">Compensation</span>
                        <span className="font-bold text-[var(--qh-accent-deep)]">
                          {opportunity.compensationRange}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--qh-slate-600)] block font-semibold">Required Tier</span>
                        <span className="font-semibold text-[var(--qh-ink)]">{opportunity.requiredTier}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {opportunity.requiredSkills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 text-[11px] font-medium bg-[var(--qh-bg)] text-[var(--qh-slate-600)] border border-[var(--qh-border)] rounded-md"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[var(--qh-border)]">
                    <span className="text-xs text-[var(--qh-slate-600)] font-medium">
                      Status: <strong className="text-[var(--qh-ink)] capitalize">{status}</strong>
                    </span>

                    <button
                      onClick={() => toggleInterest(opportunity.id)}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all shadow-sm ${
                        isInterested
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[var(--qh-accent-main)] hover:bg-[var(--qh-accent-deep)] text-white'
                      }`}
                    >
                      {isInterested ? '✓ Interest Submitted' : 'Express Interest'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
