'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/lib/store';
import { AdminTab } from '@/lib/types';
import {
  LayoutGrid,
  Users,
  Shield,
  History,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { OverviewTab } from './OverviewTab';
import { UserManagementTab } from './UserManagementTab';
import { UserDetailsView } from './UserDetailsView';
import { RolesPermissionsTab } from './RolesPermissionsTab';
import { AuditLogTab } from './AuditLogTab';
import { SystemSettingsTab } from './SystemSettingsTab';

export const AdminSection: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const {
    activeAdminTab,
    setActiveAdminTab,
    selectedUserId,
    setSelectedUserId,
    users,
    isLoading,
  } = useApp();

  const tabs: { id: AdminTab; href: string; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', href: '/administration', label: 'Overview', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { id: 'users', href: '/administration/users', label: 'User Management', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'roles', href: '/administration/roles', label: 'Role Management', icon: <Shield className="w-3.5 h-3.5" /> },
    { id: 'audit', href: '/administration/audit-log', label: 'Audit Log', icon: <History className="w-3.5 h-3.5" /> },
    { id: 'settings', href: '/administration/settings', label: 'System Settings', icon: <Settings className="w-3.5 h-3.5" /> },
  ];

  const handleTabClick = (tabId: AdminTab, href: string) => {
    setActiveAdminTab(tabId);
    setSelectedUserId(null); // Return to sub-tab view if navigating
    router.push(href);
  };

  return (
    <div className="flex flex-col flex-1 bg-[#F7F5F0] min-h-0">
      <div className="px-4 sm:px-8 pt-6 pb-4 border-b border-[#E8E3D9] bg-[#F7F5F0]">
        <div className="max-w-[1400px] w-full mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#9A7A3A]">
              Control centre
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#25151C]">
              Administration
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage people, access, approvals, and system configuration from one place.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start sm:self-auto rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5" />
            Database connected
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-20 border-b border-[#E6E1D6] bg-white/95 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.03)] backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-[1400px] items-center gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = !selectedUserId && (pathname === tab.href || (tab.id === 'overview' && pathname === '/administration') || pathname.startsWith(tab.href + '/'));

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id, tab.href)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold tracking-tight transition-all duration-120 flex items-center gap-2 shrink-0 select-none cursor-pointer btn-press ${
                  isActive
                    ? 'bg-[#701A35] text-white border border-[#C5A059]/40 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-[#F3EFE6]/70 border border-transparent'
                }`}
              >
                <span className={isActive ? 'text-[#EED8A1]' : 'text-slate-400'}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 sm:p-8 space-y-6 animate-in fade-in duration-100">
        {isLoading && (!users || users.length <= 1) ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-10 bg-slate-200 rounded-xl w-1/3" />
            <div className="h-32 bg-slate-200 rounded-2xl w-full" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="h-28 bg-slate-200 rounded-2xl" />
              <div className="h-28 bg-slate-200 rounded-2xl" />
              <div className="h-28 bg-slate-200 rounded-2xl" />
              <div className="h-28 bg-slate-200 rounded-2xl" />
            </div>
            <div className="h-64 bg-slate-200 rounded-2xl w-full" />
          </div>
        ) : selectedUserId ? (
          <UserDetailsView />
        ) : (
          <>
            {activeAdminTab === 'overview' && <OverviewTab />}
            {activeAdminTab === 'users' && <UserManagementTab />}
            {activeAdminTab === 'roles' && <RolesPermissionsTab />}
            {activeAdminTab === 'audit' && <AuditLogTab />}
            {activeAdminTab === 'settings' && <SystemSettingsTab />}
          </>
        )}
      </main>
    </div>
  );
};
