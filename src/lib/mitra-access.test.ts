import { describe, expect, it } from 'vitest';

import { accessLevelFor, canAccess, canEnterMitraShell, MITRA_BLOCKED_REDIRECT } from './mitra-access';

/**
 * Matrix akses mode mitra . aturan keamanan, bukan kosmetik.
 *
 * DIREVISI SENGAJA untuk MODEL MITRA INSTAN (PLAN-MITRA-INSTAN, 2026-08-14):
 * mitra PENDING/REJECTED kini live sejak mendaftar (backend memberi role +
 * membuka query publik), jadi ekspektasi lama "pending dilarang orders/wallet"
 * DIBALIK dengan sadar . bukan penjaga yang hilang. Yang tetap dikunci:
 * NONE/undefined tertutup, dan gerbang tarik dana hidup di backend
 * (KYC_REQUIRED) + halaman withdraw, bukan di matrix ini.
 */
describe('accessLevelFor', () => {
  it('mengenali halaman akun sebagai always', () => {
    expect(accessLevelFor('/mitra/profile')).toBe('always');
    expect(accessLevelFor('/mitra/documents')).toBe('always');
    expect(accessLevelFor('/mitra/verification-status')).toBe('always');
    // Wizard KYC menyusul: harus selalu terbuka . inilah jalan keluar mitra
    // pending menuju badge & tarik dana.
    expect(accessLevelFor('/mitra/kyc')).toBe('always');
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

  it('halaman baru di bawah prefix yang sudah ada ikut aturannya', () => {
    expect(accessLevelFor('/mitra/wallet/withdrawals')).toBe('live');
    expect(accessLevelFor('/mitra/wallet/withdraw')).toBe('live');
  });

  it('rute tak dikenal dianggap live', () => {
    expect(accessLevelFor('/mitra/fitur-yang-belum-ada')).toBe('live');
    expect(accessLevelFor(null)).toBe('live');
  });

  // Prefix harus cocok pada BATAS SEGMEN. Tanpa itu "/mitra/servicesXYZ"
  // ikut terhitung sebagai halaman layanan.
  it('tidak mencocokkan prefix yang hanya mirip', () => {
    expect(accessLevelFor('/mitra/servicesXYZ')).toBe('live');
  });
});

describe('canAccess (model mitra instan)', () => {
  it('mitra approved boleh membuka semuanya', () => {
    expect(canAccess('/mitra/orders', 'APPROVED')).toBe(true);
    expect(canAccess('/mitra/services', 'APPROVED')).toBe(true);
    expect(canAccess('/mitra/profile', 'APPROVED')).toBe(true);
  });

  // INTI MODEL INSTAN: pending/rejected = mitra live yang belum lolos KYC.
  // Seluruh halaman operasional terbuka . dashboard, pesanan, chat, dompet.
  // (Dompet tetap terbuka: mitra harus bisa MELIHAT saldonya menumpuk; yang
  // digerbangi KYC hanya aksi TARIK di halaman withdraw + backend.)
  it('mitra pending kini boleh membuka halaman operasional', () => {
    expect(canAccess('/mitra/dashboard', 'PENDING')).toBe(true);
    expect(canAccess('/mitra/orders', 'PENDING')).toBe(true);
    expect(canAccess('/mitra/chat', 'PENDING')).toBe(true);
    expect(canAccess('/mitra/wallet', 'PENDING')).toBe(true);
    expect(canAccess('/mitra/services', 'PENDING')).toBe(true);
  });

  it('mitra rejected sama seperti pending . KYC-nya yang ditolak, bukan bisnisnya', () => {
    expect(canAccess('/mitra/orders', 'REJECTED')).toBe(true);
    expect(canAccess('/mitra/wallet', 'REJECTED')).toBe(true);
    expect(canAccess('/mitra/verification-status', 'REJECTED')).toBe(true);
  });

  it('vendor pending boleh membuka identitas usaha', () => {
    expect(accessLevelFor('/mitra/business')).toBe('always');
    expect(canAccess('/mitra/business', 'PENDING')).toBe(true);
    expect(canAccess('/mitra/business', undefined)).toBe(true);
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

  // Fail-closed yang TERSISA di matrix ini: bukan pelamar = bukan mitra.
  it('akun tanpa pengajuan tidak boleh membuka apa pun selain halaman always', () => {
    expect(canAccess('/mitra/services', 'NONE')).toBe(false);
    expect(canAccess('/mitra/orders', 'NONE')).toBe(false);
    expect(canAccess('/mitra/wallet', 'NONE')).toBe(false);
  });
});

describe('MITRA_BLOCKED_REDIRECT', () => {
  it('menunjuk halaman yang selalu boleh diakses', () => {
    expect(accessLevelFor(MITRA_BLOCKED_REDIRECT)).toBe('always');
    expect(canAccess(MITRA_BLOCKED_REDIRECT, 'REJECTED')).toBe(true);
  });
});

describe('canEnterMitraShell', () => {
  it('mitra bermode mitra selalu boleh masuk', () => {
    expect(canEnterMitraShell('partner', 'APPROVED')).toBe(true);
    // Model instan: pending juga bisa ber-active_role partner (role diberikan
    // sejak onboarding).
    expect(canEnterMitraShell('partner', 'PENDING')).toBe(true);
  });

  it('pelamar pending & rejected boleh masuk walau token lamanya tanpa role partner', () => {
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
