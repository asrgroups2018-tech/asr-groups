'use client';

import React, { useEffect, use } from 'react';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/layout/AppShell';
import { UserDetailsView } from '@/app/administration/_components/UserDetailsView';

function UserDetailAdminContent({ userId }: { userId: string }) {
  const { setActiveMainTab, setActiveAdminTab, setSelectedUserId } = useApp();

  useEffect(() => {
    setActiveMainTab('administration');
    setActiveAdminTab('users');
    if (userId) {
      setSelectedUserId(userId);
    }
  }, [setActiveMainTab, setActiveAdminTab, setSelectedUserId, userId]);

  return (
    <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
      <UserDetailsView />
    </main>
  );
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const resolvedParams = use(params);

  return (
    <AppShell>
      <UserDetailAdminContent userId={resolvedParams.userId} />
    </AppShell>
  );
}
