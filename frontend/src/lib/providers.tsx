'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type React from 'react';
import { useState } from 'react';
import { Toaster } from 'sonner';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5000,
            refetchOnWindowFocus: false,
            retry: 1,
            retryDelay: 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          style: {
            background: '#171717',
            color: '#ffffff',
            border: '1px solid #262626',
            borderRadius: '0.75rem',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-inter), sans-serif',
          },
        }}
      />
    </QueryClientProvider>
  );
}
