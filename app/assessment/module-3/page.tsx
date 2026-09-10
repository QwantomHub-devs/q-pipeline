'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { RecordedExplanationSubmission } from '@/modules/assessment/types';
import {
  getMyModule3SubmissionAction,
  startModule3Action,
  submitModule3Action,
} from '@/modules/assessment/actions';

export default function Module3RecordedExplanationPage() {
  const [submission, setSubmission] = useState<RecordedExplanationSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Video recording states
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [videoUrlInput, setVideoUrlInput] = useState('');

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from('.gsap-hero', {
        y: -20,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      });
      gsap.from('.gsap-pane', {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.15,
        ease: 'power3.out',
      });
    },
    { scope: containerRef, dependencies: [loading] }
  );

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const res = await getMyModule3SubmissionAction();
      if (res.success && res.data) {
        setSubmission(res.data);
        if (res.data.videoUrl) {
          setVideoUrlInput(res.data.videoUrl);
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // Timer counter during active recording
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recording) {
      interval = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 180) {
            stopRecording();
            return 180;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recording]);

  const handleStartAssessment = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    const res = await startModule3Action();
    if (res.success && res.data) {
      setSubmission(res.data);
    } else {
      setErrorMessage(res.error || 'Failed to start Module 3 assessment');
    }
    setSubmitting(false);
  };

  const startRecording = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        setVideoUrlInput(url);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
      };

      recorder.start();
      setRecording(true);
      setRecordSeconds(0);
    } catch (err: any) {
      setErrorMessage('Camera/Microphone permission denied or not available. You can also paste an uploaded video URL below.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleSubmitVideo = async () => {
    if (!submission) return;
    if (!videoUrlInput) {
      setErrorMessage('Please record or upload a video explanation before submitting.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const duration = recordSeconds > 0 ? recordSeconds : 120; // default 2 minutes if URL pasted
    const res = await submitModule3Action(submission.id, videoUrlInput, duration);
    if (res.success && res.data) {
      setSubmission(res.data);
    } else {
      setErrorMessage(res.error || 'Failed to submit Module 3 video explanation');
    }
    setSubmitting(false);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--qh-bg-dark)] text-white flex items-center justify-center p-6">
        <div className="flex items-center space-x-3 text-[var(--qh-ink-muted)]">
          <div className="w-5 h-5 border-2 border-t-[var(--qh-accent-primary)] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
          <span>Loading Module 3 Recorded Explanation workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-[var(--qh-bg-dark)] text-white font-[family-name:var(--font-poppins)]">
      <AppHeader
        title="QPipeline Talent Platform"
        subtitle="Module 3 — Recorded Explanation Intake"
        backLink={{ href: '/assessment/results', label: '← Score Matrix' }}
      />

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="gsap-hero mb-8">
          <div className="inline-flex items-center space-x-2 bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-full px-4 py-1.5 text-xs text-[var(--qh-accent-glow)] mb-4">
            <span className="w-2 h-2 rounded-full bg-[var(--qh-accent-primary)] animate-pulse" />
            <span>Assessment Module 3 — Async Video Defense & Tradeoff Explanation</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Recorded Technical Explanation (3 Minutes Max)
          </h2>
          <p className="text-sm text-[var(--qh-ink-muted)] max-w-3xl leading-relaxed">
            Record a short video (up to 3 minutes) articulating your Module 2 build sandbox solution. Explain your system architecture, trade-offs, how you handled planted client secrets or deprecated endpoints, and how AI tools were used.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-sm">
            {errorMessage}
          </div>
        )}

        {/* State 1: Not Started */}
        {!submission && (
          <div className="gsap-pane bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl p-8 max-w-3xl mx-auto text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-[var(--qh-accent-primary)]/10 border border-[var(--qh-accent-primary)]/30 flex items-center justify-center mx-auto text-2xl">
              🎥
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Ready to Record Your Module 3 Defense?</h3>
              <p className="text-sm text-[var(--qh-ink-muted)] leading-relaxed">
                You will record a 3-minute video using your camera or upload a recorded video file. Human reviewers evaluate your communication, architectural transparency, and trap explanation.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={handleStartAssessment}
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[var(--qh-accent-primary)] hover:bg-[var(--qh-accent-deep)] text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-[var(--qh-accent-glow)]/20 disabled:opacity-50"
              >
                {submitting ? 'Initializing Video Workspace...' : 'Start Module 3 Video Intake'}
              </button>
            </div>
          </div>
        )}

        {/* State 2: In Progress */}
        {submission && submission.status === 'in_progress' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Prompts & Instructions */}
            <div className="lg:col-span-5 space-y-6">
              <div className="gsap-pane bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span className="text-[var(--qh-accent-glow)]">🎙️</span>
                  <span>Video Defense Prompts</span>
                </h3>

                {submission.specificQuestionPrompts && submission.specificQuestionPrompts.length > 0 ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center space-x-2">
                      <span>🎯</span>
                      <strong className="font-semibold">Reviewer Post-Hoc Questions Picked From Your Module 2 Code:</strong>
                    </div>
                    {submission.specificQuestionPrompts.map((q, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-[var(--qh-bg-dark)] border border-[var(--qh-accent-primary)]/40 text-xs space-y-1">
                        <strong className="text-[var(--qh-accent-glow)] block">Question #{idx + 1}</strong>
                        <p className="text-white font-medium leading-relaxed">{q}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-[var(--qh-bg-dark)] border border-[var(--qh-border)] text-[var(--qh-ink-muted)]">
                      <strong className="text-amber-400 block mb-1">📋 Standard Post-Hoc Topics</strong>
                      Addressing your Module 2 build sandbox implementation:
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--qh-bg-dark)] border border-[var(--qh-border)]">
                      <strong className="text-white block mb-1">1. System Architecture & Line Decisions (25%)</strong>
                      <span className="text-[var(--qh-ink-muted)]">Explain your queue consumer pattern, line-by-line data flow, and PostgreSQL sync.</span>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--qh-bg-dark)] border border-[var(--qh-border)]">
                      <strong className="text-white block mb-1">2. Planted Secrets & Traps (25%)</strong>
                      <span className="text-[var(--qh-ink-muted)]">How did you detect client secrets or deprecated endpoints? Explain your remediation choices.</span>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--qh-bg-dark)] border border-[var(--qh-border)]">
                      <strong className="text-white block mb-1">3. AI Transparency & Verification (25%)</strong>
                      <span className="text-[var(--qh-ink-muted)]">Which sections were AI-assisted vs self-authored? How did you verify correctness?</span>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--qh-bg-dark)] border border-[var(--qh-border)]">
                      <strong className="text-white block mb-1">4. Technical Communication Clarity (25%)</strong>
                      <span className="text-[var(--qh-ink-muted)]">Concise, professional engineering explanation under 3 minutes.</span>
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-red-950/30 border border-red-800/40 text-red-300 text-xs">
                  <strong>⚠️ Enforced Single Take Policy:</strong> No retakes or pauses are permitted. Once recording starts and stops, the recording is locked and auto-finalized.
                </div>
              </div>
            </div>

            {/* Right Column: WebRTC Recorder & Submission */}
            <div className="lg:col-span-7 space-y-6">
              <div className="gsap-pane bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">In-Browser Continuous Take Recorder</h3>
                  <span className={`text-xs font-mono font-bold ${recordSeconds >= 150 ? 'text-red-400 animate-pulse' : 'text-[var(--qh-accent-glow)]'}`}>
                    {formatSeconds(recordSeconds)} / 03:00
                  </span>
                </div>

                {/* Video Preview Box */}
                <div className="relative aspect-video w-full bg-[var(--qh-bg-dark)] border border-[var(--qh-border)] rounded-xl overflow-hidden flex items-center justify-center">
                  <video
                    ref={videoPreviewRef}
                    muted={recording}
                    controls={!recording && !!recordedVideoUrl}
                    src={!recording ? recordedVideoUrl || undefined : undefined}
                    className="w-full h-full object-cover"
                  />

                  {!recording && !recordedVideoUrl && (
                    <div className="text-center p-6 space-y-2">
                      <div className="text-3xl text-[var(--qh-ink-muted)]">📹</div>
                      <p className="text-xs text-[var(--qh-ink-muted)]">
                        Click "Start Continuous Take Recording" below to allow camera & microphone access.
                      </p>
                    </div>
                  )}
                </div>

                {/* Control Buttons */}
                <div className="flex flex-wrap gap-3">
                  {!recording && !recordedVideoUrl ? (
                    <button
                      onClick={startRecording}
                      className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-all flex items-center justify-center space-x-2"
                    >
                      <span>🔴</span>
                      <span>Start Continuous Take Recording</span>
                    </button>
                  ) : recording ? (
                    <button
                      onClick={stopRecording}
                      className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-xs transition-all flex items-center justify-center space-x-2 animate-pulse"
                    >
                      <span>⏹</span>
                      <span>Stop & Finalize Take ({formatSeconds(recordSeconds)})</span>
                    </button>
                  ) : (
                    <div className="w-full p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-xs text-center font-medium">
                      ✓ Single take recorded successfully. Ready for submission.
                    </div>
                  )}
                </div>

                {/* Direct Video URL Fallback */}
                <div className="pt-4 border-t border-[var(--qh-border)] space-y-3">
                  <label className="block text-xs font-medium text-[var(--qh-ink-muted)]">
                    Or paste pre-recorded video URL / Supabase storage URL:
                  </label>
                  <input
                    type="url"
                    value={videoUrlInput}
                    onChange={(e) => setVideoUrlInput(e.target.value)}
                    placeholder="https://mock.supabase.co/storage/v1/object/sign/module3_videos/my-defense.mp4"
                    className="w-full bg-[var(--qh-bg-dark)] border border-[var(--qh-border)] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[var(--qh-accent-primary)]"
                  />
                </div>

                <button
                  onClick={handleSubmitVideo}
                  disabled={submitting || (!recordedVideoUrl && !videoUrlInput)}
                  className="w-full py-3.5 rounded-xl bg-[var(--qh-accent-primary)] hover:bg-[var(--qh-accent-deep)] text-white font-semibold text-sm transition-all disabled:opacity-50 shadow-lg shadow-[var(--qh-accent-glow)]/20"
                >
                  {submitting ? 'Submitting Video Intake...' : 'Submit Final Video Explanation'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State 3: Submitted / Graded */}
        {submission && submission.status !== 'in_progress' && (
          <div className="gsap-pane bg-[var(--qh-card-bg)] border border-[var(--qh-border)] rounded-2xl p-8 max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--qh-border)] pb-4">
              <div>
                <span className="text-xs font-medium text-[var(--qh-ink-muted)] uppercase">Status</span>
                <h3 className="text-xl font-bold text-white capitalize">{submission.status}</h3>
              </div>
              <div className="text-right">
                <span className="text-xs font-medium text-[var(--qh-ink-muted)] uppercase">Weighted Score</span>
                <div className="text-2xl font-extrabold text-[var(--qh-accent-glow)]">
                  {submission.status === 'graded' ? `${submission.weightedScore}%` : 'Pending Review'}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Submitted Video Explanation</h4>
              {submission.videoUrl && (
                <div className="aspect-video w-full bg-[var(--qh-bg-dark)] border border-[var(--qh-border)] rounded-xl overflow-hidden">
                  <video src={submission.videoUrl} controls className="w-full h-full object-cover" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-xs text-[var(--qh-ink-muted)] pt-2">
                <div>
                  <span>Submitted At:</span>
                  <strong className="text-white block">{submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'N/A'}</strong>
                </div>
                <div>
                  <span>Duration:</span>
                  <strong className="text-white block">{submission.videoDurationSeconds} seconds</strong>
                </div>
              </div>

              {submission.status === 'graded' && (
                <div className="p-4 rounded-xl bg-[var(--qh-bg-dark)] border border-[var(--qh-border)] space-y-2">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Rubric Calibration Breakdown</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>Architecture Articulation: <strong className="text-white">{submission.criterionScores.architectureArticulation}/4</strong></div>
                    <div>Trap Explanation: <strong className="text-white">{submission.criterionScores.trapExplanation}/4</strong></div>
                    <div>AI Transparency: <strong className="text-white">{submission.criterionScores.aiTransparency}/4</strong></div>
                    <div>Communication Clarity: <strong className="text-white">{submission.criterionScores.communicationClarity}/4</strong></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
