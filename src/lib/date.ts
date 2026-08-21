/**
 * `YYYY-MM-DD` dari komponen tanggal LOKAL.
 *
 * JANGAN memakai `toISOString().split('T')[0]` untuk ini. Tengah malam lokal di
 * WIB (UTC+7) adalah pukul 17:00 UTC pada tanggal SEBELUMNYA, jadi cara itu
 * menggeser seluruh rentang satu hari: pada 31 Agustus, filter "Bulan Ini"
 * mengirim `end_date=2026-08-30` dan pendapatan hari itu lenyap dari daftar,
 * sementara mutasi sore 31 Juli justru ikut tertarik masuk (M4, audit
 * 2026-08-21).
 *
 * Sisi backend membaca string ini sebagai WIB . lihat `parseDateQuery`
 * (internal/order/handler.go) dan `wallet/handler.go`. Keduanya dijaga tes;
 * kalau salah satu sisi berubah, ubah dua-duanya.
 */
export function toDateParam(d: Date): string {
  const bulan = String(d.getMonth() + 1).padStart(2, '0');
  const tanggal = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${bulan}-${tanggal}`;
}
