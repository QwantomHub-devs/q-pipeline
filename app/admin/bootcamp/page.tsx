'use client';

import React, { useState, useEffect, useRef } from 'react';
import AppHeader from '@/components/AppHeader';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  listTracksAction,
  createTrackAction,
  updateTrackAction,
  deleteTrackAction,
  listCohortsAdminAction,
  createCohortAction,
  updateCohortStatusAction,
  createMilestoneAction,
  gradeMilestoneAction,
  enrollFellowAction,
} from '@/modules/bootcamp/actions';
import { BootcampTrack, Cohort } from '@/modules/bootcamp/types';

export default function AdminBootcampPage() {
  const [activeTab, setActiveTab] = useState<'tracks' | 'cohorts'>('cohorts');
  const [tracks, setTracks] = useState<BootcampTrack[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dynamic Track Modal State
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [editingTrack, setEditingTrack] = useState<BootcampTrack | null>(null);
  const [trackForm, setTrackForm] = useState({ slug: '', name: '', description: '', isActive: true });

  // Cohort Modal State
  const [showCohortModal, setShowCohortModal] = useState(false);
  const [cohortForm, setCohortForm] = useState({
    name: '',
    trackSlug: '',
    capacity: 30,
    startDate: '',
    endDate: '',
    description: '',
  });

  // Milestone Modal State
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');
  const [milestoneForm, setMilestoneForm] = useState({ title: '', description: '', weekNumber: 1 });

  // Enroll Fellow Modal State
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ fellowProfileId: '', cohortId: '' });

  const containerRef = useRef<HTMLDivElement>(null);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [tList, cList] = await Promise.all([listTracksAction(), listCohortsAdminAction()]);
      setTracks(tList);
      setCohorts(cList);
      if (tList.length > 0 && !cohortForm.trackSlug) {
        setCohortForm((prev) => ({ ...prev, trackSlug: tList[0].slug }));
      }
    } catch (err: any) {
      console.error('Error loading admin bootcamp data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  useGSAP(
    () => {
      if (!loading) {
        gsap.from('.gsap-fade-up', {
          y: 15,
          opacity: 0,
          duration: 0.5,
          stagger: 0.08,
          ease: 'power2.out',
        });
      }
    },
    { scope: containerRef, dependencies: [loading, activeTab] }
  );

  // Dynamic Track Handlers
  const handleSaveTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      if (editingTrack) {
        await updateTrackAction({
          id: editingTrack.id,
          name: trackForm.name,
          description: trackForm.description,
          isActive: trackForm.isActive,
        });
        setActionMessage({ type: 'success', text: `Track '${trackForm.name}' updated successfully.` });
      } else {
        await createTrackAction(trackForm);
        setActionMessage({ type: 'success', text: `Dynamic Track '${trackForm.name}' created.` });
      }
      setShowTrackModal(false);
      setEditingTrack(null);
      setTrackForm({ slug: '', name: '', description: '', isActive: true });
      await refreshData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to save track' });
    }
  };

  const handleDeleteTrack = async (trackId: string, trackName: string) => {
    if (!confirm(`Are you sure you want to delete track '${trackName}'?`)) return;
    try {
      await deleteTrackAction(trackId);
      setActionMessage({ type: 'success', text: `Track '${trackName}' deleted.` });
      await refreshData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to delete track' });
    }
  };

  // Cohort Handlers
  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      await createCohortAction({
        name: cohortForm.name,
        trackSlug: cohortForm.trackSlug,
        capacity: Number(cohortForm.capacity),
        startDate: cohortForm.startDate || undefined,
        endDate: cohortForm.endDate || undefined,
        description: cohortForm.description || undefined,
      });
      setActionMessage({ type: 'success', text: `Cohort '${cohortForm.name}' created!` });
      setShowCohortModal(false);
      setCohortForm({ name: '', trackSlug: tracks[0]?.slug || '', capacity: 30, startDate: '', endDate: '', description: '' });
      await refreshData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to create cohort' });
    }
  };

  const handleUpdateStatus = async (cohortId: string, status: 'upcoming' | 'active' | 'completed' | 'cancelled') => {
    try {
      await updateCohortStatusAction({ cohortId, status });
      setActionMessage({ type: 'success', text: 'Cohort status updated.' });
      await refreshData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Milestone Handler
  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMilestoneAction({
        cohortId: selectedCohortId,
        title: milestoneForm.title,
        description: milestoneForm.description,
        weekNumber: Number(milestoneForm.weekNumber),
      });
      setActionMessage({ type: 'success', text: 'Milestone added to cohort.' });
      setShowMilestoneModal(false);
      setMilestoneForm({ title: '', description: '', weekNumber: 1 });
      await refreshData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Fellow Enrollment Handler
  const handleEnrollFellow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await enrollFellowAction(enrollForm);
      setActionMessage({ type: 'success', text: 'Candidate successfully enrolled into cohort!' });
      setShowEnrollModal(false);
      setEnrollForm({ fellowProfileId: '', cohortId: '' });
      await refreshData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[var(--qh-bg)] text-[var(--qh-ink)] flex flex-col">
      <AppHeader
        title="Bootcamp & Cohort Governance"
        subtitle="Dynamic Track Engine & Local Cohorts Manager"
        backLink={{ href: '/admin/assessment/scoring-matrix', label: '← Scoring Leaderboard' }}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-[var(--qh-border)] pb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('cohorts')}
              className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
                activeTab === 'cohorts'
                  ? 'bg-[var(--qh-accent-main)] text-white shadow-md'
                  : 'bg-[var(--qh-surface-subtle)] text-[var(--qh-slate-600)] hover:text-[var(--qh-ink)]'
              }`}
            >
              Cohorts Management ({cohorts.length})
            </button>
            <button
              onClick={() => setActiveTab('tracks')}
              className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
                activeTab === 'tracks'
                  ? 'bg-[var(--qh-accent-main)] text-white shadow-md'
                  : 'bg-[var(--qh-surface-subtle)] text-[var(--qh-slate-600)] hover:text-[var(--qh-ink)]'
              }`}
            >
              Dynamic Tracks ({tracks.length})
            </button>
          </div>

          <div>
            {activeTab === 'tracks' ? (
              <button
                onClick={() => {
                  setEditingTrack(null);
                  setTrackForm({ slug: '', name: '', description: '', isActive: true });
                  setShowTrackModal(true);
                }}
                className="px-4 py-2 bg-[var(--qh-accent-main)] hover:bg-[var(--qh-accent-deep)] text-white font-semibold text-xs rounded-xl transition-colors shadow-sm"
              >
                + Add Dynamic Track
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEnrollModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm"
                >
                  + Enroll Fellow
                </button>
                <button
                  onClick={() => setShowCohortModal(true)}
                  className="px-4 py-2 bg-[var(--qh-accent-main)] hover:bg-[var(--qh-accent-deep)] text-white font-semibold text-xs rounded-xl transition-colors shadow-sm"
                >
                  + Create Cohort
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Message Alert */}
        {actionMessage && (
          <div
            className={`p-4 rounded-xl text-sm font-medium border ${
              actionMessage.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
            }`}
          >
            {actionMessage.text}
          </div>
        )}

        {/* Dynamic Tracks Tab */}
        {activeTab === 'tracks' && (
          <div className="space-y-4">
            <p className="text-xs text-[var(--qh-slate-600)]">
              Admin-configurable track registry. Add, edit, or toggle tracks dynamically without hardcoding schema enums.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tracks.map((t) => (
                <div
                  key={t.id}
                  className="gsap-fade-up bg-[var(--qh-surface-card)] rounded-xl border border-[var(--qh-border)] p-6 space-y-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-[var(--qh-accent-deep)] uppercase">
                        slug: {t.slug}
                      </span>
                      <h3 className="text-xl font-bold text-[var(--qh-ink)] mt-1">{t.name}</h3>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-bold rounded-full ${
                        t.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-600'
                      }`}
                    >
                      {t.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <p className="text-sm text-[var(--qh-slate-600)] leading-relaxed">
                    {t.description || 'No description provided.'}
                  </p>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--qh-border)]">
                    <button
                      onClick={() => {
                        setEditingTrack(t);
                        setTrackForm({ slug: t.slug, name: t.name, description: t.description || '', isActive: t.isActive });
                        setShowTrackModal(true);
                      }}
                      className="px-3 py-1.5 bg-[var(--qh-surface-subtle)] text-xs font-semibold text-[var(--qh-ink)] rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Edit Track
                    </button>
                    <button
                      onClick={() => handleDeleteTrack(t.id, t.name)}
                      className="px-3 py-1.5 bg-rose-500/10 text-xs font-semibold text-rose-600 rounded-lg hover:bg-rose-500/20 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cohorts Management Tab */}
        {activeTab === 'cohorts' && (
          <div className="space-y-6">
            <div className="bg-[var(--qh-surface-card)] rounded-xl border border-[var(--qh-border)] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--qh-surface-subtle)] border-b border-[var(--qh-border)] text-xs uppercase font-semibold text-[var(--qh-slate-600)]">
                    <tr>
                      <th className="p-4">Cohort Name</th>
                      <th className="p-4">Dynamic Track</th>
                      <th className="p-4">Slot Capacity Usage</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--qh-border)]">
                    {cohorts.map((c) => {
                      const usagePercent = Math.round(((c.enrolledCount || 0) / c.capacity) * 100);

                      return (
                        <tr key={c.id} className="gsap-fade-up hover:bg-[var(--qh-bg)]/50 transition-colors">
                          <td className="p-4">
                            <span className="font-bold text-[var(--qh-ink)] block">{c.name}</span>
                            <span className="text-xs text-[var(--qh-slate-600)]">{c.description || 'No description'}</span>
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 bg-[var(--qh-accent-main)]/10 text-[var(--qh-accent-deep)] text-xs font-bold rounded-full">
                              {c.trackName || c.trackSlug}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1 max-w-xs">
                              <div className="flex justify-between text-xs font-medium">
                                <span>{c.enrolledCount || 0} / {c.capacity} slots</span>
                                <span className="font-bold">{c.availableSlots} available</span>
                              </div>
                              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    usagePercent >= 100 ? 'bg-rose-500' : 'bg-[var(--qh-accent-main)]'
                                  }`}
                                  style={{ width: `${Math.min(100, usagePercent)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <select
                              value={c.status}
                              onChange={(e) => handleUpdateStatus(c.id, e.target.value as any)}
                              className="text-xs font-semibold p-1.5 rounded-lg border border-[var(--qh-border)] bg-[var(--qh-surface-card)]"
                            >
                              <option value="upcoming">Upcoming</option>
                              <option value="active">Active</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setSelectedCohortId(c.id);
                                setShowMilestoneModal(true);
                              }}
                              className="px-3 py-1.5 bg-[var(--qh-surface-subtle)] text-xs font-semibold text-[var(--qh-accent-deep)] rounded-lg hover:bg-slate-200 transition-colors"
                            >
                              + Add Milestone
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Track Modal */}
        {showTrackModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--qh-surface-card)] border border-[var(--qh-border)] rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
              <h3 className="text-xl font-bold">{editingTrack ? 'Edit Dynamic Track' : 'Create Dynamic Track'}</h3>
              <form onSubmit={handleSaveTrack} className="space-y-4">
                {!editingTrack && (
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Track Slug (Unique ID)</label>
                    <input
                      type="text"
                      required
                      placeholder="fullstack_ai"
                      value={trackForm.slug}
                      onChange={(e) => setTrackForm({ ...trackForm, slug: e.target.value })}
                      className="w-full text-xs p-3 rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Track Display Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Fullstack AI Systems Engineering"
                    value={trackForm.name}
                    onChange={(e) => setTrackForm({ ...trackForm, name: e.target.value })}
                    className="w-full text-xs p-3 rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Comprehensive 12-week local track covering LLM orchestration & fullstack modern frameworks."
                    value={trackForm.description}
                    onChange={(e) => setTrackForm({ ...trackForm, description: e.target.value })}
                    className="w-full text-xs p-3 rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="trackActive"
                    checked={trackForm.isActive}
                    onChange={(e) => setTrackForm({ ...trackForm, isActive: e.target.checked })}
                    className="rounded text-[var(--qh-accent-main)]"
                  />
                  <label htmlFor="trackActive" className="text-xs font-semibold">Active Track</label>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--qh-border)]">
                  <button
                    type="button"
                    onClick={() => setShowTrackModal(false)}
                    className="px-4 py-2 bg-[var(--qh-surface-subtle)] text-xs font-semibold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--qh-accent-deep)]"
                  >
                    Save Track
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Cohort Modal */}
        {showCohortModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--qh-surface-card)] border border-[var(--qh-border)] rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
              <h3 className="text-xl font-bold">Create Local Track Cohort</h3>
              <form onSubmit={handleCreateCohort} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Cohort Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Lagos 2026-Q3 Cohort"
                    value={cohortForm.name}
                    onChange={(e) => setCohortForm({ ...cohortForm, name: e.target.value })}
                    className="w-full text-xs p-3 rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Select Dynamic Track</label>
                  <select
                    required
                    value={cohortForm.trackSlug}
                    onChange={(e) => setCohortForm({ ...cohortForm, trackSlug: e.target.value })}
                    className="w-full text-xs p-3 rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)] font-semibold"
                  >
                    {tracks.map((t) => (
                      <option key={t.id} value={t.slug}>
                        {t.name} ({t.slug})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Slot Capacity</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={cohortForm.capacity}
                    onChange={(e) => setCohortForm({ ...cohortForm, capacity: Number(e.target.value) })}
                    className="w-full text-xs p-3 rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--qh-border)]">
                  <button
                    type="button"
                    onClick={() => setShowCohortModal(false)}
                    className="px-4 py-2 bg-[var(--qh-surface-subtle)] text-xs font-semibold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--qh-accent-deep)]"
                  >
                    Create Cohort
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Milestone Modal */}
        {showMilestoneModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--qh-surface-card)] border border-[var(--qh-border)] rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
              <h3 className="text-xl font-bold">Add Cohort Milestone</h3>
              <form onSubmit={handleCreateMilestone} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Week Number</label>
                  <input
                    type="number"
                    min={1}
                    max={52}
                    required
                    value={milestoneForm.weekNumber}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, weekNumber: Number(e.target.value) })}
                    className="w-full text-xs p-3 rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Milestone Title</label>
                  <input
                    type="text"
                    required
                    placeholder="Week 1: Clean Architecture & Modular Monolith Setup"
                    value={milestoneForm.title}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                    className="w-full text-xs p-3 rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Build modular bounded contexts and submit GitHub PR link."
                    value={milestoneForm.description}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                    className="w-full text-xs p-3 rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--qh-border)]">
                  <button
                    type="button"
                    onClick={() => setShowMilestoneModal(false)}
                    className="px-4 py-2 bg-[var(--qh-surface-subtle)] text-xs font-semibold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--qh-accent-deep)]"
                  >
                    Save Milestone
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Enroll Fellow Modal */}
        {showEnrollModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--qh-surface-card)] border border-[var(--qh-border)] rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
              <h3 className="text-xl font-bold">Enroll Candidate into Cohort</h3>
              <form onSubmit={handleEnrollFellow} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Fellow Profile UUID</label>
                  <input
                    type="text"
                    required
                    placeholder="550e8400-e29b-41d4-a716-446655440000"
                    value={enrollForm.fellowProfileId}
                    onChange={(e) => setEnrollForm({ ...enrollForm, fellowProfileId: e.target.value })}
                    className="w-full text-xs p-3 rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Select Cohort</label>
                  <select
                    required
                    value={enrollForm.cohortId}
                    onChange={(e) => setEnrollForm({ ...enrollForm, cohortId: e.target.value })}
                    className="w-full text-xs p-3 rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)] font-semibold"
                  >
                    <option value="">-- Choose Cohort --</option>
                    {cohorts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.availableSlots} slots available)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--qh-border)]">
                  <button
                    type="button"
                    onClick={() => setShowEnrollModal(false)}
                    className="px-4 py-2 bg-[var(--qh-surface-subtle)] text-xs font-semibold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700"
                  >
                    Enroll Candidate
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
