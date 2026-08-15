import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

/**
 * Penjaga A18: setiap folder route baru di `src/app` WAJIB terdaftar di
 * `RESERVED_ROOT_SEGMENTS` (HeaderWrapper).
 *
 * `src/app/[username]` menangkap segmen tunggal APA PUN di root. Daftar inilah
 * yang membedakan `/promos` (halaman) dari `/budi` (profil mitra). Folder route
 * baru yang lupa didaftarkan akan dikira profil mitra: TopNavbar-nya hilang di
 * mobile DAN (sejak FEATURE #11) BottomNav ikut disembunyikan. Sudah dua kali
 * kejadian (`/jasa`, `/kategori`) . dokumen & komentar saja terbukti tak cukup.
 *
 * Berbeda dari penjaga teks lain di folder ini, test ini MENGIMPOR set-nya
 * langsung supaya yang diuji adalah nilai yang benar-benar dipakai runtime.
 */

// HeaderWrapper menarik TopNavbar (rantai hook & store) . tidak relevan untuk
// test ini, jadi dipotong di sini.
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('@/components/layout/TopNavbar', () => ({ default: () => null }));

import { RESERVED_ROOT_SEGMENTS, isPartnerProfilePath } from './HeaderWrapper';

const APP_DIR = path.resolve(__dirname, '../../app');

/**
 * Semua segmen root nyata di `src/app`:
 * - route group `(auth)` BUKAN segmen URL . anak-anaknya yang jadi segmen root;
 * - segmen dinamis (`[username]`) dilewati . justru dialah yang dijaga;
 * - berkas non-route (page.tsx, globals.css, *.test.ts) bukan direktori dan
 *   tidak ikut terjaring.
 */
function collectRootSegments(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    if (entry.startsWith('[')) continue; // segmen dinamis
    if (entry.startsWith('(')) {
      // Route group: foldernya tidak menjadi segmen URL, anak-anaknya iya.
      out.push(...collectRootSegments(full));
      continue;
    }
    out.push(entry);
  }
  return out;
}

const SEGMENTS = collectRootSegments(APP_DIR);

describe('RESERVED_ROOT_SEGMENTS . cermin isi src/app', () => {
  it('menemukan segmen untuk diperiksa . penjaga atas daftar kosong selalu hijau', () => {
    expect(SEGMENTS.length).toBeGreaterThan(20);
    // Anak route group HARUS ikut terjaring . login hidup di (auth)/login.
    expect(SEGMENTS).toContain('login');
    expect(SEGMENTS).toContain('orders');
  });

  it('setiap folder route di src/app terdaftar di RESERVED_ROOT_SEGMENTS', () => {
    const missing = SEGMENTS.filter((s) => !RESERVED_ROOT_SEGMENTS.has(s));
    // Bila merah: tambahkan segmennya ke RESERVED_ROOT_SEGMENTS di
    // HeaderWrapper.tsx . kalau tidak, route barumu dikira profil mitra.
    expect(missing).toEqual([]);
  });

  it('isPartnerProfilePath: segmen terdaftar bukan profil, segmen bebas iya', () => {
    expect(isPartnerProfilePath('/budi')).toBe(true);
    expect(isPartnerProfilePath('/promos')).toBe(false);
    expect(isPartnerProfilePath('/login')).toBe(false);
    expect(isPartnerProfilePath('/')).toBe(false);
    expect(isPartnerProfilePath('/orders/123')).toBe(false);
  });
});
