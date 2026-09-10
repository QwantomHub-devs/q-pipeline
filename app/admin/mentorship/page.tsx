'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { Mentor, MentorAssignment, MentorSession, EnhancedMentorMatch } from '@/modules/mentorship/types';
import {
  registerMentorAction,
  updateMentorAction,
  deleteMentorAction,
  assignMentorAction,
  unassignMentorAction,
  getMentorsListAction,
  scheduleSessionAction,
  autoMatchFellowAction,
  listEnhancedMatchesAction,
  rebalanceWorkloadAction,
} from '@/modules/mentorship/actions';

export default function AdminMentorshipPage() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [matches, setMatches] = useState<EnhancedMentorMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpertise, setSelectedExpertise] = useState<string>('all');
  const [showAddMentorModal, setShowAddMentorModal] = useState(false);
  const [showEditMentorModal, setShowEditMentorModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showAutoMatchModal, setShowAutoMatchModal] = useState(false);
  const [autoMatchFellowId, setAutoMatchFellowId] = useState('');
  const [showRebalanceModal, setShowRebalanceModal] = useState(false);
  const [rebalanceReason, setRebalanceReason] = useState('');

  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);

  // Clean empty form state for adding a mentor
  const [newMentor, setNewMentor] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
    expertiseStr: '',
    maxMentees: 5,
    bio: '',
  });

  // Form state for editing a mentor
  const [editMentorForm, setEditMentorForm] = useState({
    id: '',
    name: '',
    email: '',
    company: '',
    role: '',
    expertiseStr: '',
    maxMentees: 5,
    status: 'active' as 'active' | 'inactive' | 'on_leave',
    bio: '',
  });

  // Clean empty form state for assignment
  const [assignForm, setAssignForm] = useState({
    targetType: 'cohort' as 'cohort' | 'fellow',
    targetId: '',
    targetName: '',
    notes: '',
  });

  // Clean empty form state for session scheduling
  const [sessionForm, setSessionForm] = useState({
    targetType: 'cohort' as 'cohort' | 'fellow',
    targetId: '',
    title: '',
    description: '',
    meetingUrl: '',
    scheduledAt: '',
    durationMinutes: 45,
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchMentors();
  }, []);

  const fetchMentors = async () => {
    setLoading(true);
    try {
      const res = await getMentorsListAction();
      if (res.success && res.mentors) {
        setMentors(res.mentors);
      }
      const matchRes = await listEnhancedMatchesAction();
      if (matchRes.success && matchRes.matches) {
        setMatches(matchRes.matches);
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to load mentors & matches' });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!autoMatchFellowId) return;

    try {
      const res = await autoMatchFellowAction({
        fellowProfileId: autoMatchFellowId,
        forceReassign: true,
      });

      if (res.success && res.match) {
        setNotification({
          type: 'success',
          message: `Fellow ${autoMatchFellowId} auto-matched to ${res.match.mentorName} (${res.match.compatibilityScore}% compatibility).`,
        });
        setShowAutoMatchModal(false);
        setAutoMatchFellowId('');
        fetchMentors();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Auto-matching failed' });
    }
  };

  const handleRebalanceWorkload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentor) return;

    try {
      const res = await rebalanceWorkloadAction({
        mentorId: selectedMentor.id,
        reason: rebalanceReason || 'Admin triggered workload rebalance',
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: `Workload re-balanced for mentor '${selectedMentor.name}'. ${res.reassignedCount} fellow(s) reassigned.`,
        });
        setShowRebalanceModal(false);
        setRebalanceReason('');
        fetchMentors();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Workload rebalance failed' });
    }
  };

  const handleRegisterMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const expertiseList = newMentor.expertiseStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await registerMentorAction({
        name: newMentor.name,
        email: newMentor.email,
        company: newMentor.company,
        role: newMentor.role,
        expertise: expertiseList,
        maxMentees: Number(newMentor.maxMentees),
        bio: newMentor.bio,
      });

      if (res.success && res.mentor) {
        setNotification({ type: 'success', message: `Mentor '${res.mentor.name}' onboarded successfully.` });
        setShowAddMentorModal(false);
        setNewMentor({
          name: '',
          email: '',
          company: '',
          role: '',
          expertiseStr: '',
          maxMentees: 5,
          bio: '',
        });
        fetchMentors();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to register mentor' });
    }
  };

  const handleUpdateMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const expertiseList = editMentorForm.expertiseStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await updateMentorAction(editMentorForm.id, {
        name: editMentorForm.name,
        email: editMentorForm.email,
        company: editMentorForm.company,
        role: editMentorForm.role,
        expertise: expertiseList,
        maxMentees: Number(editMentorForm.maxMentees),
        status: editMentorForm.status,
        bio: editMentorForm.bio,
      });

      if (res.success && res.mentor) {
        setNotification({ type: 'success', message: `Mentor '${res.mentor.name}' updated successfully.` });
        setShowEditMentorModal(false);
        fetchMentors();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to update mentor details' });
    }
  };

  const handleDeleteMentor = async (mentor: Mentor) => {
    if (!confirm(`Are you sure you want to delete mentor '${mentor.name}'? This will also cancel their active assignments.`)) {
      return;
    }
    try {
      const res = await deleteMentorAction(mentor.id);
      if (res.success) {
        setNotification({ type: 'success', message: `Mentor '${mentor.name}' deleted successfully.` });
        fetchMentors();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to delete mentor' });
    }
  };

  const openEditModal = (mentor: Mentor) => {
    setEditMentorForm({
      id: mentor.id,
      name: mentor.name,
      email: mentor.email,
      company: mentor.company,
      role: mentor.role,
      expertiseStr: mentor.expertise.join(', '),
      maxMentees: mentor.maxMentees,
      status: mentor.status,
      bio: mentor.bio || '',
    });
    setShowEditMentorModal(true);
  };

  const handleAssignMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentor) return;

    try {
      const res = await assignMentorAction({
        mentorId: selectedMentor.id,
        targetType: assignForm.targetType,
        targetId: assignForm.targetId,
        targetName: assignForm.targetName,
        notes: assignForm.notes,
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: `Mentor '${selectedMentor.name}' assigned to ${assignForm.targetType} '${assignForm.targetName || assignForm.targetId}'.`,
        });
        setShowAssignModal(false);
        setAssignForm({ targetType: 'cohort', targetId: '', targetName: '', notes: '' });
        fetchMentors();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to assign mentor' });
    }
  };

  const handleScheduleSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentor) return;

    try {
      const res = await scheduleSessionAction({
        mentorId: selectedMentor.id,
        targetType: sessionForm.targetType,
        targetId: sessionForm.targetId,
        title: sessionForm.title,
        description: sessionForm.description,
        meetingUrl: sessionForm.meetingUrl,
        scheduledAt: new Date(sessionForm.scheduledAt).toISOString(),
        durationMinutes: Number(sessionForm.durationMinutes),
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: `Session '${sessionForm.title}' scheduled for ${selectedMentor.name}.`,
        });
        setShowSessionModal(false);
        setSessionForm({
          targetType: 'cohort',
          targetId: '',
          title: '',
          description: '',
          meetingUrl: '',
          scheduledAt: '',
          durationMinutes: 45,
        });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to schedule session' });
    }
  };

  const filteredMentors = mentors.filter((m) => {
    if (selectedExpertise === 'all') return true;
    return m.expertise.some((e) => e.toLowerCase().includes(selectedExpertise.toLowerCase()));
  });

  return (
    <div className="min-h-screen bg-[var(--qh-bg)] text-[var(--qh-ink)]">
      <AppHeader
        title="FAANG & Industry Mentorship Governance"
        subtitle="Enhanced auto-matching algorithm (0-100% score), session feedback, and workload re-balancing"
        badge={{ label: 'Phase 3 Service 24', variant: 'accent' }}
        backLink={{ href: '/admin', label: '← Back to Admin Panel' }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAutoMatchModal(true)}
            className="px-3.5 py-2 bg-[var(--qh-surface-card)] text-[var(--qh-ink)] border border-[var(--qh-border)] hover:border-[var(--qh-accent-main)] text-xs font-semibold rounded-lg transition-colors"
          >
            ⚡ Auto-Match Fellow
          </button>
          <button
            onClick={() => setShowAddMentorModal(true)}
            className="px-4 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-sm"
          >
            + Onboard Mentor
          </button>
        </div>
      </AppHeader>

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

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="p-5 bg-[var(--qh-surface-card)] rounded-xl border border-[var(--qh-border)] shadow-sm">
            <p className="text-xs font-semibold text-[var(--qh-slate-600)] uppercase tracking-wider">Total Mentors</p>
            <h3 className="text-2xl font-bold mt-1 text-[var(--qh-ink)]">{mentors.length}</h3>
            <p className="text-xs text-emerald-600 mt-1">Industry Experts</p>
          </div>

          <div className="p-5 bg-[var(--qh-surface-card)] rounded-xl border border-[var(--qh-border)] shadow-sm">
            <p className="text-xs font-semibold text-[var(--qh-slate-600)] uppercase tracking-wider">Active Mentees</p>
            <h3 className="text-2xl font-bold mt-1 text-[var(--qh-ink)]">
              {mentors.reduce((acc, m) => acc + m.activeMenteesCount, 0)}
            </h3>
            <p className="text-xs text-[var(--qh-slate-600)] mt-1">Paired candidates</p>
          </div>

          <div className="p-5 bg-[var(--qh-surface-card)] rounded-xl border border-[var(--qh-border)] shadow-sm">
            <p className="text-xs font-semibold text-[var(--qh-slate-600)] uppercase tracking-wider">Total Capacity</p>
            <h3 className="text-2xl font-bold mt-1 text-[var(--qh-ink)]">
              {mentors.reduce((acc, m) => acc + m.maxMentees, 0)}
            </h3>
            <p className="text-xs text-[var(--qh-slate-600)] mt-1">Max mentorship slots</p>
          </div>

          <div className="p-5 bg-[var(--qh-surface-card)] rounded-xl border border-[var(--qh-border)] shadow-sm">
            <p className="text-xs font-semibold text-[var(--qh-slate-600)] uppercase tracking-wider">Utilization Rate</p>
            <h3 className="text-2xl font-bold mt-1 text-[var(--qh-accent-deep)]">
              {mentors.reduce((acc, m) => acc + m.maxMentees, 0) > 0
                ? Math.round(
                    (mentors.reduce((acc, m) => acc + m.activeMenteesCount, 0) /
                      mentors.reduce((acc, m) => acc + m.maxMentees, 0)) *
                      100
                  )
                : 0}
              %
            </h3>
            <p className="text-xs text-[var(--qh-slate-600)] mt-1">Cohort slot load</p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--qh-slate-600)]">Filter by Expertise:</span>
            {['all', 'AI Systems', 'TypeScript', 'Distributed Systems', 'Cloud Architecture'].map((exp) => (
              <button
                key={exp}
                onClick={() => setSelectedExpertise(exp)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedExpertise === exp
                    ? 'bg-[var(--qh-accent-main)] text-white'
                    : 'bg-[var(--qh-surface-card)] text-[var(--qh-slate-600)] border border-[var(--qh-border)] hover:border-[var(--qh-accent-main)]'
                }`}
              >
                {exp === 'all' ? 'All Expertise' : exp}
              </button>
            ))}
          </div>
        </div>

        {/* Mentors Table / Cards */}
        {loading ? (
          <div className="p-12 text-center text-sm text-[var(--qh-slate-600)]">Loading mentor roster...</div>
        ) : filteredMentors.length === 0 ? (
          <div className="p-12 text-center bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] space-y-3">
            <p className="text-sm font-semibold text-[var(--qh-slate-600)]">No mentors registered yet.</p>
            <p className="text-xs text-[var(--qh-slate-600)]">
              Click &quot;+ Onboard Mentor&quot; above to add mentors to the platform.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredMentors.map((mentor) => {
              const capacityPercent = Math.round((mentor.activeMenteesCount / mentor.maxMentees) * 100);
              const isFull = mentor.activeMenteesCount >= mentor.maxMentees;

              return (
                <div
                  key={mentor.id}
                  className="bg-[var(--qh-surface-card)] p-6 rounded-2xl border border-[var(--qh-border)] shadow-sm hover:border-[var(--qh-accent-main)] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[var(--qh-accent-main)]/10 text-[var(--qh-accent-deep)] flex items-center justify-center font-bold text-lg border border-[var(--qh-accent-main)]/20">
                          {mentor.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-[var(--qh-ink)]">{mentor.name}</h3>
                          <p className="text-xs text-[var(--qh-slate-600)]">
                            {mentor.role} @ <span className="font-semibold text-[var(--qh-ink)]">{mentor.company}</span>
                          </p>
                          <p className="text-xs text-[var(--qh-slate-600)]">{mentor.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                            mentor.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-amber-500/10 text-amber-600'
                          }`}
                        >
                          {mentor.status}
                        </span>
                        <button
                          onClick={() => openEditModal(mentor)}
                          className="p-1.5 text-xs text-[var(--qh-slate-600)] hover:text-[var(--qh-accent-deep)] transition-colors"
                          title="Edit Mentor"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteMentor(mentor)}
                          className="p-1.5 text-xs text-rose-500 hover:text-rose-700 transition-colors"
                          title="Delete Mentor"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {mentor.bio && <p className="text-xs text-[var(--qh-slate-600)] mb-4 italic">&quot;{mentor.bio}&quot;</p>}

                    {/* Expertise badges */}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {mentor.expertise.map((exp) => (
                        <span
                          key={exp}
                          className="px-2 py-0.5 text-[11px] font-medium bg-[var(--qh-bg)] text-[var(--qh-slate-600)] border border-[var(--qh-border)] rounded-md"
                        >
                          {exp}
                        </span>
                      ))}
                    </div>

                    {/* Capacity Indicator Bar */}
                    <div className="mb-5 p-3 bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)]">
                      <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                        <span className="text-[var(--qh-slate-600)]">Mentorship Capacity Load</span>
                        <span className={isFull ? 'text-rose-600 font-bold' : 'text-emerald-600'}>
                          {mentor.activeMenteesCount} / {mentor.maxMentees} Mentees ({capacityPercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-[var(--qh-border)] h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            isFull ? 'bg-rose-500' : capacityPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(capacityPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-[var(--qh-border)]">
                    {mentor.activeMenteesCount > 0 && (
                      <button
                        onClick={() => {
                          setSelectedMentor(mentor);
                          setShowRebalanceModal(true);
                        }}
                        className="px-2.5 py-1.5 bg-amber-500/10 text-amber-700 border border-amber-300 text-xs font-semibold rounded-lg hover:bg-amber-500/20 transition-colors"
                        title="Re-balance active mentee workload"
                      >
                        ⚖️ Re-balance
                      </button>
                    )}
                    <button
                      disabled={isFull || mentor.status !== 'active'}
                      onClick={() => {
                        setSelectedMentor(mentor);
                        setShowAssignModal(true);
                      }}
                      className="px-3 py-1.5 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {isFull ? 'At Capacity' : 'Match to Cohort/Fellow'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMentor(mentor);
                        setShowSessionModal(true);
                      }}
                      className="px-3 py-1.5 bg-[var(--qh-surface-card)] text-[var(--qh-ink)] border border-[var(--qh-border)] text-xs font-semibold rounded-lg hover:border-[var(--qh-accent-main)] transition-colors"
                    >
                      Schedule Session
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Onboard Mentor Modal */}
      {showAddMentorModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--qh-surface-card)] w-full max-w-lg rounded-2xl border border-[var(--qh-border)] p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[var(--qh-ink)] mb-1">Onboard Industry Mentor</h2>
            <p className="text-xs text-[var(--qh-slate-600)] mb-4">
              Add FAANG or senior industry mentor profile to the matching pool.
            </p>

            <form onSubmit={handleRegisterMentor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newMentor.name}
                  onChange={(e) => setNewMentor({ ...newMentor, name: e.target.value })}
                  placeholder="e.g. Dr. Evelyn Vance"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={newMentor.email}
                    onChange={(e) => setNewMentor({ ...newMentor, email: e.target.value })}
                    placeholder="mentor@company.com"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Company</label>
                  <input
                    type="text"
                    required
                    value={newMentor.company}
                    onChange={(e) => setNewMentor({ ...newMentor, company: e.target.value })}
                    placeholder="e.g. Google, Stripe, Meta"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Position / Role</label>
                  <input
                    type="text"
                    required
                    value={newMentor.role}
                    onChange={(e) => setNewMentor({ ...newMentor, role: e.target.value })}
                    placeholder="e.g. Principal AI Architect"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Max Capacity (Mentees)</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={newMentor.maxMentees}
                    onChange={(e) => setNewMentor({ ...newMentor, maxMentees: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">
                  Expertise Tags (comma-separated)
                </label>
                <input
                  type="text"
                  required
                  value={newMentor.expertiseStr}
                  onChange={(e) => setNewMentor({ ...newMentor, expertiseStr: e.target.value })}
                  placeholder="e.g. AI Systems, TypeScript, System Design"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Bio / Background</label>
                <textarea
                  rows={2}
                  value={newMentor.bio}
                  onChange={(e) => setNewMentor({ ...newMentor, bio: e.target.value })}
                  placeholder="Short introduction & experience..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--qh-border)]">
                <button
                  type="button"
                  onClick={() => setShowAddMentorModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--qh-slate-600)] hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90 shadow-sm"
                >
                  Save Mentor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Mentor Modal */}
      {showEditMentorModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--qh-surface-card)] w-full max-w-lg rounded-2xl border border-[var(--qh-border)] p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[var(--qh-ink)] mb-1">Edit Mentor Profile</h2>
            <p className="text-xs text-[var(--qh-slate-600)] mb-4">
              Update mentor information, active status, or mentorship slot capacity.
            </p>

            <form onSubmit={handleUpdateMentor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editMentorForm.name}
                  onChange={(e) => setEditMentorForm({ ...editMentorForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={editMentorForm.email}
                    onChange={(e) => setEditMentorForm({ ...editMentorForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Company</label>
                  <input
                    type="text"
                    required
                    value={editMentorForm.company}
                    onChange={(e) => setEditMentorForm({ ...editMentorForm, company: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Position / Role</label>
                  <input
                    type="text"
                    required
                    value={editMentorForm.role}
                    onChange={(e) => setEditMentorForm({ ...editMentorForm, role: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Max Capacity</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={editMentorForm.maxMentees}
                    onChange={(e) => setEditMentorForm({ ...editMentorForm, maxMentees: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Status</label>
                  <select
                    value={editMentorForm.status}
                    onChange={(e) => setEditMentorForm({ ...editMentorForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">
                  Expertise Tags (comma-separated)
                </label>
                <input
                  type="text"
                  required
                  value={editMentorForm.expertiseStr}
                  onChange={(e) => setEditMentorForm({ ...editMentorForm, expertiseStr: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Bio / Background</label>
                <textarea
                  rows={2}
                  value={editMentorForm.bio}
                  onChange={(e) => setEditMentorForm({ ...editMentorForm, bio: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--qh-border)]">
                <button
                  type="button"
                  onClick={() => setShowEditMentorModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--qh-slate-600)] hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90 shadow-sm"
                >
                  Update Mentor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Match Mentor Modal */}
      {showAssignModal && selectedMentor && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--qh-surface-card)] w-full max-w-md rounded-2xl border border-[var(--qh-border)] p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[var(--qh-ink)] mb-1">
              Match {selectedMentor.name}
            </h2>
            <p className="text-xs text-[var(--qh-slate-600)] mb-4">
              Assign mentor to a bootcamp cohort or individual candidate.
            </p>

            <form onSubmit={handleAssignMentor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Assignment Target Type</label>
                <select
                  value={assignForm.targetType}
                  onChange={(e) => setAssignForm({ ...assignForm, targetType: e.target.value as 'cohort' | 'fellow' })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                >
                  <option value="cohort">Bootcamp Cohort</option>
                  <option value="fellow">Individual Fellow</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Target ID / Slug</label>
                <input
                  type="text"
                  required
                  value={assignForm.targetId}
                  onChange={(e) => setAssignForm({ ...assignForm, targetId: e.target.value })}
                  placeholder="e.g. cohort-fullstack-2026-q3 or fellow_id"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Display Name (Optional)</label>
                <input
                  type="text"
                  value={assignForm.targetName}
                  onChange={(e) => setAssignForm({ ...assignForm, targetName: e.target.value })}
                  placeholder="e.g. Fullstack AI Engineering Cohort 1"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Assignment Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                  placeholder="Notes or expectations for this mentor match..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--qh-border)]">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--qh-slate-600)] hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90 shadow-sm"
                >
                  Assign Mentor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Session Modal */}
      {showSessionModal && selectedMentor && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--qh-surface-card)] w-full max-w-md rounded-2xl border border-[var(--qh-border)] p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[var(--qh-ink)] mb-1">Schedule Mentor Session</h2>
            <p className="text-xs text-[var(--qh-slate-600)] mb-4">
              Book a video session with {selectedMentor.name}.
            </p>

            <form onSubmit={handleScheduleSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Session Target Type</label>
                <select
                  value={sessionForm.targetType}
                  onChange={(e) => setSessionForm({ ...sessionForm, targetType: e.target.value as 'cohort' | 'fellow' })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                >
                  <option value="cohort">Bootcamp Cohort</option>
                  <option value="fellow">Individual Fellow</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Target Cohort or Fellow ID</label>
                <input
                  type="text"
                  required
                  value={sessionForm.targetId}
                  onChange={(e) => setSessionForm({ ...sessionForm, targetId: e.target.value })}
                  placeholder="e.g. cohort-fullstack-2026-q3 or fellow_id"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Session Title</label>
                <input
                  type="text"
                  required
                  value={sessionForm.title}
                  onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                  placeholder="e.g. Technical System Architecture Review"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Meeting URL (Google Meet / Zoom)</label>
                <input
                  type="url"
                  required
                  value={sessionForm.meetingUrl}
                  onChange={(e) => setSessionForm({ ...sessionForm, meetingUrl: e.target.value })}
                  placeholder="https://meet.google.com/xyz-abc-def"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Scheduled Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={sessionForm.scheduledAt}
                    onChange={(e) => setSessionForm({ ...sessionForm, scheduledAt: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min={15}
                    max={180}
                    value={sessionForm.durationMinutes}
                    onChange={(e) => setSessionForm({ ...sessionForm, durationMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--qh-border)]">
                <button
                  type="button"
                  onClick={() => setShowSessionModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--qh-slate-600)] hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90 shadow-sm"
                >
                  Schedule Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto-Match Fellow Modal */}
      {showAutoMatchModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--qh-surface-card)] w-full max-w-md rounded-2xl border border-[var(--qh-border)] p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[var(--qh-ink)] mb-1">⚡ Auto-Match Candidate</h2>
            <p className="text-xs text-[var(--qh-slate-600)] mb-4">
              Run the 0–100% compatibility algorithm (Skill 40%, Experience 30%, Capacity 20%, Timezone 10%).
            </p>

            <form onSubmit={handleAutoMatch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Fellow Profile ID</label>
                <input
                  type="text"
                  required
                  value={autoMatchFellowId}
                  onChange={(e) => setAutoMatchFellowId(e.target.value)}
                  placeholder="e.g. fellow-user-100"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)] font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--qh-border)]">
                <button
                  type="button"
                  onClick={() => setShowAutoMatchModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--qh-slate-600)] hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90 shadow-sm"
                >
                  Run Auto-Match Algorithm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rebalance Mentor Workload Modal */}
      {showRebalanceModal && selectedMentor && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--qh-surface-card)] w-full max-w-md rounded-2xl border border-[var(--qh-border)] p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[var(--qh-ink)] mb-1">
              ⚖️ Rebalance Workload: {selectedMentor.name}
            </h2>
            <p className="text-xs text-[var(--qh-slate-600)] mb-4">
              Reassign active mentees from this mentor to available backup mentors with capacity.
            </p>

            <form onSubmit={handleRebalanceWorkload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Rebalance Reason</label>
                <textarea
                  rows={2}
                  value={rebalanceReason}
                  onChange={(e) => setRebalanceReason(e.target.value)}
                  placeholder="e.g. Mentor at 100% capacity / schedule constraints..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--qh-border)]">
                <button
                  type="button"
                  onClick={() => setShowRebalanceModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--qh-slate-600)] hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:opacity-90 shadow-sm"
                >
                  Execute Workload Re-balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
