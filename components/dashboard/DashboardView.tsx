'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import {
  CreditCard,
  Clock,
  Banknote,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertTriangle,
  FileCheck,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieIcon,
  ShieldCheck,
} from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';

export const DashboardView: React.FC = () => {
  const { setActiveMainTab, setActiveAdminTab, simulatedRoleId } = useApp();
  const [timeFilter, setTimeFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>(
    'month'
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Dashboard Top Title & Time Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 tracking-tight">
            Financial Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ASR Family Finance ERP · Last updated: 08 Aug 2026, 10:30 AM IST
          </p>
        </div>

        {/* Time Filters */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-[#EBE7DF] shadow-2xs overflow-x-auto">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'custom', label: 'Custom' },
          ].map((f) => {
            const isActive = timeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setTimeFilter(f.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  isActive
                    ? 'bg-[#FAF4E6] text-[#8C6B28] border border-[#DBC187] font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 1: Primary 4 KPI Cards (Matching Screenshot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Loan Amount */}
        <StatCard
          title="TOTAL LOAN AMOUNT"
          value="₹4.88 Cr"
          subtitle="All disbursed loans"
          trend={{ value: '8.2% vs last month', isPositive: true }}
          icon={<CreditCard className="w-5 h-5 text-rose-700" />}
          iconBgColor="bg-rose-100/70"
        />

        {/* 2. Total Outstanding */}
        <StatCard
          title="TOTAL OUTSTANDING"
          value="₹1.98 Cr"
          subtitle="Across all active loans"
          trend={{ value: '3.1% reduced', isPositive: false }}
          icon={<Clock className="w-5 h-5 text-amber-700" />}
          iconBgColor="bg-amber-100/70"
        />

        {/* 3. Total Collected */}
        <StatCard
          title="TOTAL COLLECTED"
          value="₹2.89 Cr"
          subtitle="All time collections"
          trend={{ value: '12.4% vs last month', isPositive: true }}
          icon={<Banknote className="w-5 h-5 text-emerald-700" />}
          iconBgColor="bg-emerald-100/70"
        />

        {/* 4. Net Profit */}
        <StatCard
          title="NET PROFIT"
          value="₹12.69 L"
          subtitle="Income minus expenses"
          trend={{ value: '15.8% vs last month', isPositive: true }}
          icon={<TrendingUp className="w-5 h-5 text-rose-700" />}
          iconBgColor="bg-rose-100/70"
        />
      </div>

      {/* Row 2: Secondary 5 KPI Cards (Matching Screenshot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Today's Collection */}
        <StatCard
          title="TODAY'S COLLECTION"
          value="₹1.92 L"
          subtitle="42 receipts recorded"
          icon={<DollarSign className="w-5 h-5 text-amber-800" />}
          iconBgColor="bg-amber-100/70"
        />

        {/* This Week */}
        <StatCard
          title="THIS WEEK"
          value="₹9.85 L"
          subtitle="Mon - Sun tally"
          icon={<Calendar className="w-5 h-5 text-blue-700" />}
          iconBgColor="bg-blue-100/70"
        />

        {/* This Month */}
        <StatCard
          title="THIS MONTH"
          value="₹34.20 L"
          subtitle="Aug 2026 performance"
          icon={<TrendingUp className="w-5 h-5 text-emerald-700" />}
          iconBgColor="bg-emerald-100/70"
        />

        {/* Active Loans */}
        <StatCard
          title="ACTIVE LOANS"
          value="78"
          subtitle="12 overdue accounts"
          icon={<CreditCard className="w-5 h-5 text-rose-700" />}
          iconBgColor="bg-rose-100/70"
        />

        {/* Pending Approvals */}
        <StatCard
          title="PENDING APPROVALS"
          value="5"
          subtitle="Awaiting review"
          icon={<AlertTriangle className="w-5 h-5 text-amber-700" />}
          iconBgColor="bg-amber-100/70"
          onClick={() => {
            setActiveMainTab('administration');
            setActiveAdminTab('rules');
          }}
        />
      </div>

      {/* Row 3: Charts matching screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Collection vs Target Line Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-[#EBE7DF] shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-serif">
                Collection vs Target
              </h3>
              <p className="text-xs text-slate-500">
                Monthly performance trend (Feb–Aug 2026)
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300">
              On Track
            </span>
          </div>

          {/* SVG Chart Graphic */}
          <div className="h-64 w-full relative pt-4">
            <svg
              viewBox="0 0 700 220"
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              {/* Horizontal Grid lines */}
              <line x1="40" y1="30" x2="680" y2="30" stroke="#E5E0D5" strokeDasharray="3 3" />
              <text x="5" y="34" fill="#999" fontSize="10" fontFamily="monospace">
                ₹12.00 L
              </text>

              <line x1="40" y1="90" x2="680" y2="90" stroke="#E5E0D5" strokeDasharray="3 3" />
              <text x="5" y="94" fill="#999" fontSize="10" fontFamily="monospace">
                ₹9.00 L
              </text>

              <line x1="40" y1="150" x2="680" y2="150" stroke="#E5E0D5" strokeDasharray="3 3" />
              <text x="5" y="154" fill="#999" fontSize="10" fontFamily="monospace">
                ₹6.00 L
              </text>

              {/* Gradient definition */}
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#831843" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#831843" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area fill */}
              <path
                d="M 60 140 Q 160 110, 260 100 T 460 70 T 560 60 T 660 150 L 660 200 L 60 200 Z"
                fill="url(#chartGrad)"
              />

              {/* Trend Line (Deep Maroon) */}
              <path
                d="M 60 140 Q 160 110, 260 100 T 460 70 T 560 60 T 660 150"
                fill="none"
                stroke="#831843"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Data points */}
              {[
                { cx: 60, cy: 140, label: 'Feb' },
                { cx: 160, cy: 115, label: 'Mar' },
                { cx: 260, cy: 100, label: 'Apr' },
                { cx: 360, cy: 82, label: 'May' },
                { cx: 460, cy: 70, label: 'Jun' },
                { cx: 560, cy: 60, label: 'Jul' },
                { cx: 660, cy: 150, label: 'Aug' },
              ].map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.cx} cy={pt.cy} r="5" fill="#831843" stroke="#fff" strokeWidth="2" />
                  <text
                    x={pt.cx}
                    y="215"
                    fill="#666"
                    fontSize="11"
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {pt.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Right: Loan Portfolio Donut Chart (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-[#EBE7DF] shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-serif">
              Loan Portfolio
            </h3>
            <p className="text-xs text-slate-500">By loan asset classification</p>

            {/* SVG Donut Chart */}
            <div className="flex items-center justify-center py-4">
              <div className="relative w-44 h-44">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {/* Segment 1: Personal (45%) - Maroon */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#831843"
                    strokeWidth="18"
                    strokeDasharray="107 238"
                    strokeDashoffset="0"
                  />
                  {/* Segment 2: Business (30%) - Gold */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#C5A059"
                    strokeWidth="18"
                    strokeDasharray="71 238"
                    strokeDashoffset="-107"
                  />
                  {/* Segment 3: Gold Loan (15%) - Dark Slate */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#1E293B"
                    strokeWidth="18"
                    strokeDasharray="36 238"
                    strokeDashoffset="-178"
                  />
                  {/* Segment 4: Vehicle (10%) - Emerald */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#059669"
                    strokeWidth="18"
                    strokeDasharray="24 238"
                    strokeDashoffset="-214"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-lg font-bold text-slate-900 font-mono">78</span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">
                    Active Loans
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#831843]" />
              <span className="text-slate-600">Personal (45%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C5A059]" />
              <span className="text-slate-600">Business (30%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1E293B]" />
              <span className="text-slate-600">Gold (15%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
              <span className="text-slate-600">Vehicle (10%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
