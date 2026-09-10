'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { getAuditLogsAction } from '@/modules/audit/actions';
import { AuditLogEntry, AuditSeverity } from '@/modules/audit/types';

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [actionSearch, setActionSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const data = await getAuditLogsAction({
        action: actionSearch || undefined,
        severity: (selectedSeverity as AuditSeverity) || undefined,
        limit: 100,
      });
      setLogs(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed loading audit logs';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [actionSearch, selectedSeverity]);

  useGSAP(
    () => {
      if (tableRef.current) {
        gsap.fromTo(
          tableRef.current,
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
        );
      }
    },
    { dependencies: [logs], scope: containerRef }
  );

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col bg-[var(--qh-bg)] text-[var(--qh-ink)]">
      <AppHeader
        title="Compliance Audit Log"
        subtitle="Append-Only Security & Overrides Ledger"
        badge={{ label: 'Audit Log', variant: 'slate' }}
        backLink={{ href: '/admin', label: '← Back to Ops Dashboard' }}
      />

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--qh-ink)]">
            System Compliance & Security Ledger
          </h1>
          <p className="text-sm text-[var(--qh-muted)]">
            Immutable audit log of sensitive pipeline actions, overrides, and security events.
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-lg bg-red-100 text-red-800 text-sm font-semibold border border-red-200">
            {errorMessage}
          </div>
        )}

        {/* Filters */}
        <div className="p-4 rounded-xl bg-[var(--qh-surface)] border border-[var(--qh-accent)] flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="Search action (e.g. stage_tier_override)..."
            value={actionSearch}
            onChange={(e) => setActionSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 rounded-md bg-[var(--qh-bg)] text-[var(--qh-ink-deep)] border border-[var(--qh-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--qh-ink)] text-sm"
          />

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-2 rounded-md bg-[var(--qh-bg)] text-[var(--qh-ink-deep)] border border-[var(--qh-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--qh-ink)] text-sm"
          >
            <option value="">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Audit Log Table */}
        <div ref={tableRef} className="bg-[var(--qh-surface)] rounded-xl border border-[var(--qh-accent)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--qh-accent)] text-[var(--qh-ink)] uppercase text-xs font-bold border-b border-[var(--qh-accent-deep)]">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Actor ID</th>
                  <th className="px-6 py-3">Target</th>
                  <th className="px-6 py-3">Severity</th>
                  <th className="px-6 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--qh-bg)]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[var(--qh-muted)] font-medium">
                      {loading ? 'Loading compliance logs...' : 'No audit log entries found.'}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--qh-bg)] transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-[var(--qh-muted)]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-[var(--qh-ink)]">
                        {log.action}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-[var(--qh-muted)]">
                        {log.actorClerkUserId}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span className="font-semibold text-[var(--qh-ink)]">{log.targetType}</span>
                        <div className="text-[var(--qh-muted)] font-mono">{log.targetId}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                            log.severity === 'critical'
                              ? 'bg-red-200 text-red-900 border border-red-300'
                              : log.severity === 'warning'
                              ? 'bg-amber-200 text-amber-900 border border-amber-300'
                              : 'bg-[var(--qh-bg)] text-[var(--qh-ink)]'
                          }`}
                        >
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="px-3 py-1.5 rounded-md bg-[var(--qh-ink)] text-white text-xs font-semibold hover:bg-[var(--qh-accent-deep)] transition-colors"
                        >
                          View Diff
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Metadata Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--qh-surface)] rounded-xl border border-[var(--qh-accent)] max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[var(--qh-ink)]">
                Audit Event Metadata: {selectedLog.action}
              </h2>
              <span className="text-xs font-mono text-[var(--qh-muted)]">
                {new Date(selectedLog.createdAt).toISOString()}
              </span>
            </div>

            <div className="bg-[var(--qh-bg)] rounded-md p-4 overflow-x-auto max-h-80 border border-[var(--qh-accent)]">
              <pre className="text-xs font-mono text-[var(--qh-ink-deep)] leading-relaxed">
                {JSON.stringify(selectedLog.metadata, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-md bg-[var(--qh-ink)] text-white text-xs font-semibold hover:bg-[var(--qh-accent-deep)] transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
