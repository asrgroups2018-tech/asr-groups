'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { AuditLogEntry, AuditActionType } from '@/lib/types';
import {
  History,
  Lock,
  Search,
  Filter,
  FileSpreadsheet,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { RoleBadge } from '@/components/common/RoleBadge';
import { DataTable, ColumnDef } from '@/components/common/DataTable';

export const AuditLogTab: React.FC = () => {
  const { auditLogs, users } = useApp();

  const [selectedActionType, setSelectedActionType] = useState<string>('all');
  const [selectedActor, setSelectedActor] = useState<string>('all');
  const [onlySensitive, setOnlySensitive] = useState<boolean>(false);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (selectedActionType !== 'all' && log.action !== selectedActionType) {
        return false;
      }
      if (selectedActor !== 'all' && log.actorName !== selectedActor) {
        return false;
      }
      if (onlySensitive && !log.isSensitive) {
        return false;
      }
      return true;
    });
  }, [auditLogs, selectedActionType, selectedActor, onlySensitive]);

  // Unique Actors & Action Types
  const uniqueActors = useMemo(() => {
    return Array.from(new Set(auditLogs.map((l) => l.actorName))).sort();
  }, [auditLogs]);

  const uniqueActions = useMemo(() => {
    return Array.from(new Set(auditLogs.map((l) => l.action))).sort();
  }, [auditLogs]);

  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      key: 'timestamp',
      header: 'Time',
      sortable: true,
      accessor: (l) => l.timestamp,
      render: (l) => (
        <div className="font-mono text-[11px] text-slate-700">
          <p className="font-bold">{l.timestamp.slice(0, 10)}</p>
          <p className="text-slate-500">{l.timestamp.slice(11)}</p>
        </div>
      ),
      exportValue: (l) => l.timestamp,
    },
    {
      key: 'actor',
      header: 'Actor',
      sortable: true,
      accessor: (l) => l.actorName,
      render: (l) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900 text-xs">{l.actorName}</span>
            <RoleBadge roleId={l.actorRoleId} size="xs" />
          </div>
          <p className="text-[10px] font-mono text-slate-400">{l.actorId}</p>
        </div>
      ),
      exportValue: (l) => `${l.actorName} (Role ${l.actorRoleId})`,
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      accessor: (l) => l.action,
      render: (l) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-bold text-xs ${
                l.isSensitive ? 'text-amber-800' : 'text-slate-800'
              }`}
            >
              {l.action}
            </span>
            {l.isSensitive && (
              <span className="text-[9px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded border border-amber-300">
                SENSITIVE
              </span>
            )}
          </div>
        </div>
      ),
      exportValue: (l) => (l.isSensitive ? `[SENSITIVE] ${l.action}` : l.action),
    },
    {
      key: 'target',
      header: 'Target',
      sortable: true,
      accessor: (l) => l.target,
      render: (l) => (
        <span className="font-medium text-slate-800 text-xs truncate max-w-xs block">
          {l.target}
        </span>
      ),
    },
    {
      key: 'diff',
      header: 'Details',
      sortable: false,
      render: (l) => (
        <div className="text-[11px] space-y-1 max-w-sm">
          {l.beforeVal && (
            <div className="flex items-center gap-1.5 text-slate-500 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              <span className="text-slate-400 font-bold text-[10px]">BEFORE:</span>
              <span className="truncate">{l.beforeVal}</span>
            </div>
          )}
          {l.afterVal && (
            <div className="flex items-center gap-1.5 text-emerald-800 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <span className="text-emerald-600 font-bold text-[10px]">AFTER:</span>
              <span className="truncate">{l.afterVal}</span>
            </div>
          )}
        </div>
      ),
      exportValue: (l) =>
        `Before: ${l.beforeVal || '-'} -> After: ${l.afterVal || '-'}`,
    },
    {
      key: 'client',
      header: 'IP / Device Info',
      sortable: false,
      render: (l) => (
        <div className="font-mono text-[11px] text-slate-600 space-y-0.5">
          <p className="font-semibold text-slate-800">{l.ipAddress}</p>
          <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{l.device}</p>
        </div>
      ),
      exportValue: (l) => `${l.ipAddress} (${l.device})`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-[#EBE7DF] shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E6E1D6] flex items-center justify-center text-[#701A35]">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 font-serif">
                  System Audit Ledger
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  <Lock className="w-3 h-3 text-[#C5A059]" />
                  READ ONLY · IMMUTABLE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Permanent chronological record of user role updates, permission changes, and security events
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-slate-600">
            <span>Total Logged Events:</span>
            <strong className="text-slate-900">{auditLogs.length}</strong>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {/* Action Type Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedActionType}
                onChange={(e) => setSelectedActionType(e.target.value)}
                className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer text-xs"
              >
                <option value="all">All Action Types</option>
                {uniqueActions.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>

            {/* Actor Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <span className="text-slate-400 font-bold">@</span>
              <select
                value={selectedActor}
                onChange={(e) => setSelectedActor(e.target.value)}
                className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer text-xs"
              >
                <option value="all">All Actors</option>
                {uniqueActors.map((actor) => (
                  <option key={actor} value={actor}>
                    {actor}
                  </option>
                ))}
              </select>
            </div>

            {/* Sensitive Filter Toggle */}
            <button
              onClick={() => setOnlySensitive(!onlySensitive)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                onlySensitive
                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Sensitive Events Only</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Audit Log Table */}
      <DataTable
        data={filteredLogs}
        columns={columns}
        keyExtractor={(l) => l.id}
        title="ASR Groups Audit Log"
        exportFileName="asr_audit_trail"
        searchPlaceholder="Search audit events by target, actor, or diff values..."
        pageSizeDefault={20}
      />
    </div>
  );
};
