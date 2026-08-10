import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Penjaga konvensi tata letak . SELURUH `src/app`.
 *
 * Aturannya sudah tertulis di `DEVELOPER_NOTES.md` §UI mode mitra sejak lama
 * ("`MitraPageContainer` . jangan mengetik `max-w-*` sendiri"), dan tetap
 * dilanggar 17 dari 21 halaman. Dokumen jelas tidak cukup: penyimpangan tata
 * letak tidak membuat apa pun gagal, jadi tidak ada yang menyadarinya sampai
 * seseorang membuka halamannya di layar lebar.
 *
 * Test ini membaca berkasnya sebagai teks . bukan me-render . karena yang
 * dijaga memang bentuk sumbernya, bukan perilakunya.
 *
 * ⚠️ Kelas angka ditulis `[0-9]`, BUKAN `\d`, dan berkas ini disunting
 * LANGSUNG . jangan lewat skrip yang memproses backslash. Versi pertama
 * penjaga lintas-aplikasi ini ditulis lewat skrip, dan skripnya menyelipkan
 * backslash ganda plus satu byte backspace (0x08) ke dalam pola. Polanya jadi
 * mustahil cocok, seluruh rute pelanggan lolos, dan test tetap HIJAU.
 */

const APP_DIR = path.resolve(__dirname);
const MITRA_DIR = path.join(APP_DIR, 'mitra');

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
  return path.relative(APP_DIR, file).split(path.sep).join('/');
}

/** Path relatif terhadap `/mitra` . dipakai daftar pengecualian khusus mitra. */
function relMitra(file: string): string {
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

/** Seluruh halaman aplikasi . rute pelanggan DAN mode mitra. */
const ALL_FILES = collectFiles(APP_DIR);

/** Hanya mode mitra: sebagian aturan di bawah memang khusus shell mitra. */
const MITRA_FILES = ALL_FILES.filter(f => !path.relative(MITRA_DIR, f).startsWith('..'));

function offenders(
  predicate: (source: string) => boolean,
  skip: string[] = [],
  files: string[] = ALL_FILES,
): string[] {
  return files
    .filter(f => !skip.includes(rel(f)))
    .filter(f => predicate(code(f)))
    .map(rel);
}

/** Varian yang daftar pengecualiannya relatif terhadap `/mitra`. */
function mitraOffenders(predicate: (source: string) => boolean, skip: string[] = []): string[] {
  return MITRA_FILES.filter(f => !skip.includes(relMitra(f)))
    .filter(f => predicate(code(f)))
    .map(rel);
}

/** Isi tiap `className="…"` / `className={`…`}` dalam satu berkas. */
function classNames(source: string): string[] {
  return Array.from(source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)).map(
    m => m[1] ?? m[2] ?? '',
  );
}

const PALET_MENTAH =
  /(?:bg|text|border|fill|ring|from|via|to|divide|outline|decoration)-(?:red|green|blue|yellow|orange|gray|slate|zinc|neutral|stone|amber|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}/;

/**
 * A13-T3: aturan ini dulu HANYA menjaga `/mitra` . 47 rute pelanggan tidak
 * punya penjaga setara. Itu pula sebabnya 36 utilitas warna mentah bertahan di
 * luar `/mitra`: di dalam `/mitra` mereka membuat test merah dan sudah lama
 * dibersihkan.
 *
 * Yang berlaku UNIVERSAL dipisahkan dari yang khusus shell mitra . memaksakan
 * aturan mitra ke rute pelanggan justru SALAH: `page-h` dan `lg:top-16` sah di
 * sana, karena rute pelanggan memang punya TopNavbar setinggi 4rem.
 */
describe('konvensi tata letak . seluruh aplikasi', () => {
  it('menemukan halaman untuk diperiksa', () => {
    // Tanpa ini, regex yang tidak pernah cocok karena daftarnya KOSONG akan
    // tampak sebagai "semua aturan lolos".
    expect(ALL_FILES.length).toBeGreaterThan(60);
    expect(MITRA_FILES.length).toBeGreaterThan(15);
  });

  it('polanya benar-benar cocok . penjaga yang lumpuh selalu hijau', () => {
    // Penjaga statis gagal ke arah yang salah secara DIAM-DIAM: pola yang rusak
    // tidak membuat apa pun merah, ia hanya berhenti menemukan pelanggaran.
    // Aturan warna di berkas ini pernah persis begitu (lihat catatan di atas),
    // jadi polanya kini diuji terhadap contoh yang sudah diketahui jawabannya.
    expect(PALET_MENTAH.test('bg-emerald-500')).toBe(true);
    expect(PALET_MENTAH.test('text-gray-500')).toBe(true);
    expect(PALET_MENTAH.test('fill-amber-400')).toBe(true);
    // Token brand TIDAK boleh ikut terjaring.
    expect(PALET_MENTAH.test('bg-brand-gray-100')).toBe(false);
    expect(PALET_MENTAH.test('text-brand-warning')).toBe(false);
  });

  it('tidak ada palet Tailwind mentah di mana pun . warna harus lewat token brand-*', () => {
    // `fill`/`ring` ikut dijaga meski saat ini nol: bintang rating memakai
    // `fill-*`, dan itu jalur paling mudah menyelinapkan warna mentah kembali
    // tanpa tersentuh aturan bg/text/border.
    expect(offenders(src => PALET_MENTAH.test(src))).toEqual([]);
  });

  it('tidak ada halaman yang melampaui langit-langit tangga z-index (60)', () => {
    // Tangga nyatanya: halaman & overlay-nya paling tinggi 60; di ATAS itu milik
    // komponen bersama (`ui/modal` & `ui/toast` di 100, gerbang re-consent legal
    // di 100) . toast memang HARUS menang atas modal.
    //
    // Karena itu aturannya "jangan melampaui 60", bukan "jangan pakai z-[..]".
    // `z-60` tidak ada di tema, dan `MitraModal` kanonik sendiri menulis
    // `z-[60]` . melarang bentuk arbitrernya akan menghukum pola yang benar.
    const tooHigh = (src: string) =>
      Array.from(src.matchAll(/z-\[([0-9]+)\]/g)).some(m => Number(m[1]) > 60);
    expect(offenders(tooHigh)).toEqual([]);
  });
});

describe('konvensi tata letak . khusus shell mode mitra', () => {
  it('tidak ada halaman yang mengetik kontainer halaman sendiri', () => {
    // Penandanya tiga hal sekaligus: `mx-auto` (kontainer memusatkan dirinya),
    // pada lebar SKALA HALAMAN (`lg` ke atas . tak ada varian mitra di bawah
    // `max-w-2xl`). Dua bentuk lain sengaja tidak ikut terjaring karena keduanya
    // benar: `max-w-xl` pada <p> adalah pembatas panjang baris teks, dan
    // `max-w-sm w-full mx-auto` adalah kartu kecil terpusat di layar sukses.
    const PAGE_WIDTH = /max-w-(?:lg|xl|[2-7]xl|\[)/;
    const isPageContainer = (cls: string) => /mx-auto/.test(cls) && PAGE_WIDTH.test(cls);
    expect(mitraOffenders(src => classNames(src).some(isPageContainer), FULL_BLEED)).toEqual([]);
  });

  it('tidak ada `sticky top-0` di halaman . satu-satunya yang sticky adalah MitraPageHeader', () => {
    // Inilah bug dompet: pita merah `sticky top-0 z-10` setinggi 160px ikut
    // turun saat digulir lalu menutupi riwayat transaksi di bawahnya.
    expect(mitraOffenders(src => /sticky top-0/.test(src))).toEqual([]);
  });

  it('tidak ada z-index arbitrer di halaman mitra . overlay milik MitraModal', () => {
    // Dialog tulis tangan dulu memakai `z-[70]` untuk menang atas MitraModal
    // (z-60) . lomba angka yang selalu dimenangkan yang menulis paling akhir.
    // Di mode mitra aturannya lebih ketat daripada langit-langit universal:
    // halaman tidak boleh mengetik z-index arbitrer sama sekali.
    expect(mitraOffenders(src => /z-\[[0-9]+\]/.test(src))).toEqual([]);
  });

  it('tidak ada halaman yang mengurus latar & tinggi sendiri . itu milik shell', () => {
    // `page-h` = `100dvh - 4rem`, dan 4rem itu jatah TopNavbar yang di mode
    // mitra tidak pernah ada.
    const skip = ['MitraLayoutClient.tsx', ...FULL_BLEED];
    expect(mitraOffenders(src => /page-h/.test(src), skip)).toEqual([]);
  });

  it('tidak ada `lg:top-16` . mode mitra tidak punya TopNavbar untuk dihindari', () => {
    expect(mitraOffenders(src => /lg:top-16/.test(src))).toEqual([]);
  });
});
