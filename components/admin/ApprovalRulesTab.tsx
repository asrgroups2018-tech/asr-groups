'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { ApprovalRule, RoleId } from '@/lib/types';
import {
  FileCheck2,
  PlusCircle,
  ShieldAlert,
  Zap,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { RoleBadge } from '@/components/common/RoleBadge';
import { AddApprovalRuleModal } from './modals/AddApprovalRuleModal';
import { DataTable, ColumnDef } from '@/components/common/DataTable';

export const ApprovalRulesTab: React.FC = () => {
  const {
    approvalRules,
    roles,
    updateApprovalRule,
    deleteApprovalRule,
    showToast,
  } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const activeRulesCount = approvalRules.filter((r) => r.isActive).length;
  const autoApproveCount = approvalRules.filter((r) => r.autoApproveBelow).length;

  const handleToggleActive = (rule: ApprovalRule) => {
    updateApprovalRule(rule.id, { isActive: !rule.isActive });
  };

  const handleToggleAutoApprove = (rule: ApprovalRule) => {
    updateApprovalRule(rule.id, { autoApproveBelow: !rule.autoApproveBelow });
  };

  const columns: ColumnDef<ApprovalRule>[] = [
    {
      key: 'changeType',
      header: 'Workflow',
      sortable: true,
      accessor: (r) => r.changeType,
      render: (r) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900 text-xs">{r.changeType}</span>
            <span className="text-[10px] font-mono text-slate-400">({r.id})</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm">{r.description}</p>
        </div>
      ),
      exportValue: (r) => `${r.changeType} (${r.id})`,
    },
    {
      key: 'whoCanRaise',
      header: 'Raised By',
      sortable: false,
      render: (r) => (
        <div className="flex items-center gap-1 flex-wrap max-w-xs">
          {r.whoCanRaise.map((rId) => (
            <RoleBadge key={rId} roleId={rId} size="xs" />
          ))}
        </div>
      ),
      exportValue: (r) =>
        r.whoCanRaise
          .map((rId) => roles.find((role) => role.id === rId)?.name || `Role ${rId}`)
          .join('; '),
    },
    {
      key: 'whoMustApprove',
      header: 'Approver',
      sortable: true,
      accessor: (r) => r.whoMustApprove,
      render: (r) => (
        <RoleBadge roleId={r.whoMustApprove} size="xs" />
      ),
      exportValue: (r) =>
        roles.find((role) => role.id === r.whoMustApprove)?.name || `Role ${r.whoMustApprove}`,
    },
    {
      key: 'threshold',
      header: 'Threshold Limit',
      sortable: true,
      accessor: (r) => r.amountThreshold,
      render: (r) => (
        <div className="font-mono text-xs tabular-nums">
          {r.amountThreshold > 0 ? (
            <span className="font-bold text-slate-900">
              ₹{r.amountThreshold.toLocaleString('en-IN')}
            </span>
          ) : (
            <span className="text-slate-400 italic">No cap</span>
          )}
        </div>
      ),
      exportValue: (r) =>
        r.amountThreshold > 0 ? `₹${r.amountThreshold}` : 'No cap',
    },
    {
      key: 'autoApprove',
      header: 'Auto-Approve',
      align: 'center',
      sortable: false,
      render: (r) => (
        <button
          onClick={() => handleToggleAutoApprove(r)}
          className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 mx-auto cursor-pointer ${
            r.autoApproveBelow
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
          }`}
        >
          <Zap className={`w-3.5 h-3.5 ${r.autoApproveBelow ? 'text-amber-500 fill-amber-400' : 'text-slate-400'}`} />
          <span>{r.autoApproveBelow ? 'Enabled' : 'Disabled'}</span>
        </button>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      sortable: false,
      render: (r) => (
        <button
          onClick={() => handleToggleActive(r)}
          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 mx-auto ${
            r.isActive
              ? 'bg-emerald-100/90 text-emerald-800 border-emerald-300'
              : 'bg-rose-100/90 text-rose-800 border-rose-300'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              r.isActive ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
          />
          <span>{r.isActive ? 'Active' : 'Inactive'}</span>
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      sortable: false,
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => deleteApprovalRule(r.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Delete Rule"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Stat Strip & Add Button */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-[#EBE7DF] shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              TOTAL RULES
            </p>
            <h3 className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
              {approvalRules.length}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#EBE7DF] shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              ACTIVE WORKFLOWS
            </p>
            <h3 className="text-2xl font-bold text-emerald-700 tabular-nums mt-0.5">
              {activeRulesCount}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#EBE7DF] shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              AUTO-APPROVE ENABLED
            </p>
            <h3 className="text-2xl font-bold text-amber-700 tabular-nums mt-0.5">
              {autoApproveCount}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Zap className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Rules Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#EBE7DF] shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-serif">
            Financial & Operational Approval Matrix
          </h3>
          <p className="text-xs text-slate-500">
            Enforces multi-signature authority for critical loan overrides, expense approvals, and salary adjustments
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] active:scale-98 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
        >
          <PlusCircle className="w-4 h-4 text-amber-200" />
          <span>+ Add Rule</span>
        </button>
      </div>

      {/* Rules Table or Modern Empty State */}
      {approvalRules.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 sm:p-12 border border-[#E6E1D6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#FAF8F5] text-[#701A35] border border-[#E6E1D6] flex items-center justify-center mx-auto">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h4 className="text-base font-bold text-slate-900 font-serif">
              No Approval Rules Configured Yet
            </h4>
            <p className="text-xs text-slate-500">
              Create workflow policies to enforce authorization limits for loan updates, expense bookings, salary revisions, and customer KYC modifications.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] active:scale-98 rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4 text-amber-200" />
            <span>Create Your First Approval Rule</span>
          </button>
        </div>
      ) : (
        <DataTable
          data={approvalRules}
          columns={columns}
          keyExtractor={(r) => r.id}
          title="Approval Rules Matrix"
          exportFileName="approval_rules_asr"
          searchPlaceholder="Search rules by transaction type or description..."
        />
      )}

      {/* Modal */}
      <AddApprovalRuleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};
