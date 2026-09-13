'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/lib/store';
import {
  Menu,
  Bell,
  ChevronDown,
  UserCheck,
  LogOut,
  Key,
} from 'lucide-react';
import { RoleBadge } from '@/components/ui/RoleBadge';

interface TopNavProps {
  onOpenMobileMenu: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onOpenMobileMenu }) => {
  const {
    activeMainTab,
    activeAdminTab,
    selectedUserId,
    users,
    currentActor,
    simulatedRoleId,
    setSimulatedRoleId,
    roles,
    showToast,
  } = useApp();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const selectedUser = selectedUserId
    ? users.find((u) => u.id === selectedUserId)
    : null;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Capitalize tab name for breadcrumbs
  const tabTitles: Record<string, string> = {
    overview: 'Overview',
    users: 'User Management',
    roles: 'Role Management',
    audit: 'Audit Log',
    settings: 'System Settings',
  };

  const breadcrumbSection =
    activeMainTab === 'administration'
      ? selectedUser
        ? `Administration > Users > ${selectedUser.name}`
        : `Administration > ${tabTitles[activeAdminTab] || 'Overview'}`
      : activeMainTab.charAt(0).toUpperCase() + activeMainTab.slice(1);

  return (
    <header className="bg-white border-b border-[#EBE7DF] sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="text-slate-400">ASR Groups</span>
          <span>›</span>
          <span className="text-slate-900 font-bold tracking-tight">
            {breadcrumbSection}
          </span>
        </div>
      </div>

      {/* Right: Notifications & Profile */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() =>
              showToast('Notifications', 'You have 5 pending approval workflows awaiting review.', 'info')
            }
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 relative transition-colors cursor-pointer"
            title="5 Pending Approvals"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] flex items-center justify-center font-mono">
              5
            </span>
          </button>
        </div>

        {/* User Profile / Perspective Switcher Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-[#831843] text-amber-100 flex items-center justify-center font-bold text-xs tracking-wider border border-amber-400/40">
              {currentActor.initials}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-slate-900 leading-none">
                {currentActor.name}
              </p>
              <p className="text-[10px] font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                <span>{roles.find((r) => r.id === simulatedRoleId)?.name || 'Super Admin'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </p>
            </div>
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="p-2.5 border-b border-slate-100 mb-2">
                <p className="text-xs font-bold text-slate-900">{currentActor.name}</p>
                <p className="text-[11px] text-slate-500">{currentActor.email}</p>
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <RoleBadge roleId={simulatedRoleId} size="xs" />
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: {currentActor.id}
                  </span>
                </div>
              </div>

              {/* Perspective Switcher in Dropdown */}
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 mb-2">
                <p className="text-[10px] font-bold uppercase text-slate-600 mb-1.5 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-amber-600" />
                  Active Role Perspective
                </p>
                <p className="text-[10px] text-slate-500 mb-2">
                  Switch active persona to preview role-based permissions:
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {roles.map((r) => {
                    const isSelected = simulatedRoleId === r.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => {
                          setSimulatedRoleId(r.id);
                          showToast(
                            'Perspective Changed',
                            `Now operating as ${r.name} (Role ${r.id}).`,
                            'info'
                          );
                          setIsProfileOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-amber-100/80 font-bold text-amber-900 border border-amber-300'
                            : 'hover:bg-slate-200/60 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: r.hexColor }}
                          />
                          <span>Role {r.id} · {r.name}</span>
                        </div>
                        {isSelected && <span className="text-[10px] text-amber-800">Active</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-1 space-y-1">
                <button
                  onClick={() => {
                    showToast('2FA Security', 'Two-Factor Authentication is currently active for your session.', 'success');
                    setIsProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                  <span>Security & 2FA Status</span>
                </button>
                <button
                  onClick={() => {
                    showToast('Logged Out', 'Your session has been securely ended.', 'info');
                    setIsProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-medium cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
