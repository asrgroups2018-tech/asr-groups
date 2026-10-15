'use client';

import React, { useMemo, useState } from 'react';
import { AccessRequest, ApprovalRequest } from '@/lib/types';
import { useApp } from '@/lib/store';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { AnyStatus, StatusPill } from '@/components/ui/StatusPill';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { getPermissionActionLabel, getPermissionModuleLabel } from '@/lib/permissions';
import { formatExactDateTime } from '@/lib/dateFormat';
import {
  Eye,
  Check,
  X,
} from 'lucide-react';
import { RequestDetailsModal } from './RequestDetailsModal';
import { AccessRequestDetailsModal } from './AccessRequestDetailsModal';
import { CustomSelect } from '@/components/ui/CustomSelect';

type QueueRequest = ApprovalRequest & {
  source: 'approval' | 'access';
  accessRequest?: AccessRequest;
};

interface RequestsQueueTableProps {
  accessRequests: AccessRequest[];
  onAccessRequestChanged: () => void;
}

function normalizeAccessRequest(request: AccessRequest): QueueRequest {
  return {
    id: request.id,
    changeType: 'Role Change',
    title: `${getPermissionActionLabel(request.action)} access · ${getPermissionModuleLabel(request.moduleId)}`,
    description: request.reason,
    entityType: 'user',
    entityId: request.userId,
    requesterId: request.userId,
    requesterName: request.userName,
    requesterRoleId: request.roleId,
    approverRoleId: 0,
    amount: 0,
    status: request.status,
    proposedPayload: JSON.stringify({ moduleId: request.moduleId, action: request.action }),
    createdAt: request.createdAt,
    resolvedAt: request.resolvedAt,
    source: 'access',
    accessRequest: request,
  };
}

export const RequestsQueueTable: React.FC<RequestsQueueTableProps> = ({ accessRequests, onAccessRequestChanged }) => {
  const { approvalRequests, currentActor, showToast } = useApp();
  const [selectedRequest, setSelectedRequest] = useState<QueueRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccessRequest, setSelectedAccessRequest] = useState<AccessRequest | null>(null);
  const [statusTab, setStatusTab] = useState<string>('ALL');
  const [changeTypeFilter, setChangeTypeFilter] = useState<string>('ALL');

  const queueRequests = useMemo(() => [
    ...approvalRequests.map((request) => ({ ...request, source: 'approval' as const })),
    ...accessRequests.map(normalizeAccessRequest),
  ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()), [accessRequests, approvalRequests]);

  const pendingCount = queueRequests.filter((r) => r.status === 'Pending').length;
  const approvedCount = queueRequests.filter((r) => r.status === 'Approved').length;
  const autoApprovedCount = queueRequests.filter((r) => r.status === 'Auto-Approved').length;
  const rejectedCount = queueRequests.filter((r) => r.status === 'Rejected').length;

  const filteredRequests = queueRequests.filter((r) => {
    if (statusTab !== 'ALL' && r.status !== statusTab) return false;
    if (changeTypeFilter === 'ACCESS' && r.source !== 'access') return false;
    if (changeTypeFilter !== 'ALL' && changeTypeFilter !== 'ACCESS' && (r.source !== 'approval' || r.changeType !== changeTypeFilter)) return false;
    return true;
  });

  const handleOpenDetails = (req: QueueRequest) => {
    setSelectedRequest(req);
    setIsModalOpen(true);
  };

  const handleOpenAccessDetails = (request: AccessRequest) => {
    setSelectedAccessRequest(request);
  };

  const decideAccessRequest = async (request: QueueRequest, status: 'Approved' | 'Rejected') => {
    if (!request.accessRequest) return;
    const response = await fetch('/api/access-requests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: request.accessRequest.id, status }),
    });
    const json = await response.json().catch(() => ({}));
    if (response.ok && json.success) {
      showToast(`Access request ${status.toLowerCase()}`, `${request.requesterName}'s page access request was updated.`, 'success');
      onAccessRequestChanged();
      setSelectedAccessRequest(null);
    } else {
      showToast('Access request update failed', json.error || 'The access request could not be updated.', 'error');
    }
  };

  const getWorkflowBadge = (type: string, source: QueueRequest['source']) => {
    if (source === 'access') {
      return <span className="text-[11px] font-semibold text-[#701A35] bg-[#FBF8F3] px-2 py-0.5 rounded border border-[#E8CFA8]">Page Access</span>;
    }
    switch (type) {
      case 'Loan Split':
        return <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">Split</span>;
      case 'Loan Merge':
        return <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Merge</span>;
      case 'Role Change':
        return <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">Role</span>;
      case 'Historical Correction':
      case 'Collection Correction':
        return <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Ledger</span>;
      default:
        return <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{type}</span>;
    }
  };

  const columns: ColumnDef<QueueRequest>[] = [
    {
      key: 'title',
      header: 'What is being requested',
      sortable: true,
      accessor: (r) => r.title,
      className: 'w-[43%] max-w-0',
      render: (r) => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            {getWorkflowBadge(r.changeType, r.source)}
            {r.source === 'access' ? (
              <span className="font-mono text-[10px] text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                {getPermissionModuleLabel(r.accessRequest?.moduleId || '')} · {getPermissionActionLabel(r.accessRequest?.action || '')}
              </span>
            ) : r.entityId && r.entityId !== 'MANUAL-ENTRY' && (
              <span className="font-mono text-[10px] text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                {r.entityId}
              </span>
            )}
          </div>
          <p className="truncate font-semibold text-slate-900 text-xs" title={r.title}>{r.title}</p>
          <p className="mt-0.5 truncate text-[10px] text-slate-400">Requested {formatExactDateTime(r.createdAt)}</p>
        </div>
      ),
      exportValue: (r) => `${r.source === 'access' ? 'Page Access' : r.changeType}: ${r.title}`,
    },
    {
      key: 'requester',
      header: 'Requested by',
      sortable: true,
      accessor: (r) => r.requesterName,
      className: 'w-[17%]',
      render: (r) => (
        <div>
          <span className="font-semibold text-slate-900 text-xs block">{r.requesterName}</span>
          <div className="mt-0.5">
            <RoleBadge roleId={r.requesterRoleId} size="xs" />
          </div>
        </div>
      ),
      exportValue: (r) => `${r.requesterName} (Role ${r.requesterRoleId})`,
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      align: 'right',
      accessor: (r) => r.amount,
      className: 'w-[14%]',
      render: (r) => (
        <div className="text-right">
          {r.amount > 0 ? (
            <MoneyDisplay amount={r.amount} size="sm" amountClassName="font-bold text-slate-900" />
          ) : (
            <span className="text-slate-400 font-mono text-xs">-</span>
          )}
        </div>
      ),
      exportValue: (r) => (r.amount > 0 ? `₹${r.amount}` : '-'),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      sortable: true,
      accessor: (r) => r.status,
      className: 'w-[14%]',
      render: (r) => <StatusPill status={r.status as AnyStatus} size="sm" />,
      exportValue: (r) => r.status,
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      sortable: false,
      className: 'w-[18%]',
      render: (r) => r.source === 'access' ? (
        r.status === 'Pending' && currentActor.assignedRoleIds.includes(0) ? (
            <div className="flex items-center justify-end gap-1.5">
              <button type="button" onClick={() => handleOpenAccessDetails(r.accessRequest!)} className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100">
                <Eye className="h-3.5 w-3.5" /> View
              </button>
              <button type="button" onClick={() => void decideAccessRequest(r, 'Rejected')} className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-2.5 py-1.5 text-[11px] font-bold text-rose-700">
                <X className="h-3.5 w-3.5" />Reject
              </button>
              <button type="button" onClick={() => void decideAccessRequest(r, 'Approved')} className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white">
                <Check className="h-3.5 w-3.5" />Approve
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => handleOpenAccessDetails(r.accessRequest!)} className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
              <Eye className="h-3.5 w-3.5" />
              {r.status === 'Pending' ? 'View request' : 'View'}
            </button>
          )
      ) : (
        <button
          type="button"
          onClick={() => handleOpenDetails(r)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ml-auto cursor-pointer shadow-2xs ${
            r.status === 'Pending'
              ? 'bg-[#701A35] text-white hover:bg-[#5C142B] active:scale-95'
              : 'bg-[#FAF8F5] text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{r.status === 'Pending' ? 'Review' : 'View'}</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters Bar matching Loans page */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row xl:items-end justify-between gap-3.5">
        <div className="flex min-w-0 flex-col sm:flex-row sm:items-end gap-3 flex-1 flex-wrap">
          {/* Change Type Filter Dropdown */}
          <div className="relative w-full min-w-0 sm:w-[220px]">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-1 block">
              Filter by Workflow Type
            </label>
            <CustomSelect
              value={changeTypeFilter}
              aria-label="Filter by workflow type"
              onChange={setChangeTypeFilter}
              options={[
                { value: 'ALL', label: 'All Workflow Types' },
                { value: 'Loan Update', label: 'Loan Restructuring' },
                { value: 'Loan Split', label: 'Loan Split' },
                { value: 'Loan Merge', label: 'Loan Merge' },
                { value: 'Historical Correction', label: 'Historical Receipt' },
                { value: 'Customer Update', label: 'Customer Profile' },
                { value: 'Role Change', label: 'Role Elevation' },
                { value: 'ACCESS', label: 'Page Access' },
              ]}
              buttonClassName="rounded-xl border-slate-300 px-3 py-2 text-xs text-slate-900 shadow-2xs hover:border-[#701A35]"
              menuClassName="min-w-full"
              size="sm"
            />
          </div>
        </div>

        {/* Status Filter Tabs matching Loans page */}
        <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs font-semibold max-w-full">
          {(['ALL', 'Pending', 'Approved', 'Auto-Approved', 'Rejected'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusTab(st)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold btn-press transition-all duration-120 cursor-pointer whitespace-nowrap ${
                statusTab === st
                  ? 'bg-[#701A35] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
              }`}
            >
              {st === 'ALL'
                ? `All (${queueRequests.length})`
                : st === 'Pending'
                ? `Pending (${pendingCount})`
                : st === 'Approved'
                ? `Approved (${approvedCount})`
                : st === 'Auto-Approved'
                ? `Auto (${autoApprovedCount})`
                : `Rejected (${rejectedCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Main Data Table */}
      <DataTable
        data={filteredRequests}
        columns={columns}
        keyExtractor={(r) => `${r.source}:${r.id}`}
        title="Requests & Approvals Queue"
        exportFileName="asr_approval_requests"
        searchPlaceholder="Search what is requested or who requested it..."
        pageSizeDefault={15}
        fitViewport
        compact
        emptyStateMessage="No approval requests match the selected filters."
      />

      {/* Details & Diff Modal */}
      <RequestDetailsModal
        request={selectedRequest?.source === 'approval' ? selectedRequest : null}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRequest(null);
        }}
      />

      <AccessRequestDetailsModal
        request={selectedAccessRequest}
        isOpen={Boolean(selectedAccessRequest)}
        canReview={currentActor.assignedRoleIds.includes(0)}
        onClose={() => setSelectedAccessRequest(null)}
        onDecision={(status) => {
          if (!selectedAccessRequest) return;
          const queueRequest = normalizeAccessRequest(selectedAccessRequest);
          void decideAccessRequest(queueRequest, status);
        }}
      />
    </div>
  );
};
