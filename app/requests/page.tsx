'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import {
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  ShieldCheck,
  PlusCircle,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react';
import { RequestsQueueTable } from './_components/RequestsQueueTable';
import { CreateManualRequestModal } from './_components/CreateManualRequestModal';
import Link from 'next/link';

export default function RequestsPage() {
  const { setActiveMainTab, approvalRequests, approvalRules, currentActor } = useApp();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    setActiveMainTab('requests');
  }, [setActiveMainTab]);

  const pendingCount = approvalRequests.filter((r) => r.status === 'Pending').length;
  const approvedCount = approvalRequests.filter((r) => r.status === 'Approved').length;
  const autoApprovedCount = approvalRequests.filter((r) => r.status === 'Auto-Approved').length;
  const rejectedCount = approvalRequests.filter((r) => r.status === 'Rejected').length;
  const activeRulesCount = approvalRules.filter((r) => r.isActive).length;

  return (
    <AppShell>
      <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Top Header Card matching Loans page */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#701A35] text-[#EED8A1] shadow-sm flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-950 font-serif">
                Requests & Approvals Queue
              </h1>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Manage operational review, loan restructuring, split & merge approvals, and audit sign-offs
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/administration?tab=rules"
              className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#701A35]" />
              <span>Approval Rules ({activeRulesCount})</span>
            </Link>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-[#C5A059] hover:from-amber-300 hover:to-amber-400 active:scale-98 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <PlusCircle className="w-4 h-4 font-bold" />
              <span>New Request</span>
            </button>
          </div>
        </div>

        {/* 3 High-Impact KPI Badges matching Loans page */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-white p-4.5 rounded-2xl border-2 border-slate-200/90 shadow-sm hover:border-slate-300 transition-all">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Total Requests Logged
            </span>
            <div className="mt-1.5">
              <h3 className="text-slate-950 font-black text-2xl tracking-tight font-mono">
                {approvalRequests.length}
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-medium mt-1 block">
              Across all operational workflows
            </span>
          </div>

          <div className="bg-gradient-to-br from-emerald-100/90 via-emerald-50 to-white p-4.5 rounded-2xl border-2 border-emerald-300 shadow-sm hover:border-emerald-400 transition-all">
            <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider font-mono">
              Approved & Authorized
            </span>
            <div className="mt-1.5">
              <h3 className="text-emerald-700 font-black text-2xl tracking-tight font-mono">
                {approvedCount + autoApprovedCount}
              </h3>
            </div>
            <span className="text-[11px] text-emerald-800 font-bold mt-1 block">
              {approvedCount} manual · {autoApprovedCount} auto-passed
            </span>
          </div>

          <div className="bg-gradient-to-br from-rose-100/90 via-rose-50 to-white p-4.5 rounded-2xl border-2 border-rose-300 shadow-sm hover:border-rose-400 transition-all">
            <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider font-mono">
              Pending Review
            </span>
            <div className="mt-1.5">
              <h3 className="text-[#701A35] font-black text-2xl tracking-tight font-mono">
                {pendingCount}
              </h3>
            </div>
            <span className="text-[11px] text-rose-700 font-bold mt-1 block">
              {pendingCount > 0 ? `${pendingCount} action required` : 'All requests up to date'}
            </span>
          </div>
        </div>

        {/* Requests Queue Table */}
        <RequestsQueueTable />

        {/* Manual Request Modal */}
        <CreateManualRequestModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </main>
    </AppShell>
  );
}
