'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useUser } from '@clerk/nextjs';
import { getMyProfile } from '@/modules/identity/actions';
import { getFellowBenchOverviewAction } from '@/modules/bench/actions';
import { BenchFellow, BenchAssignment } from '@/modules/bench/types';

export default function FellowBenchPage() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [benchRecord, setBenchRecord] = useState<BenchFellow | null>(null);
  const [activeAssignment, setActiveAssignment] = useState<BenchAssignment | null>(null);
  const [pastAssignments, setPastAssignments] = useState<BenchAssignment[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!isLoaded || !user) return;
      try {
        const spine = await getMyProfile();
        if (spine) {
          const res = await getFellowBenchOverviewAction(spine.id);
          if (res.success) {
            setBenchRecord(res.benchRecord || null);
            setActiveAssignment(res.activeAssignment || null);
            setPastAssignments(res.pastAssignments || []);
          }
        }
      } catch (err) {
        console.error('Failed to load bench overview:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user, isLoaded]);

  return (
    <div className="min-h-screen bg-[var(--qh-bg)] text-[var(--qh-ink)] flex flex-col">
      <AppHeader
        title="Bench & Farm-System Portal"
        subtitle="SME build projects, micro-tasks, and accrued stipend earnings"
        badge={{ label: 'Bench Farm-System', variant: 'accent' }}
        backLink={{ href: '/assessment/results', label: '← My Score Card' }}
      />

      <main className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 space-y-8">
        {loading ? (
          <div className="p-12 text-center text-sm text-[var(--qh-slate-600)]">Loading bench status...</div>
        ) : !benchRecord ? (
          <div className="p-12 text-center bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] max-w-2xl mx-auto space-y-4 shadow-sm">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              🌟
            </div>
            <h2 className="text-xl font-bold text-[var(--qh-ink)]">Not Currently in Bench Pool</h2>
            <p className="text-xs text-[var(--qh-slate-600)] leading-relaxed">
              You are currently active in assessment or bootcamp training. If placed in the Bench Tier, you will gain access to SME build project assignments here.
            </p>
            <Link
              href="/assessment/results"
              className="inline-block px-5 py-2.5 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-xl"
            >
              View Pipeline Score & Tier
            </Link>
          </div>
        ) : (
          <>
            {/* Top Status & Metrics Card */}
            <div className="bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] p-6 md:p-8 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--qh-border)] pb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-[var(--qh-accent-main)]/10 text-[var(--qh-accent-deep)] text-xs font-bold rounded-full uppercase tracking-wider">
                      Bench Candidate Pool
                    </span>
                    <span
                      className={`px-3 py-1 text-xs font-bold rounded-full capitalize ${
                        benchRecord.lifecycleStage === 'bench'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : benchRecord.lifecycleStage === 'placed'
                          ? 'bg-blue-500/10 text-blue-600'
                          : 'bg-slate-500/10 text-slate-600'
                      }`}
                    >
                      {(benchRecord.lifecycleStage || 'bench').replace('_', ' ')}
                    </span>
                  </div>
                  <h2 className="text-3xl font-extrabold text-[var(--qh-ink)]">{benchRecord.fullName}</h2>
                  <p className="text-xs text-[var(--qh-slate-600)] mt-1">Email: {benchRecord.email}</p>
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[var(--qh-slate-600)] block">
                      Projects Completed
                    </span>
                    <span className="text-2xl font-extrabold text-[var(--qh-ink)]">
                      {benchRecord.totalProjectsCompleted}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-[var(--qh-slate-600)] block">
                      Accrued Stipend Earnings
                    </span>
                    <span className="text-2xl font-extrabold text-emerald-600">
                      ${benchRecord.totalStipendEarned.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Active SME Assignment */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--qh-slate-600)]">
                  Active SME Build Project Assignment
                </h3>

                {!activeAssignment ? (
                  <div className="p-6 bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] text-xs text-[var(--qh-slate-600)] italic">
                    No active SME build project assigned right now. You are currently available for new project matches.
                  </div>
                ) : (
                  <div className="p-6 bg-[var(--qh-bg)] rounded-2xl border border-[var(--qh-border)] space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase bg-blue-500/10 text-blue-600">
                            Active Project
                          </span>
                          <span className="text-xs text-[var(--qh-slate-600)] font-medium">
                            Client: {activeAssignment.clientName || 'Partner SME'}
                          </span>
                        </div>
                        <h4 className="font-bold text-xl text-[var(--qh-ink)]">{activeAssignment.projectTitle}</h4>
                        <p className="text-xs text-[var(--qh-slate-600)] mt-0.5">Role: {activeAssignment.roleTitle}</p>
                      </div>

                      <div className="bg-[var(--qh-surface-card)] px-4 py-2 rounded-xl border border-[var(--qh-border)] text-right">
                        <span className="text-xl font-extrabold text-emerald-600">
                          ${activeAssignment.stipendAmount.toLocaleString()}
                        </span>
                        <span className="block text-[9px] uppercase font-bold text-[var(--qh-slate-600)]">
                          Project Stipend
                        </span>
                      </div>
                    </div>

                    {activeAssignment.notes && (
                      <p className="text-xs text-[var(--qh-slate-600)] bg-[var(--qh-surface-card)] p-3 rounded-lg border border-[var(--qh-border)] italic">
                        &quot;{activeAssignment.notes}&quot;
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Past Projects History */}
              {pastAssignments.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-[var(--qh-border)]">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--qh-slate-600)]">
                    Completed Project History ({pastAssignments.length})
                  </h3>

                  <div className="space-y-3">
                    {pastAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="p-4 bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm text-[var(--qh-ink)]">
                              {assignment.projectTitle}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase bg-emerald-500/10 text-emerald-600">
                              Completed
                            </span>
                          </div>
                          <p className="text-xs text-[var(--qh-slate-600)]">Role: {assignment.roleTitle}</p>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-sm text-emerald-600">
                            +${assignment.stipendAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
