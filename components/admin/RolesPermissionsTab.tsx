'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { Role } from '@/lib/types';
import {
  Shield,
  ShieldPlus,
  Lock,
  Users,
  ChevronDown,
  ChevronUp,
  Sliders,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { RoleBadge } from '@/components/common/RoleBadge';
import { CreateRoleModal } from './modals/CreateRoleModal';

export const RolesPermissionsTab: React.FC = () => {
  const { roles, users, setActiveAdminTab, showToast } = useApp();
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [expandedRoleId, setExpandedRoleId] = useState<number | null>(null);

  const handleToggleExpand = (roleId: number) => {
    setExpandedRoleId(expandedRoleId === roleId ? null : roleId);
  };

  const handleInspectMatrix = (role: Role) => {
    setActiveAdminTab('matrix');
    showToast('Permission Matrix', `Editing permissions for ${role.name} in matrix view.`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header with Title & + Create Custom Role */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E6E1D6] shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div>
          <h2 className="text-base font-bold text-slate-900 font-serif">
            Role Hierarchy & Access Tiers
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict 7-tier access control system. Lower number indicates higher authorization authority.
          </p>
        </div>

        <button
          onClick={() => setIsCreateRoleModalOpen(true)}
          className="px-4 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] active:scale-98 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
        >
          <ShieldPlus className="w-4 h-4 text-amber-200" />
          <span>+ Create Custom Role</span>
        </button>
      </div>

      {/* Grid of Role Cards (0 to 6) — Monochromatic, Neutral & High Craft */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {roles.map((role) => {
          const userCount = users.filter((u) => u.assignedRoleIds.includes(role.id)).length;
          const isExpanded = expandedRoleId === role.id;

          return (
            <div
              key={role.id}
              className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)] ${
                role.isSystemProtected
                  ? 'border-[#C5A059]/50 hover:border-[#C5A059]'
                  : 'border-[#E6E1D6] hover:border-slate-300'
              }`}
            >
              <div className="p-5 space-y-4">
                {/* Header Row: Role Badge & Protection Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <RoleBadge roleId={role.id} size="md" isPrimary={role.id === 0} />
                  </div>
                  {role.isSystemProtected ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-800 bg-[#FAF8F5] px-2.5 py-0.5 rounded-full border border-[#E6E1D6]">
                      <Lock className="w-3 h-3 text-[#C5A059]" />
                      Protected Tier
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-500 font-bold bg-[#FAF8F5] px-2 py-0.5 rounded-lg border border-[#E6E1D6]">
                      Tier {role.id}
                    </span>
                  )}
                </div>

                {/* Role Description */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{role.name}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {role.description}
                  </p>
                </div>

                {/* User Count */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#E6E1D6]/70 text-xs">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">Assigned Users:</span>
                    <strong className="text-slate-900 font-mono tabular-nums">
                      {userCount}
                    </strong>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Code: {role.code}
                  </span>
                </div>

                {/* Expandable Module Permissions Snapshot */}
                {isExpanded && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs animate-in fade-in">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 font-mono">
                      Module Access Preview
                    </p>
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {[
                        { name: 'Dashboard', access: 'Full View & Summary' },
                        { name: 'Loans & Underwriting', access: role.id <= 2 ? 'Approval Authority' : 'Read Only' },
                        { name: 'Customer Directory', access: 'View & KYC Manage' },
                        { name: 'Field Collections', access: role.id <= 4 ? 'Active Collection' : 'None' },
                        { name: 'Financial Reports', access: role.id <= 3 ? 'Export Access' : 'None' },
                        { name: 'Administration', access: role.id <= 1 ? 'Full Governance' : 'Restricted' },
                      ].map((perm, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 border border-slate-100"
                        >
                          <span className="text-slate-700 font-medium">{perm.name}</span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {perm.access}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="px-5 py-3 bg-[#FAF8F5] border-t border-[#E6E1D6]/60 flex items-center justify-between text-xs">
                <button
                  onClick={() => handleToggleExpand(role.id)}
                  className="text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span>{isExpanded ? 'Hide Privileges' : 'Inspect Privileges'}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  onClick={() => handleInspectMatrix(role)}
                  className="text-[#701A35] hover:text-[#5C142B] font-bold flex items-center gap-1"
                >
                  <Sliders className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Configure Matrix</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      <CreateRoleModal
        isOpen={isCreateRoleModalOpen}
        onClose={() => setIsCreateRoleModalOpen(false)}
      />
    </div>
  );
};
