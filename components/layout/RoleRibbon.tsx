'use client';

import React from 'react';
import { useApp } from '@/lib/store';
import { ShieldCheck, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';
import { RoleBadge } from '@/components/common/RoleBadge';

export const RoleRibbon: React.FC = () => {
  const { simulatedRoleId, currentActor, setSimulatedRoleId, roles } = useApp();

  return (
    <div className="bg-[#0B1528] text-slate-200 border-b border-[#1E293B] px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 font-medium">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400">
            <ShieldCheck className="w-3.5 h-3.5" />
          </span>
          <span className="font-semibold text-white tracking-wide">
            Administration · Super Admin only · Role 0
          </span>
        </div>

        <div className="h-3.5 w-px bg-slate-700 hidden sm:block" />

        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold tracking-wider animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            ADMIN MODE
          </span>
          <span className="text-slate-400 text-[11px] hidden md:inline">
            Logged in as <strong className="text-white">{currentActor.name}</strong>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="text-[11px] text-slate-400 hidden lg:inline">
          Simulate Role:
        </span>
        <select
          value={simulatedRoleId}
          onChange={(e) => setSimulatedRoleId(Number(e.target.value) as any)}
          className="bg-[#162238] border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 font-medium focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              Role {r.id} · {r.name}
            </option>
          ))}
        </select>

        <RoleBadge roleId={simulatedRoleId} size="xs" />
      </div>
    </div>
  );
};
