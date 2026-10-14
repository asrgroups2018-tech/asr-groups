'use client';

import React from 'react';
import { AppProvider } from '@/lib/store';
import { ThemeProvider } from './ThemeProvider';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ThemeProvider>
      <AppProvider>{children}</AppProvider>
    </ThemeProvider>
  );
}
