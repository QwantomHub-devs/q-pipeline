'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { Opportunity, FellowMatch, OpportunityType, PlacementTier, MatchStatus } from '@/modules/matching/types';
import {
  createOpportunityAction,
  updateOpportunityAction,
  deleteOpportunityAction,
  getOpportunitiesListAction,
  runMatchingForOpportunityAction,
  updateMatchStatusAction,
} from '@/modules/matching/actions';

export default function AdminMatchingPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [showAddOppModal, setShowAddOppModal] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [candidateMatches, setCandidateMatches] = useState<FellowMatch[]>([]);
  const [matchingLoading, setMatchingLoading] = useState(false);

  // Clean empty form state for creating an opportunity
  const [newOpp, setNewOpp] = useState({
    title: '',
    clientName: '',
    opportunityType: 'faang_placement' as OpportunityType,
    requiredSkillsStr: '',
    minScore: 70,
    requiredTier: 'Tier 2 Regional' as PlacementTier,
    compensationRange: '',
    location: 'Remote / Hybrid',
    slotsAvailable: 1,
    description: '',
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const res = await getOpportunitiesListAction();
      if (res.success && res.opportunities) {
        setOpportunities(res.opportunities);
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to load opportunities' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const requiredSkills = newOpp.requiredSkillsStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await createOpportunityAction({
        title: newOpp.title,
        clientName: newOpp.clientName,
        opportunityType: newOpp.opportunityType,
        requiredSkills,
        minScore: Number(newOpp.minScore),
        requiredTier: newOpp.requiredTier,
        compensationRange: newOpp.compensationRange,
        location: newOpp.location,
        slotsAvailable: Number(newOpp.slotsAvailable),
        description: newOpp.description,
      });

      if (res.success && res.opportunity) {
        setNotification({ type: 'success', message: `Opportunity '${res.opportunity.title}' created.` });
        setShowAddOppModal(false);
        setNewOpp({
          title: '',
          clientName: '',
          opportunityType: 'faang_placement',
          requiredSkillsStr: '',
          minScore: 70,
          requiredTier: 'Tier 2 Regional',
          compensationRange: '',
          location: 'Remote / Hybrid',
          slotsAvailable: 1,
          description: '',
        });
        fetchOpportunities();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to create opportunity' });
    }
  };

  const handleDeleteOpportunity = async (opp: Opportunity) => {
    if (!confirm(`Are you sure you want to delete opportunity '${opp.title}'?`)) return;
    try {
      const res = await deleteOpportunityAction(opp.id);
      if (res.success) {
        setNotification({ type: 'success', message: `Opportunity '${opp.title}' deleted.` });
        if (selectedOpportunity?.id === opp.id) {
          setSelectedOpportunity(null);
          setCandidateMatches([]);
        }
        fetchOpportunities();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to delete opportunity' });
    }
  };

  const handleRunMatching = async (opp: Opportunity) => {
    setSelectedOpportunity(opp);
    setMatchingLoading(true);
    try {
      const res = await runMatchingForOpportunityAction(opp.id);
      if (res.success && res.matches) {
        setCandidateMatches(res.matches);
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to run matching engine' });
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleUpdateMatchStatus = async (matchId: string, status: MatchStatus) => {
    try {
      const res = await updateMatchStatusAction({ matchId, status });
      if (res.success && selectedOpportunity) {
        setNotification({ type: 'success', message: `Candidate status updated to '${status}'.` });
        handleRunMatching(selectedOpportunity);
        fetchOpportunities();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to update match status' });
    }
  };

  const filteredOpportunities = opportunities.filter((o) => {
    if (selectedTypeFilter === 'all') return true;
    return o.opportunityType === selectedTypeFilter;
  });

  return (
    <div className="min-h-screen bg-[var(--qh-bg)] text-[var(--qh-ink)]">
      <AppHeader
        title="Opportunity & Candidate Matching Console"
        subtitle="Algorithmic matching of fellows to FAANG placements, SME build projects, and staffing gigs"
        badge={{ label: 'Phase 2 Service 16', variant: 'accent' }}
        backLink={{ href: '/admin', label: '← Back to Admin Panel' }}
      >
        <button
          onClick={() => setShowAddOppModal(true)}
          className="px-4 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-sm"
        >
          + Post Client Opportunity
        </button>
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
            <p className="text-xs font-semibold text-[var(--qh-slate-600)] uppercase tracking-wider">Open Opportunities</p>
            <h3 className="text-2xl font-bold mt-1 text-[var(--qh-ink)]">
              {opportunities.filter((o) => o.status === 'open').length}
            </h3>
            <p className="text-xs text-emerald-600 mt-1">Active client postings</p>
          </div>

          <div className="p-5 bg-[var(--qh-surface-card)] rounded-xl border border-[var(--qh-border)] shadow-sm">
            <p className="text-xs font-semibold text-[var(--qh-slate-600)] uppercase tracking-wider">FAANG Placements</p>
            <h3 className="text-2xl font-bold mt-1 text-[var(--qh-ink)]">
              {opportunities.filter((o) => o.opportunityType === 'faang_placement').length}
            </h3>
            <p className="text-xs text-[var(--qh-slate-600)] mt-1">Global tier slots</p>
          </div>

          <div className="p-5 bg-[var(--qh-surface-card)] rounded-xl border border-[var(--qh-border)] shadow-sm">
            <p className="text-xs font-semibold text-[var(--qh-slate-600)] uppercase tracking-wider">SME Build Projects</p>
            <h3 className="text-2xl font-bold mt-1 text-[var(--qh-ink)]">
              {opportunities.filter((o) => o.opportunityType === 'sme_build_project').length}
            </h3>
            <p className="text-xs text-[var(--qh-slate-600)] mt-1">Regional team projects</p>
          </div>

          <div className="p-5 bg-[var(--qh-surface-card)] rounded-xl border border-[var(--qh-border)] shadow-sm">
            <p className="text-xs font-semibold text-[var(--qh-slate-600)] uppercase tracking-wider">Filled Slots</p>
            <h3 className="text-2xl font-bold mt-1 text-[var(--qh-accent-deep)]">
              {opportunities.reduce((acc, o) => acc + o.filledSlotsCount, 0)} /{' '}
              {opportunities.reduce((acc, o) => acc + o.slotsAvailable, 0)}
            </h3>
            <p className="text-xs text-[var(--qh-slate-600)] mt-1">Placed candidates</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs font-semibold text-[var(--qh-slate-600)]">Filter Opportunity Type:</span>
          {[
            { id: 'all', label: 'All Types' },
            { id: 'faang_placement', label: 'FAANG Placement' },
            { id: 'sme_build_project', label: 'SME Build Project' },
            { id: 'staffing_maintenance', label: 'Staffing / Maintenance' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedTypeFilter(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedTypeFilter === item.id
                  ? 'bg-[var(--qh-accent-main)] text-white'
                  : 'bg-[var(--qh-surface-card)] text-[var(--qh-slate-600)] border border-[var(--qh-border)] hover:border-[var(--qh-accent-main)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Opportunities List Column */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--qh-slate-600)]">
              Client Opportunity Directory ({filteredOpportunities.length})
            </h3>

            {loading ? (
              <div className="p-12 text-center text-sm text-[var(--qh-slate-600)]">Loading opportunities...</div>
            ) : filteredOpportunities.length === 0 ? (
              <div className="p-12 text-center bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] space-y-3">
                <p className="text-sm font-semibold text-[var(--qh-slate-600)]">No client opportunities posted yet.</p>
                <p className="text-xs text-[var(--qh-slate-600)]">
                  Click &quot;+ Post Client Opportunity&quot; to post a new job placement or SME project.
                </p>
              </div>
            ) : (
              filteredOpportunities.map((opp) => {
                const isSelected = selectedOpportunity?.id === opp.id;
                return (
                  <div
                    key={opp.id}
                    className={`bg-[var(--qh-surface-card)] p-6 rounded-2xl border shadow-sm transition-all ${
                      isSelected
                        ? 'border-[var(--qh-accent-main)] ring-2 ring-[var(--qh-accent-main)]/20'
                        : 'border-[var(--qh-border)] hover:border-[var(--qh-accent-main)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase bg-[var(--qh-accent-main)]/10 text-[var(--qh-accent-deep)]">
                            {opp.opportunityType.replace('_', ' ')}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                              opp.status === 'open'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-slate-500/10 text-slate-600'
                            }`}
                          >
                            {opp.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-lg text-[var(--qh-ink)]">{opp.title}</h4>
                        <p className="text-xs text-[var(--qh-slate-600)]">
                          Client: <span className="font-semibold text-[var(--qh-ink)]">{opp.clientName}</span> | Location:{' '}
                          <span className="font-medium text-[var(--qh-ink)]">{opp.location}</span>
                        </p>
                      </div>

                      <button
                        onClick={() => handleDeleteOpportunity(opp)}
                        className="p-1.5 text-xs text-rose-500 hover:text-rose-700 transition-colors"
                        title="Delete Opportunity"
                      >
                        🗑️
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-[var(--qh-bg)] rounded-xl border border-[var(--qh-border)] text-xs">
                      <div>
                        <span className="text-[var(--qh-slate-600)] block font-semibold">Compensation</span>
                        <span className="font-bold text-[var(--qh-accent-deep)]">{opp.compensationRange}</span>
                      </div>
                      <div>
                        <span className="text-[var(--qh-slate-600)] block font-semibold">Required Tier & Score</span>
                        <span className="font-semibold text-[var(--qh-ink)]">
                          {opp.requiredTier} (Min: {opp.minScore}%)
                        </span>
                      </div>
                    </div>

                    {/* Required Skills Badges */}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {opp.requiredSkills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 text-[11px] font-medium bg-[var(--qh-bg)] text-[var(--qh-slate-600)] border border-[var(--qh-border)] rounded-md"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[var(--qh-border)]">
                      <span className="text-xs text-[var(--qh-slate-600)]">
                        Slots Filled: <strong className="text-[var(--qh-ink)]">{opp.filledSlotsCount} / {opp.slotsAvailable}</strong>
                      </span>
                      <button
                        onClick={() => handleRunMatching(opp)}
                        className="px-4 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Run Auto-Matching Engine →
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Candidate Matching Drawer Column */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--qh-slate-600)]">
              Ranked Candidate Matching Drawer
            </h3>

            {!selectedOpportunity ? (
              <div className="p-8 text-center bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] text-xs text-[var(--qh-slate-600)]">
                Select an opportunity and click &quot;Run Auto-Matching Engine&quot; to inspect ranked fellow candidates.
              </div>
            ) : matchingLoading ? (
              <div className="p-8 text-center bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] text-xs text-[var(--qh-slate-600)]">
                Running algorithmic matching matrix...
              </div>
            ) : candidateMatches.length === 0 ? (
              <div className="p-8 text-center bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] text-xs text-[var(--qh-slate-600)]">
                No matching fellow candidates found for &quot;{selectedOpportunity.title}&quot;.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-[var(--qh-surface-card)] rounded-xl border border-[var(--qh-border)]">
                  <h4 className="font-bold text-sm text-[var(--qh-ink)]">{selectedOpportunity.title}</h4>
                  <p className="text-xs text-[var(--qh-slate-600)]">
                    {candidateMatches.length} Candidate(s) Ranked by Compatibility
                  </p>
                </div>

                {candidateMatches.map((match, idx) => (
                  <div
                    key={match.id}
                    className="p-5 bg-[var(--qh-surface-card)] rounded-2xl border border-[var(--qh-border)] shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[var(--qh-accent-main)] text-white text-[10px] font-bold flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <h5 className="font-bold text-sm text-[var(--qh-ink)]">
                            {match.fellowName || `Fellow ${match.fellowId.substring(0, 8)}`}
                          </h5>
                        </div>
                        <p className="text-xs text-[var(--qh-slate-600)]">{match.fellowEmail || match.fellowId}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-xl font-extrabold text-[var(--qh-accent-deep)]">{match.matchScore}%</span>
                        <span className="block text-[10px] text-[var(--qh-slate-600)] uppercase font-semibold">
                          Match Score
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 bg-[var(--qh-bg)] rounded-lg border border-[var(--qh-border)]">
                      <div>
                        <span className="text-[var(--qh-slate-600)]">Skill Match: </span>
                        <span className="font-bold text-[var(--qh-ink)]">{match.skillMatchPercent}%</span>
                      </div>
                      <div>
                        <span className="text-[var(--qh-slate-600)]">Tier Eligible: </span>
                        <span className={match.tierEligible ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                          {match.tierEligible ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--qh-border)]">
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--qh-slate-600)]">
                        Status: <span className="text-[var(--qh-accent-deep)]">{match.status}</span>
                      </span>

                      <div className="flex items-center gap-2">
                        {match.status !== 'shortlisted' && match.status !== 'placed' && (
                          <button
                            onClick={() => handleUpdateMatchStatus(match.id, 'shortlisted')}
                            className="px-3 py-1.5 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 text-xs font-semibold rounded-lg transition-colors"
                          >
                            Shortlist
                          </button>
                        )}
                        {match.status !== 'placed' && (
                          <button
                            onClick={() => handleUpdateMatchStatus(match.id, 'placed')}
                            className="px-3 py-1.5 bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-semibold rounded-lg transition-colors shadow-sm"
                          >
                            Place Candidate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Post Opportunity Modal */}
      {showAddOppModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--qh-surface-card)] w-full max-w-lg rounded-2xl border border-[var(--qh-border)] p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-[var(--qh-ink)]">Post Client Opportunity</h2>
            <p className="text-xs text-[var(--qh-slate-600)]">
              Add a new job placement or project opportunity to the matching engine.
            </p>

            <form onSubmit={handleCreateOpportunity} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Job Title</label>
                <input
                  type="text"
                  required
                  value={newOpp.title}
                  onChange={(e) => setNewOpp({ ...newOpp, title: e.target.value })}
                  placeholder="e.g. Senior AI Systems Engineer"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Client Name</label>
                  <input
                    type="text"
                    required
                    value={newOpp.clientName}
                    onChange={(e) => setNewOpp({ ...newOpp, clientName: e.target.value })}
                    placeholder="e.g. Stripe, Paystack"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Opportunity Type</label>
                  <select
                    value={newOpp.opportunityType}
                    onChange={(e) => setNewOpp({ ...newOpp, opportunityType: e.target.value as OpportunityType })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  >
                    <option value="faang_placement">FAANG Placement</option>
                    <option value="sme_build_project">SME Build Project</option>
                    <option value="staffing_maintenance">Staffing / Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Required Tier</label>
                  <select
                    value={newOpp.requiredTier}
                    onChange={(e) => setNewOpp({ ...newOpp, requiredTier: e.target.value as PlacementTier })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  >
                    <option value="Tier 1 Global">Tier 1 Global</option>
                    <option value="Tier 2 Regional">Tier 2 Regional</option>
                    <option value="Tier 3 Bench">Tier 3 Bench</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Min Score Requirement (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newOpp.minScore}
                    onChange={(e) => setNewOpp({ ...newOpp, minScore: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Compensation Range</label>
                  <input
                    type="text"
                    required
                    value={newOpp.compensationRange}
                    onChange={(e) => setNewOpp({ ...newOpp, compensationRange: e.target.value })}
                    placeholder="e.g. $120,000 - $150,000 USD/yr"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">Slots Available</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={newOpp.slotsAvailable}
                    onChange={(e) => setNewOpp({ ...newOpp, slotsAvailable: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--qh-slate-600)] mb-1">
                  Required Skills (comma-separated)
                </label>
                <input
                  type="text"
                  required
                  value={newOpp.requiredSkillsStr}
                  onChange={(e) => setNewOpp({ ...newOpp, requiredSkillsStr: e.target.value })}
                  placeholder="e.g. AI Systems, TypeScript, System Design"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--qh-border)] bg-[var(--qh-bg)] text-[var(--qh-ink)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--qh-border)]">
                <button
                  type="button"
                  onClick={() => setShowAddOppModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[var(--qh-slate-600)] hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--qh-accent-main)] text-white text-xs font-semibold rounded-lg hover:opacity-90 shadow-sm"
                >
                  Save Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
