'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { AdminSection } from './_components/AdminSection';

export default function AdministrationPage() {
  const { setActiveMainTab, setActiveAdminTab } = useApp();

  useEffect(() => {
    setActiveMainTab('administration');
    setActiveAdminTab('users');
  }, [setActiveMainTab, setActiveAdminTab]);

  return (
    <AppShell>
      <AdminSection />
    </AppShell>
  );
}
