import type { ApiResponse, ApiErrorDetail } from '@/types/api';

/**
 * Pesan galat untuk AKSI PESANAN (terima/tolak/mulai/selesai/batal/sengketa/
 * biaya tambahan).
 *
 * Kenapa tidak memakai `getErrorMessage` seperti halaman lain: helper itu
 * memprioritaskan `error.details`, dan `utils.ErrorResponse` di backend mengisi
 * `details` dengan `err.Error()` MENTAH untuk seluruh respons 4xx (penyensoran
 * hanya berlaku pada 5xx). Untuk jalur pesanan, string mentah itu berbahasa
 * Inggris dan menyebut nama status internal:
 *
 *   "invalid order status to start: CANCELLED (expected PAID)"
 *   "unauthorized: not the assigned partner"
 *
 * Padahal handler-nya SUDAH menyiapkan kalimat Indonesia di `message`
 * ("Gagal memulai pesanan"). Di sini `details` sengaja diabaikan: kode yang
 * dikenal dipetakan ke kalimat yang menjelaskan APA YANG HARUS MITRA LAKUKAN,
 * sisanya jatuh ke `message` dari server.
 */

/** Kode dari `error.code`, BUKAN `res.code` . envelope backend menaruhnya di dalam `error`. */
export function kodeGalat(res: ApiResponse): string | undefined {
  if (typeof res.error === 'object' && res.error !== null) {
    const kode = (res.error as ApiErrorDetail).code;
    if (typeof kode === 'string' && kode !== '') return kode;
  }
  return undefined;
}

/**
 * Kode yang bisa muncul dari aksi pesanan mitra, dengan langkah berikutnya .
 * bukan sekadar terjemahan. Kode "ERROR" sengaja TIDAK ada di sini: itu penanda
 * galat tanpa konvensi, dan kalimat servernya sudah cukup.
 */
const PESAN_PER_KODE: Record<string, string> = {
  START_WINDOW_EXPIRED:
    'Batas waktu mulai pengerjaan sudah lewat. Hubungi CS lewat menu Bantuan untuk membuka kembali pesanan ini.',
  ORDER_VERSION_CONFLICT:
    'Status pesanan baru saja berubah. Muat ulang halaman untuk melihat keadaan terbarunya.',
  ADDITIONAL_FEE_LIMIT:
    'Total biaya tambahan pesanan ini melewati batas yang diizinkan. Kurangi nominalnya, atau hitung ulang bersama tagihan yang sudah diajukan sebelumnya.',
  INVALID_ADDITIONAL_FEE:
    'Nama, harga, atau jumlah item tidak valid. Harga tidak boleh negatif dan jumlah minimal 1.',
  CANCEL_REQUIRES_DISPUTE:
    'Pesanan yang sudah dibayar tidak bisa dibatalkan langsung. Gunakan "Lapor Masalah" agar CS menengahi.',
  ORDER_SLOT_CONFLICT: 'Jadwalnya bertabrakan dengan pesanan lain.',
  UNAUTHORIZED: 'Kamu tidak punya akses ke pesanan ini.',
  ORDER_NOT_FOUND: 'Pesanan tidak ditemukan. Mungkin sudah dihapus atau tautannya kedaluwarsa.',
};

/**
 * @param cadangan Kalimat terakhir bila server tidak mengirim apa pun yang layak
 *                 tampil . tulis sesuai aksinya ("Gagal memulai pesanan.").
 */
export function pesanGalatPesanan(res: ApiResponse, cadangan: string): string {
  const kode = kodeGalat(res);
  if (kode && PESAN_PER_KODE[kode]) return PESAN_PER_KODE[kode];

  // Kalimat siap-tampil dari server (`utils.SplitErrorCode` sudah membuang
  // prefiks kodenya). Dipakai hanya bila BUKAN galat tanpa konvensi . kalau
  // kodenya "ERROR", isinya bisa saja string Inggris mentah.
  if (kode && kode !== 'ERROR') {
    if (typeof res.error === 'object' && res.error !== null) {
      const pesan = (res.error as ApiErrorDetail).message;
      if (typeof pesan === 'string' && pesan !== '') return pesan;
    }
  }

  // `res.message` untuk galat "ERROR" adalah kalimat Indonesia yang ditulis
  // handler ("Gagal memulai pesanan"), bukan `err.Error()`.
  if (res.message) return res.message;
  return cadangan;
}
