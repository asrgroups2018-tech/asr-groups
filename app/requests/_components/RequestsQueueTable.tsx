'use client';

import React, { useState } from 'react';
import { ApprovalRequest, ApprovalRequestStatus } from '@/lib/types';
import { useApp } from '@/lib/store';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { StatusPill } from '@/components/ui/StatusPill';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import {
  Eye,
  CheckCircle2,
  Clock,
  Filter,
  Layers,
  Split,
  GitMerge,
  Shield,
  FileSpreadsheet,
} from 'lucide-react';
import { RequestDetailsModal } from './RequestDetailsModal';

export const RequestsQueueTable: React.FC = () => {
  const { approvalRequests, roles } = useApp();
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusTab, setStatusTab] = useState<string>('ALL');
  const [changeTypeFilter, setChangeTypeFilter] = useState<string>('ALL');

  const pendingCount = approvalRequests.filter((r) => r.status === 'Pending').length;
  const approvedCount = approvalRequests.filter((r) => r.status === 'Approved').length;
  const autoApprovedCount = approvalRequests.filter((r) => r.status === 'Auto-Approved').length;
  const rejectedCount = approvalRequests.filter((r) => r.status === 'Rejected').length;

  const filteredRequests = approvalRequests.filter((r) => {
    if (statusTab !== 'ALL' && r.status !== statusTab) return false;
    if (changeTypeFilter !== 'ALL' && r.changeType !== changeTypeFilter) return false;
    return true;
  });

  const handleOpenDetails = (req: ApprovalRequest) => {
    setSelectedRequest(req);
    setIsModalOpen(true);
  };

  const getWorkflowBadge = (type: string) => {
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

  const columns: ColumnDef<ApprovalRequest>[] = [
    {
      key: 'id',
      header: 'Request Ref',
      sortable: true,
      accessor: (r) => r.id,
      render: (r) => (
        <div>
          <span className="font-mono font-bold text-slate-900 text-xs block">{r.id}</span>
          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{r.createdAt}</span>
        </div>
      ),
      exportValue: (r) => `${r.id} (${r.createdAt})`,
    },
    {
      key: 'title',
      header: 'Subject & Target',
      sortable: true,
      accessor: (r) => r.title,
      render: (r) => (
        <div className="max-w-md">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            {getWorkflowBadge(r.changeType)}
            {r.entityId && r.entityId !== 'MANUAL-ENTRY' && (
              <span className="font-mono text-[10px] text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                {r.entityId}
              </span>
            )}
          </div>
          <p className="font-semibold text-slate-900 text-xs truncate">{r.title}</p>
        </div>
      ),
      exportValue: (r) => `${r.changeType}: ${r.title}`,
    },
    {
      key: 'requester',
      header: 'Raised By',
      sortable: true,
      accessor: (r) => r.requesterName,
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
      key: 'approverRoleId',
      header: 'Approver Role',
      sortable: true,
      accessor: (r) => r.approverRoleId,
      render: (r) => (
        <div>
          <RoleBadge roleId={r.approverRoleId} size="xs" />
        </div>
      ),
      exportValue: (r) => `Role ${r.approverRoleId} (${roles.find((x) => x.id === r.approverRoleId)?.name || ''})`,
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      align: 'right',
      accessor: (r) => r.amount,
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
      render: (r) => <StatusPill status={r.status as any} size="sm" />,
      exportValue: (r) => r.status,
    },
    {
      key: 'reviewer',
      header: 'Decision',
      sortable: false,
      render: (r) => (
        <div className="text-xs">
          {r.status === 'Approved' ? (
            <div>
              <span className="text-emerald-700 font-semibold block">Approved · {r.reviewerName || 'Admin'}</span>
              <span className="text-[10px] text-slate-400 font-mono">{r.resolvedAt}</span>
            </div>
          ) : r.status === 'Auto-Approved' ? (
            <div>
              <span className="text-indigo-700 font-semibold block">Auto-Approved</span>
              <span className="text-[10px] text-slate-400 font-mono">Policy</span>
            </div>
          ) : r.status === 'Rejected' ? (
            <div>
              <span className="text-rose-700 font-semibold block">Rejected · {r.reviewerName || 'Admin'}</span>
              <span className="text-[10px] text-slate-400 font-mono">{r.resolvedAt}</span>
            </div>
          ) : (
            <span className="text-amber-700 font-medium text-xs">
              Pending
            </span>
          )}
        </div>
      ),
      exportValue: (r) => (r.reviewerName ? `${r.status} by ${r.reviewerName}` : r.status),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      sortable: false,
      render: (r) => (
        <button
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
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 flex-1 flex-wrap">
          {/* Change Type Filter Dropdown */}
          <div className="relative min-w-[200px]">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-1 block">
              Filter by Workflow Type
            </label>
            <div className="relative">
              <select
                value={changeTypeFilter}
                onChange={(e) => setChangeTypeFilter(e.target.value)}
                className="w-full bg-white border border-slate-300 hover:border-[#701A35] rounded-xl px-3 py-2 text-xs text-slate-900 font-bold transition-colors cursor-pointer shadow-2xs focus:outline-none focus:border-[#701A35]"
              >
                <option value="ALL">All Workflow Types</option>
                <option value="Loan Update">Loan Restructuring</option>
                <option value="Loan Split">Loan Split</option>
                <option value="Loan Merge">Loan Merge</option>
                <option value="Historical Correction">Historical Receipt</option>
                <option value="Customer Update">Customer Profile</option>
                <option value="Role Change">Role Elevation</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status Filter Tabs matching Loans page */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold overflow-x-auto max-w-full">
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
                ? `All (${approvalRequests.length})`
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
        keyExtractor={(r) => r.id}
        title="Requests & Approvals Queue"
        exportFileName="asr_approval_requests"
        searchPlaceholder="Search requests by ID, title, requester, or entity..."
        pageSizeDefault={15}
        emptyStateMessage="No approval requests match the selected filters."
      />

      {/* Details & Diff Modal */}
      <RequestDetailsModal
        request={selectedRequest}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRequest(null);
        }}
      />
    </div>
  );
};
