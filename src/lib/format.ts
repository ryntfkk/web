// Util format global . SATU-SATUNYA sumber untuk format mata uang/tanggal/angka.
// Dilarang mendefinisikan ulang formatRupiah/formatDate/formatPrice di komponen;
// impor dari sini (lihat WEB-IMPLEMENTATION-PLAN.md §3.4).

/** "Rp150.000" . tanpa desimal. */
export function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);
}

/** Alias formatRupiah . dipakai di konteks harga. */
export const formatPrice = formatRupiah;

/** "Senin, 21 Juli 2026, 14.30" . untuk detail order/pembayaran. */
export function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "21 Jul 2026, 14.30" . untuk kartu/list. */
export function formatDateShort(d: string | Date): string {
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "21 Jul 2026" . tanggal saja tanpa jam. */
export function formatDateOnly(d: string | Date): string {
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** "90" → "1 jam 30 menit". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} jam` : `${h} jam ${m} menit`;
}

/** 1200 → "1,2rb" . untuk jumlah terjual/ulasan di kartu. */
export function formatCompactNumber(n: number): string {
  return new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

/** "5 menit lalu" / "2 hari lalu" . untuk notifikasi & chat. */
export function formatRelativeTime(d: string | Date): string {
  const diffMs = Date.now() - new Date(d).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return formatDateOnly(d);
}
