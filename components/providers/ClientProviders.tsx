'use client';

import React from 'react';
import { AppProvider } from '@/lib/store';
import { ThemeProvider } from './ThemeProvider';
import { AmountWordsHover } from '@/components/ui/AmountWordsHover';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ThemeProvider>
      <AppProvider>{children}</AppProvider>
      <AmountWordsHover />
    </ThemeProvider>
  );
}
