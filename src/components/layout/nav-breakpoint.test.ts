import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Penjaga ambang navigasi global.
 *
 * Tiga berkas HARUS sepakat pada satu ambang (`lg`), karena bersama-sama mereka
 * memutuskan apakah ada navigasi di layar:
 *
 *   BottomNav      `lg:hidden`       . nav bawah tampil DI BAWAH lg
 *   HeaderWrapper  `hidden lg:block` . nav atas tampil MULAI lg
 *   layout.tsx     `pb-16 lg:pb-0`   . ruang untuk nav bawah
 *
 * Saat BottomNav memakai `md:hidden` sementara TopNavbar tetap `lg`, rentang
 * 768-1023px (iPad portrait, Surface, jendela desktop yang di-snap setengah)
 * kehilangan SELURUH navigasi global: yang bawah sudah pergi, yang atas belum
 * datang. Footer pun `hidden md:block` dan tidak memuat Profil/Pesanan/Chat,
 * jadi tidak ada apa pun yang menggantikannya.
 *
 * Itu bukan hipotesis . itu keadaan produksi sampai 2026-08-11 (audit A1).
 *
 * Test ini membaca sumbernya sebagai TEKS, bukan me-render: yang dijaga adalah
 * kesepakatan antar-berkas, dan itu hidup di kelasnya.
 */

const LAYOUT_DIR = __dirname;
const APP_DIR = path.resolve(LAYOUT_DIR, '../../app');

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

/** Buang komentar . komentar di berkas ini justru MENJELASKAN kelas yang salah. */
function code(file: string): string {
  return read(file)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const bottomNav = code(path.join(LAYOUT_DIR, 'BottomNav.tsx'));
const headerWrapper = code(path.join(LAYOUT_DIR, 'HeaderWrapper.tsx'));
const rootLayout = code(path.join(APP_DIR, 'layout.tsx'));

describe('ambang navigasi global . ketiganya harus sepakat di `lg`', () => {
  it('berkasnya benar-benar terbaca . penjaga atas berkas kosong selalu hijau', () => {
    expect(bottomNav).toContain('BottomNav');
    expect(headerWrapper).toContain('TopNavbar');
    expect(rootLayout).toContain('<body');
  });

  it('BottomNav bersembunyi di `lg`, bukan `md`', () => {
    expect(bottomNav).toContain('lg:hidden');
    // `md:hidden` di berkas ini SELALU berarti pita mati . tidak ada
    // pemakaian sah lain di dalamnya.
    expect(bottomNav).not.toContain('md:hidden');
  });

  it('HeaderWrapper memunculkan TopNavbar mulai `lg`', () => {
    expect(headerWrapper).toContain('hidden lg:block');
  });

  it('<body> menyediakan ruang nav sampai `lg`, bukan `md`', () => {
    expect(rootLayout).toContain('pb-16 lg:pb-0');
    expect(rootLayout).not.toContain('md:pb-0');
  });

  it('shell mitra tidak menambah ruang nav lagi . itu tugas <body>', () => {
    // Padding ganda: 64px dari <body> + 64px dari shell = 128px di bawah setiap
    // halaman mitra. Baris itu dulu ada semata-mata untuk menambal <body> yang
    // berhenti di `md`; sejak ambangnya sama, ia jadi mubazir.
    const mitraShell = code(path.join(APP_DIR, 'mitra/MitraLayoutClient.tsx'));
    expect(mitraShell).not.toContain('pb-16 lg:pb-0');
  });
});
