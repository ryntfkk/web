// ── Order data normalizer ────────────────────────────────────────────
// Helper to safely unwrap API responses.

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Ambil payload dari envelope API, apapun tingkat nesting-nya. */
// CATATAN (P1-12): `unwrapData` DIHAPUS.
//
// Fungsi itu menebak . "kalau ada field `data`, buka" . dan tebakannya
// membuang field saudara pada payload yang memang berisi `data`
// (mis. riwayat dompet `{data, summary}`). Pembungkusan ganda kini dirapikan
// sekali di batas API (`lib/api.ts`, normalizeEnvelope) dan berisik saat
// development, jadi halaman cukup memakai `res.data` langsung.
//
// Jangan menghidupkannya kembali: tambalan per halaman menyembunyikan
// penyimpangan kontrak alih-alih memperbaikinya.

// ── Satuan harga layanan (unit) ─────────────────────────────────────
export type ServiceUnit = 'per_hour' | 'per_service' | 'per_unit' | 'per_kg';

/** Label singkat setelah "/" pada harga, mis. "Rp120.000 /jam". */
export function unitLabel(unit?: string): string {
  switch (unit) {
    case 'per_hour': return 'jam';
    case 'per_unit': return 'unit';
    case 'per_kg': return 'kg';
    case 'per_service':
    default: return 'jasa';
  }
}

export type FilterStatus = 'all' | 'pending' | 'processing' | 'completed' | 'cancelled';

export const FILTER_GROUPS: Record<Exclude<FilterStatus, 'all'>, string[]> = {
  pending: ['WAITING_CONFIRMATION', 'WAITING_PAYMENT'],
  processing: ['PAID', 'IN_PROGRESS', 'WAITING_ADDITIONAL_PAY', 'WAITING_CUSTOMER_CONFIRM', 'DISPUTED'],
  completed: ['COMPLETED'],
  cancelled: ['CANCELLED'],
};

export function matchesFilter(status: string, filter: FilterStatus): boolean {
  if (filter === 'all') return true;
  return FILTER_GROUPS[filter].includes(status);
}

// ── Metode pembayaran ───────────────────────────────────────────────

/**
 * Label metode bayar untuk pelanggan. Kunci datang dari dua sumber: pilihan
 * eksplisit di charge API (`bca_va`, `wallet_balance`) dan `payment_type` dari
 * Midtrans saat settlement (`bank_transfer`, `gopay`, …).
 *
 * `snap` sengaja TIDAK diterjemahkan menjadi nama instrumen: itu placeholder
 * saat instrumen sebenarnya belum diketahui. Menyebutnya "QRIS" atau "Kartu"
 * berarti mengarang.
 */
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  wallet_balance: 'Saldo Dompet',
  gopay: 'GoPay',
  shopeepay: 'ShopeePay',
  qris: 'QRIS',
  bank_transfer: 'Transfer Bank / Virtual Account',
  echannel: 'Mandiri Bill Payment',
  bca_va: 'BCA Virtual Account',
  bni_va: 'BNI Virtual Account',
  bri_va: 'BRI Virtual Account',
  mandiri_va: 'Mandiri Virtual Account',
  permata_va: 'Permata Virtual Account',
  credit_card: 'Kartu Kredit/Debit',
  cstore: 'Gerai Retail',
  akulaku: 'Akulaku',
  snap: 'Pembayaran online',
};

export function paymentMethodLabel(method?: string): string {
  if (!method) return 'Tidak tercatat';
  return PAYMENT_METHOD_LABELS[method.toLowerCase()] ?? method.replace(/_/g, ' ');
}
