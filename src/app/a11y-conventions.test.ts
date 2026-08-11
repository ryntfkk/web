import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Penjaga aksesibilitas . seluruh `src/app` DAN `src/components`.
 *
 * Sengaja mencakup `src/components` juga: penjaga tata letak
 * (`layout-conventions.test.ts`) hanya memindai `src/app`, dan itulah sebabnya
 * 40 utilitas warna mentah bisa bertahan di komponen bersama tanpa ada yang
 * tahu (audit F2). Aturan a11y tidak boleh mewarisi titik buta yang sama .
 * komponen bersamalah yang dipakai puluhan halaman sekaligus.
 */

const SRC_DIR = path.resolve(__dirname, '..');

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectFiles(full));
      continue;
    }
    if (!/\.tsx$/.test(entry) || /\.test\.tsx$/.test(entry)) continue;
    out.push(full);
  }
  return out;
}

function rel(file: string): string {
  return path.relative(SRC_DIR, file).split(path.sep).join('/');
}

/** Hanya baris kode . komentar di sini justru MENJELASKAN pola yang dilarang. */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const ALL_FILES = collectFiles(SRC_DIR);

/**
 * `<input type="radio|checkbox" className="hidden">`.
 *
 * `hidden` = `display:none`, yang mengeluarkan elemen dari urutan tab DAN dari
 * pohon aksesibilitas. Kontrol bergaya di sebelahnya cuma `<div>` . jadi
 * pilihannya tidak bisa dicapai keyboard dan tidak diumumkan pembaca layar.
 *
 * Ini bukan kasus teoretis: sampai 2026-08-11 KETIGA metode pembayaran di
 * `/payment/[order_id]` memakai pola ini, sehingga tombol "Bayar Sekarang"
 * tetap `disabled` selamanya bagi siapa pun yang tidak memakai tetikus (D2).
 *
 * Yang benar: `className="sr-only"` . tetap bisa difokus & terbaca . plus
 * `focus-within:ring-*` pada <label> pembungkusnya agar fokusnya TERLIHAT.
 */
const RADIO_HIDDEN = /<input[^>]*type="(?:radio|checkbox)"[^>]*className="hidden"/;
/** Urutan atribut bisa terbalik . `className` lebih dulu, `type` menyusul. */
const RADIO_HIDDEN_REVERSED = /<input[^>]*className="hidden"[^>]*type="(?:radio|checkbox)"/;

describe('konvensi aksesibilitas . seluruh src', () => {
  it('menemukan berkas untuk diperiksa', () => {
    // Tanpa ini, daftar yang KOSONG akan tampak sebagai "semua aturan lolos".
    expect(ALL_FILES.length).toBeGreaterThan(100);
  });

  it('polanya benar-benar cocok . penjaga yang lumpuh selalu hijau', () => {
    expect(RADIO_HIDDEN.test('<input type="radio" name="x" className="hidden" />')).toBe(true);
    expect(RADIO_HIDDEN.test('<input type="checkbox" className="hidden" />')).toBe(true);
    expect(RADIO_HIDDEN_REVERSED.test('<input className="hidden" type="radio" />')).toBe(true);
    // Bentuk yang BENAR tidak boleh ikut terjaring.
    expect(RADIO_HIDDEN.test('<input type="radio" className="sr-only" />')).toBe(false);
    // `hidden` pada input NON-pilihan (mis. file uploader tersembunyi) juga
    // tidak terjaring . aturannya khusus radio & checkbox.
    expect(RADIO_HIDDEN.test('<input type="file" className="hidden" />')).toBe(false);
  });

  it('tidak ada radio/checkbox yang disembunyikan dengan `hidden` . pakai `sr-only`', () => {
    const offenders = ALL_FILES.filter((f) => {
      const src = code(f);
      return RADIO_HIDDEN.test(src) || RADIO_HIDDEN_REVERSED.test(src);
    }).map(rel);
    expect(offenders).toEqual([]);
  });

  /**
   * Satu halaman = satu `<h1>`.
   *
   * `MobilePageHeader` merender `<h1>` secara DEFAULT, jadi halaman yang juga
   * menulis `<h1>` sendiri di badan konten menghasilkan DUA . pembaca layar
   * mengumumkan dua judul halaman. Aturannya sudah tertulis di komponennya
   * sendiri ("Halaman yang punya H1 sendiri di badan konten WAJIB set 'p'")
   * dan tetap dilanggar 11 halaman sampai 2026-08-11 (audit A6): dokumen jelas
   * tidak cukup ketika pelanggarannya tidak membuat apa pun gagal.
   */
  it('halaman ber-<h1> sendiri WAJIB mengoper titleAs="p" ke MobilePageHeader', () => {
    const offenders = ALL_FILES.filter((f) => {
      const src = code(f);
      if (!/<MobilePageHeader/.test(src)) return false;
      if (!/<h1[\s>]/.test(src)) return false;
      return !/titleAs=/.test(src);
    }).map(rel);
    expect(offenders).toEqual([]);
  });
});
