'use client';

import React from 'react';
import { useApp } from '@/lib/store';
import {
  ArrowRight,
  UserPlus,
  Shield,
  History,
  Settings,
  Users,
  Clock,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { RoleBadge } from '@/components/ui/RoleBadge';

export const OverviewTab: React.FC = () => {
  const { users, roles, auditLogs, systemSettings, setActiveAdminTab } = useApp();

  const totalUsers = users.length;
  const pendingApprovals = users.filter((u) => u.status === 'Pending').length;
  const staffCount = users.filter((u) => !u.isCustomer).length;
  const customerCount = users.filter((u) => u.isCustomer).length;
  const totalRoles = roles.length;
  const companyName = systemSettings?.companyProfile?.companyName || 'Organisation';

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
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#701A35] text-[#EED8A1] shadow-sm flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-950 font-serif">
                System Administration
              </h1>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Identity access management, role hierarchies, and system security controls
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveAdminTab('roles')}
            className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            <span>Roles & Permissions</span>
          </button>
          <button
            onClick={() => setActiveAdminTab('users')}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-[#C5A059] hover:from-amber-300 hover:to-amber-400 active:scale-98 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 font-bold" />
            <span>New User</span>
          </button>
        </div>
      </div>

      {/* ─── 4 Clean KPI Metric Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Users */}
        <div
          onClick={() => setActiveAdminTab('users')}
          className="bg-gradient-to-br from-[#701A35]/12 via-[#FAF8F5] to-white p-4.5 rounded-2xl border-2 border-[#701A35]/30 shadow-sm hover:border-[#701A35]/50 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#701A35] uppercase tracking-wider font-mono">Accounts Directory</span>
            <div className="w-8 h-8 rounded-xl bg-[#701A35]/10 border border-[#701A35]/30 flex items-center justify-center text-[#701A35] group-hover:bg-[#701A35] group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#701A35] tabular-nums">{totalUsers}</span>
            <span className="text-[11px] text-slate-600 font-medium">({staffCount} staff, {customerCount} cust)</span>
          </div>
        </div>

        {/* Card 2: Pending */}
        <div
          onClick={() => setActiveAdminTab('users')}
          className="bg-gradient-to-br from-amber-100/90 via-amber-50 to-white p-4.5 rounded-2xl border-2 border-amber-300 shadow-sm hover:border-amber-400 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider font-mono">Pending Review</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl font-black tabular-nums ${pendingApprovals > 0 ? 'text-amber-800' : 'text-slate-950'}`}>
              {pendingApprovals}
            </span>
            <span className="text-[11px] text-amber-800 font-bold">{pendingApprovals === 0 ? 'All clear' : 'Requires action'}</span>
          </div>
        </div>

        {/* Card 3: Roles */}
        <div
          onClick={() => setActiveAdminTab('roles')}
          className="bg-gradient-to-br from-purple-100/90 via-purple-50 to-white p-4.5 rounded-2xl border-2 border-purple-300 shadow-sm hover:border-purple-400 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider font-mono">Access Roles</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-800 group-hover:bg-purple-800 group-hover:text-white transition-colors">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-800 tabular-nums">{totalRoles}</span>
            <span className="text-[11px] text-purple-700 font-bold">Role Tiers 0–6</span>
          </div>
        </div>

        {/* Card 4: Audit */}
        <div
          onClick={() => setActiveAdminTab('audit')}
          className="bg-gradient-to-br from-emerald-100/90 via-emerald-50 to-white p-4.5 rounded-2xl border-2 border-emerald-300 shadow-sm hover:border-emerald-400 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider font-mono">Audit Trail</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 group-hover:bg-emerald-800 group-hover:text-white transition-colors">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-800 tabular-nums">{auditLogs.length}</span>
            <span className="text-[11px] text-emerald-700 font-bold">Recorded Events</span>
          </div>
        </div>
      </div>

      {/* ─── Two Columns: Roles Distribution & Recent Activity ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Role Distribution */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-950 font-serif">
                Role Headcount Distribution
              </h2>
              <button
                onClick={() => setActiveAdminTab('roles')}
                className="text-xs font-bold text-[#701A35] hover:text-[#5C142B] flex items-center gap-1 group transition-colors cursor-pointer"
              >
                <span>Manage Roles</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="space-y-1.5 pt-1">
              {roleCounts.map(({ role, count }) => {
                const barWidth = maxRoleCount > 0 ? (count / maxRoleCount) * 100 : 0;
                return (
                  <button
                    key={role.id}
                    onClick={() => setActiveAdminTab('roles')}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer text-left group"
                  >
                    <div className="w-32 shrink-0">
                      <RoleBadge roleId={role.id} size="xs" isPrimary={role.id === 0} />
                    </div>

                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(barWidth, count > 0 ? 6 : 0)}%`,
                          backgroundColor: role.hexColor || '#64748B',
                        }}
                      />
                    </div>

                    <div className="w-12 text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">{count}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Click any role tier to inspect permissions</span>
            <button
              onClick={() => setActiveAdminTab('roles')}
              className="text-[#701A35] font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Shield className="w-3 h-3" />
              <span>Role Permissions Matrix</span>
            </button>
          </div>
        </div>

        {/* Right: Recent Activity */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#C5A059]" />
                <h2 className="text-base font-bold text-slate-950 font-serif">
                  Recent Activity
                </h2>
              </div>
              <button
                onClick={() => setActiveAdminTab('audit')}
                className="text-xs font-bold text-[#701A35] hover:text-[#5C142B] flex items-center gap-1 group transition-colors cursor-pointer"
              >
                <span>Full Audit Log</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="space-y-2 pt-1">
              {auditLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No activity recorded yet
                </div>
              ) : (
                auditLogs.slice(0, 4).map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 text-xs space-y-1 hover:bg-slate-100/70 transition-colors"
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
                        <span className="font-mono bg-white px-1.5 py-0.2 rounded border border-slate-200 text-slate-600 truncate max-w-[120px]">
                          {log.afterVal}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Audit ledger verified
            </span>
            <button
              onClick={() => setActiveAdminTab('audit')}
              className="text-[#701A35] font-bold hover:underline cursor-pointer"
            >
              Export
            </button>
          </div>
        </div>
      </div>

      {/* ─── Quick Shortcuts ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-1">
        {[
          { label: 'User Directory', desc: `${totalUsers} accounts`, icon: <Users className="w-4 h-4" />, tab: 'users' as const },
          { label: 'Role Management', desc: `${totalRoles} tiers`, icon: <Shield className="w-4 h-4" />, tab: 'roles' as const },
          { label: 'Audit Trail', desc: 'Verified ledger logs', icon: <History className="w-4 h-4" />, tab: 'audit' as const },
          { label: 'System Settings', desc: 'Company & Security', icon: <Settings className="w-4 h-4" />, tab: 'settings' as const },
        ].map((item) => (
          <button
            key={item.tab}
            onClick={() => setActiveAdminTab(item.tab)}
            className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-xs transition-all text-left group flex items-center gap-3 cursor-pointer shadow-2xs"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 group-hover:bg-[#701A35] group-hover:text-white transition-colors shrink-0">
              {item.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 group-hover:text-[#701A35] truncate transition-colors">
                  {item.label}
                </span>
                <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-[#701A35] shrink-0" />
              </div>
              <span className="text-[11px] text-slate-500 font-medium block truncate mt-0.5">
                {item.desc}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
