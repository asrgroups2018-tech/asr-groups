'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { AdminSection } from '@/app/administration/_components/AdminSection';

function SettingsAdminContent() {
  const { setActiveMainTab, setActiveAdminTab, setSelectedUserId } = useApp();

  useEffect(() => {
    setActiveMainTab('administration');
    setActiveAdminTab('settings');
    setSelectedUserId(null);
  }, [setActiveMainTab, setActiveAdminTab, setSelectedUserId]);

  return <AdminSection />;
}

export default function AdminSettingsPage() {
  return (
    <AppShell>
      <SettingsAdminContent />
    </AppShell>
  );
}
