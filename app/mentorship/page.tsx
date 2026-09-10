'use client';

import React, { useState, useEffect } from 'react';
import AppHeader from '@/components/AppHeader';
import { EnhancedMentorMatch, MentorSession, MentorAssignment } from '@/modules/mentorship/types';
import {
  getFellowMentorshipAction,
  getFellowEnhancedMatchAction,
  autoMatchFellowAction,
  submitSessionFeedbackAction,
} from '@/modules/mentorship/actions';

export default function FellowMentorshipPage() {
  const [match, setMatch] = useState<EnhancedMentorMatch | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [sessions, setSessions] = useState<MentorSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [selectedSessionForFeedback, setSelectedSessionForFeedback] = useState<MentorSession | null>(null);
  const [feedbackScore, setFeedbackScore] = useState<number>(5);
  const [feedbackComments, setFeedbackComments] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadMentorshipData();
  }, []);

  const loadMentorshipData = async () => {
    setLoading(true);
    try {
      // 1. Fetch enhanced match details
      const matchRes = await getFellowEnhancedMatchAction();
      if (matchRes.success && matchRes.match) {
        setMatch(matchRes.match);
      }

      // 2. Fetch fellow sessions & assignments
      const mentorRes = await getFellowMentorshipAction();
      if (mentorRes.success) {
        setAssignments(mentorRes.assignments || []);
        setSessions(mentorRes.sessions || []);
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to load mentorship overview' });
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerAutoMatch = async () => {
    setMatchingLoading(true);
    try {
      const res = await autoMatchFellowAction({
        fellowProfileId: 'current', // Resolved via current auth user in server action
      });
      if (res.success && res.match) {
        setMatch(res.match);
        setNotification({
          type: 'success',
          message: `Auto-matched with mentor ${res.match.mentorName} (${res.match.compatibilityScore}% compatibility)!`,
        });
        loadMentorshipData();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Auto-matching failed' });
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionForFeedback) return;

    try {
      const res = await submitSessionFeedbackAction({
        sessionId: selectedSessionForFeedback.id,
        fellowFeedbackScore: feedbackScore,
        fellowFeedbackComments: feedbackComments,
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: 'Thank you! Your 1-on-1 session feedback has been submitted.',
        });
        setSelectedSessionForFeedback(null);
        setFeedbackComments('');
        loadMentorshipData();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to submit feedback' });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--qh-bg)] text-[var(--qh-ink)]">
      <AppHeader
        title="Fellow Mentorship Portal"
        subtitle="1-on-1 FAANG & Industry Mentor Matching, Session Scheduling & Feedback"
        badge={{ label: 'Service 24', variant: 'accent' }}
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
          <div className="p-12 text-center text-sm text-[var(--qh-slate-600)]">Loading mentorship profile...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Active Mentor Match Card */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-[var(--qh-surface-card)] p-6 rounded-2xl border border-[var(--qh-border)] shadow-sm">
                <h3 className="text-xs font-semibold text-[var(--qh-slate-600)] uppercase tracking-wider mb-4">
                  Active Mentor Match
                </h3>

                {match ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-[var(--qh-accent-main)]/10 text-[var(--qh-accent-deep)] flex items-center justify-center font-bold text-xl border border-[var(--qh-accent-main)]/20">
                        {match.mentorName ? match.mentorName.substring(0, 2).toUpperCase() : 'M'}
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-[var(--qh-ink)]">{match.mentorName}</h4>
                        <p className="text-xs text-[var(--qh-slate-600)]">
                          {match.mentorRole} @ <span className="font-semibold text-[var(--qh-ink)]">{match.mentorCompany}</span>
                        </p>
                        <span className="inline-block mt-1 px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-600 rounded-full">
                          Match Active
                        </span>
                      </div>
                    </div>

                    {/* Compatibility Score Breakdown Bar */}
                    <div className="p-4 bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--qh-ink)]">Compatibility Score</span>
                        <span className="text-lg font-extrabold text-[var(--qh-accent-deep)]">
                          {match.compatibilityScore}%
                        </span>
                      </div>

                      <div className="w-full bg-[var(--qh-border)] h-2.5 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-[var(--qh-accent-main)]"
                          style={{ width: `${(match.skillMatchScore / 40) * 100}%` }}
                          title={`Skill Match: ${match.skillMatchScore}/40`}
                        />
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${(match.experienceMatchScore / 30) * 100}%` }}
                          title={`Experience Match: ${match.experienceMatchScore}/30`}
                        />
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${(match.capacityScore / 20) * 100}%` }}
                          title={`Capacity Score: ${match.capacityScore}/20`}
                        />
                        <div
                          className="h-full bg-indigo-500"
                          style={{ width: `${(match.timezoneScore / 10) * 100}%` }}
                          title={`Timezone Score: ${match.timezoneScore}/10`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--qh-slate-600)] pt-1">
                        <div>🎯 Skill Fit: <span className="font-semibold text-[var(--qh-ink)]">{match.skillMatchScore}/40</span></div>
                        <div>💼 Experience: <span className="font-semibold text-[var(--qh-ink)]">{match.experienceMatchScore}/30</span></div>
                        <div>📊 Slot Availability: <span className="font-semibold text-[var(--qh-ink)]">{match.capacityScore}/20</span></div>
                        <div>🌐 Timezone: <span className="font-semibold text-[var(--qh-ink)]">{match.timezoneScore}/10</span></div>
                      </div>
                    </div>

                    <button
                      onClick={handleTriggerAutoMatch}
                      disabled={matchingLoading}
                      className="w-full py-2 bg-[var(--qh-bg)] text-[var(--qh-ink)] border border-[var(--qh-border)] hover:border-[var(--qh-accent-main)] text-xs font-semibold rounded-lg transition-colors"
                    >
                      {matchingLoading ? 'Recalculating Match...' : '🔄 Re-run Auto-Match Engine'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-3">
                    <p className="text-xs text-[var(--qh-slate-600)]">You do not have an active 1-on-1 mentor match assigned yet.</p>
                    <button
                      onClick={handleTriggerAutoMatch}
                      disabled={matchingLoading}
                      className="px-4 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-sm"
                    >
                      {matchingLoading ? 'Matching with Mentor...' : '✨ Find My Optimal Mentor Match'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Mentorship Sessions & Feedback */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[var(--qh-surface-card)] p-6 rounded-2xl border border-[var(--qh-border)] shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-base text-[var(--qh-ink)]">Mentorship 1-on-1 Sessions</h3>
                    <p className="text-xs text-[var(--qh-slate-600)]">Upcoming meetings and past session feedback</p>
                  </div>
                </div>

                {sessions.length === 0 ? (
                  <div className="p-8 text-center bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] text-xs text-[var(--qh-slate-600)]">
                    No scheduled mentorship sessions found.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="p-4 bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                session.status === 'completed'
                                  ? 'bg-emerald-500/10 text-emerald-600'
                                  : 'bg-indigo-500/10 text-indigo-600'
                              }`}
                            >
                              {session.status.toUpperCase()}
                            </span>
                            <span className="text-xs font-semibold text-[var(--qh-slate-600)]">
                              {session.durationMinutes} mins
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-[var(--qh-ink)]">{session.title}</h4>
                          <p className="text-xs text-[var(--qh-slate-600)]">
                            With <span className="font-semibold text-[var(--qh-ink)]">{session.mentorName || 'Mentor'}</span> • Scheduled:{' '}
                            {new Date(session.scheduledAt).toLocaleString()}
                          </p>
                          {session.meetingUrl && (
                            <a
                              href={session.meetingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-[var(--qh-accent-deep)] hover:underline inline-block mt-1 font-mono"
                            >
                              🔗 Join Video Call
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {session.status === 'completed' && session.fellowFeedbackScore ? (
                            <div className="text-right">
                              <div className="text-amber-500 font-bold text-sm">
                                {'★'.repeat(session.fellowFeedbackScore)} ({session.fellowFeedbackScore}/5)
                              </div>
                              <p className="text-[11px] text-[var(--qh-slate-600)] max-w-xs truncate">
                                &quot;{session.fellowFeedbackComments || 'No comment'}&quot;
                              </p>
                            </div>
                          ) : (
                            <button
                              onClick={() => setSelectedSessionForFeedback(session)}
                              className="px-3 py-1.5 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
                            >
                              Rate Session Feedback
                            </button>
                          )}
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

      {/* Session Feedback Modal */}
      {selectedSessionForFeedback && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--qh-surface-card)] w-full max-w-md rounded-2xl border border-[var(--qh-border)] p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[var(--qh-ink)] mb-1">Submit Session Feedback</h2>
            <p className="text-xs text-[var(--qh-slate-600)] mb-4">
              Rate your 1-on-1 session with {selectedSessionForFeedback.mentorName || 'your mentor'}.
            </p>

            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-2">
                  Session Quality Rating (1 - 5 Stars)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setFeedbackScore(star)}
                      className={`text-2xl transition-transform hover:scale-110 ${
                        star <= feedbackScore ? 'text-amber-400' : 'text-[var(--qh-border)]'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-xs font-bold text-[var(--qh-ink)] ml-2">{feedbackScore} / 5 Stars</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">
                  Comments & Key Takeaways
                </label>
                <textarea
                  rows={3}
                  value={feedbackComments}
                  onChange={(e) => setFeedbackComments(e.target.value)}
                  placeholder="Share feedback on guidance received or topics discussed..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--qh-border)]">
                <button
                  type="button"
                  onClick={() => setSelectedSessionForFeedback(null)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--qh-slate-600)] hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90 shadow-sm"
                >
                  Submit Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
