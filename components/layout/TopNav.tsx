'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const {
    users,
    loans,
    customers,
    companies,
    currentActor,
    simulatedRoleId,
    setSimulatedRoleId,
    roles,
    showToast,
    isLoading,
  } = useApp();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

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

  // Compute breadcrumbs synchronously from Next.js pathname to eliminate any visual flash on refresh
  const getBreadcrumbs = () => {
    if (!pathname || pathname === '/' || pathname === '/dashboard') {
      return ['Dashboard'];
    }

    const segments = pathname.split('/').filter(Boolean);
    const first = segments[0]?.toLowerCase();

    if (first === 'administration') {
      const sub = segments[1]?.toLowerCase();
      if (!sub) return ['Administration', 'Overview'];
      if (sub === 'users') {
        const userId = segments[2];
        if (userId) {
          const user = users.find((u) => u.id.toLowerCase() === userId.toLowerCase());
          return ['Administration', 'Users', user ? user.name : userId.toUpperCase()];
        }
        return ['Administration', 'User Management'];
      }
      if (sub === 'roles') return ['Administration', 'Role Management'];
      if (sub === 'audit-log' || sub === 'audit') return ['Administration', 'Audit Log'];
      if (sub === 'settings') return ['Administration', 'System Settings'];
      return ['Administration'];
    }

    if (first === 'loans') {
      const loanId = segments[1];
      if (loanId) {
        const loan = loans.find(
          (l) => l.id.toLowerCase() === loanId.toLowerCase() || l.codeNo?.toLowerCase() === loanId.toLowerCase()
        );
        return ['Loans', loan ? `${loan.id} (${loan.customerName})` : loanId.toUpperCase()];
      }
      return ['Loans'];
    }

    if (first === 'customers') {
      const custId = segments[1];
      if (custId) {
        const cust = customers.find(
          (c) => c.id.toLowerCase() === custId.toLowerCase() || c.name.toLowerCase() === decodeURIComponent(custId).toLowerCase()
        );
        return ['Customers', cust ? cust.name : decodeURIComponent(custId)];
      }
      return ['Customers'];
    }

    if (first === 'companies') {
      const compId = segments[1];
      if (compId) {
        const comp = companies.find(
          (c) =>
            c.id.toLowerCase() === compId.toLowerCase() ||
            c.shortCode?.toLowerCase() === compId.toLowerCase() ||
            c.name?.toLowerCase() === decodeURIComponent(compId).toLowerCase()
        );
        return ['Companies', comp ? comp.name : decodeURIComponent(compId)];
      }
      return ['Companies'];
    }

    if (first === 'schedule') return ['Schedule'];
    if (first === 'reports') return ['Reports'];
    if (first === 'requests') return ['Requests & Approvals'];
    if (first === 'settings') return ['Settings'];
    if (first === 'historical-sheet') return ['Historical Sheet'];

    return [first.charAt(0).toUpperCase() + first.slice(1)];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="bg-white border-b border-[#EBE7DF] sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 relative">
      {/* Top Progress Loading Bar */}
      {isLoading && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#C5A059] overflow-hidden z-50">
          <div className="w-full h-full bg-[#701A35] animate-pulse" />
        </div>
      )}
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 flex-wrap">
          <span className="text-slate-400">ASR Groups</span>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <span className="text-slate-300">›</span>
              <span
                className={
                  idx === breadcrumbs.length - 1
                    ? 'text-slate-900 font-bold tracking-tight'
                    : 'text-slate-500 font-medium'
                }
              >
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Right: Notifications & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() =>
              showToast('Notifications', 'No new unread notifications.', 'info')
            }
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 relative transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
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
