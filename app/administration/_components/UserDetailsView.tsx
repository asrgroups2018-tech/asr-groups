'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Activity, ArrowLeft, Check, Grid2X2, Lock, ShieldCheck, UserRound } from 'lucide-react';
import { useApp } from '@/lib/store';
import { MODULES_DATA } from '@/lib/seedData';
import { ModuleAction, PermissionMatrixState, Role, RoleId, User, UserStatus } from '@/lib/types';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { StatusPill } from '@/components/ui/StatusPill';
import { DeleteUserModal } from './modals/DeleteUserModal';

type DetailSection = 'profile' | 'access' | 'activity';
const actionLabels: Record<ModuleAction, string> = { view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete', approve: 'Approve', export: 'Export' };
const cloneMatrix = (matrix: PermissionMatrixState) => JSON.parse(JSON.stringify(matrix)) as PermissionMatrixState;
const displayDate = (value?: string) => value ? value.replace('T', ' ') : '—';

export const UserDetailsView: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { users, roles, permissionMatrix, auditLogs, selectedUserId, setSelectedUserId, updateUserRoles, updateUserProfile, updatePermissionMatrix, showToast } = useApp();
  const user = useMemo(() => {
    const selected = String(selectedUserId || '').trim().toLowerCase();
    return users.find((item) => item.id.toLowerCase() === selected || item.email.toLowerCase() === selected);
  }, [selectedUserId, users]);
  const effectiveLoginMethod = user?.loginMethod === 'username' && !user.username ? 'email' : user?.loginMethod || 'email';

  const [section, setSection] = useState<DetailSection>('profile');
  const [editing, setEditing] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profileLoginMethod, setProfileLoginMethod] = useState<'email' | 'username'>('email');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmergency, setProfileEmergency] = useState('');
  const [profileStatus, setProfileStatus] = useState<UserStatus>('Active');
  const [twoFactor, setTwoFactor] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [draftRoleIds, setDraftRoleIds] = useState<RoleId[]>([]);
  const [draftPrimaryRole, setDraftPrimaryRole] = useState<RoleId>(0);
  const [accessRoleId, setAccessRoleId] = useState<RoleId>(0);
  const [draftMatrix, setDraftMatrix] = useState<PermissionMatrixState>(() => cloneMatrix(permissionMatrix));
  const [activityQuery, setActivityQuery] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfileName(user.name);
    setProfileEmail(user.email);
    setProfileUsername(user.username || '');
    setProfileLoginMethod(user.loginMethod === 'username' && !user.username ? 'email' : user.loginMethod || 'email');
    setProfilePhone(user.phone || '');
    setProfileEmergency(user.emergencyContact || '');
    setProfileStatus(user.status);
    setTwoFactor(user.twoFactorEnabled);
    setDraftRoleIds(user.assignedRoleIds);
    setDraftPrimaryRole(user.primaryRoleId);
    setAccessRoleId(user.primaryRoleId);
    setDraftMatrix(cloneMatrix(permissionMatrix));
  }, [permissionMatrix, user]);

  useEffect(() => {
    setEditing(searchParams.get('edit') === '1');
    const requested = searchParams.get('section');
    if (requested === 'access' || requested === 'activity' || requested === 'profile') setSection(requested);
  }, [searchParams]);

  if (!user) return <section className="rounded-3xl border border-[#E7DFD2] bg-white p-10 text-center text-sm text-slate-500">This account is no longer available. <button onClick={() => router.push('/administration/users')} className="font-bold text-[#701A35] hover:underline">Return to directory</button></section>;

  const hasRoleChanges = JSON.stringify([...draftRoleIds].sort()) !== JSON.stringify([...user.assignedRoleIds].sort()) || draftPrimaryRole !== user.primaryRoleId;
  const hasMatrixChanges = JSON.stringify(draftMatrix) !== JSON.stringify(permissionMatrix);
  const activeRole = roles.find((role) => role.id === accessRoleId);
  const userLogs = auditLogs.filter((log) => log.actorId === user.id || log.target.toLowerCase().includes(user.id.toLowerCase()) || log.target.toLowerCase().includes(user.name.toLowerCase())).filter((log) => !activityQuery.trim() || [log.action, log.target, log.actorName, log.timestamp].some((value) => value.toLowerCase().includes(activityQuery.trim().toLowerCase())));

  const goBack = () => { setSelectedUserId(null); router.push('/administration/users'); };
  const beginEdit = () => { setSection('profile'); setEditing(true); };
  const toggleRole = (roleId: RoleId) => {
    if (draftRoleIds.includes(roleId)) {
      if (draftRoleIds.length === 1) { showToast('Role required', 'Every account must keep at least one role.', 'warning'); return; }
      const next = draftRoleIds.filter((id) => id !== roleId);
      setDraftRoleIds(next);
      if (draftPrimaryRole === roleId) setDraftPrimaryRole(next[0]);
      if (accessRoleId === roleId) setAccessRoleId(next[0]);
    } else setDraftRoleIds((current) => [...current, roleId]);
  };
  const togglePermission = (moduleId: string, action: ModuleAction) => {
    if (accessRoleId === 0) { showToast('Protected role', 'Super Admin has unrestricted page access.', 'info'); return; }
    setDraftMatrix((current) => ({ ...current, [moduleId]: { ...current[moduleId], [action]: { ...current[moduleId]?.[action], [accessRoleId]: !current[moduleId]?.[action]?.[accessRoleId] } } }));
  };
  const saveAccess = async () => {
    const rolesSaved = !hasRoleChanges || await updateUserRoles(user.id, draftRoleIds, draftPrimaryRole);
    if (rolesSaved && hasMatrixChanges) await updatePermissionMatrix(draftMatrix);
    if (rolesSaved) showToast('Access saved', 'Role assignments and page permissions are stored.', 'success');
  };
  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profileName.trim() || !profileEmail.trim()) { showToast('Missing information', 'Name and email address are required.', 'warning'); return; }
    if (profileLoginMethod === 'username' && !profileUsername.trim()) { showToast('Username required', 'Add a username for username sign-in.', 'warning'); return; }
    if (newPassword && newPassword.length < 8) { showToast('Password too short', 'Use at least 8 characters.', 'warning'); return; }
    if (newPassword !== confirmPassword) { showToast('Password mismatch', 'The new password and confirmation must match.', 'warning'); return; }
    const initials = profileName.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
    const updates: Partial<User> = { name: profileName.trim(), email: profileEmail.trim(), username: profileLoginMethod === 'username' ? profileUsername.trim() : undefined, loginMethod: profileLoginMethod, phone: profilePhone.trim(), emergencyContact: profileEmergency.trim(), twoFactorEnabled: twoFactor, status: profileStatus, initials };
    if (newPassword.trim()) updates.tempPassword = newPassword;
    await updateUserProfile(user.id, updates);
    setNewPassword(''); setConfirmPassword(''); setEditing(false);
  };
  const navItems: { id: DetailSection; label: string; description: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'User information', description: 'Identity & security', icon: <UserRound className="h-4 w-4" /> },
    { id: 'access', label: 'Roles & page access', description: 'Role-based permissions', icon: <Grid2X2 className="h-4 w-4" /> },
    { id: 'activity', label: 'Activity', description: 'Saved account history', icon: <Activity className="h-4 w-4" /> },
  ];

  return <div className="w-full space-y-5 pb-8">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><button onClick={goBack} aria-label="Back to users" className="rounded-xl border border-[#E7DFD2] bg-white p-2.5 text-slate-600 shadow-sm hover:bg-[#FBF8F3]"><ArrowLeft className="h-4 w-4" /></button><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A07A39]">Account workspace</p><h1 className="text-2xl font-bold tracking-tight text-[#24131B]">{user.name}</h1></div></div><span className="text-xs text-slate-500">{user.id} · Created {displayDate(user.joinedDate || user.createdAt)}</span></div>
    <section className="rounded-3xl border border-[#E7DFD2] bg-white p-5 shadow-[0_12px_32px_rgba(58,34,22,0.05)] sm:p-6"><div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between"><div className="flex min-w-0 items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#701A35] text-lg font-bold text-[#EED8A1]">{user.initials || user.name.slice(0, 2).toUpperCase()}</div><div className="min-w-0"><h2 className="truncate text-xl font-bold text-slate-900">{user.name}</h2><p className="truncate text-sm text-slate-500">{effectiveLoginMethod === 'email' ? user.email : user.username || 'Username not set'}</p></div></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-2xl bg-[#FBF8F3] px-3 py-2.5"><span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Status</span><div className="mt-1"><StatusPill status={user.status} size="sm" /></div></div><div className="rounded-2xl bg-[#FBF8F3] px-3 py-2.5"><span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Primary role</span><span className="mt-1 block truncate text-xs font-bold text-slate-800">{roles.find((role) => role.id === user.primaryRoleId)?.name || '—'}</span></div><div className="rounded-2xl bg-[#FBF8F3] px-3 py-2.5"><span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Last sign-in</span><span className="mt-1 block truncate font-mono text-xs text-slate-700">{user.lastLogin || 'Never'}</span></div><div className="rounded-2xl bg-[#FBF8F3] px-3 py-2.5"><span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Roles</span><span className="mt-1 block text-xs font-bold text-slate-800">{user.assignedRoleIds.length} assigned</span></div></div></div><div className="mt-5 flex flex-wrap gap-2 border-t border-[#EEE8DE] pt-4"><button onClick={beginEdit} className="rounded-xl bg-[#701A35] px-3.5 py-2.5 text-xs font-bold text-white hover:bg-[#571027]">Edit account</button><button onClick={() => setDeleteOpen(true)} className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100">Delete account</button></div></section>

    <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]"><nav className="space-y-1.5 rounded-3xl border border-[#E7DFD2] bg-white p-2.5 shadow-sm">{navItems.map((item) => <button key={item.id} onClick={() => setSection(item.id)} className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-3.5 text-left transition ${section === item.id ? 'bg-[#701A35] text-white shadow-sm' : 'text-slate-600 hover:bg-[#FBF8F3] hover:text-slate-900'}`}><span className={section === item.id ? 'text-[#EED8A1]' : 'text-slate-400'}>{item.icon}</span><span><span className="block text-xs font-bold">{item.label}</span><span className={`mt-0.5 block text-[10px] ${section === item.id ? 'text-white/70' : 'text-slate-400'}`}>{item.description}</span></span></button>)}</nav>
      <div className="min-w-0">
        {section === 'profile' && <section className="rounded-3xl border border-[#E7DFD2] bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-col gap-3 border-b border-[#EEE8DE] pb-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#A07A39]">Identity & security</p><h2 className="mt-1 text-lg font-bold text-slate-900">User information</h2><p className="mt-1 text-xs text-slate-500">Update the account record stored in the directory.</p></div><button onClick={() => editing ? setEditing(false) : beginEdit()} className="rounded-xl border border-[#DCC7B0] px-3.5 py-2.5 text-xs font-bold text-[#701A35] hover:bg-[#FBF8F3]">{editing ? 'Cancel editing' : 'Edit information'}</button></div>
          {editing ? <form onSubmit={saveProfile} className="mt-6 space-y-6"><div className="grid gap-4 sm:grid-cols-2"><Field label="Full name" required value={profileName} onChange={setProfileName} /><Field label="Email address" required type="email" value={profileEmail} onChange={setProfileEmail} /><Field label="Phone number" value={profilePhone} onChange={setProfilePhone} /><label className="block text-xs font-semibold text-slate-700">Account status<select value={profileStatus} onChange={(event) => setProfileStatus(event.target.value as UserStatus)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-[#C5A059] focus:bg-white"><option value="Active">Active</option><option value="Pending">Pending</option><option value="Suspended">Suspended</option></select></label></div><Field label="Emergency contact" value={profileEmergency} onChange={setProfileEmergency} /><div className="rounded-2xl border border-[#E1C98D] bg-[#FFFBF2] p-4"><div><h3 className="text-sm font-bold text-slate-900">Sign-in & password</h3><p className="mt-1 text-[11px] text-slate-500">Choose how this account signs in. Leave password fields blank to keep the current password.</p></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div><label className="text-xs font-semibold text-slate-700">Login method<select value={profileLoginMethod} onChange={(event) => setProfileLoginMethod(event.target.value as 'email' | 'username')} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#C5A059]"><option value="email">Email address</option><option value="username">Username</option></select></label></div><Field label="Username" value={profileUsername} onChange={setProfileUsername} placeholder={profileLoginMethod === 'username' ? 'Required for username login' : 'Not used for email login'} /><Field label="New password" type="password" value={newPassword} onChange={setNewPassword} placeholder="At least 8 characters" /><Field label="Confirm password" type="password" value={confirmPassword} onChange={setConfirmPassword} /></div></div><label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700"><input type="checkbox" checked={twoFactor} onChange={(event) => setTwoFactor(event.target.checked)} className="h-4 w-4 accent-[#701A35]" /><span><span className="block">Require two-factor authentication</span><span className="mt-0.5 block text-[11px] font-normal text-slate-500">Stored on this account and enforced at sign-in when supported.</span></span></label><div className="flex justify-end"><button type="submit" className="rounded-xl bg-[#701A35] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#571027]">Save account changes</button></div></form> : <div className="mt-6 grid gap-5 sm:grid-cols-2"><Info label="User ID" value={user.id} mono /><Info label="Full name" value={user.name} /><Info label="Email address" value={user.email} /><Info label="Phone number" value={user.phone || 'Not specified'} /><div className="rounded-2xl border border-[#E7DFD2] bg-[#FBF8F3] p-4 sm:col-span-2"><p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#A07A39]">Sign-in & password</p><div className="grid gap-4 sm:grid-cols-4"><Info label="Login method" value={effectiveLoginMethod === 'email' ? 'Email address' : 'Username'} /><Info label="Username" value={effectiveLoginMethod === 'email' ? 'Not used' : user.username || 'Not configured'} accent /><Info label="Password" value="Managed securely" /><Info label="Two-factor authentication" value={user.twoFactorEnabled ? 'Enabled' : 'Disabled'} /></div></div><Info label="Joined date" value={displayDate(user.joinedDate || user.createdAt)} mono /><div className="sm:col-span-2"><Info label="Emergency contact" value={user.emergencyContact || 'Not specified'} /></div></div>}
        </section>}
        {section === 'access' && <PageAccessEditor roles={roles} draftRoleIds={draftRoleIds} draftPrimaryRole={draftPrimaryRole} setDraftPrimaryRole={setDraftPrimaryRole} toggleRole={toggleRole} accessRoleId={accessRoleId} setAccessRoleId={setAccessRoleId} activeRole={activeRole} draftMatrix={draftMatrix} togglePermission={togglePermission} hasChanges={hasRoleChanges || hasMatrixChanges} onSave={saveAccess} />}
        {section === 'activity' && <section className="rounded-3xl border border-[#E7DFD2] bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-col gap-4 border-b border-[#EEE8DE] pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#A07A39]">Audit trail</p><h2 className="mt-1 text-lg font-bold text-slate-900">Account activity</h2><p className="mt-1 text-xs text-slate-500">Changes, sign-ins, access updates, and security actions related to this account.</p></div><input value={activityQuery} onChange={(event) => setActivityQuery(event.target.value)} placeholder="Filter activity" className="rounded-xl border border-slate-200 bg-[#FBF8F3] px-3 py-2.5 text-xs outline-none focus:border-[#C5A059]" /></div><div className="mt-5 space-y-3">{userLogs.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">No saved activity for this account yet. Actions taken here will appear in this list.</div> : userLogs.map((log) => <article key={log.id} className="flex gap-3 rounded-2xl border border-slate-200 p-4"><div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F5EEE3] text-[#701A35]"><Activity className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-bold text-slate-900">{log.action}</h3><time className="font-mono text-[10px] text-slate-400">{displayDate(log.timestamp)}</time></div><p className="mt-1 text-xs text-slate-600">{log.target}</p><p className="mt-1 text-[10px] text-slate-400">By {log.actorName} · {log.device}</p></div></article>)}</div></section>}
      </div>
    </div>
    <DeleteUserModal user={user} isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} onDeleted={goBack} />
  </div>;
};

function PageAccessEditor({ roles, draftRoleIds, draftPrimaryRole, setDraftPrimaryRole, toggleRole, accessRoleId, setAccessRoleId, activeRole, draftMatrix, togglePermission, hasChanges, onSave }: { roles: Role[]; draftRoleIds: RoleId[]; draftPrimaryRole: RoleId; setDraftPrimaryRole: (roleId: RoleId) => void; toggleRole: (roleId: RoleId) => void; accessRoleId: RoleId; setAccessRoleId: (roleId: RoleId) => void; activeRole?: Role; draftMatrix: PermissionMatrixState; togglePermission: (moduleId: string, action: ModuleAction) => void; hasChanges: boolean; onSave: () => Promise<void> }) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => new Set(MODULES_DATA.map((module) => module.id)));
  const groupedModules = MODULES_DATA.reduce<Record<string, typeof MODULES_DATA>>((groups, module) => { (groups[module.category] ||= []).push(module); return groups; }, {});
  const totalControls = MODULES_DATA.reduce((total, module) => total + module.actions.length, 0);
  const enabledControls = activeRole?.isSystemProtected ? totalControls : MODULES_DATA.reduce((total, module) => total + module.actions.filter((action) => Boolean(draftMatrix[module.id]?.[action]?.[accessRoleId])).length, 0);
  const toggleModule = (moduleId: string) => setExpandedModules((current) => { const next = new Set(current); if (next.has(moduleId)) next.delete(moduleId); else next.add(moduleId); return next; });

  return <section className="rounded-3xl border border-[#E7DFD2] bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-col gap-4 border-b border-[#EEE8DE] pb-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#A07A39]">Authorization</p><h2 className="mt-1 text-lg font-bold text-slate-900">Roles & page access</h2><p className="mt-1 max-w-xl text-xs text-slate-500">Assign roles first, then manage the page actions granted by each role. Changes are stored in the shared permission matrix.</p></div>{hasChanges && <button onClick={onSave} className="rounded-xl bg-[#701A35] px-3.5 py-2.5 text-xs font-bold text-white hover:bg-[#571027]">Save access changes</button>}</div>
    <div className="mt-6"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-bold text-slate-900">Assigned roles</h3><p className="mt-1 text-[11px] text-slate-500">Select the roles this account can use and choose one primary role.</p></div><span className="rounded-full bg-[#F5EEE3] px-2.5 py-1 text-[10px] font-bold text-[#701A35]">{draftRoleIds.length} assigned</span></div><div className="grid gap-2 sm:grid-cols-2">{roles.map((role) => { const assigned = draftRoleIds.includes(role.id); const primary = draftPrimaryRole === role.id; return <div key={role.id} className={`flex items-center justify-between gap-2 rounded-2xl border p-3 ${assigned ? 'border-[#C5A059] bg-[#FBF8F3]' : 'border-slate-200 bg-white'}`}><button type="button" onClick={() => toggleRole(role.id)} className="flex min-w-0 items-center gap-2 text-left"><span className={`flex h-4 w-4 items-center justify-center rounded border ${assigned ? 'border-[#701A35] bg-[#701A35] text-white' : 'border-slate-300'}`}>{assigned && <Check className="h-3 w-3" />}</span><RoleBadge roleId={role.id} roleName={role.name} size="xs" isPrimary={primary} /></button>{assigned && <button type="button" onClick={() => setDraftPrimaryRole(role.id)} className={`rounded-lg px-2 py-1 text-[10px] font-bold ${primary ? 'bg-[#701A35] text-white' : 'text-slate-500 hover:bg-white'}`}>{primary ? 'Primary role' : 'Make primary'}</button>}</div>; })}</div></div>
    <div className="mt-7 rounded-2xl border border-[#E7DFD2] bg-[#FBF8F3] p-4"><div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px_150px] md:items-end"><div><label className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Role to configure<select value={accessRoleId} onChange={(event) => setAccessRoleId(Number(event.target.value) as RoleId)} className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#C5A059]">{roles.filter((role) => draftRoleIds.includes(role.id)).map((role) => <option key={role.id} value={role.id}>{role.name}{role.id === draftPrimaryRole ? ' · Primary' : ''}</option>)}</select></label></div><div><span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Pages & actions</span><strong className="mt-1 block text-lg text-[#701A35]">{enabledControls} <span className="text-xs font-medium text-slate-400">/ {totalControls}</span></strong></div><div><span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Role level</span><strong className="mt-1 block text-sm text-slate-800">{activeRole?.isSystemProtected ? 'System protected' : activeRole?.description || 'Custom access'}</strong></div></div>{activeRole?.isSystemProtected && <div className="mt-4 flex items-start gap-2 border-t border-[#E7DFD2] pt-3 text-xs text-slate-600"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#701A35]" /><span><strong>{activeRole.name}</strong> has full access by design. Its controls are visible for reference and cannot be changed.</span></div>}</div>
    <div className="mt-6 space-y-5">{Object.entries(groupedModules).map(([category, modules]) => <div key={category}><div className="mb-2 flex items-center justify-between"><h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#A07A39]">{category}</h3><span className="text-[10px] text-slate-400">{modules.length} pages</span></div><div className="overflow-hidden rounded-2xl border border-slate-200">{modules.map((module) => { const expanded = expandedModules.has(module.id); const allowedCount = activeRole?.isSystemProtected ? module.actions.length : module.actions.filter((action) => Boolean(draftMatrix[module.id]?.[action]?.[accessRoleId])).length; return <div key={module.id} className="border-b border-slate-100 last:border-b-0"><button type="button" onClick={() => toggleModule(module.id)} className="flex w-full items-center justify-between gap-3 bg-white px-4 py-3 text-left hover:bg-[#FBF8F3]"><span className="min-w-0"><span className="block text-xs font-bold text-slate-800">{module.name}</span><span className="mt-0.5 block truncate text-[10px] text-slate-400">{module.description}</span></span><span className="shrink-0 text-[10px] font-bold text-slate-500">{allowedCount}/{module.actions.length} enabled {expanded ? '−' : '+'}</span></button>{expanded && <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-[#FCFBF9] p-3 sm:grid-cols-3 lg:grid-cols-6">{module.actions.map((action) => { const allowed = activeRole?.isSystemProtected || Boolean(draftMatrix[module.id]?.[action]?.[accessRoleId]); return <button type="button" key={action} disabled={activeRole?.isSystemProtected} aria-pressed={Boolean(allowed)} onClick={() => togglePermission(module.id, action)} className={`rounded-xl border px-3 py-2 text-left text-[10px] font-bold transition ${allowed ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-500 hover:border-[#C5A059]'} disabled:cursor-not-allowed`}><span className="block">{actionLabels[action]}</span><span className="mt-0.5 block text-[9px] font-medium opacity-70">{allowed ? 'Enabled' : 'Not allowed'}</span></button>; })}</div>}</div>; })}</div></div>)}</div><div className="mt-5 flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-[11px] text-slate-600"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Access is role-based: saving a permission changes it for every account assigned to that role.</div>
  </section>;
}

function Field({ label, value, onChange, type = 'text', required = false, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return <label className="block text-xs font-semibold text-slate-700">{label}{required && <span className="text-rose-500"> *</span>}<input required={required} type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-[#C5A059] focus:bg-white" /></label>;
}

function Info({ label, value, mono = false, accent = false }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return <div><span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</span><span className={`mt-1 block text-sm font-semibold ${mono ? 'font-mono' : ''} ${accent ? 'text-[#701A35]' : 'text-slate-800'}`}>{value}</span></div>;
}
