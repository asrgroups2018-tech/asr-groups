'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import {
  FileSpreadsheet,
  Building2,
  CalendarCheck,
  Users,
  Briefcase,
  Layers,
  FileCheck2,
} from 'lucide-react';
import { CompanySyndicationReport } from './_components/CompanySyndicationReport';
import { InstallmentRecoveryReport } from './_components/InstallmentRecoveryReport';
import { BorrowerExposureReport } from './_components/BorrowerExposureReport';
import { HistoricalAuditReport } from './_components/HistoricalAuditReport';
import { PortfolioYieldReport } from './_components/PortfolioYieldReport';

type ReportTab = 'syndication' | 'installments' | 'borrowers' | 'historical' | 'portfolio';

export default function ReportsPage() {
  const { setActiveMainTab } = useApp();
  const [activeTab, setActiveTab] = useState<ReportTab>('syndication');

  useEffect(() => {
    setActiveMainTab('reports');
  }, [setActiveMainTab]);

  return (
    <AppShell>
      <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Top Header Card matching Loans page */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#701A35] text-[#EED8A1] shadow-sm flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-950 font-serif">
                Financial & Portfolio Reports
              </h1>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Multi-company syndication, repayment aging, borrower exposure matrix, and ledger audit
              </p>
            </div>
          </div>
        </div>

        {/* Report Selector Tabs matching Loans page */}
        <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'syndication', label: '16-Company Syndication' },
            { id: 'installments', label: 'EMI Recovery & Aging' },
            { id: 'borrowers', label: 'Borrower Exposure' },
            { id: 'historical', label: 'July 2026 Audit Reconcile' },
            { id: 'portfolio', label: 'Portfolio Yield' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-120 cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#701A35] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Active Report View */}
        <div className="pt-2">
          {activeTab === 'syndication' && <CompanySyndicationReport />}
          {activeTab === 'installments' && <InstallmentRecoveryReport />}
          {activeTab === 'borrowers' && <BorrowerExposureReport />}
          {activeTab === 'historical' && <HistoricalAuditReport />}
          {activeTab === 'portfolio' && <PortfolioYieldReport />}
        </div>
      </main>
    </AppShell>
  );
}
