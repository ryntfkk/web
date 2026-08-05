import type { PartnerVerificationStatus } from '@/hooks/usePartnerVerificationStatus';

/**
 * Matrix akses mode mitra (P1-10) . SATU definisi untuk seluruh aplikasi.
 *
 * Sebelumnya mitra berstatus pending/rejected bisa membuka semua halaman
 * operasional. Halamannya memuat, tombolnya bisa ditekan, lalu backend menolak .
 * atau lebih buruk, membalas sukses atas nol baris. Yang dilihat mitra adalah
 * aplikasi yang seolah berfungsi padahal belum boleh dipakai.
 *
 * Tiga tingkat, dan pembagiannya berdasar satu pertanyaan: **apakah halaman ini
 * mengandaikan bisnisnya sudah hidup?**
 *
 * - `always`  . akun & berkas. Justru inilah yang harus dikerjakan mitra pending.
 * - `prepare` . menyiapkan etalase. Aman sebelum disetujui karena layanan mitra
 *               non-approved TIDAK tampil publik (query publik menyaring
 *               `verification_status = 'approved'`), jadi tak ada pelanggan yang
 *               bisa memesannya lebih dulu.
 * - `live`    . mengandaikan ada pesanan, pelanggan, atau uang. Tidak masuk akal
 *               sebelum disetujui.
 */
export type MitraAccessLevel = 'always' | 'prepare' | 'live';

/** Urut dari yang paling spesifik: pencocokan memakai prefix pertama yang cocok. */
const ACCESS_RULES: Array<{ prefix: string; level: MitraAccessLevel }> = [
  // ── always ──
  { prefix: '/mitra/verification-status', level: 'always' },
  { prefix: '/mitra/register', level: 'always' },
  { prefix: '/mitra/profile', level: 'always' },
  { prefix: '/mitra/documents', level: 'always' },
  { prefix: '/mitra/bank-account', level: 'always' },
  { prefix: '/mitra/basecamp', level: 'always' },
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
 * Rute mitra yang tidak terdaftar dianggap `live` . fail-closed. Halaman baru
 * lebih baik terlalu tertutup lalu ketahuan, daripada diam-diam terbuka untuk
 * mitra yang belum diverifikasi.
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
  status: PartnerVerificationStatus | undefined,
): boolean {
  const level = accessLevelFor(pathname);
  if (level === 'always') return true;
  // Status belum diketahui → jangan tebak. Layout menahan render sampai tahu.
  if (!status) return false;
  if (status === 'APPROVED') return true;
  return level === 'prepare';
}

/**
 * Ke mana mitra diarahkan saat menyentuh halaman yang belum boleh dibuka.
 * Selalu halaman status: di sanalah alasannya dijelaskan dan langkah
 * berikutnya diberikan . bukan halaman kosong tanpa penjelasan.
 */
export const MITRA_BLOCKED_REDIRECT = '/mitra/verification-status';
