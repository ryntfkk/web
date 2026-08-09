import { describe, expect, it } from 'vitest';

import { accessLevelFor, canAccess, canEnterMitraShell, MITRA_BLOCKED_REDIRECT } from './mitra-access';

/**
 * Matrix akses mode mitra (P1-10). Ini aturan keamanan, bukan kosmetik:
 * sebelum ada matrix ini mitra pending/rejected bisa membuka semua halaman
 * operasional, menekan tombolnya, lalu ditolak backend . atau lebih buruk,
 * dibalas sukses atas nol baris.
 */
describe('accessLevelFor', () => {
  it('mengenali halaman akun sebagai always', () => {
    expect(accessLevelFor('/mitra/profile')).toBe('always');
    expect(accessLevelFor('/mitra/documents')).toBe('always');
    expect(accessLevelFor('/mitra/verification-status')).toBe('always');
  });

  it('mengenali halaman etalase sebagai prepare', () => {
    expect(accessLevelFor('/mitra/services')).toBe('prepare');
    expect(accessLevelFor('/mitra/services/new')).toBe('prepare');
    expect(accessLevelFor('/mitra/portfolio')).toBe('prepare');
    expect(accessLevelFor('/mitra/schedule')).toBe('prepare');
  });

  it('mengenali halaman yang mengandaikan bisnis hidup sebagai live', () => {
    expect(accessLevelFor('/mitra/orders')).toBe('live');
    expect(accessLevelFor('/mitra/wallet')).toBe('live');
    expect(accessLevelFor('/mitra/reviews')).toBe('live');
  });

  // Halaman riwayat penarikan ditambahkan belakangan; ia harus ikut terkunci
  // lewat prefix /mitra/wallet, bukan diam-diam terbuka.
  it('halaman baru di bawah prefix yang sudah ada ikut aturannya', () => {
    expect(accessLevelFor('/mitra/wallet/withdrawals')).toBe('live');
    expect(accessLevelFor('/mitra/wallet/withdraw')).toBe('live');
  });

  // Fail-closed. Rute baru yang lupa didaftarkan lebih baik terlalu tertutup
  // lalu ketahuan, daripada diam-diam terbuka untuk mitra belum terverifikasi.
  it('rute tak dikenal dianggap live (fail-closed)', () => {
    expect(accessLevelFor('/mitra/fitur-yang-belum-ada')).toBe('live');
    expect(accessLevelFor(null)).toBe('live');
  });

  // Prefix harus cocok pada BATAS SEGMEN. Tanpa itu "/mitra/servicesXYZ"
  // ikut terhitung sebagai halaman layanan.
  it('tidak mencocokkan prefix yang hanya mirip', () => {
    expect(accessLevelFor('/mitra/servicesXYZ')).toBe('live');
  });
});

describe('canAccess', () => {
  it('mitra approved boleh membuka semuanya', () => {
    expect(canAccess('/mitra/orders', 'APPROVED')).toBe(true);
    expect(canAccess('/mitra/services', 'APPROVED')).toBe(true);
    expect(canAccess('/mitra/profile', 'APPROVED')).toBe(true);
  });

  it('mitra pending boleh menyiapkan etalase & mengurus akun, bukan operasional', () => {
    expect(canAccess('/mitra/profile', 'PENDING')).toBe(true);
    expect(canAccess('/mitra/services', 'PENDING')).toBe(true);
    expect(canAccess('/mitra/orders', 'PENDING')).toBe(false);
    expect(canAccess('/mitra/wallet', 'PENDING')).toBe(false);
  });

  // Identitas usaha adalah data akun, bukan operasional. Vendor pending yang
  // salah ketik nama tampilnya harus bisa membetulkannya SEBELUM admin meninjau .
  // aturan fail-closed `accessLevelFor` akan menguncinya jadi `live` bila rutenya
  // lupa didaftarkan, dan halamannya tak pernah bisa dibuka pelamar.
  it('vendor pending boleh membuka identitas usaha', () => {
    expect(accessLevelFor('/mitra/business')).toBe('always');
    expect(canAccess('/mitra/business', 'PENDING')).toBe(true);
    expect(canAccess('/mitra/business', 'REJECTED')).toBe(true);
    expect(canAccess('/mitra/business', undefined)).toBe(true);
  });

  it('mitra rejected sama seperti pending . jalan keluarnya lewat halaman akun', () => {
    expect(canAccess('/mitra/verification-status', 'REJECTED')).toBe(true);
    expect(canAccess('/mitra/orders', 'REJECTED')).toBe(false);
  });

  // Status belum diketahui berarti JANGAN MENEBAK. Layout menahan render sampai
  // tahu; menebak "boleh" akan menampilkan halaman operasional sekejap.
  it('status belum diketahui menutup halaman non-always', () => {
    expect(canAccess('/mitra/orders', undefined)).toBe(false);
    expect(canAccess('/mitra/services', undefined)).toBe(false);
    // …kecuali halaman `always`, yang justru dibutuhkan mitra pending dan
    // menahannya berarti menahan satu-satunya jalan keluar.
    expect(canAccess('/mitra/profile', undefined)).toBe(true);
  });
});

describe('MITRA_BLOCKED_REDIRECT', () => {
  // Tujuannya harus halaman yang SELALU bisa dibuka, kalau tidak redirect-nya
  // memantul tanpa henti.
  it('menunjuk halaman yang selalu boleh diakses', () => {
    expect(accessLevelFor(MITRA_BLOCKED_REDIRECT)).toBe('always');
    expect(canAccess(MITRA_BLOCKED_REDIRECT, 'REJECTED')).toBe(true);
  });
});

/**
 * F-01: pelamar berstatus pending/rejected TIDAK punya role `partner` . backend
 * sengaja menahannya karena role itu membuka endpoint order/chat/wallet. Sebelum
 * gerbang ini ada, shell mitra menuntut role tersebut, sehingga halaman
 * `prepare` yang diizinkan matrix di atas tidak pernah bisa dicapai siapa pun.
 */
describe('canEnterMitraShell', () => {
  it('mitra approved yang sedang bermode mitra selalu boleh masuk', () => {
    expect(canEnterMitraShell('partner', 'APPROVED')).toBe(true);
  });

  it('pelamar pending & rejected boleh masuk walau tanpa role partner', () => {
    expect(canEnterMitraShell('customer', 'PENDING')).toBe(true);
    expect(canEnterMitraShell('customer', 'REJECTED')).toBe(true);
  });

  it('pelanggan biasa tetap ditolak', () => {
    expect(canEnterMitraShell('customer', 'NONE')).toBe(false);
    expect(canEnterMitraShell(undefined, 'NONE')).toBe(false);
  });

  it('status belum diketahui belum membuka pintu . layout menunggu, bukan menebak', () => {
    expect(canEnterMitraShell('customer', undefined)).toBe(false);
  });

  it('mitra approved yang sedang bermode pelanggan tidak diseret ke shell mitra', () => {
    // Ia harus menekan "Mode Mitra" dulu; itu yang menerbitkan token ber-role.
    expect(canEnterMitraShell('customer', 'APPROVED')).toBe(false);
  });
});

describe('canAccess untuk pelamar', () => {
  it('pelamar pending boleh menyiapkan etalase, tidak boleh halaman live', () => {
    expect(canAccess('/mitra/services/new', 'PENDING')).toBe(true);
    expect(canAccess('/mitra/schedule', 'PENDING')).toBe(true);
    expect(canAccess('/mitra/portfolio', 'PENDING')).toBe(true);
    expect(canAccess('/mitra/orders', 'PENDING')).toBe(false);
    expect(canAccess('/mitra/wallet', 'PENDING')).toBe(false);
    expect(canAccess('/mitra/chat', 'PENDING')).toBe(false);
  });

  it('akun tanpa pengajuan tidak boleh membuka apa pun selain halaman always', () => {
    expect(canAccess('/mitra/services', 'NONE')).toBe(false);
    expect(canAccess('/mitra/orders', 'NONE')).toBe(false);
  });
});
