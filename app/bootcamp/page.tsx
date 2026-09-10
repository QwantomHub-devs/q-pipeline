'use client';

import React, { useState, useEffect, useRef } from 'react';
import AppHeader from '@/components/AppHeader';
import Image from 'next/image';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { getMyBootcampDashboardAction, submitMilestoneAction } from '@/modules/bootcamp/actions';
import { getFellowMentorshipAction, submitSessionFeedbackAction } from '@/modules/mentorship/actions';
import { getMyProfile } from '@/modules/identity/actions';
import { FellowBootcampDashboardData } from '@/modules/bootcamp/types';
import { MentorAssignment, MentorSession, Mentor } from '@/modules/mentorship/types';

export default function FellowBootcampPage() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [fellowId, setFellowId] = useState<string | null>(null);
  const [data, setData] = useState<FellowBootcampDashboardData | null>(null);
  const [mentorship, setMentorship] = useState<{
    assignments: (MentorAssignment & { mentor?: Mentor })[];
    sessions: MentorSession[];
  }>({ assignments: [], sessions: [] });
  const [feedbackSession, setFeedbackSession] = useState<MentorSession | null>(null);
  const [feedbackScore, setFeedbackScore] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [activeMilestoneId, setActiveMilestoneId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      if (!isLoaded || !user) return;
      try {
        const spine = await getMyProfile();
        if (spine) {
          setFellowId(spine.id);
          const dashData = await getMyBootcampDashboardAction(spine.id);
          setData(dashData);

          const mentorData = await getFellowMentorshipAction(spine.id);
          if (mentorData.success) {
            setMentorship({
              assignments: mentorData.assignments || [],
              sessions: mentorData.sessions || [],
            });
          }
        }
      } catch (err: any) {
        console.error('Error loading bootcamp data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user, isLoaded]);

  useGSAP(
    () => {
      if (!loading && data) {
        gsap.from('.gsap-fade-up', {
          y: 20,
          opacity: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power2.out',
        });
      }
    },
    { scope: containerRef, dependencies: [loading, data] }
  );

  const handleSubmitMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.enrollment || !activeMilestoneId || !submissionUrl) return;

    setSubmitting(true);
    setMessage(null);
    try {
      await submitMilestoneAction({
        enrollmentId: data.enrollment.id,
        milestoneId: activeMilestoneId,
        submissionUrl,
      });

      setMessage({ type: 'success', text: 'Milestone submission recorded successfully!' });
      setSubmissionUrl('');
      setActiveMilestoneId(null);

      // Refresh data
      if (fellowId) {
        const updated = await getMyBootcampDashboardAction(fellowId);
        setData(updated);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Submission failed' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--qh-bg)] text-[var(--qh-ink)] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[var(--qh-accent-main)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[var(--qh-slate-600)] text-sm font-medium">Loading bootcamp workspace...</p>
        </div>
      </div>
    );
  }

  const enrollment = data?.enrollment;
  const cohort = data?.cohort;
  const track = data?.track;
  const milestones = data?.milestones || [];

  const completedCount = milestones.filter((m) => m.progress?.status === 'approved').length;
  const progressPercent = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

  return (
    <div ref={containerRef} className="min-h-screen bg-[var(--qh-bg)] text-[var(--qh-ink)] flex flex-col">
      <AppHeader
        title="Bootcamp Learning Workspace"
        subtitle="Local Track Execution Portal"
        backLink={{ href: '/assessment/results', label: '← My Score Card' }}
      />

      {/* Main Body */}
      <main className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 space-y-8">
        {!enrollment ? (
          <div className="gsap-fade-up bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] p-12 text-center max-w-2xl mx-auto space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              ⏳
            </div>
            <h2 className="text-2xl font-bold">No Active Cohort Enrollment</h2>
            <p className="text-sm text-[var(--qh-slate-600)] leading-relaxed">
              You are currently not assigned to an active local track bootcamp cohort. Once your Top Tier or Bench score is reviewed and a cohort slot opens, you will receive an automated enrollment notification.
            </p>
            <Link
              href="/assessment/results"
              className="inline-block px-6 py-3 bg-[var(--qh-accent-main)] hover:bg-[var(--qh-accent-deep)] text-white font-semibold text-sm rounded-xl transition-colors shadow-md"
            >
              View My Pipeline Score & Tier
            </Link>
          </div>
        ) : (
          <>
            {/* Cohort Overview Card */}
            <div className="gsap-fade-up bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] p-6 md:p-8 space-y-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--qh-border)] pb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-[var(--qh-accent-main)]/10 text-[var(--qh-accent-deep)] text-xs font-bold rounded-full uppercase tracking-wider">
                      {track?.name || 'Local Engineering Track'}
                    </span>
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-xs font-bold rounded-full capitalize">
                      {cohort?.status || 'Active'}
                    </span>
                  </div>
                  <h2 className="text-3xl font-extrabold">{cohort?.name || 'Local Track Cohort'}</h2>
                  <p className="text-sm text-[var(--qh-slate-600)] mt-1">{cohort?.description || track?.description}</p>
                </div>
                <div className="flex flex-col items-start md:items-end">
                  <span className="text-xs text-[var(--qh-slate-600)] uppercase font-semibold">Cohort Progress</span>
                  <span className="text-2xl font-extrabold text-[var(--qh-accent-deep)]">{progressPercent}%</span>
                </div>
              </div>

              {/* Progress Arc / Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-[var(--qh-slate-600)]">
                  <span>Milestone Completions</span>
                  <span>{completedCount} of {milestones.length} Week Milestones Approved</span>
                </div>
                <div className="w-full h-3 bg-[var(--qh-surface-subtle)] rounded-full overflow-hidden border border-[var(--qh-border)]">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--qh-accent-main)] to-[var(--qh-accent-deep)] transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Notification Messages */}
            {message && (
              <div
                className={`p-4 rounded-xl text-sm font-medium border ${
                  message.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Curriculum & Milestones Grid */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-[var(--qh-ink)]">Cohort Curriculum & Weekly Milestones</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {milestones.map((m) => {
                  const prog = m.progress;
                  const isApproved = prog?.status === 'approved';
                  const isSubmitted = prog?.status === 'submitted';
                  const needsRevision = prog?.status === 'revision_needed';

                  return (
                    <div
                      key={m.id}
                      className="gsap-fade-up bg-[var(--qh-surface-card)] rounded-xl border border-[var(--qh-border)] p-6 space-y-4 flex flex-col justify-between shadow-sm hover:border-[var(--qh-accent-main)]/40 transition-all"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--qh-accent-deep)] uppercase tracking-wider">
                            Week {m.weekNumber}
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isApproved
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : isSubmitted
                                ? 'bg-blue-500/10 text-blue-600'
                                : needsRevision
                                ? 'bg-amber-500/10 text-amber-600'
                                : 'bg-slate-500/10 text-slate-600'
                            }`}
                          >
                            {isApproved
                              ? '✓ Approved'
                              : isSubmitted
                              ? 'Under Review'
                              : needsRevision
                              ? 'Revision Requested'
                              : 'Pending Submission'}
                          </span>
                        </div>
                        <h4 className="text-lg font-bold text-[var(--qh-ink)]">{m.title}</h4>
                        <p className="text-sm text-[var(--qh-slate-600)] leading-relaxed">{m.description}</p>
                        {prog?.submissionUrl && (
                          <div className="text-xs text-[var(--qh-slate-600)] bg-[var(--qh-surface-subtle)] p-2.5 rounded-lg border border-[var(--qh-border)] truncate">
                            <span className="font-semibold text-[var(--qh-ink)]">Submitted URL: </span>
                            <a
                              href={prog.submissionUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[var(--qh-accent-deep)] underline"
                            >
                              {prog.submissionUrl}
                            </a>
                          </div>
                        )}
                        {prog?.feedback && (
                          <div className="text-xs text-amber-700 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                            <span className="font-bold">Mentor Feedback: </span>
                            {prog.feedback}
                          </div>
                        )}
                      </div>

                      {/* Submission Action */}
                      {!isApproved && (
                        <div className="pt-4 border-t border-[var(--qh-border)]">
                          {activeMilestoneId === m.id ? (
                            <form onSubmit={handleSubmitMilestone} className="space-y-3">
                              <input
                                type="url"
                                required
                                value={submissionUrl}
                                onChange={(e) => setSubmissionUrl(e.target.value)}
                                placeholder="https://github.com/org/repo-pr"
                                className="w-full text-xs p-3 rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--qh-accent-main)]"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="submit"
                                  disabled={submitting}
                                  className="flex-1 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--qh-accent-deep)] transition-colors disabled:opacity-50"
                                >
                                  {submitting ? 'Submitting...' : 'Submit Deliverable'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveMilestoneId(null)}
                                  className="px-3 py-2 bg-[var(--qh-surface-subtle)] text-xs text-[var(--qh-slate-600)] font-semibold rounded-lg hover:bg-slate-200 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : (
                            <button
                              onClick={() => {
                                setActiveMilestoneId(m.id);
                                setSubmissionUrl(prog?.submissionUrl || '');
                              }}
                              className="w-full py-2.5 bg-[var(--qh-surface-subtle)] hover:bg-[var(--qh-accent-main)] hover:text-white text-[var(--qh-accent-deep)] font-semibold text-xs rounded-lg transition-all"
                            >
                              {isSubmitted || needsRevision ? 'Resubmit Deliverable' : 'Submit Assignment URL'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mentorship & 1-on-1 Sessions Hub */}
            <div className="gsap-fade-up bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] p-6 md:p-8 space-y-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--qh-border)] pb-4">
                <div>
                  <h3 className="text-xl font-bold text-[var(--qh-ink)] flex items-center gap-2">
                    🎓 Mentorship Hub & FAANG Sessions
                  </h3>
                  <p className="text-xs text-[var(--qh-slate-600)] mt-0.5">
                    Assigned FAANG mentors, live 1-on-1 video sessions, and feedback logging
                  </p>
                </div>
                <Link
                  href="/admin/mentorship"
                  className="text-xs font-semibold text-[var(--qh-accent-deep)] hover:underline"
                >
                  Admin View →
                </Link>
              </div>

              {/* Assigned Mentors */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--qh-slate-600)]">
                  My Assigned Mentors ({mentorship.assignments.length})
                </h4>
                {mentorship.assignments.length === 0 ? (
                  <div className="p-4 bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] text-xs text-[var(--qh-slate-600)] italic">
                    No individual mentor assigned yet. You have access to general cohort mentor sessions.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mentorship.assignments.map((assign) => {
                      const mentor = assign.mentor;
                      if (!mentor) return null;
                      return (
                        <div
                          key={assign.id}
                          className="p-4 bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] flex items-center gap-4"
                        >
                          <div className="w-10 h-10 rounded-full bg-[var(--qh-accent-main)]/10 text-[var(--qh-accent-deep)] flex items-center justify-center font-bold text-sm">
                            {mentor.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h5 className="font-bold text-sm text-[var(--qh-ink)]">{mentor.name}</h5>
                            <p className="text-xs text-[var(--qh-slate-600)]">
                              {mentor.role} @ <span className="font-semibold text-[var(--qh-ink)]">{mentor.company}</span>
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {mentor.expertise.map((e) => (
                                <span
                                  key={e}
                                  className="px-1.5 py-0.5 text-[10px] bg-[var(--qh-surface-card)] text-[var(--qh-slate-600)] border border-[var(--qh-border)] rounded"
                                >
                                  {e}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Scheduled Sessions */}
              <div className="space-y-3 pt-4 border-t border-[var(--qh-border)]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--qh-slate-600)]">
                  Upcoming & Scheduled Video Sessions ({mentorship.sessions.length})
                </h4>

                {mentorship.sessions.length === 0 ? (
                  <div className="p-4 bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] text-xs text-[var(--qh-slate-600)] italic">
                    No scheduled sessions available yet. Check back soon for live technical review slots.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mentorship.sessions.map((sess) => (
                      <div
                        key={sess.id}
                        className="p-4 bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm text-[var(--qh-ink)]">{sess.title}</span>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                                sess.status === 'completed'
                                  ? 'bg-emerald-500/10 text-emerald-600'
                                  : 'bg-blue-500/10 text-blue-600'
                              }`}
                            >
                              {sess.status}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--qh-slate-600)] mb-2">{sess.description}</p>
                          <p className="text-xs text-[var(--qh-slate-600)] font-mono">
                            📅 {new Date(sess.scheduledAt).toLocaleString()} ({sess.durationMinutes} mins)
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={sess.meetingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
                          >
                            Join Meeting Link ↗
                          </a>
                          {sess.status !== 'completed' && (
                            <button
                              onClick={() => setFeedbackSession(sess)}
                              className="px-3 py-2 bg-[var(--qh-surface-card)] text-[var(--qh-ink)] border border-[var(--qh-border)] text-xs font-semibold rounded-lg hover:border-[var(--qh-accent-main)]"
                            >
                              Log Feedback
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Feedback Modal */}
      {feedbackSession && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--qh-surface-card)] w-full max-w-md rounded-2xl border border-[var(--qh-border)] p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-[var(--qh-ink)]">Submit Session Feedback</h3>
            <p className="text-xs text-[var(--qh-slate-600)]">
              Rate your mentorship session for &quot;{feedbackSession.title}&quot;
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await submitSessionFeedbackAction({
                    sessionId: feedbackSession.id,
                    fellowFeedbackScore: Number(feedbackScore),
                    fellowFeedbackComments: feedbackComments,
                  });
                  if (res.success) {
                    setMessage({ type: 'success', text: 'Feedback logged successfully!' });
                    setFeedbackSession(null);
                    // Refresh
                    if (fellowId) {
                      const updated = await getFellowMentorshipAction(fellowId);
                      if (updated.success) {
                        setMentorship({
                          assignments: updated.assignments || [],
                          sessions: updated.sessions || [],
                        });
                      }
                    }
                  }
                } catch (err: any) {
                  setMessage({ type: 'error', text: err.message || 'Failed to submit feedback' });
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">
                  Session Rating (1 to 5 stars)
                </label>
                <select
                  value={feedbackScore}
                  onChange={(e) => setFeedbackScore(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                >
                  <option value={5}>5 Stars — Outstanding & Inspiring</option>
                  <option value={4}>4 Stars — Very Good & Helpful</option>
                  <option value={3}>3 Stars — Average / Met Expectations</option>
                  <option value={2}>2 Stars — Needs Improvement</option>
                  <option value={1}>1 Star — Unsatisfactory</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">
                  Comments & Key Takeaways
                </label>
                <textarea
                  rows={3}
                  value={feedbackComments}
                  onChange={(e) => setFeedbackComments(e.target.value)}
                  placeholder="What did you learn? Any actionable advice received?"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--qh-border)]">
                <button
                  type="button"
                  onClick={() => setFeedbackSession(null)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--qh-slate-600)] hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90"
                >
                  Submit Rating
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
