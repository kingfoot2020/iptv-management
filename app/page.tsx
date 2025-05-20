'use client';

import { useEffect, useState } from 'react';
import { Dashboard } from '@/components/dashboard';
import { ToastProvider } from '@/lib/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  if (!isClient) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <ToastProvider>
      <Dashboard />
      <Toaster />
    </ToastProvider>
  );
}
