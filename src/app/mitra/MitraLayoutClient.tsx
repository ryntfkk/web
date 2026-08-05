"use client";

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import MitraBottomNav from '@/components/layout/MitraBottomNav';
import { PageSkeleton } from '@/components/ui/skeleton';
import { usePartnerVerificationStatus } from '@/hooks/usePartnerVerificationStatus';
import { accessLevelFor, canAccess, MITRA_BLOCKED_REDIRECT } from '@/lib/mitra-access';
import PreparationNotice from '@/components/mitra/PreparationNotice';
import MitraSidebar from '@/components/layout/MitraSidebar';

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

  // Tahan render sampai status verifikasi diketahui . kalau tidak, halaman
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
    // Form dengan action bar fixed di bawah . sembunyikan bottom nav agar tombol tidak tertutup.
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

  // Shell desktop (P1-13 / §5.2): sidebar menggantikan bottom nav mulai `lg`.
  // Bottom nav yang fixed di layar lebar membuat mode mitra tampak seperti
  // aplikasi ponsel yang diletakkan di tengah layar kosong.
  // Sidebar hanya untuk akun yang MEMANG sedang bermode mitra. Halaman
  // pengecualian (/mitra/register) dibuka pelanggan yang belum jadi mitra:
  // bagi mereka sidebar itu daftar menu ke halaman yang belum jadi miliknya,
  // sekaligus menggeser formulir 240px ke kanan sementara bilah aksi tetap
  // terpusat pada viewport - itulah tampilan yang miring di desktop.
  const showSidebar = isPartnerMode;

  return (
    <>
      {showSidebar && <MitraSidebar verification={verification} />}

      {/* lg:pl-60 = lebar sidebar. Konten di dalam halaman yang mengatur
          lebar bacanya sendiri (§5.3); shell hanya menyediakan ruangnya. */}
      <div className={showSidebar ? 'lg:pl-60' : ''}>
        {showPreparationNotice && <PreparationNotice status={verification as 'PENDING' | 'REJECTED'} />}
        {children}
      </div>

      {/* Bottom nav HANYA di bawah lg . di desktop navigasinya sidebar.
          Excluded flow punya bilah aksi fixed sendiri (mis. Simpan Jadwal,
          Terima Pesanan). Bottom-nav yang ikut tampil di md menutupi bilah itu
          (z-50 vs z-50, DOM terakhir menang). Sembunyikan sepenuhnya untuk
          excluded flow: bilah aksi halaman jadi satu-satunya CTA bawah, dan
          tombol back di MitraPageHeader cukup untuk navigasi naik di md. */}
      <div className={`lg:hidden ${isExcludedFlow ? 'hidden' : 'block'}`}>
        <MitraBottomNav approved={verification === 'APPROVED'} />
      </div>
    </>
  );
}
