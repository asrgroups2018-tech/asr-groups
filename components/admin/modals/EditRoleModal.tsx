'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/store';
import { Role, RoleId, ModuleAction, PermissionMatrixState } from '@/lib/types';
import { MODULES_DATA } from '@/lib/seedData';
import {
  X,
  Sliders,
  Shield,
  Save,
  Check,
  CheckCircle2,
  Lock,
  Layers,
  LayoutGrid,
} from 'lucide-react';
import { RoleBadge } from '@/components/common/RoleBadge';

interface EditRoleModalProps {
  role: Role | null;
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  'General',
  'Loans & Underwriting',
  'Collections & Field',
  'Accounting & Cashbook',
  'Salary & Payroll',
  'Agents & Business',
  'Reports & Analytics',
  'Administration',
];

export const EditRoleModal: React.FC<EditRoleModalProps> = ({
  role,
  isOpen,
  onClose,
}) => {
  const { permissionMatrix, updatePermissionMatrix, updateRole, showToast } = useApp();

  const [activeTab, setActiveTab] = useState<'details' | 'pages'>('pages');
  const [roleName, setRoleName] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [accountType, setAccountType] = useState('STAFF');
  const [draftMatrix, setDraftMatrix] = useState<PermissionMatrixState>(permissionMatrix);

  useEffect(() => {
    if (role) {
      setRoleName(role.name);
      setRoleCode(role.code);
      setDescription(role.description || '');
      setDraftMatrix(permissionMatrix);
    }
  }, [role, permissionMatrix]);

  if (!isOpen || !role) return null;

  const isSuperAdmin = role.id === 0;

  const handleToggleModuleView = (moduleId: string) => {
    if (isSuperAdmin) {
      showToast('Protected', 'Role 0 (Super Admin) has full immutable view permissions.', 'warning');
      return;
    }

    const currentVal = !!draftMatrix[moduleId]?.['view']?.[role.id];
    setDraftMatrix((prev) => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        view: {
          ...prev[moduleId]?.view,
          [role.id]: !currentVal,
        },
      },
    }));
  };

  const handleToggleAction = (moduleId: string, action: ModuleAction) => {
    if (isSuperAdmin) {
      showToast('Protected', 'Role 0 (Super Admin) has full immutable action permissions.', 'warning');
      return;
    }

    const currentVal = !!draftMatrix[moduleId]?.[action]?.[role.id];
    setDraftMatrix((prev) => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [action]: {
          ...prev[moduleId]?.[action],
          [role.id]: !currentVal,
        },
      },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Update Role metadata
      await updateRole(role.id, {
        name: roleName,
        code: roleCode,
        description,
      });

      // 2. Update Module permissions matrix
      await updatePermissionMatrix(draftMatrix);

      showToast('Role & Pages Saved', `Updated permissions and page visibility for "${roleName}".`, 'success');
      onClose();
    } catch {
      // Handled in store
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-[#E6E1D6] shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1A0A13] text-white px-6 py-4 flex items-center justify-between border-b border-[#2C1420] shrink-0">
          <div className="flex items-center gap-3">
            <RoleBadge roleId={role.id} size="sm" isPrimary={role.id === 0} />
            <div>
              <h3 className="text-base font-bold text-[#EED8A1] font-serif">
                Configure Role: {role.name}
              </h3>
              <p className="text-xs text-[#C5A059]/80 font-mono">
                Code: {role.code} · ID: {role.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Sub-Tabs */}
        <div className="px-6 pt-3 bg-[#FAF8F5] border-b border-[#E6E1D6] flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('pages')}
            className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pages'
                ? 'border-[#701A35] text-[#701A35] bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Accessible Pages & Module Visibility</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'details'
                ? 'border-[#701A35] text-[#701A35] bg-white rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Role Information</span>
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            {/* TAB 1: Accessible Pages & Modules */}
            {activeTab === 'pages' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <span className="text-sm">💡</span>
                  <div>
                    <strong className="block">Role-Based Page Visibility:</strong>
                    <span>
                      Enable or disable which pages and modules appear in the navigation for users assigned to this role.
                      For example, for <strong>Customer</strong> role, enable only <em>Dashboard</em> and <em>Loans</em>, and disable <em>Administration</em> and <em>Salary</em>.
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 border border-[#E6E1D6] rounded-2xl overflow-hidden bg-white">
                  {MODULES_DATA.map((mod) => {
                    const isViewAllowed = isSuperAdmin ? true : !!draftMatrix[mod.id]?.['view']?.[role.id];

                    return (
                      <div
                        key={mod.id}
                        className={`p-4 transition-colors ${
                          isViewAllowed ? 'bg-white' : 'bg-slate-50/80 opacity-60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Module Info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs">{mod.name}</span>
                              <span className="text-[10px] font-mono bg-[#FAF8F5] px-1.5 py-0.2 rounded border border-[#E6E1D6] text-slate-500">
                                {mod.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-md">
                              {mod.description}
                            </p>
                          </div>

                          {/* View Toggle */}
                          <div className="flex items-center gap-3 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleModuleView(mod.id)}
                              className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                                isViewAllowed
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isViewAllowed ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              />
                              <span>{isViewAllowed ? 'Page Visible' : 'Page Hidden'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Granular Action Checkboxes if View is enabled */}
                        {isViewAllowed && (
                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-4 flex-wrap text-xs">
                            <span className="text-[11px] text-slate-400 font-semibold font-mono uppercase">
                              Actions:
                            </span>
                            {(['create', 'edit', 'delete', 'approve', 'export'] as ModuleAction[]).map(
                              (act) => {
                                const isActionAllowed = isSuperAdmin
                                  ? true
                                  : !!draftMatrix[mod.id]?.[act]?.[role.id];

                                return (
                                  <label
                                    key={act}
                                    className="flex items-center gap-1.5 text-slate-700 cursor-pointer select-none text-[11px]"
                                  >
                                    <input
                                      type="checkbox"
                                      disabled={isSuperAdmin}
                                      checked={isActionAllowed}
                                      onChange={() => handleToggleAction(mod.id, act)}
                                      className="w-3.5 h-3.5 rounded text-[#701A35] focus:ring-[#701A35] cursor-pointer"
                                    />
                                    <span className="capitalize">{act}</span>
                                  </label>
                                );
                              }
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: Role Details */}
            {activeTab === 'details' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Role Display Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#701A35]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    System Identifier Code
                  </label>
                  <input
                    type="text"
                    disabled={isSuperAdmin}
                    value={roleCode}
                    onChange={(e) => setRoleCode(e.target.value)}
                    className="w-full px-3.5 py-2 font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#701A35]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Functional Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#701A35]"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Account Type Tag
                    </label>
                    <input
                      type="text"
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#701A35]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Role Description & Operational Scope
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#701A35]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3.5 bg-[#FAF8F5] border-t border-[#E6E1D6] flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-500">
              Changes take effect immediately for assigned users.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] active:scale-98 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-amber-200" />
                <span>Save Role & Permissions</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
