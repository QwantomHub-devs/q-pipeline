'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { RecordedExplanationSubmission, Module3RubricScores } from '@/modules/assessment/types';
import {
  getModule3VideoQueueAction,
  finalizeModule3GradingAction,
  assignPostHocQuestionsAction,
} from '@/modules/assessment/actions';
import { calculateModule3WeightedScore } from '@/modules/assessment/types';

export default function Module3VideoQueuePage() {
  const [queue, setQueue] = useState<RecordedExplanationSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<RecordedExplanationSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Post-hoc questions state
  const [prompt1, setPrompt1] = useState('');
  const [prompt2, setPrompt2] = useState('');
  const [assigningPrompts, setAssigningPrompts] = useState(false);
  const [promptSuccessMsg, setPromptSuccessMsg] = useState<string | null>(null);

  // Rubric Calibration & Authenticity Gate
  const [authenticityPassed, setAuthenticityPassed] = useState<boolean>(true);
  const [authenticityNotes, setAuthenticityNotes] = useState<string>('');
  const [scores, setScores] = useState<Module3RubricScores>({
    architectureArticulation: 0,
    trapExplanation: 0,
    aiTransparency: 0,
    communicationClarity: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from('.gsap-header', { y: -20, opacity: 0, duration: 0.6, ease: 'power3.out' });
      gsap.from('.gsap-row', { y: 20, opacity: 0, duration: 0.4, stagger: 0.1, ease: 'power3.out' });
    },
    { scope: containerRef, dependencies: [loading] }
  );

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const res = await getModule3VideoQueueAction();
      if (res.success && res.data) {
        setQueue(res.data);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const handleSelectSubmission = (sub: RecordedExplanationSubmission) => {
    setSelectedSubmission(sub);
    setAuthenticityPassed(sub.authenticityPassed ?? true);
    setAuthenticityNotes(sub.authenticityNotes || '');
    if (sub.specificQuestionPrompts && sub.specificQuestionPrompts.length > 0) {
      setPrompt1(sub.specificQuestionPrompts[0] || '');
      setPrompt2(sub.specificQuestionPrompts[1] || '');
    } else {
      setPrompt1('');
      setPrompt2('');
    }
    setPromptSuccessMsg(null);

    // Anti-Anchoring Bias: If already graded, load final score. If pending, start sliders un-anchored (0).
    setScores(
      sub.status === 'graded'
        ? sub.criterionScores
        : {
            architectureArticulation: 0,
            trapExplanation: 0,
            aiTransparency: 0,
            communicationClarity: 0,
          }
    );
  };

  const handleAssignPostHocPrompts = async () => {
    if (!selectedSubmission) return;
    const prompts = [prompt1, prompt2].filter((p) => p.trim().length > 0);
    if (prompts.length === 0) {
      setErrorMessage('Please enter at least one post-hoc submission-specific question.');
      return;
    }

    setAssigningPrompts(true);
    setErrorMessage(null);
    setPromptSuccessMsg(null);
    const res = await assignPostHocQuestionsAction(selectedSubmission.id, prompts);
    if (res.success && res.data) {
      setQueue((prev) => prev.map((item) => (item.id === res.data!.id ? res.data! : item)));
      setSelectedSubmission(res.data);
      setPromptSuccessMsg('Post-hoc submission-specific questions assigned successfully!');
    } else {
      setErrorMessage(res.error || 'Failed to assign post-hoc questions');
    }
    setAssigningPrompts(false);
  };

  const handleFinalizeGrading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    setSubmitting(true);
    setErrorMessage(null);
    const res = await finalizeModule3GradingAction(
      selectedSubmission.id,
      scores,
      authenticityPassed,
      authenticityNotes
    );
    if (res.success && res.data) {
      setQueue((prev) => prev.map((item) => (item.id === res.data!.id ? res.data! : item)));
      setSelectedSubmission(res.data);
    } else {
      setErrorMessage(res.error || 'Failed to finalize grading');
    }
    setSubmitting(false);
  };

  const currentWeightedScore = calculateModule3WeightedScore(scores);

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[var(--qh-bg-dark)] text-white font-[family-name:var(--font-poppins)] antialiased pb-16"
    >
      <AppHeader
        title="QPipeline Admin Ops"
        subtitle="Module 3 — Recorded Explanation Video Queue"
        backLink={{ href: '/admin', label: '← Dashboard' }}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="gsap-header mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--qh-card-bg)] border border-[var(--qh-border)] text-xs text-[var(--qh-accent-glow)] mb-2">
            <span className="w-2 h-2 rounded-full bg-[var(--qh-accent-primary)] animate-pulse" />
            Admin Video Calibration Workspace
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Module 3 — Recorded Explanation Calibration Queue
          </h2>
          <p className="text-xs text-[var(--qh-ink-muted)] max-w-2xl mt-1">
            Review candidate video explanations, evaluate system architecture articulation, trap explanations, and calibrate 0-100% weighted scores.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center p-12 text-xs text-[var(--qh-ink-muted)] space-x-3">
            <div className="w-4 h-4 border-2 border-t-[var(--qh-accent-primary)] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
            <span>Loading video submission queue...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Submissions Table */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--qh-border)] flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Video Submissions ({queue.length})
                  </h3>
                </div>

                {queue.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[var(--qh-ink-muted)]">
                    No Module 3 video explanation submissions found.
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--qh-border)]">
                    {queue.map((sub) => {
                      const isSelected = selectedSubmission?.id === sub.id;
                      return (
                        <div
                          key={sub.id}
                          onClick={() => handleSelectSubmission(sub)}
                          className={`gsap-row p-4 transition-all cursor-pointer hover:bg-[var(--qh-bg-dark)]/60 ${
                            isSelected
                              ? 'bg-[var(--qh-bg-dark)] border-l-4 border-l-[var(--qh-accent-primary)]'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono font-medium text-white">
                              Fellow #{sub.fellowProfileId.substring(0, 8)}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                sub.status === 'graded'
                                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                                  : sub.status === 'submitted'
                                  ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                                  : 'bg-blue-950/60 text-blue-400 border border-blue-800/40'
                              }`}
                            >
                              {sub.status}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--qh-ink-muted)]">
                            <span>Score: <strong className="text-white">{sub.status === 'graded' ? `${sub.weightedScore}%` : 'Pending'}</strong></span>
                            <span>•</span>
                            <span>Duration: <strong className="text-white">{sub.videoDurationSeconds}s</strong></span>
                            <span>•</span>
                            <span>Late: <strong className={sub.isLate ? 'text-red-400' : 'text-emerald-400'}>{sub.isLate ? 'Yes' : 'No'}</strong></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Embedded Player & Calibration Workspace */}
            <div className="lg:col-span-7 space-y-6">
              {selectedSubmission ? (
                <div className="bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl p-6 space-y-6">
                  {/* Header info */}
                  <div className="border-b border-[var(--qh-border)] pb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Submission #{selectedSubmission.id.substring(0, 8)}
                      </h3>
                      <p className="text-xs text-[var(--qh-ink-muted)]">
                        Submitted: {selectedSubmission.submittedAt ? new Date(selectedSubmission.submittedAt).toLocaleString() : 'In Progress'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-[var(--qh-ink-muted)]">Live Score Preview</span>
                      <div className="text-xl font-extrabold text-[var(--qh-accent-glow)]">
                        {currentWeightedScore}%
                      </div>
                    </div>
                  </div>

                  {/* Video Player */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Candidate Video Player</h4>
                    <div className="aspect-video w-full bg-[var(--qh-bg-dark)] border border-[var(--qh-border)] rounded-xl overflow-hidden">
                      {selectedSubmission.videoUrl ? (
                        <video src={selectedSubmission.videoUrl} controls className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-[var(--qh-ink-muted)]">
                          No video file uploaded yet.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Post-Hoc Submission-Specific Question Assignment */}
                  <div className="p-4 rounded-xl bg-[var(--qh-bg-dark)] border border-[var(--qh-border)] space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center space-x-1.5">
                        <span>🎯</span>
                        <span>Assign Candidate-Specific Post-Hoc Questions</span>
                      </h4>
                      {promptSuccessMsg && (
                        <span className="text-[10px] text-emerald-400 font-medium">{promptSuccessMsg}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--qh-ink-muted)]">
                      Pick 1–2 specific lines/decisions from this candidate's Module 2 sandbox submission to prevent rehearsed proxy defenses:
                    </p>
                    <div className="space-y-2 text-xs">
                      <input
                        type="text"
                        value={prompt1}
                        onChange={(e) => setPrompt1(e.target.value)}
                        placeholder="e.g. Explain why you handled the null case on line 47 of your submission this way..."
                        className="w-full bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--qh-accent-primary)]"
                      />
                      <input
                        type="text"
                        value={prompt2}
                        onChange={(e) => setPrompt2(e.target.value)}
                        placeholder="e.g. Why did you choose an async queue instead of a direct DB write in your solution?"
                        className="w-full bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--qh-accent-primary)]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAssignPostHocPrompts}
                      disabled={assigningPrompts}
                      className="px-4 py-2 rounded-lg bg-[var(--qh-accent-primary)] hover:bg-[var(--qh-accent-deep)] text-white text-xs font-medium transition-all disabled:opacity-50"
                    >
                      {assigningPrompts ? 'Saving Questions...' : 'Attach Questions to Candidate'}
                    </button>
                  </div>

                  {/* Anti-Anchoring Calibration Sliders & Authenticity Gate */}
                  <form onSubmit={handleFinalizeGrading} className="space-y-5 pt-2">
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                      Weighted Rubric Calibration
                    </h4>

                    {/* Architecture Articulation (25%) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <label className="text-[var(--qh-ink-muted)]">Architecture Articulation (25% max)</label>
                        <span className="font-bold text-white">{scores.architectureArticulation} / 4</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="4"
                        value={scores.architectureArticulation}
                        onChange={(e) => setScores({ ...scores, architectureArticulation: parseInt(e.target.value) })}
                        className="w-full accent-[var(--qh-accent-primary)]"
                      />
                    </div>

                    {/* Trap Explanation (25%) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <label className="text-[var(--qh-ink-muted)]">Trap & Bug Explanation (25% max)</label>
                        <span className="font-bold text-white">{scores.trapExplanation} / 4</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="4"
                        value={scores.trapExplanation}
                        onChange={(e) => setScores({ ...scores, trapExplanation: parseInt(e.target.value) })}
                        className="w-full accent-[var(--qh-accent-primary)]"
                      />
                    </div>

                    {/* AI Transparency (25%) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <label className="text-[var(--qh-ink-muted)]">AI Tool Usage Transparency (25% max)</label>
                        <span className="font-bold text-white">{scores.aiTransparency} / 4</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="4"
                        value={scores.aiTransparency}
                        onChange={(e) => setScores({ ...scores, aiTransparency: parseInt(e.target.value) })}
                        className="w-full accent-[var(--qh-accent-primary)]"
                      />
                    </div>

                    {/* Communication Clarity (25%) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <label className="text-[var(--qh-ink-muted)]">Communication Clarity (25% max)</label>
                        <span className="font-bold text-white">{scores.communicationClarity} / 4</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="4"
                        value={scores.communicationClarity}
                        onChange={(e) => setScores({ ...scores, communicationClarity: parseInt(e.target.value) })}
                        className="w-full accent-[var(--qh-accent-primary)]"
                      />
                    </div>

                    {/* Hard Authenticity Gate Toggle */}
                    <div className="p-4 rounded-xl bg-[var(--qh-bg-dark)] border border-red-800/40 space-y-3">
                      <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center space-x-2">
                        <span>🛡️</span>
                        <span>Hard Authenticity Gate Check</span>
                      </h4>
                      <p className="text-[11px] text-[var(--qh-ink-muted)]">
                        Verify if defense is authentic vs proxy/ghostwritten submission:
                      </p>
                      <div className="flex items-center space-x-6 text-xs">
                        <label className="flex items-center space-x-2 cursor-pointer text-emerald-300 font-medium">
                          <input
                            type="radio"
                            name="authenticity"
                            checked={authenticityPassed === true}
                            onChange={() => setAuthenticityPassed(true)}
                            className="accent-emerald-500"
                          />
                          <span>✓ Passed Authenticity Gate</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer text-red-400 font-medium">
                          <input
                            type="radio"
                            name="authenticity"
                            checked={authenticityPassed === false}
                            onChange={() => setAuthenticityPassed(false)}
                            className="accent-red-500"
                          />
                          <span>🛑 Failed (Proxy / Unauthentic Defense)</span>
                        </label>
                      </div>

                      {!authenticityPassed && (
                        <div className="space-y-2 pt-1">
                          <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-red-200 text-[11px]">
                            <strong>🛑 Disqualification Wall:</strong> Candidate will be immediately rejected and assigned to Tier 4 (Rejected) regardless of their numerical composite score.
                          </div>
                          <input
                            type="text"
                            value={authenticityNotes}
                            onChange={(e) => setAuthenticityNotes(e.target.value)}
                            placeholder="Reason for failing authenticity check (e.g. candidate could not explain code line 47)..."
                            className="w-full bg-[var(--qh-card-bg)] border border-red-800/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                          />
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 rounded-xl bg-[var(--qh-accent-primary)] hover:bg-[var(--qh-accent-deep)] text-white font-medium text-xs transition-all disabled:opacity-50 shadow-lg shadow-[var(--qh-accent-glow)]/20"
                    >
                      {submitting ? 'Saving Calibration...' : 'Finalize Calibration & Save Score'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl p-12 text-center text-xs text-[var(--qh-ink-muted)]">
                  Select a submission from the left queue to view video defense and calibrate rubric scores.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
