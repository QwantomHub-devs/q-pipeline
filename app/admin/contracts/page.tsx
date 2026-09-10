'use client';

import React, { useState, useEffect } from 'react';
import { FellowContract, ContractType, ContractAuditEvent } from '@/modules/contracts/types';
import {
  listContractsForAdminAction,
  createContractEnvelopeAction,
  updateContractEnvelopeAction,
  sendContractEnvelopeAction,
  deleteContractEnvelopeAction,
  voidContractEnvelopeAction,
  getContractAuditTrailAction,
} from '@/modules/contracts/actions';

export default function AdminContractsPage() {
  const [contracts, setContracts] = useState<FellowContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<ContractType | 'all'>('all');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [editingContract, setEditingContract] = useState<FellowContract | null>(null);
  const [activeAuditEvents, setActiveAuditEvents] = useState<ContractAuditEvent[] | null>(null);
  const [showVoidModal, setShowVoidModal] = useState<FellowContract | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');

  // Create Form state
  const [formFellowProfileId, setFormFellowProfileId] = useState('550e8400-e29b-41d4-a716-446655440000');
  const [formContractType, setFormContractType] = useState<ContractType>('bootcamp_agreement');
  const [formTitle, setFormTitle] = useState('');
  const [formProvider, setFormProvider] = useState<'embedded' | 'documenso'>('embedded');
  const [formStatus, setFormStatus] = useState<'draft' | 'sent'>('sent');
  const [stipendAmount, setStipendAmount] = useState('500');
  const [clientName, setClientName] = useState('Seelicongate Global');
  const [placementRole, setPlacementRole] = useState('Senior AI Engineer');

  useEffect(() => {
    loadContracts();
  }, [filterType]);

  async function loadContracts() {
    setLoading(true);
    try {
      const data = await listContractsForAdminAction(filterType === 'all' ? undefined : filterType);
      setContracts(data);
    } catch (err: any) {
      console.error('Failed to load admin contracts:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleIssueContract(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      await createContractEnvelopeAction({
        fellowProfileId: formFellowProfileId.trim(),
        contractType: formContractType,
        title: formTitle.trim() || undefined,
        provider: formProvider,
        status: formStatus,
        customVariables: {
          STIPEND_AMOUNT: stipendAmount,
          CLIENT_NAME: clientName,
          PLACEMENT_ROLE: placementRole,
          CURRENCY: 'USD',
        },
      });

      setStatusMessage({
        type: 'success',
        text: `Contract envelope successfully ${formStatus === 'draft' ? 'drafted' : 'issued and sent'} to fellow.`,
      });
      setShowIssueModal(false);
      await loadContracts();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to issue contract envelope.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateContract(e: React.FormEvent) {
    e.preventDefault();
    if (!editingContract) return;
    setIsSubmitting(true);

    try {
      await updateContractEnvelopeAction({
        contractId: editingContract.id,
        title: editTitle.trim(),
        populatedBody: editBody,
      });

      setStatusMessage({ type: 'success', text: `Contract envelope '${editingContract.id}' updated.` });
      setEditingContract(null);
      await loadContracts();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update contract envelope.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendContract(contractId: string) {
    setIsSubmitting(true);
    try {
      await sendContractEnvelopeAction({ contractId });
      setStatusMessage({ type: 'success', text: 'Draft contract envelope sent to fellow with email notification.' });
      await loadContracts();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to send contract envelope.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteContract(contractId: string) {
    if (!confirm('Are you sure you want to delete this contract envelope?')) return;
    setIsSubmitting(true);
    try {
      await deleteContractEnvelopeAction({ contractId });
      setStatusMessage({ type: 'success', text: `Contract envelope '${contractId}' deleted.` });
      await loadContracts();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to delete contract envelope.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVoidContract() {
    if (!showVoidModal || !voidReason.trim()) return;
    setIsSubmitting(true);
    try {
      await voidContractEnvelopeAction({
        contractId: showVoidModal.id,
        reason: voidReason.trim(),
      });

      setStatusMessage({ type: 'success', text: `Contract envelope '${showVoidModal.id}' voided.` });
      setShowVoidModal(null);
      setVoidReason('');
      await loadContracts();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to void contract envelope.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleViewAuditTrail(contractId: string) {
    try {
      const events = await getContractAuditTrailAction(contractId);
      setActiveAuditEvents(events);
    } catch (err: any) {
      alert(err.message || 'Failed to load contract audit trail.');
    }
  }

  const totalEnvelopes = contracts.length;
  const draftCount = contracts.filter((c) => c.status === 'draft').length;
  const pendingCount = contracts.filter((c) => c.status === 'sent' || c.status === 'delivered').length;
  const signedCount = contracts.filter((c) => c.status === 'signed').length;
  const declinedOrVoided = contracts.filter((c) => c.status === 'declined' || c.status === 'voided').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      {/* Header & Controls */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 tracking-wider uppercase mb-1">
              <span>Admin Governance</span>
              <span>/</span>
              <span>Contract Lifecycle & E-Signature</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Contract & Onboarding Governance Console</h1>
            <p className="text-slate-400 text-sm mt-1">
              Draft, modify, issue, send, void, and delete fellow contracts with SHA-256 cryptographic audit trail tracking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowIssueModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-lg shadow-blue-900/30 transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create / Issue Contract Envelope
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
          <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl">
            <span className="text-xs text-slate-400 font-medium">Total Envelopes</span>
            <div className="text-2xl font-bold text-white mt-1">{totalEnvelopes}</div>
            <span className="text-[11px] text-slate-500">Across all tracks</span>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl">
            <span className="text-xs text-slate-300 font-medium">Draft Envelopes</span>
            <div className="text-2xl font-bold text-slate-300 mt-1">{draftCount}</div>
            <span className="text-[11px] text-slate-500">Ready to send</span>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl">
            <span className="text-xs text-amber-400 font-medium">Sent & Pending</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">{pendingCount}</div>
            <span className="text-[11px] text-slate-500">Awaiting fellow sign</span>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl">
            <span className="text-xs text-emerald-400 font-medium">Signed & Sealed</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{signedCount}</div>
            <span className="text-[11px] text-slate-500">Legally binding</span>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl">
            <span className="text-xs text-rose-400 font-medium">Declined / Voided</span>
            <div className="text-2xl font-bold text-rose-400 mt-1">{declinedOrVoided}</div>
            <span className="text-[11px] text-slate-500">Archived/rejected</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
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
            <span className="text-xs font-semibold text-slate-400">Filter by Type:</span>
            {(['all', 'bootcamp_agreement', 'bench_stipend_contract', 'placement_agreement'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition capitalize ${
                  filterType === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 font-mono">
            Showing {contracts.length} contract envelope(s)
          </span>
        </div>

        {/* Data Table */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
              <p className="text-sm">Loading contract envelopes...</p>
            </div>
          ) : contracts.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="text-sm">No contract envelopes found for selected filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Contract Title & Type</th>
                    <th className="p-4">Signer Fellow</th>
                    <th className="p-4">Provider</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">SHA-256 Digital Seal</th>
                    <th className="p-4 text-right">CRUD Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {contracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4">
                        <div className="font-sans font-bold text-white text-sm">{contract.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">ID: {contract.id}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-slate-200">{contract.signerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{contract.signerEmail}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                          {contract.provider}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            contract.status === 'signed'
                              ? 'bg-emerald-950 border-emerald-500/40 text-emerald-400'
                              : contract.status === 'sent'
                              ? 'bg-amber-950 border-amber-500/40 text-amber-400'
                              : contract.status === 'draft'
                              ? 'bg-slate-800 border-slate-700 text-slate-300'
                              : contract.status === 'declined'
                              ? 'bg-rose-950 border-rose-500/40 text-rose-400'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {contract.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4">
                        {contract.sha256Hash ? (
                          <span className="text-emerald-400 text-[11px]">
                            {contract.sha256Hash.substring(0, 12)}...
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[11px]">Unsealed</span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-1.5">
                        {contract.status === 'draft' && (
                          <button
                            onClick={() => handleSendContract(contract.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded text-[11px] transition"
                          >
                            Send
                          </button>
                        )}
                        {contract.status !== 'signed' && (
                          <button
                            onClick={() => {
                              setEditingContract(contract);
                              setEditTitle(contract.title);
                              setEditBody(contract.populatedBody);
                            }}
                            className="px-2.5 py-1 bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800/40 rounded text-[11px] transition"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => handleViewAuditTrail(contract.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition"
                        >
                          Audit
                        </button>
                        {contract.status === 'sent' && (
                          <button
                            onClick={() => setShowVoidModal(contract)}
                            className="px-2.5 py-1 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800/40 rounded text-[11px] transition"
                          >
                            Void
                          </button>
                        )}
                        {contract.status !== 'signed' && (
                          <button
                            onClick={() => handleDeleteContract(contract.id)}
                            className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/40 rounded text-[11px] transition"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create / Issue Contract Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleIssueContract}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">Create Contract Envelope</h2>
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Fellow Profile ID:</label>
                <input
                  type="text"
                  required
                  value={formFellowProfileId}
                  onChange={(e) => setFormFellowProfileId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Contract Type:</label>
                  <select
                    value={formContractType}
                    onChange={(e) => setFormContractType(e.target.value as ContractType)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="bootcamp_agreement">Bootcamp Agreement</option>
                    <option value="bench_stipend_contract">Bench Stipend Contract</option>
                    <option value="placement_agreement">Placement Agreement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Envelope Initial Action:</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="sent">Send Immediately to Fellow</option>
                    <option value="draft">Save as Draft (Review First)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">E-Signature Provider:</label>
                  <select
                    value={formProvider}
                    onChange={(e) => setFormProvider(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="embedded">Embedded Native ($0 / SHA-256)</option>
                    <option value="documenso">Documenso Webhook Adapter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Custom Title (Optional):</label>
                  <input
                    type="text"
                    placeholder="e.g. Fellow Bootcamp Agreement"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {formContractType === 'bench_stipend_contract' && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Monthly Stipend Amount (USD):</label>
                  <input
                    type="number"
                    value={stipendAmount}
                    onChange={(e) => setStipendAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              )}

              {formContractType === 'placement_agreement' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Client Partner Name:</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Placement Role Title:</label>
                    <input
                      type="text"
                      value={placementRole}
                      onChange={(e) => setPlacementRole(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition"
              >
                {isSubmitting ? 'Creating Envelope...' : formStatus === 'draft' ? 'Save Draft Envelope' : 'Issue & Send Envelope'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Contract Envelope Modal */}
      {editingContract && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleUpdateContract}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">Modify Contract Envelope</h2>
              <button
                type="button"
                onClick={() => setEditingContract(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Contract Title:</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg font-sans focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Contract Text Body:</label>
                <textarea
                  rows={10}
                  required
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 p-3 rounded-lg font-mono text-xs focus:outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingContract(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition"
              >
                {isSubmitting ? 'Saving Changes...' : 'Save Modified Contract'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Void Modal */}
      {showVoidModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Void Contract Envelope</h3>
            <p className="text-xs text-slate-400">
              Voiding contract envelope '{showVoidModal.id}'. The fellow will no longer be able to sign this document.
            </p>
            <textarea
              rows={3}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="e.g. Terms updated in revised placement contract..."
              className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-200 p-3 rounded-lg focus:outline-none focus:border-rose-500"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setShowVoidModal(null)} className="text-xs text-slate-400 hover:text-white">
                Cancel
              </button>
              <button
                disabled={!voidReason.trim() || isSubmitting}
                onClick={handleVoidContract}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition"
              >
                Confirm Void Envelope
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Events Drawer */}
      {activeAuditEvents && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 max-w-md w-full p-6 h-full overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Contract Audit Trail</h3>
              <button onClick={() => setActiveAuditEvents(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {activeAuditEvents.length === 0 ? (
                <p className="text-slate-500">No audit events recorded for this envelope.</p>
              ) : (
                activeAuditEvents.map((evt) => (
                  <div key={evt.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-blue-400 font-bold uppercase">
                      <span>{evt.action}</span>
                      <span className="text-[10px] text-slate-500">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-slate-400">Actor: {evt.actorClerkUserId}</div>
                    {evt.ipAddress && <div className="text-slate-500">IP: {evt.ipAddress}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
