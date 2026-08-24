'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/store';
import {
  Users,
  UserCheck,
  Clock,
  Shield,
  FileCheck2,
  ArrowRight,
  Sliders,
  UserPlus,
  Lock,
} from 'lucide-react';
import { RoleBadge } from '@/components/common/RoleBadge';

const ROLE_TONES: Record<number, string> = {
  0: '#1A0A13',
  1: '#701A35',
  2: '#334155',
  3: '#475569',
  4: '#64748B',
  5: '#94A3B8',
  6: '#0F172A',
};

export const OverviewTab: React.FC = () => {
  const { users, roles, auditLogs, approvalRules, setActiveAdminTab, setSelectedUserId } = useApp();

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'Active').length;
  const pendingApprovals = users.filter((u) => u.status === 'Pending').length;
  const staffCount = users.filter((u) => !u.isCustomer).length;
  const customerCount = users.filter((u) => u.isCustomer).length;
  const totalRoles = roles.length;
  const activeRulesCount = approvalRules.filter((r) => r.isActive).length;

  const activePercent = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 100;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Dignified Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="font-serif text-2xl font-bold text-slate-900 tracking-tight">
            Administration Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            System identity management, access control matrices, and audit logging.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setActiveAdminTab('matrix')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-[#E6E1D6] rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Permission Matrix</span>
          </button>
          {/* Sole primary button in Maroon */}
          <button
            onClick={() => setActiveAdminTab('users')}
            className="px-4 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] active:scale-98 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4 text-amber-200" />
            <span>+ Add User</span>
          </button>
        </div>
      </div>

      {/* 2. Asymmetrical KPI Pattern: Hero Card + 3 Secondary Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Elevated Hero KPI Card (Span 5) */}
        <div
          onClick={() => setActiveAdminTab('users')}
          className="lg:col-span-5 bg-white rounded-2xl p-5 sm:p-6 border border-[#E6E1D6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-[#C5A059]/60 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                TOTAL DIRECTORY ACCOUNTS
              </span>
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 tabular-nums">
                  {totalUsers}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FAF8F5] text-slate-800 border border-[#E6E1D6]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  {activePercent}% Operational
                </span>
              </div>
            </div>

            <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E6E1D6] flex items-center justify-center text-[#701A35] group-hover:bg-[#701A35] group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span>Staff: <strong className="text-slate-900 font-mono">{staffCount}</strong></span>
              <span className="text-slate-300">·</span>
              <span>Customers: <strong className="text-slate-900 font-mono">{customerCount}</strong></span>
            </div>
            <span className="text-[#701A35] font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
              <span>View directory</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Right 3 Secondary Metric Cards (Span 7) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Secondary 1: Pending Approvals */}
          <div
            onClick={() => setActiveAdminTab('users')}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E6E1D6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
          >
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                PENDING REVIEW
              </span>
              <h3 className="font-serif text-2xl font-bold text-slate-900 tabular-nums">
                {pendingApprovals}
              </h3>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className={pendingApprovals > 0 ? 'text-amber-800 font-semibold' : 'text-slate-500'}>
                {pendingApprovals > 0 ? 'Action required' : 'Queue cleared'}
              </span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>

          {/* Secondary 2: Configured Roles */}
          <div
            onClick={() => setActiveAdminTab('roles')}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E6E1D6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
          >
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                ACCESS TIERS
              </span>
              <h3 className="font-serif text-2xl font-bold text-slate-900 tabular-nums">
                {totalRoles}
              </h3>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-600">Roles 0 to 6</span>
              <Shield className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>

          {/* Secondary 3: Active Approval Rules */}
          <div
            onClick={() => setActiveAdminTab('rules')}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E6E1D6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
          >
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                APPROVAL RULES
              </span>
              <h3 className="font-serif text-2xl font-bold text-slate-900 tabular-nums">
                {activeRulesCount}
              </h3>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-600">{approvalRules.length} Defined</span>
              <FileCheck2 className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Two-Column Layout: Stacked Bar Role Visual + Connected Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Role Distribution (Signature Monochromatic Stacked Bar) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-5 sm:p-6 border border-[#E6E1D6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-5">
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="font-serif text-base font-bold text-slate-900">
                  Role Distribution & Hierarchy
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Proportional headcount across active system security tiers
                </p>
              </div>
              <button
                onClick={() => setActiveAdminTab('roles')}
                className="text-xs font-semibold text-[#701A35] hover:text-[#5C142B] flex items-center gap-1 group transition-colors"
              >
                <span>View Roles</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Signature Element: Full-width tonal stacked bar */}
            <div className="space-y-2">
              <div className="h-3.5 w-full bg-slate-100 rounded-lg overflow-hidden flex shadow-inner">
                {roles.map((role) => {
                  const count = users.filter((u) => u.assignedRoleIds.includes(role.id)).length;
                  const widthPercent = totalUsers > 0 ? (count / totalUsers) * 100 : 0;

                  if (count === 0) return null;

                  return (
                    <div
                      key={role.id}
                      style={{
                        width: `${Math.max(widthPercent, 5)}%`,
                        backgroundColor: ROLE_TONES[role.id] || '#475569',
                      }}
                      className="h-full transition-all duration-300 hover:opacity-90 relative group/segment cursor-pointer"
                      title={`${role.name}: ${count} users (${widthPercent.toFixed(1)}%)`}
                    />
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 font-mono text-right">
                100% of directory accounts mapped
              </p>
            </div>

            {/* Clean Monochromatic Grid Legend */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {roles.map((role) => {
                const count = users.filter((u) => u.assignedRoleIds.includes(role.id)).length;
                const percentage = totalUsers > 0 ? ((count / totalUsers) * 100).toFixed(0) : '0';

                return (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E1D6]/70 text-xs hover:bg-[#F3EFE6] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <RoleBadge roleId={role.id} size="xs" isPrimary={role.id === 0} />
                      <span className="font-semibold text-slate-800 truncate">
                        {role.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono tabular-nums shrink-0 ml-2">
                      <span className="font-bold text-slate-900">{count}</span>
                      <span className="text-[11px] text-slate-400">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Multi-role union access evaluation: Active</span>
            <button
              onClick={() => setActiveAdminTab('matrix')}
              className="text-[#701A35] font-semibold hover:underline flex items-center gap-1"
            >
              <Sliders className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Permission Matrix</span>
            </button>
          </div>
        </div>

        {/* Right: Recent Security Activity (Real Connected Timeline) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-5 sm:p-6 border border-[#E6E1D6] shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="font-serif text-base font-bold text-slate-900">
                  Recent Account & Security Changes
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chronological log of administrative actions and permissions
                </p>
              </div>
              <button
                onClick={() => setActiveAdminTab('audit')}
                className="text-xs font-semibold text-[#701A35] hover:text-[#5C142B] flex items-center gap-1 group transition-colors"
              >
                <span>Full Audit Log</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Real Connected Vertical Timeline */}
            <div className="relative pl-6 space-y-4 before:absolute before:top-2 before:bottom-2 before:left-2.5 before:w-0.5 before:bg-slate-200">
              {auditLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No activity entries recorded yet. Real events will stream here.
                </div>
              ) : (
                auditLogs.slice(0, 4).map((log) => (
                  <div key={log.id} className="relative group">
                    {/* Timeline Node Dot */}
                    <div
                      className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 bg-white ${
                        log.isSensitive ? 'border-amber-500' : 'border-[#701A35]'
                      }`}
                    />

                    <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#E6E1D6]/70 text-xs space-y-1 hover:bg-[#F3EFE6] transition-colors">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{log.action}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
                      </div>

                      <p className="text-slate-700 text-xs">
                        Target: <strong className="text-slate-900">{log.target}</strong>
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>by <strong>{log.actorName}</strong></span>
                        {log.afterVal && (
                          <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {log.afterVal}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Integrated Live Status Strip */}
          <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E6E1D6]/70 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-[#C5A059]" />
              <span className="text-[11px]">Audit Ledger Synchronization: <strong>Active & Verified</strong></span>
            </div>
            <button
              onClick={() => setActiveAdminTab('audit')}
              className="text-[#701A35] font-semibold hover:underline text-[11px]"
            >
              Export CSV / PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
