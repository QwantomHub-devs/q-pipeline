'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FellowContract } from '@/modules/contracts/types';
import {
  getMyContractsAction,
  signContractEnvelopeAction,
  declineContractEnvelopeAction,
} from '@/modules/contracts/actions';

export default function FellowContractsPage() {
  const [fellowProfileId, setFellowProfileId] = useState('550e8400-e29b-41d4-a716-446655440000');
  const [contracts, setContracts] = useState<FellowContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeContract, setActiveContract] = useState<FellowContract | null>(null);
  const [signingMode, setSigningMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    loadContracts();
  }, [fellowProfileId]);

  async function loadContracts() {
    setLoading(true);
    try {
      const data = await getMyContractsAction(fellowProfileId);
      setContracts(data);
    } catch (err: any) {
      console.error('Failed to load fellow contracts:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      setHasScrolledToBottom(true);
    }
  }

  // Canvas Drawing Handlers
  function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#3b82f6'; // QwantomHub accent blue
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function handleSignContract() {
    if (!activeContract) return;
    let signatureData = '';

    if (signingMode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      signatureData = canvas.toDataURL('image/png');
    } else {
      if (!typedName.trim()) {
        setStatusMessage({ type: 'error', text: 'Please type your full legal name to sign.' });
        return;
      }
      signatureData = `TYPED_SIGNATURE:${typedName.trim()}`;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      await signContractEnvelopeAction({
        contractId: activeContract.id,
        fellowProfileId,
        signatureCanvasData: signatureData,
        signerIpAddress: '197.210.64.12', // Standard sample IP
      });

      setStatusMessage({ type: 'success', text: 'Contract successfully signed and cryptographically sealed with SHA-256 HMAC!' });
      setActiveContract(null);
      await loadContracts();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to sign contract.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeclineContract() {
    if (!activeContract || !declineReason.trim()) return;
    setIsSubmitting(true);
    try {
      await declineContractEnvelopeAction({
        contractId: activeContract.id,
        fellowProfileId,
        reason: declineReason.trim(),
      });
      setStatusMessage({ type: 'success', text: 'Contract declined.' });
      setShowDeclineModal(false);
      setActiveContract(null);
      await loadContracts();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to decline contract.' });
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
              <span>QwantomHub Onboarding</span>
              <span>/</span>
              <span>Legal Contracts & Agreements</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Fellow Onboarding Contracts</h1>
            <p className="text-slate-400 text-sm mt-1">
              Review, sign, and download your legally binding program agreements and stipend contracts.
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

      {/* Main Container */}
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
            <p className="text-sm">Loading assigned contract envelopes...</p>
          </div>
        ) : contracts.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 rounded-xl border border-slate-800">
            <svg className="w-12 h-12 mx-auto text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-slate-200">No Pending Contracts</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto mt-1">
              You have no active or pending contract envelopes assigned to your fellow profile.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {contracts.map((contract) => (
              <div
                key={contract.id}
                className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-xl p-6 transition flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                        contract.status === 'signed'
                          ? 'bg-emerald-950 border-emerald-500/40 text-emerald-400'
                          : contract.status === 'sent'
                          ? 'bg-amber-950 border-amber-500/40 text-amber-400'
                          : contract.status === 'declined'
                          ? 'bg-rose-950 border-rose-500/40 text-rose-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {contract.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">Type: {contract.contractType}</span>
                    <span className="text-xs text-slate-500 font-mono">Provider: {contract.provider}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{contract.title}</h3>
                  <p className="text-xs text-slate-400">
                    Issued to <span className="text-slate-200 font-medium">{contract.signerName}</span> ({contract.signerEmail}) • Created {new Date(contract.createdAt).toLocaleDateString()}
                  </p>
                  {contract.sha256Hash && (
                    <div className="mt-2 text-xs font-mono text-emerald-400 flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-lg w-fit">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>SHA-256 Digital Seal: {contract.sha256Hash.substring(0, 16)}...</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {contract.status === 'sent' && (
                    <button
                      onClick={() => {
                        setActiveContract(contract);
                        setHasScrolledToBottom(false);
                        setIsAgreed(false);
                      }}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-lg shadow-lg shadow-blue-900/30 transition flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Review & Sign Contract
                    </button>
                  )}
                  {contract.status === 'signed' && (
                    <button
                      onClick={() => setActiveContract(contract)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm rounded-lg transition border border-slate-700 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Signed Seal
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contract Review & Signature Modal */}
      {activeContract && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  {activeContract.status === 'signed' ? 'Signed Agreement Certificate' : 'Review & Sign Contract'}
                </span>
                <h2 className="text-xl font-bold text-white mt-0.5">{activeContract.title}</h2>
              </div>
              <button
                onClick={() => setActiveContract(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/60"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Document Body Viewer with Scroll Listener */}
            <div
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto bg-slate-950 p-6 rounded-xl border border-slate-800 text-slate-300 font-mono text-sm leading-relaxed whitespace-pre-wrap select-text"
            >
              {activeContract.populatedBody}
            </div>

            {/* Signature Section for Active Envelope */}
            {activeContract.status === 'sent' ? (
              <div className="space-y-4 pt-2 border-t border-slate-800">
                {!hasScrolledToBottom && (
                  <p className="text-xs text-amber-400 bg-amber-950/40 border border-amber-800/40 p-2.5 rounded-lg flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Please scroll through the full document text above before signing.
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Choose Signature Method:</span>
                  <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setSigningMode('draw')}
                      className={`px-3 py-1 text-xs font-medium rounded ${
                        signingMode === 'draw' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Draw Canvas Signature
                    </button>
                    <button
                      onClick={() => setSigningMode('type')}
                      className={`px-3 py-1 text-xs font-medium rounded ${
                        signingMode === 'type' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Typed Signature
                    </button>
                  </div>
                </div>

                {signingMode === 'draw' ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-400">Sign with mouse or touch on canvas below:</label>
                      <button onClick={clearCanvas} className="text-xs text-rose-400 hover:underline">
                        Clear Pad
                      </button>
                    </div>
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={120}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-28 bg-slate-950 border border-slate-700 rounded-lg cursor-crosshair touch-none"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">Type full legal name as digital signature:</label>
                    <input
                      type="text"
                      placeholder="e.g. Ada Lovelace"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-lg font-serif italic text-blue-400 px-4 py-2.5 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="agreeCheck"
                    checked={isAgreed}
                    onChange={(e) => setIsAgreed(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="agreeCheck" className="text-xs text-slate-300 cursor-pointer">
                    I confirm I have read, understood, and legally agree to the terms in this contract envelope.
                  </label>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setShowDeclineModal(true)}
                    className="text-xs text-rose-400 hover:text-rose-300 underline font-medium"
                  >
                    Decline Agreement
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveContract(null)}
                      className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={!isAgreed || isSubmitting}
                      onClick={handleSignContract}
                      className={`px-6 py-2.5 font-bold text-xs rounded-lg transition shadow-lg ${
                        isAgreed && !isSubmitting
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isSubmitting ? 'Sealing Cryptographic Digest...' : 'Confirm & Apply SHA-256 Seal'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-950/40 border border-emerald-800/40 rounded-xl space-y-2 text-xs font-mono text-emerald-300">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-400">Cryptographic Seal Verified</span>
                  <span>Signed: {activeContract.signedAt ? new Date(activeContract.signedAt).toLocaleString() : 'N/A'}</span>
                </div>
                <p className="break-all">SHA-256 Digest: {activeContract.sha256Hash || 'N/A'}</p>
                <p>IP Address: {activeContract.signerIpAddress || '127.0.0.1'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Decline Contract Agreement</h3>
            <p className="text-xs text-slate-400">
              Please state your reason for declining this contract. This will notify the QwantomHub administration team.
            </p>
            <textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. Need clarification on stipend disbursement frequency..."
              className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-200 p-3 rounded-lg focus:outline-none focus:border-rose-500"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setShowDeclineModal(false)} className="text-xs text-slate-400 hover:text-white">
                Cancel
              </button>
              <button
                disabled={!declineReason.trim() || isSubmitting}
                onClick={handleDeclineContract}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
