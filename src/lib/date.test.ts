import { describe, expect, it } from 'vitest';

import { toDateParam } from './date';

/**
 * Penjaga M4 (audit 2026-08-21).
 *
 * Bug aslinya: rentang tanggal dibentuk dengan `toISOString()` atas tanggal
 * LOKAL. Di WIB (UTC+7) tengah malam lokal jatuh ke tanggal SEBELUMNYA dalam
 * UTC, jadi filter "Bulan Ini" pada 31 Agustus mengirim `end_date=2026-08-30`
 * dan pendapatan hari itu hilang dari daftar . tanpa satu pun tanda di layar.
 *
 * Tes ini menyatakan perbedaannya secara eksplisit, jadi kalau seseorang
 * mengembalikan `toISOString()` ia langsung merah . bukan diam-diam menggeser
 * angka uang di layar mitra.
 */
describe('toDateParam', () => {
  it('memakai komponen tanggal LOKAL, bukan UTC', () => {
    // Tengah malam lokal di tanggal 1 . inilah bentuk yang dipakai filter
    // "Bulan Ini" (`new Date(y, m, 1)`).
    const awalBulan = new Date(2026, 7, 1, 0, 0, 0);
    expect(toDateParam(awalBulan)).toBe('2026-08-01');

    // Hari terakhir bulan (`new Date(y, m + 1, 0)`).
    const akhirBulan = new Date(2026, 8, 0, 0, 0, 0);
    expect(toDateParam(akhirBulan)).toBe('2026-08-31');
  });

  it('tidak sama dengan toISOString() saat zona waktunya di timur UTC', () => {
    const tengahMalamLokal = new Date(2026, 7, 1, 0, 0, 0);
    const caraLama = tengahMalamLokal.toISOString().split('T')[0];

    // Di zona ber-offset POSITIF (mis. WIB) cara lama menghasilkan tanggal
    // sebelumnya. Di UTC/zona barat keduanya sama . jadi pernyataannya
    // dibuat kondisional, bukan berpura-pura tes ini zona-agnostik.
    if (tengahMalamLokal.getTimezoneOffset() < 0) {
      expect(caraLama).not.toBe(toDateParam(tengahMalamLokal));
    }
    expect(toDateParam(tengahMalamLokal)).toBe('2026-08-01');
  });

  it('memberi padding dua digit', () => {
    expect(toDateParam(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
