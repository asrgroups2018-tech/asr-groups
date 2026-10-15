'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/lib/store';
import { AccessRequest } from '@/lib/types';
import { AppShell } from '@/components/layout/AppShell';
import { ShieldCheck } from 'lucide-react';
import { RequestsQueueTable } from './_components/RequestsQueueTable';

export default function RequestsPage() {
  const { setActiveMainTab, approvalRequests, fetchApprovalRequests } = useApp();
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);

  useEffect(() => {
    setActiveMainTab('requests');
  }, [setActiveMainTab]);

  const loadAccessRequests = useCallback(async () => {
    try {
      const response = await fetch('/api/access-requests', { cache: 'no-store' });
      const json = await response.json();
      if (json.success) setAccessRequests(json.data || []);
    } catch (error) {
      console.error('Failed to load access requests:', error);
    }
  }, []);

  const refreshQueue = useCallback(async () => {
    await Promise.all([
      fetchApprovalRequests(),
      loadAccessRequests(),
    ]);
  }, [fetchApprovalRequests, loadAccessRequests]);

  useEffect(() => {
    void refreshQueue();

    const handleWindowFocus = () => void refreshQueue();
    window.addEventListener('focus', handleWindowFocus);
    const refreshTimer = window.setInterval(() => void refreshQueue(), 5000);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      window.clearInterval(refreshTimer);
    };
  }, [refreshQueue]);

  const allRequests = [...approvalRequests, ...accessRequests];
  const pendingCount = allRequests.filter((r) => r.status === 'Pending').length;
  const approvedCount = allRequests.filter((r) => r.status === 'Approved').length;
  const autoApprovedCount = allRequests.filter((r) => r.status === 'Auto-Approved').length;
  const rejectedCount = allRequests.filter((r) => r.status === 'Rejected').length;
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

        </div>

        {/* 3 High-Impact KPI Badges matching Loans page */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-[#701A35]/12 via-[#FAF8F5] to-white p-3 rounded-xl border-2 border-[#701A35]/30 shadow-sm hover:border-[#701A35]/50 transition-all">
            <span className="text-[10px] font-bold text-[#701A35] uppercase tracking-wider font-mono">
              Total Requests Logged
            </span>
            <div className="mt-1">
              <h3 className="text-[#701A35] font-black text-xl tracking-tight font-mono">
                {allRequests.length}
              </h3>
            </div>
            <span className="text-[10px] text-slate-600 font-medium mt-0.5 block">
              Across all page and operational requests
            </span>
          </div>

          <div className="bg-gradient-to-br from-emerald-100/90 via-emerald-50 to-white p-3 rounded-xl border-2 border-emerald-300 shadow-sm hover:border-emerald-400 transition-all">
            <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider font-mono">
              Approved & Authorized
            </span>
            <div className="mt-1">
              <h3 className="text-emerald-700 font-black text-xl tracking-tight font-mono">
                {approvedCount + autoApprovedCount}
              </h3>
            </div>
            <span className="text-[10px] text-emerald-800 font-bold mt-0.5 block">
              {approvedCount} manual · {autoApprovedCount} auto-passed
            </span>
          </div>

          <div className="bg-gradient-to-br from-rose-100/90 via-rose-50 to-white p-3 rounded-xl border-2 border-rose-300 shadow-sm hover:border-rose-400 transition-all">
            <span className="text-[10px] font-bold text-rose-900 uppercase tracking-wider font-mono">
              Pending Review
            </span>
            <div className="mt-1">
              <h3 className="text-[#701A35] font-black text-xl tracking-tight font-mono">
                {pendingCount}
              </h3>
            </div>
            <span className="text-[10px] text-rose-700 font-bold mt-0.5 block">
              {pendingCount > 0 ? `${pendingCount} action required` : 'All requests up to date'}
            </span>
          </div>
        </div>

        {/* Requests Queue Table */}
        <RequestsQueueTable
          accessRequests={accessRequests}
          onAccessRequestChanged={() => void refreshQueue()}
        />

      </main>
    </AppShell>
  );
}
