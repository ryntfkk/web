import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Penjaga token warna . seluruh `src`.
 *
 * Tailwind tidak menghasilkan kelas untuk token yang tidak ada, dan tidak
 * mengeluh. `text-brand-gray-600` pada token yang tak terdefinisi bukan warna
 * yang salah sedikit . ia TIDAK MELAKUKAN APA-APA, dan elemennya mewarisi
 * warna induknya.
 *
 * Itu persis yang terjadi sampai 2026-08-11: `brand-gray-500` & `brand-gray-600`
 * dipakai 14 kali . 10 di antaranya di `/jadi-mitra`, landing akuisisi mitra .
 * sehingga seluruh teks penjelasnya kehilangan hierarki visual di halaman yang
 * tugasnya meyakinkan calon mitra (audit C2).
 *
 * Tidak ada penjaga lain yang bisa menangkap ini: build hijau, lint hijau,
 * test hijau. Hanya perbandingan langsung DEFINISI vs PEMAKAIAN yang bisa.
 */

const SRC_DIR = path.resolve(__dirname, '..');
const GLOBALS_CSS = path.join(__dirname, 'globals.css');

/** Utility Tailwind yang menerima warna. */
const COLOR_UTILITIES =
  'bg|text|border|fill|ring|from|via|to|divide|outline|decoration|stroke|shadow|accent|caret|placeholder';

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectFiles(full));
      continue;
    }
    if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) continue;
    out.push(full);
  }
  return out;
}

/** Token yang benar-benar didefinisikan di `@theme` . `brand-red`, `brand-gray-450`, … */
function definedTokens(): Set<string> {
  const css = readFileSync(GLOBALS_CSS, 'utf8');
  const found = css.match(/--color-(brand-[a-z0-9-]+)\s*:/g) ?? [];
  return new Set(found.map((m) => m.replace(/--color-/, '').replace(/\s*:$/, '')));
}

/** Token yang DIPAKAI di kelas mana pun, apa pun varian & modifier opasitasnya. */
function usedTokens(files: string[]): Map<string, string[]> {
  const re = new RegExp(`(?:${COLOR_UTILITIES})-(brand-[a-z0-9-]+)`, 'g');
  const used = new Map<string, string[]>();
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(re)) {
      // Buang modifier opasitas (`bg-brand-red/10`) . regex sudah berhenti di
      // `/`, tapi jaga-jaga bila kelasnya diakhiri tanda lain.
      const token = m[1].replace(/\/.*$/, '');
      const where = used.get(token) ?? [];
      const rel = path.relative(SRC_DIR, file).split(path.sep).join('/');
      if (!where.includes(rel)) where.push(rel);
      used.set(token, where);
    }
  }
  return used;
}

const FILES = collectFiles(SRC_DIR);
const DEFINED = definedTokens();
const USED = usedTokens(FILES);

describe('token warna brand . definisi vs pemakaian', () => {
  it('berkas & definisinya benar-benar terbaca . penjaga kosong selalu hijau', () => {
    expect(FILES.length).toBeGreaterThan(100);
    expect(DEFINED.size).toBeGreaterThan(30);
    expect(USED.size).toBeGreaterThan(20);
    // Sanity: token yang jelas ada harus terdeteksi di kedua sisi.
    expect(DEFINED.has('brand-red')).toBe(true);
    expect(DEFINED.has('brand-gray-450')).toBe(true);
    expect(USED.has('brand-red')).toBe(true);
  });

  it('setiap token yang dipakai punya definisi di globals.css', () => {
    const hantu = [...USED.entries()]
      .filter(([token]) => !DEFINED.has(token))
      .map(([token, files]) => `${token} → ${files.join(', ')}`);
    expect(hantu).toEqual([]);
  });
});

/**
 * Ambang bawah ukuran teks: 11px (D7, audit 2026-08-21).
 *
 * `DESIGN_GUIDELINES.md` §7.3 hanya mendefinisikan sampai `text-xs` (12px),
 * tetapi kode sempat memuat 97 kemunculan `text-[10px]` DAN 7 `text-[9px]`
 * plus 2 `text-[8px]` . seluruhnya di layar yang dipakai dari ponsel. Ukuran
 * sekecil itu bukan "padat", ia tidak terbaca.
 *
 * 11px dipilih, bukan 12px, karena 11px SUDAH dipakai luas di badge & caption
 * sini . menaikkan semuanya ke 12px berarti mengubah tata letak 39 berkas
 * tanpa seorang pun melihat layarnya. Yang dijaga di sini batas bawahnya;
 * menaikkan lagi ke skala resmi boleh dilakukan bertahap.
 */
describe('ambang ukuran teks', () => {
  const TEKS_TERLALU_KECIL = /text-\[(?:[0-9]|10)px\]/;

  it('tidak ada teks di bawah 11px', () => {
    const offenders = FILES.filter((f) => TEKS_TERLALU_KECIL.test(readFileSync(f, 'utf8'))).map(
      (f) => path.relative(SRC_DIR, f).split(path.sep).join('/'),
    );
    expect(offenders).toEqual([]);
  });

  it('regex ambangnya sendiri benar', () => {
    expect(TEKS_TERLALU_KECIL.test('text-[10px]')).toBe(true);
    expect(TEKS_TERLALU_KECIL.test('text-[9px]')).toBe(true);
    expect(TEKS_TERLALU_KECIL.test('text-[11px]')).toBe(false);
    expect(TEKS_TERLALU_KECIL.test('text-[13px]')).toBe(false);
  });
});
