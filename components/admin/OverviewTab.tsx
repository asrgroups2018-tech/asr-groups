'use client';

import React from 'react';
import { useApp } from '@/lib/store';
import {
  ArrowRight,
  Sliders,
  UserPlus,
  Shield,
  FileCheck2,
  History,
  Settings,
  Users,
  Clock,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { RoleBadge } from '@/components/common/RoleBadge';

const ROLE_BAR_COLORS: Record<number, string> = {
  0: '#701A35',
  1: '#8B2548',
  2: '#475569',
  3: '#64748B',
  4: '#94A3B8',
  5: '#CBD5E1',
  6: '#0F172A',
};

export const OverviewTab: React.FC = () => {
  const { users, roles, auditLogs, approvalRules, setActiveAdminTab } = useApp();

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'Active').length;
  const pendingApprovals = users.filter((u) => u.status === 'Pending').length;
  const staffCount = users.filter((u) => !u.isCustomer).length;
  const customerCount = users.filter((u) => u.isCustomer).length;
  const totalRoles = roles.length;
  const activeRulesCount = approvalRules.filter((r) => r.isActive).length;

  const roleCounts = roles.map((role) => ({
    role,
    count: users.filter((u) => u.assignedRoleIds.includes(role.id)).length,
  }));
  const maxRoleCount = Math.max(...roleCounts.map((r) => r.count), 1);

  const formatRelativeTime = (timestamp: string): string => {
    try {
      const parts = timestamp.split(/[\s-:]/);
      if (parts.length >= 5) {
        const date = new Date(
          parseInt(parts[0]),
          parseInt(parts[1]) - 1,
          parseInt(parts[2]),
          parseInt(parts[3]),
          parseInt(parts[4])
        );
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffHrs = Math.floor(diffMin / 60);
        if (diffHrs < 24) return `${diffHrs}h ago`;
        const diffDays = Math.floor(diffHrs / 24);
        return `${diffDays}d ago`;
      }
    } catch {
      // fallback
    }
    return timestamp;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Administration
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            System identity, roles, and security controls
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveAdminTab('roles')}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-[#E6E1D6] rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Roles</span>
          </button>
          <button
            onClick={() => setActiveAdminTab('users')}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] active:scale-98 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-amber-200" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* ─── 4 Clean KPI Metric Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Users */}
        <div
          onClick={() => setActiveAdminTab('users')}
          className="bg-white p-4 rounded-2xl border border-[#E6E1D6] hover:border-[#C5A059]/60 transition-all cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.02)] group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Accounts</span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#E6E1D6] flex items-center justify-center text-[#701A35] group-hover:bg-[#701A35] group-hover:text-white transition-colors">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{totalUsers}</span>
            <span className="text-[11px] text-slate-400">({staffCount} staff, {customerCount} cust)</span>
          </div>
        </div>

        {/* Card 2: Pending */}
        <div
          onClick={() => setActiveAdminTab('users')}
          className="bg-white p-4 rounded-2xl border border-[#E6E1D6] hover:border-[#C5A059]/60 transition-all cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.02)] group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending Review</span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#E6E1D6] flex items-center justify-center text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-bold tabular-nums ${pendingApprovals > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
              {pendingApprovals}
            </span>
            <span className="text-[11px] text-slate-400">{pendingApprovals === 0 ? 'All clear' : 'Requires action'}</span>
          </div>
        </div>

        {/* Card 3: Roles */}
        <div
          onClick={() => setActiveAdminTab('roles')}
          className="bg-white p-4 rounded-2xl border border-[#E6E1D6] hover:border-[#C5A059]/60 transition-all cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.02)] group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Access Roles</span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#E6E1D6] flex items-center justify-center text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <Shield className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{totalRoles}</span>
            <span className="text-[11px] text-slate-400">Tiers 0–6</span>
          </div>
        </div>

        {/* Card 4: Audit */}
        <div
          onClick={() => setActiveAdminTab('audit')}
          className="bg-white p-4 rounded-2xl border border-[#E6E1D6] hover:border-[#C5A059]/60 transition-all cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.02)] group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Audit Logs</span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#E6E1D6] flex items-center justify-center text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <History className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{auditLogs.length}</span>
            <span className="text-[11px] text-slate-400">Events</span>
          </div>
        </div>
      </div>

      {/* ─── Two Columns: Roles Distribution & Recent Activity ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Role Distribution */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-[#E6E1D6] shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">
                Role Headcount
              </h2>
              <button
                onClick={() => setActiveAdminTab('roles')}
                className="text-xs font-semibold text-[#701A35] hover:text-[#5C142B] flex items-center gap-1 group transition-colors"
              >
                <span>Manage Roles</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="space-y-1.5">
              {roleCounts.map(({ role, count }) => {
                const barWidth = maxRoleCount > 0 ? (count / maxRoleCount) * 100 : 0;
                return (
                  <button
                    key={role.id}
                    onClick={() => setActiveAdminTab('roles')}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[#FAF8F5] transition-colors cursor-pointer text-left group"
                  >
                    <div className="w-32 shrink-0">
                      <RoleBadge roleId={role.id} size="xs" isPrimary={role.id === 0} />
                    </div>

                    <div className="flex-1 h-2 bg-[#F3EFE6] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(barWidth, count > 0 ? 6 : 0)}%`,
                          backgroundColor: ROLE_BAR_COLORS[role.id] || '#64748B',
                        }}
                      />
                    </div>

                    <div className="w-12 text-right shrink-0">
                      <span className="text-xs font-bold text-slate-900 tabular-nums">{count}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Click any role to edit permissions</span>
            <button
              onClick={() => setActiveAdminTab('roles')}
              className="text-[#701A35] font-semibold hover:underline flex items-center gap-1"
            >
              <Shield className="w-3 h-3" />
              <span>Role Management</span>
            </button>
          </div>
        </div>

        {/* Right: Recent Activity */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-[#E6E1D6] shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#C5A059]" />
                <h2 className="text-sm font-bold text-slate-900">
                  Recent Activity
                </h2>
              </div>
              <button
                onClick={() => setActiveAdminTab('audit')}
                className="text-xs font-semibold text-[#701A35] hover:text-[#5C142B] flex items-center gap-1 group transition-colors"
              >
                <span>Full Log</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="space-y-2">
              {auditLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No activity recorded yet
                </div>
              ) : (
                auditLogs.slice(0, 4).map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E1D6]/60 text-xs space-y-1 hover:bg-[#F3EFE6]/60 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">{log.action}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatRelativeTime(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate">
                      {log.target}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>by {log.actorName}</span>
                      {log.afterVal && (
                        <span className="font-mono bg-white px-1.5 py-0.2 rounded border border-[#E6E1D6] text-slate-600 truncate max-w-[120px]">
                          {log.afterVal}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Audit ledger verified
            </span>
            <button
              onClick={() => setActiveAdminTab('audit')}
              className="text-[#701A35] font-semibold hover:underline"
            >
              Export
            </button>
          </div>
        </div>
      </div>

      {/* ─── Quick Shortcuts ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {[
          { label: 'User Directory', desc: `${totalUsers} accounts`, icon: <Users className="w-4 h-4" />, tab: 'users' as const },
          { label: 'Role Management', desc: `${totalRoles} tiers`, icon: <Shield className="w-4 h-4" />, tab: 'roles' as const },
          { label: 'Audit Trail', desc: 'Verified ledger logs', icon: <History className="w-4 h-4" />, tab: 'audit' as const },
          { label: 'System Settings', desc: 'Company & Security', icon: <Settings className="w-4 h-4" />, tab: 'settings' as const },
        ].map((item) => (
          <button
            key={item.tab}
            onClick={() => setActiveAdminTab(item.tab)}
            className="p-3.5 bg-white border border-[#E6E1D6] rounded-xl hover:border-[#C5A059]/60 hover:shadow-2xs transition-all text-left group flex items-center gap-3 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#E6E1D6] flex items-center justify-center text-slate-600 group-hover:bg-[#701A35] group-hover:text-white transition-colors shrink-0">
              {item.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 group-hover:text-[#701A35] truncate transition-colors">
                  {item.label}
                </span>
                <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-[#701A35] shrink-0" />
              </div>
              <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                {item.desc}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

