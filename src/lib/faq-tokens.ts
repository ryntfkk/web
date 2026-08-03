import { formatPrice } from '@/lib/format';
import { formatFeeRate, type PlatformConfig } from '@/hooks/usePlatformConfig';

// Interpolasi token pada jawaban FAQ.
//
// Jawaban FAQ boleh memuat {{nama_setelan}}; nilainya diambil LIVE dari
// platform_settings / platform_profile saat render. Ini yang membuat FAQ tidak
// pernah bisa berbohong soal uang: admin TIDAK BISA mengetik "12%" secara
// harfiah lalu lupa memperbaruinya ketika komisi berubah — ia mengetik
// {{platform_fee_rate}} dan angkanya selalu ikut.
//
// Token yang tidak dikenal SENGAJA dibiarkan apa adanya (mis. "{{typo}}").
// Menggantinya dengan string kosong akan menghasilkan kalimat rumpang yang
// terbaca seperti kalimat sah — admin tidak akan pernah sadar ada salah ketik.

export const FAQ_TOKENS = [
  'platform_fee_rate',
  'min_transaction',
  'withdrawal_fee',
  'max_withdrawal',
  'max_additional_fee',
  'admin_fee',
  'transport_fee_per_km',
  'withdrawal_sla',
  'support_email',
] as const;

export type FaqToken = (typeof FAQ_TOKENS)[number];

/** Label yang ditampilkan di editor admin, agar admin tahu hasilnya seperti apa. */
export const FAQ_TOKEN_LABEL: Record<FaqToken, string> = {
  platform_fee_rate: 'Komisi platform (mis. 12%)',
  min_transaction: 'Minimum transaksi / harga layanan',
  withdrawal_fee: 'Biaya penarikan',
  max_withdrawal: 'Maksimum penarikan',
  max_additional_fee: 'Batas biaya tambahan per item',
  admin_fee: 'Biaya admin',
  transport_fee_per_km: 'Biaya transport per km',
  withdrawal_sla: 'SLA pencairan (mis. 1-2 hari kerja)',
  support_email: 'Email dukungan',
};

function tokenValue(token: FaqToken, cfg: PlatformConfig): string {
  switch (token) {
    case 'platform_fee_rate':
      return formatFeeRate(cfg.platform_fee_rate);
    case 'min_transaction':
      return formatPrice(cfg.min_transaction);
    case 'withdrawal_fee':
      return formatPrice(cfg.withdrawal_fee);
    case 'max_withdrawal':
      return formatPrice(cfg.max_withdrawal);
    case 'max_additional_fee':
      return formatPrice(cfg.max_additional_fee);
    case 'admin_fee':
      return formatPrice(cfg.admin_fee);
    case 'transport_fee_per_km':
      return formatPrice(cfg.transport_fee_per_km);
    case 'withdrawal_sla':
      return cfg.profile?.withdrawal_sla || '1-2 hari kerja';
    case 'support_email':
      return cfg.profile?.support_email || '';
  }
}

/** Ganti setiap {{token}} yang dikenal dengan nilainya. */
export function renderFaqAnswer(answer: string, cfg: PlatformConfig): string {
  return answer.replace(/\{\{(\w+)\}\}/g, (utuh, nama: string) => {
    if ((FAQ_TOKENS as readonly string[]).includes(nama)) {
      const nilai = tokenValue(nama as FaqToken, cfg);
      // Nilai kosong (mis. support_email belum diisi) → biarkan token utuh
      // daripada meninggalkan lubang di tengah kalimat.
      return nilai || utuh;
    }
    return utuh;
  });
}
