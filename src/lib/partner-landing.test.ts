import { describe, expect, it } from 'vitest';

import { partnerFaq } from './partner-landing';
import { formatRupiah } from './format';
import { FALLBACK_PLATFORM_CONFIG, type PlatformConfig } from '@/hooks/usePlatformConfig';

/**
 * Halaman /jadi-mitra membuat janji publik tentang biaya kepada calon mitra.
 *
 * Angka yang dijanjikan di sana WAJIB berasal dari /config, karena admin bisa
 * mengubah komisi kapan saja lewat panel. Begitu ada yang menuliskannya sebagai
 * literal ("12%"), halaman diam-diam berbohong pada hari komisinya diubah .
 * dan tak ada yang menyadarinya sampai mitra protes soal potongan yang tidak
 * sesuai dengan yang ia baca sebelum mendaftar. Test ini yang menjaganya.
 */
function configPalsu(over: Partial<PlatformConfig> = {}): PlatformConfig {
  return {
    ...FALLBACK_PLATFORM_CONFIG,
    // Sengaja BUKAN nilai default: kalau ada yang hardcode angka default,
    // test dengan angka default tidak akan pernah menangkapnya.
    platform_fee_rate: 0.085,
    withdrawal_fee: 5000,
    min_transaction: 75000,
    ...over,
  };
}

describe('partnerFaq', () => {
  it('memakai komisi dari config, bukan angka yang ditulis tangan', () => {
    const teks = partnerFaq(configPalsu())
      .map((f) => f.a)
      .join(' ');

    expect(teks).toContain('8,5%');
    // Inti test: nilai default TIDAK boleh muncul saat admin memakai nilai lain.
    expect(teks).not.toContain('12%');
  });

  it('memakai biaya penarikan & harga minimum dari config', () => {
    const teks = partnerFaq(configPalsu())
      .map((f) => f.a)
      .join(' ');

    // Ekspektasi dibangun lewat formatRupiah, bukan string ketik tangan: yang
    // dijaga test ini adalah NILAI-nya datang dari config. Memaku format keluaran
    // Intl hanya membuat test pecah saat versi ICU berganti, tanpa ada bug nyata.
    expect(teks).toContain(formatRupiah(5000));
    expect(teks).toContain(formatRupiah(75000));
    expect(teks).not.toContain(formatRupiah(FALLBACK_PLATFORM_CONFIG.withdrawal_fee));
    expect(teks).not.toContain(formatRupiah(FALLBACK_PLATFORM_CONFIG.min_transaction));
  });

  it('tidak mengarang tenggat pencairan saat SLA belum diisi', () => {
    // profile.withdrawal_sla kosong = platform belum menjanjikan waktu apa pun.
    // Mengisinya dengan tebakan adalah janji yang tak pernah disepakati siapa pun.
    const tanpaSla = partnerFaq(configPalsu({ profile: undefined }))
      .map((f) => f.a)
      .join(' ');
    expect(tanpaSla).not.toContain('Pencairan diproses');

    const denganSla = partnerFaq(
      configPalsu({
        profile: {
          legal_name: '',
          brand_name: '',
          business_id: '',
          address: '',
          support_email: '',
          support_phone: '',
          support_whatsapp: '',
          dpo_email: '',
          withdrawal_sla: 'dalam 1×24 jam kerja',
        },
      }),
    )
      .map((f) => f.a)
      .join(' ');
    expect(denganSla).toContain('Pencairan diproses dalam 1×24 jam kerja.');
  });

  it('menyebut komisi terbuka pada pertanyaan “apakah gratis”', () => {
    // Framing yang disepakati: gratis di depan, komisi TETAP diungkap di tempat
    // orang bertanya soal gratis . bukan disembunyikan ke pertanyaan lain.
    const jawabanGratis = partnerFaq(configPalsu()).find((f) =>
      f.q.toLowerCase().includes('gratis'),
    );

    expect(jawabanGratis).toBeDefined();
    expect(jawabanGratis!.a).toContain('8,5%');
  });
});
