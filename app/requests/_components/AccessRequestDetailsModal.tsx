'use client';

import React from 'react';
import { Check, Clock3, FileKey2, UserRound, X } from 'lucide-react';
import { AccessRequest } from '@/lib/types';
import { getPermissionActionLabel, getPermissionModuleLabel } from '@/lib/permissions';
import { formatExactDateTime } from '@/lib/dateFormat';
import { StatusPill } from '@/components/ui/StatusPill';

interface AccessRequestDetailsModalProps {
  request: AccessRequest | null;
  isOpen: boolean;
  canReview: boolean;
  onClose: () => void;
  onDecision: (status: 'Approved' | 'Rejected') => void;
}

export const AccessRequestDetailsModal: React.FC<AccessRequestDetailsModalProps> = ({
  request,
  isOpen,
  canReview,
  onClose,
  onDecision,
}) => {
  if (!isOpen || !request) return null;

  const isPending = request.status === 'Pending';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="access-request-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="motion-modal w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#701A35]/10 text-[#701A35]">
              <FileKey2 className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="access-request-title" className="text-base font-bold text-slate-900">
                  Page access request
                </h2>
                <StatusPill status={request.status} size="xs" />
              </div>
              <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                {getPermissionActionLabel(request.action)} access for {getPermissionModuleLabel(request.moduleId)}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700" aria-label="Close request details">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-4 px-5 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Detail label="Requested by" icon={<UserRound className="h-3.5 w-3.5" />} value={request.userName} />
            <Detail label="Requested on" icon={<Clock3 className="h-3.5 w-3.5" />} value={formatExactDateTime(request.createdAt)} />
            <Detail label="Page" value={getPermissionModuleLabel(request.moduleId)} />
            <Detail label="Permission" value={`${getPermissionActionLabel(request.action)} access`} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">What they are asking for</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{request.reason}</p>
          </div>

          {request.resolvedAt && (
            <div className="rounded-xl border border-slate-200 px-4 py-3 text-xs text-slate-500">
              {request.status} {request.reviewerName ? `by ${request.reviewerName}` : ''} on {formatExactDateTime(request.resolvedAt)}
              {request.reviewerNotes ? <span className="mt-1 block text-slate-700">Note: {request.reviewerNotes}</span> : null}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <span className="text-[11px] text-slate-500">Request ID: {request.id.slice(0, 15)}…</span>
          <div className="flex items-center gap-2">
            {isPending && canReview ? (
              <>
                <button type="button" onClick={() => onDecision('Rejected')} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50">
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
                <button type="button" onClick={() => onDecision('Approved')} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">
                  <Check className="h-3.5 w-3.5" /> Approve
                </button>
              </>
            ) : (
              <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">
                Close
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
};

function Detail({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{icon}{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-800" title={value}>{value}</p>
    </div>
  );
}
