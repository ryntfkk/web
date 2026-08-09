import { describe, expect, it } from 'vitest';
import { categoryQuotaFor, expertiseStepValid, stepsForPartner } from './category-slots';

/**
 * Aturan slot kategori (backend migrasi 000080) yang harus tetap benar di web.
 *
 * Ketiganya pernah, atau mudah sekali, salah:
 *  - kuota disamakan untuk semua tipe mitra;
 *  - langkah Keahlian dianggap sah walau foto alat belum diunggah;
 *  - pengajuan ulang memaksa mitra memilih ulang kategori yang sudah ia punya,
 *    padahal server memperlakukan daftar kosong sebagai "pertahankan".
 */

describe('kuota slot kategori', () => {
  it('perorangan 1, vendor 3', () => {
    expect(categoryQuotaFor('individual')).toBe(1);
    expect(categoryQuotaFor('vendor')).toBe(3);
  });
});

describe('langkah Keahlian', () => {
  const withFile = (id: string) => ({ category_id: id, files: [new File([''], 'alat.jpg')] });

  it('menolak kategori tanpa foto alat . bukti melekat per kategori', () => {
    expect(
      expertiseStepValid({
        picked: [{ category_id: 'a', files: [] }],
        quota: 1,
        keptCount: 0,
      }),
    ).toBe(false);
  });

  it('menolak kategori kosong walau fotonya ada', () => {
    expect(
      expertiseStepValid({ picked: [withFile('')], quota: 1, keptCount: 0 }),
    ).toBe(false);
  });

  it('menolak jumlah kategori melewati kuota tipe mitra', () => {
    expect(
      expertiseStepValid({
        picked: [withFile('a'), withFile('b')],
        quota: 1,
        keptCount: 0,
      }),
    ).toBe(false);
    expect(
      expertiseStepValid({
        picked: [withFile('a'), withFile('b')],
        quota: 3,
        keptCount: 0,
      }),
    ).toBe(true);
  });

  it('menerima satu kategori lengkap dengan bukti', () => {
    expect(expertiseStepValid({ picked: [withFile('a')], quota: 1, keptCount: 0 })).toBe(true);
  });

  it('pendaftaran BARU wajib mengisi . tak ada kategori lama untuk dipertahankan', () => {
    expect(expertiseStepValid({ picked: [], quota: 1, keptCount: 0 })).toBe(false);
  });

  it('pengajuan ULANG boleh dilewati bila kategori lama masih ada', () => {
    // Payload tanpa main_categories = "pertahankan yang lama" di server.
    // Memaksa unggah ulang berarti mitra yang ditolak soal alamat basecamp
    // harus memotret ulang seluruh alatnya.
    expect(expertiseStepValid({ picked: [], quota: 1, keptCount: 2 })).toBe(true);
  });

  it('pengajuan ulang yang MENGGANTI kategori tetap wajib membawa bukti', () => {
    expect(
      expertiseStepValid({ picked: [{ category_id: 'a', files: [] }], quota: 1, keptCount: 2 }),
    ).toBe(false);
  });
});

describe('urutan langkah pendaftaran', () => {
  it('Keahlian ada di antara Profil dan Lokasi untuk kedua tipe mitra', () => {
    for (const type of ['individual', 'vendor'] as const) {
      const steps = stepsForPartner(type, false);
      expect(steps).toContain('expertise');
      expect(steps.indexOf('expertise')).toBeGreaterThan(steps.indexOf('profile'));
      expect(steps.indexOf('expertise')).toBeLessThan(steps.indexOf('location'));
    }
  });

  it('langkah `type` hanya ada di pendaftaran baru . tipe mitra tak boleh berubah saat verifikasi ulang', () => {
    expect(stepsForPartner('vendor', true)).not.toContain('type');
    expect(stepsForPartner('vendor', false)).toContain('type');
  });
});
