'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/lib/store';
import { RoleId, UserStatus } from '@/lib/types';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CreatedCredentials {
  name: string;
  login: string;
  loginLabel: string;
  password: string;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose }) => {
  const { roles, systemSettings, createUser, showToast } = useApp();
  const defaultRoleId = useMemo(() => roles.find((role) => !role.isSystemProtected && role.id !== 6)?.id ?? roles[0]?.id ?? 0, [roles]);
  const companyDomain = systemSettings?.companyProfile?.supportEmail?.split('@')[1]?.trim().toLowerCase() || 'asrgroups.in';
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [emailEdited, setEmailEdited] = useState(false);
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [lastGeneratedIdentity, setLastGeneratedIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<UserStatus>('Active');
  const [roleId, setRoleId] = useState<RoleId>(defaultRoleId);
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const selectedRole = roles.find((role) => role.id === roleId);
  const usesEmailLogin = roleId === 0 || roleId === 1;

  const resetForm = () => {
    setName(''); setUsername(''); setEmail(''); setEmailEdited(false); setUsernameEdited(false); setLastGeneratedIdentity(''); setPassword(''); setStatus('Active'); setRoleId(defaultRoleId); setCredentials(null); setIsSaving(false);
  };
  const close = () => { resetForm(); onClose(); };
  const handleNameChange = (value: string) => {
    const identity = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
    const generatedIdentity = identity ? `${identity}@${companyDomain}` : '';
    setName(value);
    if (!emailEdited || email === lastGeneratedIdentity) setEmail(generatedIdentity);
    if (!usernameEdited || username === lastGeneratedIdentity) setUsername(generatedIdentity);
    setLastGeneratedIdentity(generatedIdentity);
  };
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) { showToast('Complete required fields', 'Name, email, and password are required.', 'warning'); return; }
    if (!usesEmailLogin && !username.trim()) { showToast('Username required', 'Add the username this user will use to sign in.', 'warning'); return; }
    if (password.trim().length < 8) { showToast('Password too short', 'Use at least 8 characters.', 'warning'); return; }
    setIsSaving(true);
    const initials = name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
    const created = await createUser({
      name: name.trim(),
      username: username.trim().toLowerCase() || undefined,
      email: email.trim().toLowerCase(),
      tempPassword: password,
      loginMethod: usesEmailLogin ? 'email' : 'username',
      initials,
      department: '',
      designation: '',
      assignedRoleIds: [roleId],
      primaryRoleId: roleId,
      status,
      joinedDate: new Date().toISOString().slice(0, 10),
      twoFactorEnabled: usesEmailLogin,
      isCustomer: roleId === 6,
    });
    setIsSaving(false);
    if (created) setCredentials({ name: created.name, login: usesEmailLogin ? created.email : created.username || username, loginLabel: usesEmailLogin ? 'Login email' : 'Username', password });
  };
  const copyCredentials = async () => {
    if (!credentials) return;
    await navigator.clipboard.writeText(`ASR Groups login\nName: ${credentials.name}\n${credentials.loginLabel}: ${credentials.login}\nPassword: ${credentials.password}`);
    showToast('Credentials copied', 'The login details were copied to the clipboard.', 'info');
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A0A13]/65 p-3 backdrop-blur-sm sm:p-6"><div className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#E6E1D6] bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]">
    <header className="flex items-center justify-between border-b border-[#2C1420] bg-[#1A0A13] px-5 py-4 text-white sm:px-6"><div><h2 className="text-base font-bold text-[#EED8A1]">Create user</h2><p className="mt-0.5 text-xs text-[#C5A059]">Add the login details and assign a starting role.</p></div><button type="button" onClick={close} aria-label="Close" className="text-lg text-slate-300 hover:text-white">×</button></header>
    {credentials ? <div className="space-y-5 overflow-y-auto p-5 sm:p-7"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><h3 className="text-base font-bold text-emerald-900">User created</h3><p className="mt-1 text-xs text-emerald-800">Share these credentials securely with {credentials.name}.</p></div><div className="grid gap-3 rounded-2xl border border-slate-200 bg-[#FBF8F3] p-4 sm:grid-cols-3"><Credential label="Name" value={credentials.name} /><Credential label={credentials.loginLabel} value={credentials.login} /><Credential label="Temporary password" value={credentials.password} /></div><div className="flex justify-end gap-2"><button type="button" onClick={copyCredentials} className="rounded-xl border border-[#C5A059] px-4 py-2.5 text-xs font-bold text-[#701A35]">Copy credentials</button><button type="button" onClick={close} className="rounded-xl bg-[#701A35] px-4 py-2.5 text-xs font-bold text-white">Done</button></div></div> : <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col"><div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6"><section><h3 className="text-sm font-bold text-slate-900">Basic details</h3><p className="mt-1 text-[11px] text-slate-500">Only the fields needed to create a working account are shown.</p><div className="mt-4"><Field label="Full name" required value={name} onChange={handleNameChange} placeholder="e.g. Ramesh Krishnan" /><div className="mt-4"><Field label="Email address" required type="email" value={email} onChange={(value) => { setEmailEdited(true); setEmail(value.toLowerCase()); }} placeholder={`name@${companyDomain}`} /></div></div></section><section className="rounded-2xl border border-[#E1C98D] bg-[#FFFBF2] p-4"><h3 className="text-sm font-bold text-slate-900">Sign-in details</h3><p className="mt-1 text-[11px] text-slate-500">Choose a starting role and set the login details.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><label className="text-xs font-semibold text-slate-700">Starting role<select value={roleId} onChange={(event) => setRoleId(Number(event.target.value) as RoleId)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold outline-none focus:border-[#C5A059]">{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label><p className="mt-1 text-[10px] text-slate-500">{selectedRole?.description || 'Access can be adjusted after creation.'}</p></div><Field label="Username" value={username} onChange={(value) => { setUsernameEdited(true); setUsername(value.toLowerCase().replace(/[^a-z0-9.@_+-]/g, '')); }} placeholder={`name@${companyDomain}`} /><Field label="Password" required type="text" value={password} onChange={setPassword} placeholder="Enter at least 8 characters" /></div></section><section><label className="text-xs font-semibold text-slate-700">Account status<select value={status} onChange={(event) => setStatus(event.target.value as UserStatus)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-[#C5A059] focus:bg-white"><option value="Active">Active</option><option value="Pending">Pending review</option></select></label></section></div><footer className="flex justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3 sm:px-6"><button type="button" onClick={close} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600">Cancel</button><button type="submit" disabled={isSaving} className="rounded-xl bg-[#701A35] px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? 'Saving…' : 'Create user'}</button></footer></form>}
  </div></div>;
};

function Field({ label, value, onChange, type = 'text', required = false, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return <label className="block text-xs font-semibold text-slate-700">{label}{required && <span className="text-rose-500"> *</span>}<input required={required} type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#C5A059]" /></label>;
}

function Credential({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-3"><span className="block text-[10px] text-slate-400">{label}</span><strong className="mt-1 block break-all font-mono text-xs text-slate-900">{value}</strong></div>;
}
