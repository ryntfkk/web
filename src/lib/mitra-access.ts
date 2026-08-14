import type { PartnerApplicationStatus } from '@/hooks/usePartnerVerificationStatus';

/**
 * Matrix akses mode mitra (P1-10) . SATU definisi untuk seluruh aplikasi.
 *
 * ⚠️ MODEL MITRA INSTAN (PLAN-MITRA-INSTAN, 2026-08-14): `verification_status`
 * berubah makna dari "gerbang boleh beroperasi" menjadi "status KYC". Mitra
 * PENDING/REJECTED kini LIVE sejak mendaftar . tampil publik, bisa dipesan,
 * dan backend memberi role `partner` + klaim JWT sejak onboarding. Yang
 * digerbangi KYC hanya TARIK DANA (backend membalas `KYC_REQUIRED`).
 *
 * Konsekuensinya matrix ini menyusut jadi dua pertanyaan:
 *  - `always`/`prepare`/`live` DIPERTAHANKAN sebagai taksonomi (dipakai
 *    banner persiapan & test), tetapi PENDING/REJECTED kini lolos ketiganya.
 *  - Satu-satunya yang tetap tertutup: akun TANPA baris mitra (`NONE`) dan
 *    status yang belum diketahui (layout menahan render sampai tahu).
 *
 * Riwayat model lama (pending hanya always+prepare) ada di git . jangan
 * dikembalikan tanpa membaca PLAN-MITRA-INSTAN §2.
 */
export type MitraAccessLevel = 'always' | 'prepare' | 'live';

/** Urut dari yang paling spesifik: pencocokan memakai prefix pertama yang cocok. */
const ACCESS_RULES: Array<{ prefix: string; level: MitraAccessLevel }> = [
  // ── always ──
  { prefix: '/mitra/verification-status', level: 'always' },
  // Wizard KYC menyusul (model mitra instan): syarat tarik dana + badge.
  { prefix: '/mitra/kyc', level: 'always' },
  { prefix: '/mitra/register', level: 'always' },
  { prefix: '/mitra/profile', level: 'always' },
  { prefix: '/mitra/documents', level: 'always' },
  { prefix: '/mitra/bank-account', level: 'always' },
  { prefix: '/mitra/basecamp', level: 'always' },
  // Identitas badan usaha . sekelas akun & berkas, bukan operasional. Vendor
  // yang masih pending justru yang paling perlu membetulkan nama tampil atau
  // kontak bisnisnya sebelum admin meninjau.
  { prefix: '/mitra/business', level: 'always' },
  { prefix: '/mitra/bantuan', level: 'always' },

  // ── prepare ──
  { prefix: '/mitra/services', level: 'prepare' },
  { prefix: '/mitra/portfolio', level: 'prepare' },
  { prefix: '/mitra/schedule', level: 'prepare' },

  // ── live ──
  { prefix: '/mitra/dashboard', level: 'live' },
  { prefix: '/mitra/orders', level: 'live' },
  { prefix: '/mitra/chat', level: 'live' },
  { prefix: '/mitra/reviews', level: 'live' },
  { prefix: '/mitra/wallet', level: 'live' },
];

/**
 * Rute mitra yang tidak terdaftar dianggap `live`. Di model instan `live`
 * terbuka untuk semua status pelamar, jadi fail-closed-nya kini terletak pada
 * `NONE`/undefined . bukan pada level.
 */
export function accessLevelFor(pathname: string | null): MitraAccessLevel {
  if (!pathname) return 'live';
  const rule = ACCESS_RULES.find(
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + '/'),
  );
  return rule?.level ?? 'live';
}

/** Halaman yang boleh dibuka pada status verifikasi tertentu. */
export function canAccess(
  pathname: string | null,
  status: PartnerApplicationStatus | undefined,
): boolean {
  const level = accessLevelFor(pathname);
  if (level === 'always') return true;
  // Status belum diketahui → jangan tebak. Layout menahan render sampai tahu.
  if (!status) return false;
  // Bukan pelamar sama sekali . tidak ada satu pun halaman mitra untuknya.
  if (status === 'NONE') return false;
  // Model mitra instan: PENDING/REJECTED = mitra live yang belum lolos KYC.
  // Seluruh halaman operasional terbuka; gerbang KYC hidup di alur tarik dana
  // (halaman withdraw + backend KYC_REQUIRED), bukan di matrix ini.
  return true;
}

/**
 * Apakah akun ini boleh membuka shell mitra sama sekali (F-01)?
 *
 * Dua jalan masuk, dan keduanya perlu:
 *
 *  1. `active_role === 'partner'` . mitra yang menekan "Mode Mitra". Di model
 *     instan backend memberi role sejak onboarding, jadi jalur ini kini
 *     mencakup mitra pending juga (setelah refresh token / switch-role).
 *  2. **Pelamar** dengan pengajuan PENDING/REJECTED . penjaga untuk sesi yang
 *     token-nya belum memuat klaim partner (JWT lama, lahir sebelum
 *     onboarding).
 */
export function canEnterMitraShell(
  activeRole: string | undefined,
  status: PartnerApplicationStatus | undefined,
): boolean {
  if (activeRole === 'partner') return true;
  return status === 'PENDING' || status === 'REJECTED';
}

/**
 * Ke mana mitra diarahkan saat menyentuh halaman yang belum boleh dibuka.
 * Selalu halaman status: di sanalah alasannya dijelaskan dan langkah
 * berikutnya diberikan . bukan halaman kosong tanpa penjelasan.
 */
export const MITRA_BLOCKED_REDIRECT = '/mitra/verification-status';
