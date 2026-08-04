"use client";

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import MitraBottomNav from '@/components/layout/MitraBottomNav';
import { PageSkeleton } from '@/components/ui/skeleton';
import { usePartnerVerificationStatus } from '@/hooks/usePartnerVerificationStatus';
import { accessLevelFor, canAccess, MITRA_BLOCKED_REDIRECT } from '@/lib/mitra-access';
import PreparationNotice from '@/components/mitra/PreparationNotice';

export default function MitraLayoutClient({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, user } = useRequireAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Status verifikasi menentukan halaman mana yang boleh dibuka (P1-10).
  // Hanya diambil untuk akun yang memang sedang bermode mitra.
  const isPartnerMode = user?.active_role === 'partner';
  const { data: verification, isLoading: verificationLoading } = usePartnerVerificationStatus(
    mounted && isAuthenticated && isPartnerMode,
  );
  const accessLevel = accessLevelFor(pathname);
  const allowed = canAccess(pathname, verification);

  /* eslint-disable react-hooks/set-state-in-effect */
  // Penanda hidrasi: layout membaca auth store yang berbeda antara server & klien.
  useEffect(() => {
    setMounted(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (mounted && !isLoading && isAuthenticated) {
      const isException = pathname === '/mitra/register' || pathname === '/mitra/verification-status';

      if (user?.active_role !== 'partner' && !isException) {
        router.replace('/');
      }

      // Mitra yang di-suspend hanya boleh mengakses halaman status verifikasi.
      if (user?.active_role === 'partner' && user?.is_suspended && pathname !== '/mitra/verification-status') {
        router.replace('/mitra/verification-status');
      }

      // Mitra belum disetujui menyentuh halaman operasional → arahkan ke halaman
      // status, tempat alasan dan langkah berikutnya dijelaskan. Menampilkan
      // halaman operasional yang tombolnya pasti ditolak backend hanya membuat
      // mitra mengira aplikasinya rusak (P1-10).
      if (isPartnerMode && !verificationLoading && verification && !allowed) {
        router.replace(MITRA_BLOCKED_REDIRECT);
      }
    }
  }, [mounted, isLoading, isAuthenticated, user, pathname, router, isPartnerMode, verificationLoading, verification, allowed]);

  if (!mounted || isLoading) {
    return <PageSkeleton />;
  }

  const isException = pathname === '/mitra/register' || pathname === '/mitra/verification-status';
  if (!isAuthenticated || (user?.active_role !== 'partner' && !isException)) {
    return null;
  }

  // Blok render konten mitra untuk akun ter-suspend (kecuali halaman status verifikasi).
  if (user?.active_role === 'partner' && user?.is_suspended && pathname !== '/mitra/verification-status') {
    return null;
  }

  // Tahan render sampai status verifikasi diketahui — kalau tidak, halaman
  // operasional sempat terlihat sekejap sebelum redirect. Halaman `always`
  // (status, dokumen, profil) tidak ikut menunggu: justru itu yang dibutuhkan
  // mitra pending, dan menahannya berarti menahan satu-satunya jalan keluar.
  if (isPartnerMode && accessLevel !== 'always' && (verificationLoading || !verification)) {
    return <PageSkeleton />;
  }
  if (isPartnerMode && !allowed) {
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
    /^\/mitra\/services\/[^/]+\/edit/.test(pathname || '') ||
    /^\/mitra\/chat\/[^/]+/.test(pathname || '');

  // Halaman persiapan untuk mitra yang belum disetujui: katakan konsekuensinya
  // di tempat ia bekerja, bukan biarkan ia menebak kenapa tak ada pesanan masuk.
  const showPreparationNotice =
    isPartnerMode && accessLevel === 'prepare' && !!verification && verification !== 'APPROVED';

  return (
    <>
      {showPreparationNotice && <PreparationNotice status={verification as 'PENDING' | 'REJECTED'} />}
      {children}
      <div className={isExcludedFlow ? 'hidden md:block' : 'block'}>
        <MitraBottomNav approved={verification === 'APPROVED'} />
      </div>
    </>
  );
}
