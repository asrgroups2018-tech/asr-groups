'use client';

import React from 'react';
import { useApp } from '@/lib/store';
import {
  Hammer,
  ShieldAlert,
  Clock,
  ArrowRight,
  Sparkles,
  LayoutDashboard,
  CreditCard,
  Users,
  Coins,
  TrendingUp,
  Receipt,
  Banknote,
  Briefcase,
  FileBarChart,
  CalendarDays,
  CheckSquare,
  Settings,
} from 'lucide-react';

interface UnderDevelopmentViewProps {
  moduleName: string;
}

export const UnderDevelopmentView: React.FC<UnderDevelopmentViewProps> = ({ moduleName }) => {
  const { setActiveMainTab, simulatedRoleId, currentActor, roles } = useApp();

  const moduleIcons: Record<string, React.ReactNode> = {
    dashboard: <LayoutDashboard className="w-8 h-8 text-amber-700" />,
    loans: <CreditCard className="w-8 h-8 text-rose-700" />,
    customers: <Users className="w-8 h-8 text-indigo-700" />,
    collections: <Coins className="w-8 h-8 text-emerald-700" />,
    income: <TrendingUp className="w-8 h-8 text-blue-700" />,
    expenses: <Receipt className="w-8 h-8 text-amber-700" />,
    salary: <Banknote className="w-8 h-8 text-purple-700" />,
    agents: <Briefcase className="w-8 h-8 text-teal-700" />,
    reports: <FileBarChart className="w-8 h-8 text-indigo-700" />,
    schedule: <CalendarDays className="w-8 h-8 text-blue-700" />,
    requests: <CheckSquare className="w-8 h-8 text-amber-700" />,
    settings: <Settings className="w-8 h-8 text-slate-700" />,
  };

  const moduleTitles: Record<string, string> = {
    dashboard: 'Financial Dashboard',
    loans: 'Loan Management & Underwriting',
    customers: 'Customer Directory & KYC',
    collections: 'Field Collections & Receipts',
    income: 'Income & Revenue Tracking',
    expenses: 'Operational Expenses',
    salary: 'Salary & Payroll Processing',
    agents: 'Agent Network & Route Mapping',
    reports: 'P&L & Accounting Reports',
    schedule: 'EMI Schedules & Calendar',
    requests: 'Requests & Approvals Queue',
    settings: 'General Preferences',
  };

  const displayTitle = moduleTitles[moduleName.toLowerCase()] || `${moduleName} Module`;
  const icon = moduleIcons[moduleName.toLowerCase()] || <Hammer className="w-8 h-8 text-amber-700" />;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in">
      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#EBE7DF] shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center space-y-6 relative overflow-hidden">
        {/* Subtle decorative background pattern */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-amber-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-purple-100/40 rounded-full blur-3xl pointer-events-none" />

        {/* Icon & Status Pill */}
        <div className="space-y-3 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 shadow-xs flex items-center justify-center mx-auto">
            {icon}
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/90 text-amber-900 border border-amber-300 text-xs font-bold font-mono tracking-wide">
            <Clock className="w-3.5 h-3.5 text-amber-700 animate-spin" />
            <span>UNDER DEVELOPMENT</span>
          </div>
        </div>

        {/* Headings */}
        <div className="space-y-2 max-w-lg mx-auto relative z-10">
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 tracking-tight">
            {displayTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            This module is currently under active construction as part of the scheduled ERP roadmap. The fully functional{' '}
            <strong className="text-slate-900">Administration & Security Control Center</strong> is ready for live use.
          </p>
        </div>

        {/* Action Button to Administration */}
        <div className="pt-2 relative z-10 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => setActiveMainTab('administration')}
            className="px-6 py-3 text-xs font-bold text-[#EED8A1] bg-[#1A0A13] hover:bg-[#2C1420] active:scale-95 rounded-2xl transition-all shadow-md flex items-center gap-2 border border-[#C5A059]/40"
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Go to Administration Module</span>
            <ArrowRight className="w-4 h-4 text-amber-400" />
          </button>
        </div>

        {/* Info Strip */}
        <div className="pt-6 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3 relative z-10">
          <span className="font-mono text-[11px]">
            Target Deployment: Q3 Sprint 2026
          </span>
          <span className="text-[11px]">
            Logged in as: <strong className="text-slate-800">{currentActor.name}</strong> ({roles.find(r => r.id === simulatedRoleId)?.name})
          </span>
        </div>
      </div>
    </div>
  );
};
