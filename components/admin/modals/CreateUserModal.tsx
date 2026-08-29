'use client';

import React, { useState, useEffect } from 'react';
import { RoleId, UserStatus, User } from '@/lib/types';
import { useApp } from '@/lib/store';
import {
  X,
  UserPlus,
  Shield,
  Key,
  Mail,
  User as UserIcon,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
} from 'lucide-react';
import { RoleBadge } from '@/components/common/RoleBadge';
import { ElevatedAccessModal } from './ElevatedAccessModal';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose }) => {
  const { roles, createUser, showToast } = useApp();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Operations & Finance');
  const [designation, setDesignation] = useState('Operations Officer');
  const [status, setStatus] = useState<UserStatus>('Active');
  const [address, setAddress] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<RoleId[]>([5]); // default Employee
  const [primaryRoleId, setPrimaryRoleId] = useState<RoleId>(5);

  // Success summary modal
  const [createdUserCredentials, setCreatedUserCredentials] = useState<{
    name: string;
    username?: string;
    email: string;
    password?: string;
    isAdmin: boolean;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Elevated modal state
  const [elevatedTargetRole, setElevatedTargetRole] = useState<RoleId | null>(null);

  // Auto-generate username and password when name changes
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'ASR@';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  useEffect(() => {
    if (name.trim()) {
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '.');
      setUsername(slug);
      if (!password) {
        setPassword(generatePassword());
      }
    }
  }, [name]);

  if (!isOpen) return null;

  const isAdminRole = selectedRoleIds.includes(0) || selectedRoleIds.includes(1);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (isAdminRole && !email.trim()) {
      showToast('Validation Error', 'Admin accounts require an official Email address.', 'warning');
      return;
    }

    const names = name.trim().split(' ');
    const initials = names.map((n) => n[0]).join('').slice(0, 2).toUpperCase();

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const joinedDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const effectiveEmail = email.trim() || `${username || 'user'}@asrgroups.in`;
    const finalPassword = password || generatePassword();

    const created = await createUser({
      name: name.trim(),
      username: isAdminRole ? undefined : username.trim(),
      email: effectiveEmail,
      tempPassword: isAdminRole ? undefined : finalPassword,
      loginMethod: isAdminRole ? 'email' : 'username',
      phone: phone.trim() || '+91 98000 00000',
      initials,
      assignedRoleIds: selectedRoleIds,
      primaryRoleId: selectedRoleIds.includes(primaryRoleId) ? primaryRoleId : selectedRoleIds[0],
      status,
      department,
      designation,
      joinedDate,
      address,
      twoFactorEnabled: isAdminRole,
      isCustomer: selectedRoleIds.length === 1 && selectedRoleIds[0] === 6,
    });

    if (created) {
      setCreatedUserCredentials({
        name: created.name,
        username: created.username,
        email: created.email,
        password: finalPassword,
        isAdmin: isAdminRole,
      });
    }
  };

  const copyCredentials = () => {
    if (!createdUserCredentials) return;
    const text = createdUserCredentials.isAdmin
      ? `ASR Groups Admin Login Credentials:\nName: ${createdUserCredentials.name}\nLogin Email: ${createdUserCredentials.email}\nPortal URL: ${window.location.origin}`
      : `ASR Groups User Login Credentials:\nName: ${createdUserCredentials.name}\nUsername: ${createdUserCredentials.username}\nPassword: ${createdUserCredentials.password}\nPortal URL: ${window.location.origin}`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    showToast('Credentials Copied', 'Login details copied to clipboard.', 'info');
    setTimeout(() => setIsCopied(false), 2500);
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
                <p className="text-xs text-[#C5A059]/80">Internal Staff, Agent, or Customer Registration</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {createdUserCredentials ? (
            /* Created Summary Modal View */
            <div className="p-6 space-y-5 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center space-y-1.5">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold">User Account Created Successfully</h4>
                <p className="text-xs text-emerald-700">
                  {createdUserCredentials.isAdmin
                    ? 'Admin account registered. Login is authorized via official Email.'
                    : 'Provide the Username and Password below to this person for logging in.'}
                </p>
              </div>

              {/* Credential Card */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E6E1D6] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800 font-mono">
                    {createdUserCredentials.isAdmin ? 'ADMIN LOGIN CREDENTIALS' : 'USER LOGIN CREDENTIALS'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white font-mono">
                    {createdUserCredentials.isAdmin ? 'EMAIL LOGIN' : 'USERNAME LOGIN'}
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-slate-500 font-sans">Full Name:</span>
                    <strong className="text-slate-900">{createdUserCredentials.name}</strong>
                  </div>

                  {createdUserCredentials.isAdmin ? (
                    <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200">
                      <span className="text-slate-500 font-sans">Admin Login Email:</span>
                      <strong className="text-[#701A35]">{createdUserCredentials.email}</strong>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200">
                        <span className="text-slate-500 font-sans">Login Username:</span>
                        <strong className="text-[#701A35] text-sm">@{createdUserCredentials.username}</strong>
                      </div>
                      <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200">
                        <span className="text-slate-500 font-sans">Provided Password:</span>
                        <strong className="text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-mono tracking-wider">
                          {createdUserCredentials.password}
                        </strong>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={copyCredentials}
                  className="px-4 py-2 text-xs font-bold text-[#701A35] bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#C5A059]/60 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Copied to Clipboard' : 'Copy Credentials'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] rounded-xl cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Creation Form */
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Role-Based Authentication Policy Notice */}
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  isAdminRole
                    ? 'bg-purple-50/80 border-purple-200 text-purple-900'
                    : 'bg-amber-50/80 border-amber-200 text-amber-900'
                }`}
              >
                {isAdminRole ? (
                  <Mail className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                ) : (
                  <Key className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                )}
                <div>
                  <strong className="block">
                    {isAdminRole
                      ? 'Admin Authentication: Email & Admin Password'
                      : 'Standard Authentication: Username & Password Provided'}
                  </strong>
                  <span className="text-[11px] opacity-90">
                    {isAdminRole
                      ? 'Administrators log in using their official company Email address.'
                      : 'All other persons (Staff, Accountant, Agent, Customer) log in using their assigned Username and Password.'}
                  </span>
                </div>
              </div>

              {/* Name & Username/Email */}
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
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#701A35]"
                  />
                </div>

                {isAdminRole ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Admin Email Address (Login ID) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. ramesh.admin@asrgroups.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#701A35]"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Assigned Login Username <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-mono text-xs">@</span>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ramesh.krishnan"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                        className="w-full pl-7 pr-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#701A35]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Password for Non-Admins + Contact Info */}
              {!isAdminRole && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Provided Password <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setPassword(generatePassword())}
                        className="text-[10px] text-[#701A35] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>Regenerate</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#701A35]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Contact Email (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. ramesh@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#701A35]"
                    />
                  </div>
                </div>
              )}

              {/* Phone & Status */}
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
                    className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#701A35]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Account Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as UserStatus)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#701A35] cursor-pointer"
                  >
                    <option value="Active">Active (Ready for access)</option>
                    <option value="Pending">Pending (KYC pending)</option>
                    <option value="Suspended">Suspended (Locked)</option>
                  </select>
                </div>
              </div>

              {/* Department & Designation */}
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
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#701A35]"
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
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#701A35]"
                  />
                </div>
              </div>

              {/* Role Assignment */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#701A35]" />
                    <span>Assign Roles</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {selectedRoleIds.length} role(s) selected
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1.5 bg-slate-50/70 rounded-xl border border-slate-200">
                  {roles.map((role) => {
                    const isChecked = selectedRoleIds.includes(role.id);
                    const isPrimary = primaryRoleId === role.id;

                    return (
                      <div
                        key={role.id}
                        onClick={() => toggleRole(role.id)}
                        className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-white border-[#C5A059]/80 shadow-2xs'
                            : 'bg-white/50 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-3.5 h-3.5 rounded text-[#701A35] focus:ring-[#701A35] cursor-pointer"
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
                                ? 'bg-[#701A35] text-white font-bold'
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
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] active:scale-98 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-amber-200" />
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          )}
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
