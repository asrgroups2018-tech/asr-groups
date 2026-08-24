'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { RoleId, ModuleAction, PermissionMatrixState } from '@/lib/types';
import { MODULES_DATA } from '@/lib/seedData';
import {
  Sliders,
  Search,
  Check,
  X,
  Lock,
  RotateCcw,
  Save,
  AlertTriangle,
  HelpCircle,
  Smartphone,
  Layers,
  ChevronDown,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { RoleBadge } from '@/components/common/RoleBadge';

export const PermissionMatrixTab: React.FC = () => {
  const { roles, permissionMatrix, updatePermissionMatrix, showToast } = useApp();

  const [draftMatrix, setDraftMatrix] = useState<PermissionMatrixState>(permissionMatrix);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [mobileSelectedRole, setMobileSelectedRole] = useState<RoleId>(1); // For mobile view

  const actionsList: { key: ModuleAction; label: string }[] = [
    { key: 'view', label: 'View' },
    { key: 'create', label: 'Create' },
    { key: 'edit', label: 'Edit' },
    { key: 'delete', label: 'Delete' },
    { key: 'approve', label: 'Approve' },
    { key: 'export', label: 'Export' },
  ];

  // Track modified cells
  const modifiedCells = useMemo(() => {
    const set = new Set<string>();
    MODULES_DATA.forEach((mod) => {
      actionsList.forEach((act) => {
        roles.forEach((role) => {
          const original = !!permissionMatrix[mod.id]?.[act.key]?.[role.id];
          const current = !!draftMatrix[mod.id]?.[act.key]?.[role.id];
          if (original !== current) {
            set.add(`${mod.id}-${act.key}-${role.id}`);
          }
        });
      });
    });
    return set;
  }, [draftMatrix, permissionMatrix, roles, actionsList]);

  const hasUnsavedChanges = modifiedCells.size > 0;

  // Toggle permission cell
  const handleToggleCell = (moduleId: string, action: ModuleAction, roleId: RoleId) => {
    // Role 0 (Super Admin) is immutable
    if (roleId === 0) {
      showToast('System Locked', 'Role 0 (Super Admin) permissions are immutable and cannot be restricted.', 'warning');
      return;
    }

    setDraftMatrix((prev) => {
      const modState = prev[moduleId] || {};
      const actState = modState[action] || {};
      const currentVal = !!actState[roleId];

      return {
        ...prev,
        [moduleId]: {
          ...modState,
          [action]: {
            ...actState,
            [roleId]: !currentVal,
          },
        },
      };
    });
  };

  const handleSave = () => {
    updatePermissionMatrix(draftMatrix);
  };

  const handleDiscard = () => {
    setDraftMatrix(permissionMatrix);
    showToast('Changes Reverted', 'Reset permission matrix to active state.', 'info');
  };

  // Filter modules
  const filteredModules = useMemo(() => {
    return MODULES_DATA.filter((mod) => {
      if (selectedCategory !== 'all' && mod.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          mod.name.toLowerCase().includes(q) ||
          mod.description.toLowerCase().includes(q) ||
          mod.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="space-y-6 pb-20">
      {/* Control Center Header */}
      <div className="bg-white rounded-2xl p-5 border border-[#EBE7DF] shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-800 border border-purple-200 flex items-center justify-center font-bold">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-serif">
                System Permission Matrix
              </h3>
              <p className="text-xs text-slate-500">
                Authoritative security control center for all 13 modules and 7 roles
              </p>
            </div>
          </div>

          {/* Quick stats / unsaved count */}
          <div className="flex items-center gap-2">
            {hasUnsavedChanges ? (
              <span className="px-3 py-1 text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 rounded-full animate-pulse">
                {modifiedCells.size} Unsaved Change(s)
              </span>
            ) : (
              <span className="px-3 py-1 text-xs font-semibold text-slate-600 bg-slate-100 rounded-full">
                Matrix Synced
              </span>
            )}
          </div>
        </div>

        {/* Search, Category Filter, and Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="Core">Core</option>
              <option value="Finance">Finance</option>
              <option value="Operations">Operations</option>
              <option value="System">System</option>
            </select>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-[11px] text-slate-600 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center font-bold">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <span>Allowed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center">
                <X className="w-3.5 h-3.5" />
              </div>
              <span>Denied</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-purple-100 text-purple-800 border border-purple-300 flex items-center justify-center">
                <Lock className="w-3 h-3" />
              </div>
              <span>System Locked (Role 0)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-amber-100 border-2 border-amber-500 text-amber-900 flex items-center justify-center font-bold">
                ★
              </div>
              <span>Unsaved Edit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Frozen-Pane Spreadsheet Matrix View */}
      <div className="hidden lg:block bg-white rounded-2xl border border-[#EBE7DF] shadow-[0_2px_8px_rgba(0,0,0,0.03)] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#FAF8F5] border-b-2 border-slate-200 sticky top-0 z-20">
              {/* Frozen Left Column: Module & Action */}
              <th className="px-5 py-3 font-bold uppercase tracking-wider text-[11px] text-slate-700 bg-[#FAF8F5] sticky left-0 z-30 min-w-[240px] border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                Module & Action
              </th>

              {/* Role Columns (0 to 6) */}
              {roles.map((role) => (
                <th
                  key={role.id}
                  className="px-3 py-3 text-center border-r border-slate-200 min-w-[120px]"
                  style={{
                    backgroundColor: `${role.hexColor}10`, // 10% tint
                  }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <RoleBadge roleId={role.id} size="xs" />
                    <span className="text-[10px] text-slate-500 font-mono">
                      {role.id === 0 ? 'Protected' : `Tier ${role.id}`}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredModules.map((mod) => {
              return (
                <React.Fragment key={mod.id}>
                  {/* Module Header Bar */}
                  <tr className="bg-slate-100/70 border-y border-slate-200 font-bold text-slate-800">
                    <td
                      colSpan={roles.length + 1}
                      className="px-5 py-2 text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-amber-800 uppercase font-mono text-[10px] tracking-wider px-1.5 py-0.2 bg-amber-100 rounded">
                          {mod.category}
                        </span>
                        <span>{mod.name}</span>
                        <span className="text-slate-500 font-normal text-[11px]">
                          — {mod.description}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Action Rows */}
                  {actionsList.map((act) => {
                    const isSupported = mod.actions.includes(act.key);

                    return (
                      <tr
                        key={`${mod.id}-${act.key}`}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Frozen Module Action Title */}
                        <td className="px-5 py-2 text-slate-700 bg-white sticky left-0 z-10 border-r border-slate-200 font-medium pl-8 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                          <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500 mr-2">
                            ↳
                          </span>
                          <span>{act.label}</span>
                        </td>

                        {/* Role Cells */}
                        {roles.map((role) => {
                          if (!isSupported) {
                            return (
                              <td
                                key={role.id}
                                className="px-3 py-2 text-center text-slate-300 font-mono text-[10px] border-r border-slate-100 bg-slate-50/40"
                              >
                                N/A
                              </td>
                            );
                          }

                          const isRole0 = role.id === 0;
                          const isAllowed = isRole0
                            ? true
                            : !!draftMatrix[mod.id]?.[act.key]?.[role.id];
                          const isCellModified = modifiedCells.has(
                            `${mod.id}-${act.key}-${role.id}`
                          );

                          return (
                            <td
                              key={role.id}
                              className={`px-3 py-2 text-center border-r border-slate-100 transition-all ${
                                isCellModified ? 'bg-amber-50' : ''
                              }`}
                            >
                              <button
                                type="button"
                                disabled={isRole0}
                                onClick={() => handleToggleCell(mod.id, act.key, role.id)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all ${
                                  isRole0
                                    ? 'bg-purple-100 text-purple-700 border border-purple-300 cursor-not-allowed'
                                    : isAllowed
                                    ? isCellModified
                                      ? 'bg-emerald-500 text-white shadow-md ring-2 ring-amber-400'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                    : isCellModified
                                    ? 'bg-rose-500 text-white shadow-md ring-2 ring-amber-400'
                                    : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                                }`}
                                title={
                                  isRole0
                                    ? 'System Protected: Always Allowed'
                                    : `${act.label} for ${role.name}: ${
                                        isAllowed ? 'Allowed (Click to Deny)' : 'Denied (Click to Allow)'
                                      }`
                                }
                              >
                                {isRole0 ? (
                                  <Lock className="w-3.5 h-3.5" />
                                ) : isAllowed ? (
                                  <Check className="w-4 h-4 stroke-[3]" />
                                ) : (
                                  <X className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Responsive Role-Picker Matrix Mode */}
      <div className="block lg:hidden space-y-4">
        <div className="bg-white rounded-2xl p-4 border border-[#EBE7DF] shadow-xs space-y-3">
          <label className="block text-xs font-bold text-slate-700">
            Select Role to Inspect / Configure:
          </label>
          <div className="flex items-center gap-2">
            <select
              value={mobileSelectedRole}
              onChange={(e) => setMobileSelectedRole(Number(e.target.value) as RoleId)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  Role {r.id} · {r.name} {r.isSystemProtected ? '(System Protected)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Modules Accordion List for Selected Mobile Role */}
        <div className="space-y-3">
          {filteredModules.map((mod) => {
            const isRole0 = mobileSelectedRole === 0;

            return (
              <div
                key={mod.id}
                className="bg-white rounded-2xl p-4 border border-[#EBE7DF] shadow-xs space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">{mod.name}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {mod.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{mod.description}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                  {actionsList.map((act) => {
                    const isSupported = mod.actions.includes(act.key);
                    if (!isSupported) return null;

                    const isAllowed = isRole0
                      ? true
                      : !!draftMatrix[mod.id]?.[act.key]?.[mobileSelectedRole];
                    const isCellModified = modifiedCells.has(
                      `${mod.id}-${act.key}-${mobileSelectedRole}`
                    );

                    return (
                      <button
                        key={act.key}
                        type="button"
                        disabled={isRole0}
                        onClick={() =>
                          handleToggleCell(mod.id, act.key, mobileSelectedRole)
                        }
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                          isRole0
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : isAllowed
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        } ${isCellModified ? 'ring-2 ring-amber-400' : ''}`}
                      >
                        <span>{act.label}</span>
                        {isRole0 ? (
                          <Lock className="w-3.5 h-3.5 text-purple-600" />
                        ) : isAllowed ? (
                          <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom Save / Discard Bar */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-4 left-4 right-4 md:left-72 md:right-8 z-40 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-amber-400/40 flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-300">
                Unsaved Permission Matrix Modifications
              </h4>
              <p className="text-xs text-slate-300">
                {modifiedCells.size} rule(s) pending commit. Changes will immediately affect authorization gating.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDiscard}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              Discard Changes
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] border border-[#C5A059]/40 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-4 h-4 text-amber-200" />
              <span>Save & Commit Matrix</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
