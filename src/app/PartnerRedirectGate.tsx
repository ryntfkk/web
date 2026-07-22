"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

// P2/SE2: redirect mitra→dashboard dipindah ke komponen klien kecil ini agar
// TIDAK memblokir render halaman (dulu Home `return null` sampai auth siap →
// blank di server & crawler). Sekarang Home di-SSR penuh; gate ini hanya
// mengalihkan mitra di sisi klien setelah hidrasi. Tidak me-render apa pun.
export default function PartnerRedirectGate() {
  const router = useRouter();
  const { user, isAuthenticated, isInitializing } = useAuthStore();

  useEffect(() => {
    if (!isInitializing && isAuthenticated && user?.active_role === 'partner') {
      router.replace('/mitra/dashboard');
    }
  }, [isInitializing, isAuthenticated, user, router]);

  return null;
}
