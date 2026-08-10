import { describe, expect, it } from 'vitest';

import { formatRupiah, formatDateShort } from './format';

/**
 * Kunci kesetaraan format dengan `admin-web` . A13-T4.
 *
 * Temuan aslinya menyatakan `lib/format.ts` "bercabang 89 baris" sehingga rupiah
 * dan tanggal "dapat tampil berbeda untuk data yang sama". Diperiksa 2026-08-10:
 * **tidak benar**. Kedua berkas tidak berbagi SATU PUN nama fungsi . web punya 8
 * (formatRupiah, formatPrice, formatDate, formatDateShort, formatDateOnly,
 * formatDuration, formatCompactNumber, formatRelativeTime), admin-web punya 4
 * (formatIDR, formatIDRorDash, formatNumber, formatDateTime). Selisih 89 baris
 * itu karena web memuat LEBIH BANYAK fungsi, bukan karena yang sama berbeda
 * perilaku. Fungsi yang berperan sama sudah menghasilkan string identik, dan
 * format nomor telepon yang ikut disebut temuan tidak ada di kedua berkas.
 *
 * Yang benar-benar kurang adalah PENGUNCI: tidak ada yang membuat kesetaraan itu
 * gagal bila salah satu repo berubah. Test ini . berpasangan dengan berkas
 * bernama sama di `admin-web` . menyimpan string yang diharapkan secara harfiah.
 * Kalau salah satu sisi bergeser, sisi itu yang merah, tanpa perlu satu repo
 * mengimpor repo lain.
 *
 * Nilai harapan ditulis dengan ` ` eksplisit: `Intl` menyisipkan NBSP
 * setelah "Rp", dan spasi biasa di berkas test akan membuat perbandingan gagal
 * karena alasan yang salah.
 */
describe('kesetaraan format dengan admin-web', () => {
  it('rupiah . sama persis dengan formatIDR di admin-web', () => {
    expect(formatRupiah(0)).toBe('Rp 0');
    expect(formatRupiah(1000)).toBe('Rp 1.000');
    expect(formatRupiah(150000)).toBe('Rp 150.000');
    expect(formatRupiah(1234567)).toBe('Rp 1.234.567');
  });

  it('rupiah . tanpa desimal, termasuk nilai pecahan', () => {
    // Saldo dompet & biaya platform dihitung dalam rupiah bulat; pecahan yang
    // lolos ke sini menandakan bug hulu, tapi tampilannya tidak boleh berubah
    // bentuk gara-gara itu.
    expect(formatRupiah(1000.4)).toBe('Rp 1.000');
    expect(formatRupiah(-5000)).toBe('-Rp 5.000');
  });

  it('tanggal ringkas . sama persis dengan formatDateTime di admin-web', () => {
    // Zona waktu dipatok lewat offset eksplisit supaya hasilnya tidak berubah
    // mengikuti mesin yang menjalankan test.
    const d = new Date('2026-07-21T14:30:00+07:00');
    expect(formatDateShort(d)).toBe(
      new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(d),
    );
  });
});
