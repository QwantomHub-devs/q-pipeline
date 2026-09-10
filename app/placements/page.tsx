'use client';

import React, { useState, useEffect } from 'react';
import { FellowPlacement, PlacementPerformanceReview, PlacementMilestoneReport } from '@/modules/placements/types';
import {
  getMyPlacementsAction,
  submitMilestoneReportAction,
} from '@/modules/placements/actions';

export default function FellowPlacementsPage() {
  const [fellowProfileId, setFellowProfileId] = useState('550e8400-e29b-41d4-a716-446655440000');
  const [placements, setPlacements] = useState<
    Array<FellowPlacement & { reviews: PlacementPerformanceReview[]; milestones: PlacementMilestoneReport[] }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [activePlacement, setActivePlacement] = useState<FellowPlacement | null>(null);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [deliverablesSummary, setDeliverablesSummary] = useState('');
  const [hoursBilled, setHoursBilled] = useState('40');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadPlacements();
  }, [fellowProfileId]);

  async function loadPlacements() {
    setLoading(true);
    try {
      const data = await getMyPlacementsAction(fellowProfileId);
      setPlacements(data);
    } catch (err: any) {
      console.error('Failed to load fellow placements:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!activePlacement) return;
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      await submitMilestoneReportAction({
        placementId: activePlacement.id,
        fellowProfileId,
        title: milestoneTitle.trim(),
        deliverablesSummary: deliverablesSummary.trim(),
        hoursBilled: Number(hoursBilled) || 0,
      });

      setStatusMessage({ type: 'success', text: 'Milestone progress report submitted successfully.' });
      setShowMilestoneModal(false);
      setMilestoneTitle('');
      setDeliverablesSummary('');
      await loadPlacements();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to submit milestone report.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 tracking-wider uppercase mb-1">
              <span>QwantomHub Career Portal</span>
              <span>/</span>
              <span>Client Placement & Performance</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Fellow Placements Hub</h1>
            <p className="text-slate-400 text-sm mt-1">
              Track your active client placements, review partner feedback, and submit periodic milestone deliverables.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Fellow ID:</span>
            <input
              type="text"
              value={fellowProfileId}
              onChange={(e) => setFellowProfileId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-slate-200 px-3 py-1.5 rounded font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto">
        {statusMessage && (
          <div
            className={`mb-6 p-4 rounded-lg border text-sm font-medium flex items-center justify-between ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="text-xs underline opacity-80 hover:opacity-100">
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
            <p className="text-sm">Loading client placements...</p>
          </div>
        ) : placements.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 rounded-xl border border-slate-800">
            <svg className="w-12 h-12 mx-auto text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-slate-200">No Active Placements</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto mt-1">
              You are currently not matched to an active client placement. Check your Bench Hub for upcoming opportunity interviews.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {placements.map((placement) => (
              <div
                key={placement.id}
                className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl"
              >
                {/* Placement Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 text-xs font-bold rounded-full border uppercase ${
                          placement.status === 'active' || placement.status === 'extended'
                            ? 'bg-emerald-950 border-emerald-500/40 text-emerald-400'
                            : placement.status === 'completed'
                            ? 'bg-blue-950 border-blue-500/40 text-blue-400'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {placement.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-mono text-slate-500">Placement ID: {placement.id.substring(0, 8)}...</span>
                    </div>
                    <h2 className="text-2xl font-extrabold text-white mt-1">{placement.roleTitle}</h2>
                    <p className="text-sm text-blue-400 font-medium">
                      Client Partner: <span className="text-white">{placement.clientName}</span> ({placement.clientContactEmail})
                    </p>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-right space-y-1">
                    <span className="text-xs text-slate-400">Monthly Compensation</span>
                    <div className="text-2xl font-bold text-emerald-400">
                      ${placement.monthlyCompensation.toLocaleString()} <span className="text-xs text-slate-500 font-normal">/ mo</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      Tenure: {new Date(placement.startDate).toLocaleDateString()} – {new Date(placement.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Performance Reviews Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Client Feedback & Performance Ratings</h3>
                  {placement.reviews.length === 0 ? (
                    <p className="text-xs text-slate-500 bg-slate-950 p-4 rounded-xl border border-slate-800">
                      No periodic client performance reviews recorded yet for this placement.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {placement.reviews.map((rev) => (
                        <div key={rev.id} className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{rev.reviewerName}</span>
                            <div className="flex items-center gap-1 bg-blue-950/60 border border-blue-800/40 px-2.5 py-1 rounded-full">
                              <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="text-xs font-bold text-white">{rev.overallRating} / 5.0</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-2 text-[11px] font-mono bg-slate-900 p-2.5 rounded-lg">
                            <div><span className="text-slate-500 block">Velocity</span><span className="text-slate-200 font-bold">{rev.technicalVelocityScore}/5</span></div>
                            <div><span className="text-slate-500 block">Quality</span><span className="text-slate-200 font-bold">{rev.codeQualityScore}/5</span></div>
                            <div><span className="text-slate-500 block">Comms</span><span className="text-slate-200 font-bold">{rev.communicationScore}/5</span></div>
                            <div><span className="text-slate-500 block">Reliability</span><span className="text-slate-200 font-bold">{rev.reliabilityScore}/5</span></div>
                          </div>

                          <p className="text-xs text-slate-300 italic font-sans leading-relaxed">"{rev.feedbackNotes}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Milestone Deliverables & Action Controls */}
                <div className="pt-4 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="text-xs text-slate-400 font-mono">
                    Milestones Submitted: <span className="text-white font-bold">{placement.milestones.length}</span> report(s)
                  </div>

                  <button
                    onClick={() => {
                      setActivePlacement(placement);
                      setShowMilestoneModal(true);
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-lg shadow-blue-900/30 transition flex items-center gap-2 w-fit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Submit Milestone Progress Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Milestone Submission Modal */}
      {showMilestoneModal && activePlacement && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitMilestone}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Milestone Progress Report</span>
                <h3 className="text-lg font-bold text-white mt-0.5">{activePlacement.clientName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMilestoneModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Report / Sprint Deliverable Title:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sprint 14 API Optimization & Microservices Migration"
                  value={milestoneTitle}
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Deliverables & Velocity Summary:</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Summarize key features delivered, pull requests merged, and code quality benchmarks achieved during this period..."
                  value={deliverablesSummary}
                  onChange={(e) => setDeliverablesSummary(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 p-3 rounded-lg focus:outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Total Hours Billed:</label>
                <input
                  type="number"
                  required
                  value={hoursBilled}
                  onChange={(e) => setHoursBilled(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowMilestoneModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition"
              >
                {isSubmitting ? 'Submitting Report...' : 'Submit Milestone Report'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
