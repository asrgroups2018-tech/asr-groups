'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useApp } from '@/lib/store';
import { ShareholderCompany } from '@/lib/types';
import { INITIAL_SYSTEM_SETTINGS } from '@/lib/seedData';
import {
  Building2,
  PieChart,
  ShieldCheck,
  Database,
  ToggleLeft,
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Download,
  RotateCw,
  Info,
  Lock,
  Upload,
} from 'lucide-react';

type SettingsSubTab = 'profile' | 'shareholders' | 'security' | 'backup' | 'toggles';

export const SystemSettingsTab: React.FC = () => {
  const {
    systemSettings,
    updateCompanyProfile,
    updateShareholders,
    updateSecurityPolicy,
    updateFeatureToggles,
    triggerBackupNow,
    showToast,
  } = useApp();

  const safeSettings = systemSettings || INITIAL_SYSTEM_SETTINGS;

  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>('profile');

  // Company Profile Draft
  const [profile, setProfile] = useState(safeSettings.companyProfile || INITIAL_SYSTEM_SETTINGS.companyProfile);

  // Shareholders Draft
  const [shareholders, setShareholders] = useState<ShareholderCompany[]>(
    safeSettings.shareholders || INITIAL_SYSTEM_SETTINGS.shareholders
  );

  // Security Policy Draft
  const [security, setSecurity] = useState(safeSettings.securityPolicy || INITIAL_SYSTEM_SETTINGS.securityPolicy);
  const [ipListString, setIpListString] = useState(
    (safeSettings.securityPolicy?.ipAllowlist || INITIAL_SYSTEM_SETTINGS.securityPolicy.ipAllowlist).join('\n')
  );

  // Feature Toggles Draft
  const [toggles, setToggles] = useState(safeSettings.featureToggles || INITIAL_SYSTEM_SETTINGS.featureToggles);

  useEffect(() => {
    if (systemSettings) {
      setProfile(systemSettings.companyProfile || INITIAL_SYSTEM_SETTINGS.companyProfile);
      setShareholders(systemSettings.shareholders || INITIAL_SYSTEM_SETTINGS.shareholders);
      setSecurity(systemSettings.securityPolicy || INITIAL_SYSTEM_SETTINGS.securityPolicy);
      setIpListString((systemSettings.securityPolicy?.ipAllowlist || INITIAL_SYSTEM_SETTINGS.securityPolicy.ipAllowlist).join('\n'));
      setToggles(systemSettings.featureToggles || INITIAL_SYSTEM_SETTINGS.featureToggles);
    }
  }, [systemSettings]);

  // Backup loading
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Shareholder Calculations
  const totalPercentage = shareholders.reduce(
    (sum, sh) => sum + (Number(sh.percentage) || 0),
    0
  );
  const isShareholderValid = Math.round(totalPercentage) === 100;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyProfile(profile);
  };

  const handleSaveShareholders = () => {
    if (!isShareholderValid) {
      showToast(
        'Allocation Error',
        `Current total is ${totalPercentage}%. Equity must equal exactly 100%.`,
        'error'
      );
      return;
    }
    updateShareholders(shareholders);
  };

  const handleAddShareholder = () => {
    const newId = `SH-${shareholders.length + 1}`;
    setShareholders([
      ...shareholders,
      {
        id: newId,
        name: 'New Shareholder Entity',
        registrationNumber: 'CIN-PENDING',
        percentage: 0,
        contactPerson: 'Director Name',
        email: 'director@entity.in',
        phone: '+91 98000 00000',
        isPrimary: false,
      },
    ]);
  };

  const handleRemoveShareholder = (id: string) => {
    if (shareholders.length <= 1) {
      showToast('Validation Warning', 'At least one shareholder company must be configured.', 'warning');
      return;
    }
    setShareholders(shareholders.filter((s) => s.id !== id));
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedIps = ipListString
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    updateSecurityPolicy({
      ...security,
      ipAllowlist: parsedIps,
    });
  };

  const handleSaveToggles = () => {
    updateFeatureToggles(toggles);
  };

  const handleTriggerBackup = async () => {
    setIsBackingUp(true);
    await triggerBackupNow();
    setIsBackingUp(false);
  };

  const handleExportFullDataset = () => {
    const dataStr = JSON.stringify(systemSettings, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asr_groups_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Dataset Exported', 'Full configuration backup downloaded.', 'success');
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Sub-tab Navigation */}
      <div className="bg-white rounded-2xl p-2.5 border border-[#EBE7DF] shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center gap-2 overflow-x-auto">
        {[
          { id: 'profile', label: 'Company Profile', icon: <Building2 className="w-4 h-4" /> },
          {
            id: 'shareholders',
            label: 'Shareholder Companies',
            icon: <PieChart className="w-4 h-4" />,
            badge: `${totalPercentage}%`,
            badgeClass: isShareholderValid
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-rose-100 text-rose-800 animate-pulse',
          },
          { id: 'security', label: 'Security Policy', icon: <ShieldCheck className="w-4 h-4" /> },
          { id: 'backup', label: 'Data & Backup', icon: <Database className="w-4 h-4" /> },
          { id: 'toggles', label: 'Feature Toggles', icon: <ToggleLeft className="w-4 h-4" /> },
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as SettingsSubTab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                isActive
                  ? 'bg-[#701A35] text-white border border-[#C5A059]/40 shadow-xs'
                  : 'text-slate-600 hover:bg-[#F3EFE6] hover:text-slate-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${tab.badgeClass}`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 1. COMPANY PROFILE */}
      {activeSubTab === 'profile' && (
        <form
          onSubmit={handleSaveProfile}
          className="bg-white rounded-2xl p-6 border border-[#EBE7DF] shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-6 max-w-4xl animate-in fade-in"
        >
          <div>
            <h3 className="text-base font-bold text-slate-900 font-serif">
              Corporate Legal Entity & Branding
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              These details appear on customer loan agreements, repayment receipts, and tax invoices
            </p>
          </div>

          {/* Logo preview */}
          <div className="flex items-center gap-5 p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="w-16 h-16 rounded-2xl border border-[#C5A059]/50 overflow-hidden relative shadow-xs shrink-0">
              <Image
                src="/Groups Finalized.png"
                alt="ASR Groups Logo"
                fill
                sizes="64px"
                className="object-cover scale-105"
              />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-900">Official Brand Mark</h4>
              <p className="text-[11px] text-slate-500">
                Current: <code className="font-mono text-slate-700 font-bold">public/Groups Finalized.png</code>
              </p>
              <button
                type="button"
                onClick={() =>
                  showToast('Logo Management', 'Official vector branding is locked to enterprise asset repository.', 'info')
                }
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Replacement SVG/PNG</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Brand Display Name
              </label>
              <input
                type="text"
                value={profile.companyName}
                onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Registered Legal Entity Name
              </label>
              <input
                type="text"
                value={profile.legalEntityName}
                onChange={(e) => setProfile({ ...profile, legalEntityName: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                GSTIN Number
              </label>
              <input
                type="text"
                value={profile.gstin}
                onChange={(e) => setProfile({ ...profile, gstin: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Corporate Identification (CIN)
              </label>
              <input
                type="text"
                value={profile.cin}
                onChange={(e) => setProfile({ ...profile, cin: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Base Currency & Symbol
              </label>
              <input
                type="text"
                value={`${profile.baseCurrency} (${profile.currencySymbol})`}
                disabled
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Financial Year Start
              </label>
              <input
                type="text"
                value={profile.financialYearStart}
                onChange={(e) =>
                  setProfile({ ...profile, financialYearStart: e.target.value })
                }
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Support / Helpdesk Email
              </label>
              <input
                type="email"
                value={profile.supportEmail}
                onChange={(e) => setProfile({ ...profile, supportEmail: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Registered Head Office Address
            </label>
            <textarea
              rows={2}
              value={profile.registeredAddress}
              onChange={(e) => setProfile({ ...profile, registeredAddress: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] active:scale-98 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-4 h-4 text-amber-200" />
              <span>Save Company Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* 2. SHAREHOLDER COMPANIES */}
      {activeSubTab === 'shareholders' && (
        <div className="bg-white rounded-2xl p-6 border border-[#EBE7DF] shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-6 max-w-4xl animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-serif">
                Shareholder Companies & Equity Distribution Split
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Powers the automated loan disbursement split engine (e.g. Sunrise Finance 40%, Vaanavil Capital 35%, RK Holdings 25%)
              </p>
            </div>

            <button
              onClick={handleAddShareholder}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Entity</span>
            </button>
          </div>

          {/* Live Validation Banner */}
          <div
            className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
              isShareholderValid
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-3">
              {isShareholderValid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <div>
                <p className="text-xs font-bold">
                  {isShareholderValid
                    ? 'Total Split Validation Passed (100.0%)'
                    : `Validation Error: Total split equals ${totalPercentage.toFixed(1)}%`}
                </p>
                <p className="text-[11px] opacity-90">
                  {isShareholderValid
                    ? 'Disbursements and profit shares will be allocated according to this exact split.'
                    : 'The total allocation across all shareholder entities must sum to exactly 100%.'}
                </p>
              </div>
            </div>

            <div className="font-mono text-base font-bold tabular-nums">
              {totalPercentage.toFixed(1)}% / 100%
            </div>
          </div>

          {/* Shareholder Table / List */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {shareholders.map((sh, idx) => {
              return (
                <div
                  key={sh.id}
                  className="p-4 bg-white hover:bg-slate-50 transition-colors space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-900 text-amber-100 text-xs font-bold flex items-center justify-center font-mono">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={sh.name}
                        onChange={(e) => {
                          const updated = [...shareholders];
                          updated[idx].name = e.target.value;
                          setShareholders(updated);
                        }}
                        className="font-bold text-xs text-slate-900 px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-amber-500 min-w-[200px]"
                      />
                      {sh.isPrimary && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                          Primary Anchor
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-bold text-slate-700">Split (%):</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={sh.percentage}
                          onChange={(e) => {
                            const updated = [...shareholders];
                            updated[idx].percentage = Number(e.target.value);
                            setShareholders(updated);
                          }}
                          className="w-20 px-2 py-1 text-xs font-bold text-right font-mono rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 tabular-nums"
                        />
                        <span className="text-xs font-bold text-slate-600">%</span>
                      </div>

                      <button
                        onClick={() => handleRemoveShareholder(sh.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remove Shareholder Entity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500">
                        Registration / CIN:
                      </span>
                      <input
                        type="text"
                        value={sh.registrationNumber}
                        onChange={(e) => {
                          const updated = [...shareholders];
                          updated[idx].registrationNumber = e.target.value;
                          setShareholders(updated);
                        }}
                        className="w-full px-2 py-1 text-[11px] font-mono rounded-lg border border-slate-200 bg-slate-50 mt-0.5"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500">
                        Contact Person:
                      </span>
                      <input
                        type="text"
                        value={sh.contactPerson}
                        onChange={(e) => {
                          const updated = [...shareholders];
                          updated[idx].contactPerson = e.target.value;
                          setShareholders(updated);
                        }}
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-slate-50 mt-0.5"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500">
                        Email & Phone:
                      </span>
                      <input
                        type="text"
                        value={`${sh.email} | ${sh.phone}`}
                        onChange={(e) => {
                          const parts = e.target.value.split('|');
                          const updated = [...shareholders];
                          updated[idx].email = parts[0]?.trim() || '';
                          if (parts[1]) updated[idx].phone = parts[1].trim();
                          setShareholders(updated);
                        }}
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-slate-50 mt-0.5 font-mono"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              onClick={handleSaveShareholders}
              disabled={!isShareholderValid}
              className="px-5 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-4 h-4 text-amber-200" />
              <span>Save Equity Splits</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. SECURITY POLICY */}
      {activeSubTab === 'security' && (
        <form
          onSubmit={handleSaveSecurity}
          className="bg-white rounded-2xl p-6 border border-[#EBE7DF] shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-6 max-w-4xl animate-in fade-in"
        >
          <div>
            <h3 className="text-base font-bold text-slate-900 font-serif">
              Enterprise Authentication & Security Policy
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Governs credential complexity, session timeouts, and IP whitelisting rules
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Minimum Password Length (Characters)
              </label>
              <input
                type="number"
                min="8"
                max="32"
                value={security.minPasswordLength}
                onChange={(e) =>
                  setSecurity({ ...security, minPasswordLength: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Inactivity Session Timeout (Minutes)
              </label>
              <input
                type="number"
                min="5"
                max="240"
                value={security.sessionTimeoutMinutes}
                onChange={(e) =>
                  setSecurity({
                    ...security,
                    sessionTimeoutMinutes: Number(e.target.value),
                  })
                }
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <h4 className="text-xs font-bold text-slate-800">Password Complexity Rules</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={security.requireSpecialChar}
                  onChange={(e) =>
                    setSecurity({ ...security, requireSpecialChar: e.target.checked })
                  }
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Require Special Char (@$!%*#)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={security.requireNumber}
                  onChange={(e) =>
                    setSecurity({ ...security, requireNumber: e.target.checked })
                  }
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Require Numbers (0–9)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={security.requireUppercase}
                  onChange={(e) =>
                    setSecurity({ ...security, requireUppercase: e.target.checked })
                  }
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Require Uppercase (A–Z)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Allowed IP Address Subnets (One per line)
            </label>
            <textarea
              rows={4}
              value={ipListString}
              onChange={(e) => setIpListString(e.target.value)}
              placeholder="e.g. 49.207.214.0/24 (Chennai HO)"
              className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
            />
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] active:scale-98 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-4 h-4 text-amber-200" />
              <span>Update Security Policy</span>
            </button>
          </div>
        </form>
      )}

      {/* 4. DATA & BACKUP */}
      {activeSubTab === 'backup' && (
        <div className="bg-white rounded-2xl p-6 border border-[#EBE7DF] shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-6 max-w-4xl animate-in fade-in">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-serif">
              Disaster Recovery & Encrypted Snapshots
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated offsite database snapshots and full JSON configuration dumps
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900">
                    Primary Production Database
                  </h4>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                    HEALTHY · BACKED UP
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Last automated backup:{' '}
                  <strong className="font-mono text-slate-900">
                    {systemSettings.lastBackupTimestamp}
                  </strong>
                </p>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Target: AWS S3 Encrypted Glacier (ap-south-1 Mumbai)
                </p>
              </div>
            </div>

            <button
              onClick={handleTriggerBackup}
              disabled={isBackingUp}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl transition-all shadow-xs flex items-center gap-2 shrink-0 self-start sm:self-center"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isBackingUp ? 'animate-spin' : ''}`} />
              <span>{isBackingUp ? 'Backing Up...' : 'Backup Now'}</span>
            </button>
          </div>

          {/* Export Full Dataset */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                Export Full System Configuration
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Download full system configuration schema, shareholder percentages, rules, and audit logs as JSON
              </p>
            </div>

            <button
              onClick={handleExportFullDataset}
              className="px-4 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors flex items-center gap-2 shrink-0 self-start sm:self-center"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON Snapshot</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. FEATURE TOGGLES */}
      {activeSubTab === 'toggles' && (
        <div className="bg-white rounded-2xl p-6 border border-[#EBE7DF] shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-6 max-w-4xl animate-in fade-in">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-serif">
              System Feature Flags & Modules
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Control platform capabilities, portal modules, and notification gateways
            </p>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
            {/* 1. Customer self-service portal */}
            <div className="p-4 flex items-center justify-between gap-4 bg-white hover:bg-slate-50">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Allow Customer Self-Service Portal
                </h4>
                <p className="text-xs text-slate-500">
                  Allows customers with Role 6 to log into the web portal and view active loan passbooks
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={toggles.customerSelfServicePortal}
                  onChange={(e) =>
                    setToggles({
                      ...toggles,
                      customerSelfServicePortal: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>

            {/* 2. SMS Notifications (Disabled/Greyed out as requested) */}
            <div className="p-4 flex items-center justify-between gap-4 bg-slate-50/70 opacity-60">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-600">
                    Enable External SMS Gateway
                  </h4>
                  <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.2 rounded font-mono font-semibold">
                    IN-APP ONLY MODE
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  This ERP is strictly configured for in-app secure notifications. External SMS gateway is disabled by policy.
                </p>
              </div>
              <div
                className="cursor-not-allowed"
                title="Disabled: ASR Finance ERP operates with in-app notifications only"
              >
                <div className="w-11 h-6 bg-slate-200 rounded-full opacity-50 relative">
                  <div className="w-5 h-5 bg-white rounded-full absolute top-[2px] left-[2px] border border-slate-300" />
                </div>
              </div>
            </div>

            {/* 3. Auto-approve small expenses */}
            <div className="p-4 flex items-center justify-between gap-4 bg-white hover:bg-slate-50">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Auto-Approve Micro Expenses
                </h4>
                <p className="text-xs text-slate-500">
                  Automatically clears branch tea & stationery vouchers under threshold without queue bottleneck
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={toggles.autoApproveSmallExpenses}
                  onChange={(e) =>
                    setToggles({
                      ...toggles,
                      autoApproveSmallExpenses: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>

            {/* 4. Multi-branch support */}
            <div className="p-4 flex items-center justify-between gap-4 bg-white hover:bg-slate-50">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Multi-Branch Consolidated Mode
                </h4>
                <p className="text-xs text-slate-500">
                  Allows filtering financial ledger by Chennai HO, Coimbatore, and Madurai branches
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={toggles.multiBranchSupport}
                  onChange={(e) =>
                    setToggles({
                      ...toggles,
                      multiBranchSupport: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              onClick={handleSaveToggles}
              className="px-5 py-2 text-xs font-bold text-white bg-[#701A35] hover:bg-[#5C142B] active:scale-98 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-4 h-4 text-amber-200" />
              <span>Save Feature Flags</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
