'use client';

import React, { useState, useEffect } from 'react';
import {
  FellowPlacement,
  PlacementPerformanceReview,
  PlacementMilestoneReport,
  PlacementSummaryMetrics,
  PlacementStatus,
} from '@/modules/placements/types';
import {
  listAllPlacementsAction,
  createPlacementAction,
  updatePlacementStatusAction,
  submitPerformanceReviewAction,
  getPlacementMetricsAction,
} from '@/modules/placements/actions';

export default function AdminPlacementsPage() {
  const [placements, setPlacements] = useState<
    Array<FellowPlacement & { reviews: PlacementPerformanceReview[]; milestones: PlacementMilestoneReport[] }>
  >([]);
  const [metrics, setMetrics] = useState<PlacementSummaryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PlacementStatus | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState<FellowPlacement | null>(null);
  const [showStatusModal, setShowStatusModal] = useState<FellowPlacement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State: Create Placement
  const [fellowProfileId, setFellowProfileId] = useState('550e8400-e29b-41d4-a716-446655440000');
  const [clientName, setClientName] = useState('Seelicongate Global');
  const [clientContactEmail, setClientContactEmail] = useState('eng-lead@seelicongate.com');
  const [roleTitle, setRoleTitle] = useState('Senior AI/ML Engineer');
  const [monthlyCompensation, setMonthlyCompensation] = useState('3500');
  const [billingRate, setBillingRate] = useState('5000');
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 180 * 86400000).toISOString().substring(0, 10)
  );

  // Form State: Review Ingestion
  const [reviewerName, setReviewerName] = useState('Engineering VP');
  const [technicalVelocityScore, setTechnicalVelocityScore] = useState(5);
  const [codeQualityScore, setCodeQualityScore] = useState(5);
  const [communicationScore, setCommunicationScore] = useState(5);
  const [reliabilityScore, setReliabilityScore] = useState(5);
  const [feedbackNotes, setFeedbackNotes] = useState('Outstanding technical velocity and clean production commits.');

  // Form State: Status Update
  const [newStatus, setNewStatus] = useState<PlacementStatus>('active');
  const [newEndDate, setNewEndDate] = useState('');
  const [terminationReason, setTerminationReason] = useState('');

  useEffect(() => {
    loadPlacementsData();
  }, [statusFilter]);

  async function loadPlacementsData() {
    setLoading(true);
    try {
      const [list, stats] = await Promise.all([
        listAllPlacementsAction(statusFilter === 'all' ? undefined : statusFilter),
        getPlacementMetricsAction(),
      ]);
      setPlacements(list);
      setMetrics(stats);
    } catch (err: any) {
      console.error('Failed to load placements data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePlacement(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      await createPlacementAction({
        fellowProfileId: fellowProfileId.trim(),
        clientName: clientName.trim(),
        clientContactEmail: clientContactEmail.trim(),
        roleTitle: roleTitle.trim(),
        monthlyCompensation: Number(monthlyCompensation) || 0,
        billingRate: Number(billingRate) || 0,
        startDate,
        endDate,
        status: 'active',
      });

      setStatusMessage({ type: 'success', text: `Placement successfully created for fellow ${fellowProfileId}.` });
      setShowCreateModal(false);
      await loadPlacementsData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to create placement.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!showReviewModal) return;
    setIsSubmitting(true);

    try {
      const review = await submitPerformanceReviewAction({
        placementId: showReviewModal.id,
        fellowProfileId: showReviewModal.fellowProfileId,
        reviewerType: 'client',
        reviewerName: reviewerName.trim(),
        technicalVelocityScore: Number(technicalVelocityScore),
        codeQualityScore: Number(codeQualityScore),
        communicationScore: Number(communicationScore),
        reliabilityScore: Number(reliabilityScore),
        feedbackNotes: feedbackNotes.trim(),
      });

      if (review.isLowPerformanceFlagged) {
        setStatusMessage({
          type: 'error',
          text: `Review ingested with Overall Rating ${review.overallRating}/5.0. LOW PERFORMANCE ALERT FLAGGED for Admin Ops Review!`,
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: `Client review ingested successfully (Overall Rating: ${review.overallRating}/5.0).`,
        });
      }

      setShowReviewModal(null);
      await loadPlacementsData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to submit review.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!showStatusModal) return;
    setIsSubmitting(true);

    try {
      await updatePlacementStatusAction({
        placementId: showStatusModal.id,
        status: newStatus,
        endDate: newEndDate || undefined,
        terminationReason: terminationReason || undefined,
      });

      setStatusMessage({ type: 'success', text: `Placement status updated to '${newStatus}'.` });
      setShowStatusModal(null);
      await loadPlacementsData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update placement status.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      {/* Header & Actions */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 tracking-wider uppercase mb-1">
              <span>Admin Governance</span>
              <span>/</span>
              <span>Placement Lifecycle & Client Retention</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Placement Tracking & Performance Console</h1>
            <p className="text-slate-400 text-sm mt-1">
              Monitor active placements, ingest client performance ratings, track retention rates, and manage tenure extensions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-lg shadow-blue-900/30 transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Fellow Placement
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        {metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
            <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl">
              <span className="text-xs text-slate-400 font-medium">Active Placements</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{metrics.activePlacementsCount}</div>
              <span className="text-[11px] text-slate-500">Out of {metrics.totalPlacements} total</span>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl">
              <span className="text-xs text-blue-400 font-medium">Completed Placements</span>
              <div className="text-2xl font-bold text-blue-400 mt-1">{metrics.completedPlacementsCount}</div>
              <span className="text-[11px] text-slate-500">Successful tenure</span>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl">
              <span className="text-xs text-amber-400 font-medium">Avg Client Rating</span>
              <div className="text-2xl font-bold text-amber-400 mt-1">{metrics.averageClientRating} <span className="text-xs font-normal text-slate-500">/ 5.0</span></div>
              <span className="text-[11px] text-slate-500">Client evaluation avg</span>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl">
              <span className="text-xs text-emerald-400 font-medium">Client Retention Rate</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{metrics.retentionRatePercent}%</div>
              <span className="text-[11px] text-slate-500">Completion & extensions</span>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl">
              <span className="text-xs text-rose-400 font-medium">Low Rating Alerts</span>
              <div className="text-2xl font-bold text-rose-400 mt-1">{metrics.lowPerformanceAlertCount}</div>
              <span className="text-[11px] text-slate-500">&lt; 3.0 star reviews</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto space-y-6">
        {statusMessage && (
          <div
            className={`p-4 rounded-lg border text-sm font-medium flex items-center justify-between ${
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

        {/* Filter Bar */}
        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Filter Status:</span>
            {(['all', 'active', 'extended', 'completed', 'terminated'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition capitalize ${
                  statusFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 font-mono">Showing {placements.length} placement(s)</span>
        </div>

        {/* Data Table */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
              <p className="text-sm">Loading placement records...</p>
            </div>
          ) : placements.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="text-sm">No placement records found for selected filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Client Partner & Role</th>
                    <th className="p-4">Fellow Profile ID</th>
                    <th className="p-4">Compensation / Billing</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Avg Client Rating</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {placements.map((p) => {
                    const avgRating =
                      p.reviews.length > 0
                        ? Number((p.reviews.reduce((acc, r) => acc + r.overallRating, 0) / p.reviews.length).toFixed(2))
                        : null;
                    const hasLowPerformance = p.reviews.some((r) => r.isLowPerformanceFlagged);

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-4">
                          <div className="font-sans font-bold text-white text-sm">{p.clientName}</div>
                          <div className="text-[11px] text-blue-400 font-sans mt-0.5">{p.roleTitle}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-slate-300">{p.fellowProfileId.substring(0, 16)}...</div>
                          <div className="text-[11px] text-slate-500">{p.startDate} to {p.endDate}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-emerald-400 font-bold">${p.monthlyCompensation.toLocaleString()} / mo</div>
                          <div className="text-[11px] text-slate-500">Bill: ${p.billingRate.toLocaleString()} / mo</div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                              p.status === 'active' || p.status === 'extended'
                                ? 'bg-emerald-950 border-emerald-500/40 text-emerald-400'
                                : p.status === 'completed'
                                ? 'bg-blue-950 border-blue-500/40 text-blue-400'
                                : 'bg-rose-950 border-rose-500/40 text-rose-400'
                            }`}
                          >
                            {p.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4">
                          {avgRating !== null ? (
                            <div className="flex items-center gap-1.5">
                              <span className={`font-bold ${hasLowPerformance ? 'text-rose-400' : 'text-amber-400'}`}>
                                {avgRating} / 5.0
                              </span>
                              {hasLowPerformance && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 text-[10px] border border-rose-800/40">
                                  ALERT
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600">No reviews</span>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => setShowReviewModal(p)}
                            className="px-2.5 py-1 bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800/40 rounded text-[11px] transition"
                          >
                            Ingest Review
                          </button>
                          <button
                            onClick={() => {
                              setShowStatusModal(p);
                              setNewStatus(p.status);
                              setNewEndDate(p.endDate);
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] transition"
                          >
                            Manage Tenure
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Placement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleCreatePlacement}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">Create New Fellow Placement</h2>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Fellow Profile ID:</label>
                <input
                  type="text"
                  required
                  value={fellowProfileId}
                  onChange={(e) => setFellowProfileId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Client Partner Name:</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Client Contact Email:</label>
                  <input
                    type="email"
                    required
                    value={clientContactEmail}
                    onChange={(e) => setClientContactEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Placement Role Title:</label>
                <input
                  type="text"
                  required
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Fellow Compensation ($/mo):</label>
                  <input
                    type="number"
                    required
                    value={monthlyCompensation}
                    onChange={(e) => setMonthlyCompensation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Client Billing Rate ($/mo):</label>
                  <input
                    type="number"
                    required
                    value={billingRate}
                    onChange={(e) => setBillingRate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Start Date:</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">End Date:</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-xs text-slate-400 hover:text-white">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition">
                {isSubmitting ? 'Creating Placement...' : 'Confirm Placement Creation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Review Ingestion Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSubmitReview}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs text-blue-400 font-semibold uppercase">Client Review Ingestion</span>
                <h3 className="text-lg font-bold text-white mt-0.5">{showReviewModal.clientName}</h3>
              </div>
              <button type="button" onClick={() => setShowReviewModal(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Reviewer Name & Title:</label>
                <input
                  type="text"
                  required
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Velocity (1-5):</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={technicalVelocityScore}
                    onChange={(e) => setTechnicalVelocityScore(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Code Quality (1-5):</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={codeQualityScore}
                    onChange={(e) => setCodeQualityScore(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Communication (1-5):</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={communicationScore}
                    onChange={(e) => setCommunicationScore(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Reliability (1-5):</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={reliabilityScore}
                    onChange={(e) => setReliabilityScore(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded text-center font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Client Feedback Notes:</label>
                <textarea
                  rows={3}
                  required
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 p-3 rounded-lg focus:outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button type="button" onClick={() => setShowReviewModal(null)} className="text-xs text-slate-400 hover:text-white">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition">
                {isSubmitting ? 'Ingesting Review...' : 'Ingest Client Review'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tenure & Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateStatus}
            className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-lg font-bold text-white">Manage Placement Status & Tenure</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Status Transition:</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as PlacementStatus)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 p-2 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="active">Active Placement</option>
                  <option value="extended">Extended Tenure</option>
                  <option value="completed">Completed Successfully (Alumni)</option>
                  <option value="terminated">Terminated Early</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">New End Date:</label>
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 p-2 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              {newStatus === 'terminated' && (
                <div>
                  <label className="block text-rose-400 font-medium mb-1">Termination Reason:</label>
                  <textarea
                    rows={2}
                    value={terminationReason}
                    onChange={(e) => setTerminationReason(e.target.value)}
                    placeholder="e.g. Budget cut at client partner..."
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 p-2 rounded-lg focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowStatusModal(null)} className="text-xs text-slate-400 hover:text-white">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
