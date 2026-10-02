'use client';

import React from 'react';
import { ShieldCheck, Users } from 'lucide-react';
import { useApp } from '@/lib/store';
import { UserManagementTab } from './UserManagementTab';
import { UserDetailsView } from './UserDetailsView';

/** Administration is one workspace: people first, with access managed in context. */
export const AdminSection: React.FC = () => {
  const { selectedUserId, users, isLoading } = useApp();

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#F7F5F0]">
      <div className="border-b border-[#E8E3D9] bg-[#F7F5F0] px-4 pb-5 pt-6 sm:px-8">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A7A3A]">
              <Users className="h-3.5 w-3.5" />
              People & access
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#25151C]">User management</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Create accounts, assign roles, and control page access from one clear workspace.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 sm:self-auto">
            <ShieldCheck className="h-3.5 w-3.5" />
            Access controls ready
          </div>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-[1400px] flex-1 min-h-0 p-4 sm:p-8">
        {isLoading && (!users || users.length <= 1) ? (
          <div className="w-full space-y-5 animate-pulse">
            <div className="h-20 w-full rounded-2xl bg-slate-200" />
            <div className="h-96 w-full rounded-2xl bg-slate-200" />
          </div>
        ) : selectedUserId ? (
          <div className="w-full">
            <UserDetailsView key={selectedUserId} />
          </div>
        ) : (
          <div className="w-full">
            <UserManagementTab />
          </div>
        )}
      </main>
    </div>
  );
};
