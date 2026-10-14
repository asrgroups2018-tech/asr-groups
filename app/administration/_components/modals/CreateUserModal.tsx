'use client';

import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, Eye, EyeOff, Search, UserRound, X } from 'lucide-react';
import { useApp } from '@/lib/store';
import { CUSTOMER_ROLE_ID, RoleId, UserStatus } from '@/lib/types';
import { CreateRoleModal } from './CreateRoleModal';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CreatedCredentials {
  name: string;
  login: string;
  loginLabel: string;
  password: string;
  customerName?: string;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose }) => {
  const { roles, users, customers, systemSettings, createUser, showToast } = useApp();
  const defaultRoleId = useMemo(
    () => roles.find((role) => !role.isSystemProtected && role.id !== CUSTOMER_ROLE_ID)?.id ?? roles[0]?.id ?? 0,
    [roles],
  );
  const companyDomain = systemSettings?.companyProfile?.supportEmail?.split('@')[1]?.trim().toLowerCase() || '';
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [emailEdited, setEmailEdited] = useState(false);
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [lastGeneratedIdentity, setLastGeneratedIdentity] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [status, setStatus] = useState<UserStatus>('Active');
  const [roleId, setRoleId] = useState<RoleId>(defaultRoleId);
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);

  const selectedRole = roles.find((role) => role.id === roleId);
  const isCustomerRole = roleId === CUSTOMER_ROLE_ID;
  const usesEmailLogin = roleId === 0 || roleId === 1;
  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const selectedCustomerAccountId = selectedCustomer?.codeNo?.trim() || selectedCustomer?.id || '';
  const existingCustomerUser = users.find((user) => user.isCustomer && user.customerId === customerId);
  const matchingCustomers = useMemo(() => {
    const query = customerQuery.trim().toLowerCase();
    return customers
      .filter((customer) => !query || [customer.name, customer.id, customer.codeNo, customer.place, customer.phone].some((value) => String(value || '').toLowerCase().includes(query)))
      .slice(0, 30);
  }, [customerQuery, customers]);

  if (!isOpen) return null;

  const resetForm = () => {
    setName(''); setUsername(''); setEmail(''); setEmailEdited(false); setUsernameEdited(false);
    setLastGeneratedIdentity(''); setCustomerId(''); setCustomerQuery(''); setCustomerPickerOpen(false);
    setPassword(''); setPasswordVisible(false); setStatus('Active'); setRoleId(defaultRoleId); setCredentials(null); setIsSaving(false);
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

  const handleRoleChange = (nextRoleId: RoleId) => {
    setRoleId(nextRoleId);
    if (nextRoleId !== CUSTOMER_ROLE_ID) {
      setCustomerId(''); setCustomerQuery(''); setCustomerPickerOpen(false);
    }
  };

  const handleCustomerSelect = (id: string) => {
    const customer = customers.find((item) => item.id === id);
    if (!customer) return;
    const generatedAccountId = customer.codeNo?.trim() || customer.id;
    setCustomerId(customer.id); setCustomerQuery(''); setCustomerPickerOpen(false); setName(customer.name);
    setUsername(generatedAccountId.toLowerCase()); setUsernameEdited(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || (!isCustomerRole && !email.trim()) || !password.trim()) {
      showToast('Complete required fields', isCustomerRole ? 'Select a customer and enter a password.' : 'Name, email, and password are required.', 'warning'); return;
    }
    if (!usesEmailLogin && !username.trim()) {
      showToast('Account ID required', 'Add the account ID or username this user will use to sign in.', 'warning'); return;
    }
    if (isCustomerRole && !customerId) {
      showToast('Customer mapping required', 'Search for and select an existing customer before creating this login.', 'warning'); return;
    }
    if (isCustomerRole && existingCustomerUser) {
      showToast('Login already exists', `${selectedCustomer?.name || 'This customer'} is already mapped to an account.`, 'warning'); return;
    }
    if (password.trim().length < 8) {
      showToast('Password too short', 'Use at least 8 characters.', 'warning'); return;
    }

    setIsSaving(true);
    const initials = name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
    const created = await createUser({
      name: name.trim(), username: username.trim().toLowerCase() || undefined, email: email.trim().toLowerCase() || customerId,
      tempPassword: password, loginMethod: usesEmailLogin ? 'email' : 'username', initials,
      department: '', designation: '', assignedRoleIds: [roleId], primaryRoleId: roleId, status,
      joinedDate: new Date().toISOString().slice(0, 10), twoFactorEnabled: usesEmailLogin,
      isCustomer: isCustomerRole, customerId: isCustomerRole ? customerId : undefined,
    });
    setIsSaving(false);
    if (created) setCredentials({ name: created.name, login: usesEmailLogin ? created.email : created.username || username, loginLabel: usesEmailLogin ? 'Login email' : isCustomerRole ? 'Account ID' : 'Username', password, customerName: selectedCustomer?.name });
  };

  const copyCredentials = async () => {
    if (!credentials) return;
    await navigator.clipboard.writeText(`ASR Group login\nName: ${credentials.name}\n${credentials.loginLabel}: ${credentials.login}\nPassword: ${credentials.password}`);
    showToast('Credentials copied', 'The login details were copied to the clipboard.', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A0A13]/65 p-3 backdrop-blur-sm sm:p-6">
      <div className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#E6E1D6] bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]">
        <header className="flex items-center justify-between border-b border-[#2C1420] bg-[#1A0A13] px-5 py-4 text-white sm:px-6"><div><h2 className="text-base font-bold text-[#EED8A1]">Create user account</h2><p className="mt-0.5 text-xs text-[#C5A059]">Create sign-in access and connect it to an existing customer record.</p></div><button type="button" onClick={close} aria-label="Close" className="text-lg text-slate-300 hover:text-white"><X className="h-5 w-5" /></button></header>
        {credentials ? <div className="space-y-5 overflow-y-auto p-5 sm:p-7"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><h3 className="text-base font-bold text-emerald-900">Account created successfully</h3><p className="mt-1 text-xs text-emerald-800">Share these credentials securely with {credentials.name}.</p></div>{credentials.customerName && <div className="flex items-center gap-2 rounded-xl border border-[#E1C98D] bg-[#FFFBF2] px-3 py-2.5 text-xs text-slate-700"><UserRound className="h-4 w-4 text-[#A07A39]" /><span>Mapped customer:</span><strong>{credentials.customerName}</strong></div>}<div className="grid gap-3 rounded-2xl border border-slate-200 bg-[#FBF8F3] p-4 sm:grid-cols-3"><Credential label="Name" value={credentials.name} /><Credential label={credentials.loginLabel} value={credentials.login} /><Credential label="Temporary password" value={credentials.password} /></div><div className="flex justify-end gap-2"><button type="button" onClick={copyCredentials} className="rounded-xl border border-[#C5A059] px-4 py-2.5 text-xs font-bold text-[#701A35]">Copy credentials</button><button type="button" onClick={close} className="rounded-xl bg-[#701A35] px-4 py-2.5 text-xs font-bold text-white">Done</button></div></div> : <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col"><div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          <section><h3 className="text-sm font-bold text-slate-900">Account owner</h3><p className="mt-1 text-[11px] text-slate-500">For customer access, choose a customer already created in the Customer Directory. This form does not create customer records.</p>{isCustomerRole ? <div className="relative mt-4"><label className="text-xs font-semibold text-slate-700">Customer / borrower <span className="text-rose-500">*</span></label><div className="relative mt-1.5"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={selectedCustomer ? selectedCustomer.name : customerQuery} onFocus={() => setCustomerPickerOpen(true)} onChange={(event) => { setCustomerId(''); setCustomerQuery(event.target.value); setCustomerPickerOpen(true); }} placeholder="Search customer name, ID, phone or place" className="w-full rounded-xl border border-[#C5A059] bg-white py-3 pl-10 pr-10 text-xs outline-none focus:ring-2 focus:ring-[#C5A059]/20" /><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></div>{customerPickerOpen && <div className="absolute left-0 right-0 top-[4.8rem] z-20 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">{matchingCustomers.length > 0 ? matchingCustomers.map((customer) => <button type="button" key={customer.id} onClick={() => handleCustomerSelect(customer.id)} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#FBF8F3]"><span className="min-w-0"><strong className="block truncate text-xs text-slate-800">{customer.name}</strong><span className="mt-0.5 block truncate text-[10px] text-slate-500">{customer.id}{customer.place ? ` · ${customer.place}` : ''}</span></span>{customer.id === customerId && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}</button>) : <p className="px-3 py-5 text-center text-xs text-slate-500">No existing customers match this search.</p>}</div>}{selectedCustomer && <p className="mt-1.5 text-[10px] font-semibold text-emerald-700">Selected record: {selectedCustomer.id}{selectedCustomer.place ? ` · ${selectedCustomer.place}` : ''}</p>}</div> : <Field label="Full name" required value={name} onChange={handleNameChange} placeholder="e.g. Ramesh Krishnan" />}{isCustomerRole && <div className="mt-4"><Field label="Customer name" value={name} onChange={() => undefined} placeholder="Select a customer above" readOnly /></div>}<div className="mt-4"><Field label="Email address" required={!isCustomerRole} type="email" value={email} onChange={(value) => { setEmailEdited(true); setEmail(value.toLowerCase()); }} placeholder={companyDomain ? `name@${companyDomain}` : 'Optional for customer accounts'} /></div></section>
          <section className="rounded-2xl border border-[#E1C98D] bg-[#FFFBF2] p-4"><h3 className="text-sm font-bold text-slate-900">Sign-in details</h3><p className="mt-1 text-[11px] text-slate-500">Choose the access role and set the credentials the user will receive.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><div className="flex items-center justify-between gap-2"><label className="text-xs font-semibold text-slate-700">Starting role</label><button type="button" onClick={() => setCreateRoleOpen(true)} className="text-[10px] font-bold text-[#701A35] hover:underline">Create role</button></div><select value={roleId} onChange={(event) => handleRoleChange(Number(event.target.value) as RoleId)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold outline-none focus:border-[#C5A059]">{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select><p className="mt-1 text-[10px] text-slate-500">{selectedRole?.description || 'Access can be adjusted after creation.'}</p></div><div><Field label={isCustomerRole ? 'Account ID / username' : 'Username'} required={!usesEmailLogin} value={username} readOnly={isCustomerRole} onChange={(value) => { setUsernameEdited(true); setUsername(value.toLowerCase().replace(/[^a-z0-9.@_+-]/g, '')); }} placeholder={isCustomerRole ? (selectedCustomerAccountId || 'Select a customer to generate the account ID') : companyDomain ? `name@${companyDomain}` : 'Enter username'} />{isCustomerRole && <p className="mt-1 text-[10px] text-slate-500">Generated from the selected customer record.</p>}</div><PasswordField value={password} visible={passwordVisible} onToggle={() => setPasswordVisible((visible) => !visible)} onChange={setPassword} /></div>{existingCustomerUser && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800">This customer already has a login account. Choose another customer or manage the existing account.</div>}</section>
          <section><label className="text-xs font-semibold text-slate-700">Account status<select value={status} onChange={(event) => setStatus(event.target.value as UserStatus)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-[#C5A059] focus:bg-white"><option value="Active">Active</option><option value="Inactive">Inactive</option></select></label></section>
        </div><footer className="flex justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3 sm:px-6"><button type="button" onClick={close} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600">Cancel</button><button type="submit" disabled={isSaving} className="rounded-xl bg-[#701A35] px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? 'Creating…' : 'Create user account'}</button></footer></form>}
      </div>
      <CreateRoleModal isOpen={createRoleOpen} onClose={() => setCreateRoleOpen(false)} onCreated={(role) => setRoleId(role.id)} />
    </div>
  );
};

function Field({ label, value, onChange, type = 'text', required = false, placeholder, readOnly = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string; readOnly?: boolean }) {
  return <label className="block text-xs font-semibold text-slate-700">{label}{required && <span className="text-rose-500"> *</span>}<input required={required} readOnly={readOnly} type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={`mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-[#C5A059] ${readOnly ? 'bg-slate-50 text-slate-500' : 'bg-white'}`} /></label>;
}

function PasswordField({ value, visible, onToggle, onChange }: { value: string; visible: boolean; onToggle: () => void; onChange: (value: string) => void }) {
  return <label className="block text-xs font-semibold text-slate-700">Password <span className="text-rose-500">*</span><span className="relative mt-1.5 block"><input required type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Enter at least 8 characters" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-xs outline-none focus:border-[#C5A059]" /><button type="button" onClick={onToggle} aria-label={visible ? 'Hide password' : 'Show password'} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#701A35]">{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>;
}

function Credential({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-3"><span className="block text-[10px] text-slate-400">{label}</span><strong className="mt-1 block break-all font-mono text-xs text-slate-900">{value}</strong></div>;
}
