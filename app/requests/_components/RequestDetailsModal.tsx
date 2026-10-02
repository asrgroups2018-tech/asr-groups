'use client';

import React, { useState } from 'react';
import { ApprovalRequest } from '@/lib/types';
import { useApp } from '@/lib/store';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  ArrowRight,
  UserCheck,
  FileSpreadsheet,
  Split,
  GitMerge,
  Shield,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { StatusPill } from '@/components/ui/StatusPill';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';

interface RequestDetailsModalProps {
  request: ApprovalRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({
  request,
  isOpen,
  onClose,
}) => {
  const { currentActor, approveRequest, rejectRequest, roles } = useApp();
  const [reviewNotes, setReviewNotes] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !request) return null;

  const isPending = request.status === 'Pending';
  // Hierarchy check: 0 is Super Admin, 1 is Admin, 2 is Manager... lower number = higher privilege
  const isAuthorizedApprover = currentActor.primaryRoleId <= request.approverRoleId;

  let beforeData: any = null;
  let proposedData: any = null;
  try {
    if (request.beforePayload) beforeData = JSON.parse(request.beforePayload);
  } catch {}
  try {
    if (request.proposedPayload) proposedData = JSON.parse(request.proposedPayload);
  } catch {}

  const handleApprove = async () => {
    setIsSubmitting(true);
    const success = await approveRequest(request.id, reviewNotes || 'Approved by reviewer');
    setIsSubmitting(false);
    if (success) onClose();
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setIsSubmitting(true);
    const success = await rejectRequest(request.id, rejectReason.trim());
    setIsSubmitting(false);
    if (success) onClose();
  };

  const getWorkflowIcon = (type: string) => {
    switch (type) {
      case 'Loan Split':
        return <Split className="w-5 h-5 text-indigo-400" />;
      case 'Loan Merge':
        return <GitMerge className="w-5 h-5 text-emerald-400" />;
      case 'Role Change':
        return <Shield className="w-5 h-5 text-amber-400" />;
      case 'Historical Correction':
      case 'Collection Correction':
        return <FileSpreadsheet className="w-5 h-5 text-purple-400" />;
      default:
        return <Layers className="w-5 h-5 text-[#EED8A1]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden motion-modal">
        {/* Modal Header */}
        <div className="bg-[#1A0A13] text-white px-6 py-4 flex items-center justify-between border-b border-[#2C1420] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2C1420] border border-[#3D1A2C] flex items-center justify-center">
              {getWorkflowIcon(request.changeType)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-300">{request.id}</span>
                <span className="text-slate-500 text-xs">·</span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                  {request.changeType}
                </span>
                <StatusPill status={request.status as any} />
              </div>
              <h3 className="text-base font-bold text-white font-serif mt-0.5">{request.title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-xs">
          {/* Metadata Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <p className="text-[10px] font-mono uppercase text-slate-400 font-bold">Requester</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="font-bold text-slate-900">{request.requesterName}</span>
                <RoleBadge roleId={request.requesterRoleId} size="xs" />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-mono uppercase text-slate-400 font-bold">Minimum Approver</p>
              <div className="mt-1">
                <RoleBadge roleId={request.approverRoleId} size="xs" />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-mono uppercase text-slate-400 font-bold">Facility Amount</p>
              <div className="mt-1">
                {request.amount > 0 ? (
                  <MoneyDisplay amount={request.amount} size="sm" amountClassName="font-bold text-slate-900" />
                ) : (
                  <span className="text-slate-500 font-mono">N/A (System)</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-mono uppercase text-slate-400 font-bold">Created Timestamp</p>
              <p className="text-xs text-slate-700 font-mono mt-1">{request.createdAt}</p>
            </div>
          </div>

          {/* Requester Description */}
          {request.description && (
            <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80">
              <p className="text-[11px] font-bold text-amber-900 uppercase font-mono mb-1">
                Requester Justification / Notes
              </p>
              <p className="text-xs text-amber-950 font-medium leading-relaxed">{request.description}</p>
            </div>
          )}

          {/* Visual Diff: Before vs Proposed */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-2">
              <span>Proposed Change Analysis & Audit Diff</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Before Box */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-xs font-mono">CURRENT STATE (BEFORE)</span>
                  <span className="text-[10px] font-mono text-slate-400">Live Database</span>
                </div>
                <div className="p-3.5 space-y-2 text-xs">
                  {beforeData ? (
                    <div className="space-y-1.5">
                      {Object.entries(beforeData).map(([key, val]) => (
                        <div key={key} className="flex justify-between items-start gap-2 border-b border-slate-100 pb-1">
                          <span className="text-slate-500 font-mono capitalize text-[11px]">{key.replace(/([A-Z])/g, ' $1')}:</span>
                          <span className="font-semibold text-slate-800 text-right max-w-[200px] truncate">
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic text-center py-4">No prior record state recorded</p>
                  )}
                </div>
              </div>

              {/* Proposed Box */}
              <div className="border border-emerald-200 rounded-xl overflow-hidden bg-emerald-50/30">
                <div className="bg-emerald-100/70 px-3.5 py-2 border-b border-emerald-200 flex items-center justify-between">
                  <span className="font-bold text-emerald-900 text-xs font-mono">PROPOSED MODIFICATION</span>
                  <span className="text-[10px] font-mono text-emerald-700">Pending Authorization</span>
                </div>
                <div className="p-3.5 space-y-2 text-xs">
                  {proposedData ? (
                    <div className="space-y-1.5">
                      {Object.entries(proposedData).map(([key, val]) => (
                        <div key={key} className="flex justify-between items-start gap-2 border-b border-emerald-100 pb-1">
                          <span className="text-emerald-800 font-mono capitalize text-[11px]">{key.replace(/([A-Z])/g, ' $1')}:</span>
                          <span className="font-bold text-emerald-950 text-right max-w-[200px] truncate">
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <pre className="text-[11px] font-mono text-slate-700 whitespace-pre-wrap">{request.proposedPayload}</pre>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Historical Resolution Details if already resolved */}
          {!isPending && (
            <div className={`p-4 rounded-xl border ${request.status === 'Approved' ? 'bg-emerald-50 border-emerald-200' : request.status === 'Auto-Approved' ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'}`}>
              <div className="flex items-center gap-2 mb-1.5">
                {request.status === 'Approved' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                ) : request.status === 'Auto-Approved' ? (
                  <CheckCircle2 className="w-4 h-4 text-amber-700" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-700" />
                )}
                <span className="font-bold text-xs">
                  {request.status === 'Approved'
                    ? `Approved by ${request.reviewerName || 'Admin'}`
                    : request.status === 'Auto-Approved'
                    ? 'Automatically Authorized by Threshold Governance Policy'
                    : `Rejected by ${request.reviewerName || 'Admin'}`}
                </span>
                {request.resolvedAt && (
                  <span className="text-[10px] text-slate-500 font-mono ml-auto">{request.resolvedAt}</span>
                )}
              </div>
              {request.reviewerNotes && (
                <p className="text-xs text-slate-700 mt-1 pl-6">
                  <strong>Decision Comments:</strong> {request.reviewerNotes}
                </p>
              )}
            </div>
          )}

          {/* Approver Action Panel */}
          {isPending && (
            <div className="space-y-3 pt-2">
              {!isAuthorizedApprover ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2.5 text-amber-900">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
                  <span className="text-xs font-medium">
                    Your current role ({roles.find((r) => r.id === currentActor.primaryRoleId)?.name}) does not have approval authority for this workflow. Minimum required role is{' '}
                    <strong>{roles.find((r) => r.id === request.approverRoleId)?.name} (Role {request.approverRoleId})</strong>.
                  </span>
                </div>
              ) : isRejecting ? (
                <div className="space-y-2.5 bg-rose-50/70 p-3.5 rounded-xl border border-rose-200 animate-in fade-in">
                  <label className="block text-xs font-bold text-rose-900">
                    Specify Rejection Reason <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Provide mandatory notes explaining why this request cannot be approved..."
                    className="w-full text-xs p-2.5 rounded-xl border border-rose-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRejecting(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={!rejectReason.trim() || isSubmitting}
                      onClick={handleReject}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg shadow-xs"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Reviewer Notes / Sign-off Comments (Optional)
                  </label>
                  <input
                    type="text"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="e.g. Verified and approved according to branch quota"
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#701A35]"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>Audited & Logged in Administration Audit Trail</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors shadow-xs"
            >
              Close
            </button>

            {isPending && isAuthorizedApprover && !isRejecting && (
              <>
                <button
                  type="button"
                  onClick={() => setIsRejecting(true)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>

                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#701A35] hover:bg-[#5C142B] active:scale-98 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#EED8A1]" />
                  <span>Approve</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
