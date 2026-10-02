'use client';

import React from 'react';
import { AppProvider } from '@/lib/store';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return <AppProvider>{children}</AppProvider>;
}
