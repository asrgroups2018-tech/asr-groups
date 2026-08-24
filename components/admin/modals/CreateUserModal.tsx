'use client';

import React, { useState } from 'react';
import { RoleId, UserStatus } from '@/lib/types';
import { useApp } from '@/lib/store';
import { X, UserPlus, Shield } from 'lucide-react';
import { RoleBadge } from '@/components/common/RoleBadge';
import { ElevatedAccessModal } from './ElevatedAccessModal';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose }) => {
  const { roles, createUser } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Operations & Finance');
  const [designation, setDesignation] = useState('Operations Officer');
  const [status, setStatus] = useState<UserStatus>('Active');
  const [address, setAddress] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<RoleId[]>([5]); // default Employee
  const [primaryRoleId, setPrimaryRoleId] = useState<RoleId>(5);

  // Elevated modal state
  const [elevatedTargetRole, setElevatedTargetRole] = useState<RoleId | null>(null);

  if (!isOpen) return null;

  const toggleRole = (roleId: RoleId) => {
    if (selectedRoleIds.includes(roleId)) {
      if (selectedRoleIds.length === 1) return; // Must hold at least one role
      const newRoles = selectedRoleIds.filter((id) => id !== roleId);
      setSelectedRoleIds(newRoles);
      if (primaryRoleId === roleId) {
        setPrimaryRoleId(newRoles[0]);
      }
    } else {
      if (roleId === 0 || roleId === 1) {
        setElevatedTargetRole(roleId);
      } else {
        setSelectedRoleIds([...selectedRoleIds, roleId]);
      }
    }
  };

  const handleConfirmElevated = () => {
    if (elevatedTargetRole !== null) {
      setSelectedRoleIds([...selectedRoleIds, elevatedTargetRole]);
      setElevatedTargetRole(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const names = name.trim().split(' ');
    const initials = names.map((n) => n[0]).join('').slice(0, 2).toUpperCase();

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const joinedDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    createUser({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || '+91 98000 00000',
      initials,
      assignedRoleIds: selectedRoleIds,
      primaryRoleId: selectedRoleIds.includes(primaryRoleId) ? primaryRoleId : selectedRoleIds[0],
      status,
      department,
      designation,
      joinedDate,
      address,
      twoFactorEnabled: selectedRoleIds.includes(0) || selectedRoleIds.includes(1),
      isCustomer: selectedRoleIds.length === 1 && selectedRoleIds[0] === 6,
    });

    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full my-8 overflow-hidden">
          {/* Header */}
          <div className="bg-[#1A0A13] text-white px-6 py-4 flex items-center justify-between border-b border-[#2C1420]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] text-[#701A35] border border-[#E6E1D6] flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#EED8A1] font-serif">Create New User Account</h3>
                <p className="text-xs text-[#C5A059]/80">Internal Staff or Borrower Account Registration</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Krishnan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh.k@asrgroups.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+91 98400 12345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Initial Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as UserStatus)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Active">Active (Ready for access)</option>
                  <option value="Pending">Pending (Awaiting KYC verification)</option>
                  <option value="Suspended">Suspended (Locked)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Department
                </label>
                <input
                  type="text"
                  placeholder="e.g. Credit Underwriting"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Designation
                </label>
                <input
                  type="text"
                  placeholder="e.g. Field Officer"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Address / Location
              </label>
              <input
                type="text"
                placeholder="Branch address or residential address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Multi-role assignment */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  Assign Roles (Multi-Role Support)
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  {selectedRoleIds.length} role(s) selected
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Check all roles that apply. Effective access will be the union of all assigned roles.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-50/70 rounded-xl border border-slate-200">
                {roles.map((role) => {
                  const isChecked = selectedRoleIds.includes(role.id);
                  const isPrimary = primaryRoleId === role.id;

                  return (
                    <div
                      key={role.id}
                      onClick={() => toggleRole(role.id)}
                      className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-white border-emerald-300 shadow-xs'
                          : 'bg-white/50 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <RoleBadge roleId={role.id} size="xs" />
                      </div>
                      {isChecked && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrimaryRoleId(role.id);
                          }}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors ${
                            isPrimary
                              ? 'bg-amber-100 text-amber-800 font-bold'
                              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {isPrimary ? '★ Primary' : 'Set Primary'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] active:scale-98 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5 text-amber-200" />
                <span>Create Account</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <ElevatedAccessModal
        isOpen={elevatedTargetRole !== null}
        onClose={() => setElevatedTargetRole(null)}
        onConfirm={handleConfirmElevated}
        userName={name || 'New User'}
        elevatedRoleId={elevatedTargetRole ?? 1}
      />
    </>
  );
};
