'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { AdminSection } from '@/app/administration/_components/AdminSection';

function AuditAdminContent() {
  const { setActiveMainTab, setActiveAdminTab, setSelectedUserId } = useApp();

  useEffect(() => {
    setActiveMainTab('administration');
    setActiveAdminTab('audit');
    setSelectedUserId(null);
  }, [setActiveMainTab, setActiveAdminTab, setSelectedUserId]);

  return <AdminSection />;
}

export default function AdminAuditPage() {
  return (
    <AppShell>
      <AuditAdminContent />
    </AppShell>
  );
}
