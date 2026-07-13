"use client";

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import MitraBottomNav from '@/components/layout/MitraBottomNav';
import { Loader2 } from 'lucide-react';

export default function MitraLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, user } = useRequireAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && isAuthenticated) {
      const isException = pathname === '/mitra/register' || pathname === '/mitra/verification-status';

      if (user?.active_role !== 'partner' && !isException) {
        router.replace('/');
      }
    }
  }, [mounted, isLoading, isAuthenticated, user, pathname, router]);

  if (!mounted || isLoading) {
    return <div className="page-h flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const isException = pathname === '/mitra/register' || pathname === '/mitra/verification-status';
  if (!isAuthenticated || (user?.active_role !== 'partner' && !isException)) {
    return null; 
  }

  const excludeBottomNavPatterns = [
    '/mitra/register',
    '/mitra/verification-status',
    '/mitra/services/new',
    '/mitra/wallet/withdraw',
    '/mitra/basecamp',
    // Form dengan action bar fixed di bawah — sembunyikan bottom nav agar tombol tidak tertutup.
    '/mitra/schedule',
  ];

  const isExcludedFlow = excludeBottomNavPatterns.includes(pathname || '') ||
    /^\/mitra\/orders\/[^/]+/.test(pathname || '') || 
    /^\/mitra\/services\/[^/]+\/edit/.test(pathname || '');

  return (
    <>
      {children}
      {!isExcludedFlow && <MitraBottomNav />}
    </>
  );
}
