import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Penjaga konvensi tata letak mode mitra.
 *
 * Aturannya sudah tertulis di `DEVELOPER_NOTES.md` §UI mode mitra sejak lama
 * ("`MitraPageContainer` . jangan mengetik `max-w-*` sendiri"), dan tetap
 * dilanggar 17 dari 21 halaman. Dokumen jelas tidak cukup: penyimpangan tata
 * letak tidak membuat apa pun gagal, jadi tidak ada yang menyadarinya sampai
 * seseorang membuka halamannya di layar lebar.
 *
 * Test ini membaca berkasnya sebagai teks . bukan me-render . karena yang
 * dijaga memang bentuk sumbernya, bukan perilakunya.
 */

const MITRA_DIR = path.resolve(__dirname);

/** Shell aplikasi penuh: sengaja tanpa kontainer & mengelola tingginya sendiri. */
const FULL_BLEED = ['chat/page.tsx', 'chat/[room_id]/MitraChatClient.tsx'];

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

/** Path relatif bergaya posix supaya pesan gagalnya sama di Windows & CI. */
function rel(file: string): string {
  return path.relative(MITRA_DIR, file).split(path.sep).join('/');
}

/**
 * Hanya baris kode . komentar dibuang. Beberapa komentar di area ini justru
 * MENJELASKAN kelas yang dilarang ("dulu `max-w-lg`, jadi judulnya bergeser"),
 * dan penjaga yang ikut membacanya akan menghukum dokumentasinya sendiri.
 */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const FILES = collectFiles(MITRA_DIR);

function offenders(predicate: (source: string) => boolean, skip: string[] = []): string[] {
  return FILES.filter(f => !skip.includes(rel(f))).filter(f => predicate(code(f))).map(rel);
}

/** Isi tiap `className="…"` / `className={`…`}` dalam satu berkas. */
function classNames(source: string): string[] {
  return Array.from(source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)).map(
    m => m[1] ?? m[2] ?? '',
  );
}

describe('konvensi tata letak /mitra', () => {
  it('menemukan halaman untuk diperiksa', () => {
    // Tanpa ini, regex yang tidak pernah cocok karena daftarnya KOSONG akan
    // tampak sebagai "semua aturan lolos".
    expect(FILES.length).toBeGreaterThan(15);
  });

  it('tidak ada halaman yang mengetik kontainer halaman sendiri', () => {
    // Penandanya tiga hal sekaligus: `mx-auto` (kontainer memusatkan dirinya),
    // pada lebar SKALA HALAMAN (`lg` ke atas . tak ada varian mitra di bawah
    // `max-w-2xl`). Dua bentuk lain sengaja tidak ikut terjaring karena keduanya
    // benar: `max-w-xl` pada <p> adalah pembatas panjang baris teks, dan
    // `max-w-sm w-full mx-auto` adalah kartu kecil terpusat di layar sukses.
    const PAGE_WIDTH = /\bmax-w-(?:lg|xl|[2-7]xl|\[)/;
    const isPageContainer = (cls: string) => /\bmx-auto\b/.test(cls) && PAGE_WIDTH.test(cls);
    expect(offenders(src => classNames(src).some(isPageContainer), FULL_BLEED)).toEqual([]);
  });

  it('tidak ada `sticky top-0` di halaman . satu-satunya yang sticky adalah MitraPageHeader', () => {
    // Inilah bug dompet: pita merah `sticky top-0 z-10` setinggi 160px ikut
    // turun saat digulir lalu menutupi riwayat transaksi di bawahnya.
    expect(offenders(src => /sticky top-0/.test(src))).toEqual([]);
  });

  it('tidak ada z-index di luar tangga yang disepakati (z-10..z-60)', () => {
    // Dialog tulis tangan dulu memakai `z-[70]` untuk menang atas MitraModal
    // (z-60) . lomba angka yang selalu dimenangkan yang menulis paling akhir.
    expect(offenders(src => /z-\[\d+\]/.test(src))).toEqual([]);
  });

  it('tidak ada halaman yang mengurus latar & tinggi sendiri . itu milik shell', () => {
    // `page-h` = `100dvh - 4rem`, dan 4rem itu jatah TopNavbar yang di mode
    // mitra tidak pernah ada.
    const skip = ['MitraLayoutClient.tsx', ...FULL_BLEED];
    expect(offenders(src => /\bpage-h\b/.test(src), skip)).toEqual([]);
  });

  it('tidak ada `lg:top-16` . mode mitra tidak punya TopNavbar untuk dihindari', () => {
    expect(offenders(src => /lg:top-16/.test(src))).toEqual([]);
  });

  it('tidak ada palet Tailwind mentah . warna harus lewat token brand-*', () => {
    const raw = /\b(?:bg|text|border)-(?:red|green|blue|yellow|orange|gray|slate|zinc|neutral|stone|amber|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;
    expect(offenders(src => raw.test(src))).toEqual([]);
  });
});
