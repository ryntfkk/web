"use client";

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import MitraBottomNav from '@/components/layout/MitraBottomNav';
import { PageSkeleton } from '@/components/ui/skeleton';
import { usePartnerVerificationStatus } from '@/hooks/usePartnerVerificationStatus';
import { accessLevelFor, canAccess, canEnterMitraShell, MITRA_BLOCKED_REDIRECT } from '@/lib/mitra-access';
import MitraSidebar from '@/components/layout/MitraSidebar';
import { cn } from '@/lib/utils';

export default function MitraLayoutClient({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, user } = useRequireAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Status verifikasi menentukan halaman mana yang boleh dibuka (P1-10) DAN
  // apakah akun ini boleh masuk shell mitra sama sekali (F-01).
  //
  // Diambil untuk SETIAP akun terautentikasi yang menyentuh /mitra/*, bukan
  // hanya yang `active_role === 'partner'`. Pelamar berstatus pending tidak
  // pernah menerima role itu (backend sengaja menahannya), jadi memakainya
  // sebagai syarat pengambilan status membuat pelamar tak pernah bisa
  // dikenali . dan halaman `prepare` yang secara eksplisit diizinkan matrix
  // akses menjadi tidak terjangkau siapa pun.
  const { data: verification, isLoading: verificationLoading } = usePartnerVerificationStatus(
    mounted && isAuthenticated,
  );
  const isPartnerMode = canEnterMitraShell(user?.active_role, verification);
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

      // Redirect hanya setelah status pengajuan diketahui . menendang lebih
      // dulu berarti setiap pelamar terlempar pulang sebelum sempat dikenali.
      if (!verificationLoading && !isPartnerMode && !isException) {
        router.replace('/');
      }

      // Akun yang di-suspend hanya boleh mengakses halaman status verifikasi.
      if (isPartnerMode && user?.is_suspended && pathname !== '/mitra/verification-status') {
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
  // Selama status pengajuan belum diketahui, tahan render . jangan menyimpulkan
  // "bukan mitra" dari ketiadaan role, karena pelamar memang tidak punya role.
  if (isAuthenticated && !isException && verificationLoading) {
    return <PageSkeleton />;
  }
  if (!isAuthenticated || (!isPartnerMode && !isException)) {
    return null;
  }

  // Blok render konten mitra untuk akun ter-suspend (kecuali halaman status verifikasi).
  if (isPartnerMode && user?.is_suspended && pathname !== '/mitra/verification-status') {
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
    // Wizard KYC (model mitra instan) . form panjang dengan aksi di dasar layar.
    '/mitra/kyc',
    '/mitra/services/new',
    '/mitra/wallet/withdraw',
    // '/mitra/basecamp' TIDAK dikecualikan: tombol simpannya inline di badan
    // form, bukan action bar fixed . bottom nav tidak menutupi apa pun.
    // Form dengan action bar fixed di bawah . sembunyikan bottom nav agar tombol tidak tertutup.
    '/mitra/schedule',
  ];

  const isExcludedFlow = excludeBottomNavPatterns.includes(pathname || '') ||
    /^\/mitra\/orders\/[^/]+/.test(pathname || '') ||
    /^\/mitra\/services\/[^/]+\/edit/.test(pathname || '') ||
    /^\/mitra\/chat\/[^/]+/.test(pathname || '') ||
    // Ruang percakapan CS . layar penuh dengan kolom ketik di dasar layar,
    // persis seperti room chat mitra-pelanggan.
    /^\/mitra\/bantuan\/chat\/[^/]+/.test(pathname || '');

  // Spanduk "menunggu verifikasi" TIDAK dirender di sini. Shell merender
  // sebelum `{children}`, dan header halaman ada di dalam children . spanduknya
  // dulu duduk di ATAS header. Sekarang `MitraPageHeader` yang merendernya,
  // tepat di bawah bilah headernya sendiri (lihat komentar di komponen itu).

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

      {/* Latar, tinggi, dan ruang nav milik SHELL, bukan halaman. Sebelum ini
          `page-h bg-brand-gray-60 pb-24` diulang di 21 halaman, dan halaman yang
          lupa menyalinnya (mis. /mitra/register) kehilangan salah satunya.

          `min-h-[100dvh]`, bukan `.page-h`: utilitas itu `100dvh - 4rem` karena
          memperhitungkan TopNavbar . dan mode mitra TIDAK punya TopNavbar di
          breakpoint mana pun (HeaderWrapper menepi untuk /mitra), jadi latar
          abunya berhenti 64px sebelum dasar layar.

          lg:pl-60 = lebar sidebar. Lebar bacanya diatur halaman lewat
          MitraPageContainer (§5.3); shell hanya menyediakan ruangnya. */}
      <div
        className={cn(
          'min-h-[100dvh] bg-brand-gray-60',
          showSidebar && 'lg:pl-60',
          // Ruang bottom-nav TIDAK ditambahkan di sini lagi. Baris ini dulu
          // `!isExcludedFlow && 'pb-16 lg:pb-0'`, murni untuk menambal `<body>`
          // yang berhenti di `md` sementara nav tampil sampai `lg`. Sejak
          // <body> memakai `pb-16 lg:pb-0` (ambang yang sama dengan nav),
          // tambalan itu jadi padding GANDA: 128px di bawah setiap halaman
          // mitra. Kalau ambang di layout.tsx diubah lagi, perbaiki di sana .
          // jangan menambal ulang di sini.
        )}
      >
        {children}
      </div>

      {/* Bottom nav HANYA di bawah lg . di desktop navigasinya sidebar.
          Excluded flow punya bilah aksi fixed sendiri (mis. Simpan Jadwal,
          Terima Pesanan). Bottom-nav yang ikut tampil di md menutupi bilah itu
          (z-50 vs z-50, DOM terakhir menang). Sembunyikan sepenuhnya untuk
          excluded flow: bilah aksi halaman jadi satu-satunya CTA bawah, dan
          tombol back di MitraPageHeader cukup untuk navigasi naik di md. */}
      <div className={`lg:hidden ${isExcludedFlow ? 'hidden' : 'block'}`}>
        <MitraBottomNav />
      </div>
    </>
  );
}
