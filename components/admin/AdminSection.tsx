'use client';

import React from 'react';
import { useApp } from '@/lib/store';
import { AdminTab } from '@/lib/types';
import {
  LayoutGrid,
  Users,
  Shield,
  Sliders,
  FileCheck2,
  History,
  Settings,
} from 'lucide-react';
import { OverviewTab } from './OverviewTab';
import { UserManagementTab } from './UserManagementTab';
import { UserDetailsView } from './UserDetailsView';
import { RolesPermissionsTab } from './RolesPermissionsTab';
import { PermissionMatrixTab } from './PermissionMatrixTab';
import { ApprovalRulesTab } from './ApprovalRulesTab';
import { AuditLogTab } from './AuditLogTab';
import { SystemSettingsTab } from './SystemSettingsTab';

export const AdminSection: React.FC = () => {
  const {
    activeAdminTab,
    setActiveAdminTab,
    selectedUserId,
    setSelectedUserId,
  } = useApp();

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { id: 'users', label: 'User Management', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'roles', label: 'Roles & Permissions', icon: <Shield className="w-3.5 h-3.5" /> },
    { id: 'matrix', label: 'Permission Matrix', icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: 'rules', label: 'Approval Rules', icon: <FileCheck2 className="w-3.5 h-3.5" /> },
    { id: 'audit', label: 'Audit Log', icon: <History className="w-3.5 h-3.5" /> },
    { id: 'settings', label: 'System Settings', icon: <Settings className="w-3.5 h-3.5" /> },
  ];

  const handleTabClick = (tabId: AdminTab) => {
    setActiveAdminTab(tabId);
    setSelectedUserId(null); // Return to sub-tab view if navigating
  };

  return (
    <div className="flex flex-col flex-1 bg-[#F8F6F1] min-h-0">
      {/* Modern Segmented Sub-Tab Navigation Bar */}
      <div className="bg-white border-b border-[#E6E1D6] sticky top-0 z-20 px-4 sm:px-8 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {tabs.map((tab) => {
            const isActive = activeAdminTab === tab.id && !selectedUserId;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all flex items-center gap-2 shrink-0 select-none ${
                  isActive
                    ? 'bg-[#701A35] text-white border border-[#C5A059]/40 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-[#F3EFE6]/60 border border-transparent'
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
      <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        {selectedUserId ? (
          <UserDetailsView />
        ) : (
          <>
            {activeAdminTab === 'overview' && <OverviewTab />}
            {activeAdminTab === 'users' && <UserManagementTab />}
            {activeAdminTab === 'roles' && <RolesPermissionsTab />}
            {activeAdminTab === 'matrix' && <PermissionMatrixTab />}
            {activeAdminTab === 'rules' && <ApprovalRulesTab />}
            {activeAdminTab === 'audit' && <AuditLogTab />}
            {activeAdminTab === 'settings' && <SystemSettingsTab />}
          </>
        )}
      </main>
    </div>
  );
};
