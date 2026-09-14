'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { AdminSection } from '@/app/administration/_components/AdminSection';

function UsersAdminContent() {
  const { setActiveMainTab, setActiveAdminTab, setSelectedUserId } = useApp();

  useEffect(() => {
    setActiveMainTab('administration');
    setActiveAdminTab('users');
    setSelectedUserId(null);
  }, [setActiveMainTab, setActiveAdminTab, setSelectedUserId]);

  return <AdminSection />;
}

export default function AdminUsersPage() {
  return (
    <AppShell>
      <UsersAdminContent />
    </AppShell>
  );
}
