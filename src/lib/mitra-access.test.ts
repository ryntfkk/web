import { describe, expect, it } from 'vitest';

import { accessLevelFor, canAccess, MITRA_BLOCKED_REDIRECT } from './mitra-access';

/**
 * Matrix akses mode mitra (P1-10). Ini aturan keamanan, bukan kosmetik:
 * sebelum ada matrix ini mitra pending/rejected bisa membuka semua halaman
 * operasional, menekan tombolnya, lalu ditolak backend — atau lebih buruk,
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

  it('mitra rejected sama seperti pending — jalan keluarnya lewat halaman akun', () => {
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
