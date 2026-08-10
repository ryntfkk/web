/**
 * Pemetaan tipe notifikasi . audit A09-T2.
 *
 * Sebelumnya tiga keputusan berbeda (tujuan navigasi, ikon, penyaringan tab)
 * digantung pada pencocokan SUBSTRING `type`. Itu bukan sekadar tidak rapi .
 * ia sudah salah di produksi:
 *
 *  - Kode memeriksa `t === 'withdrawal'`, sedangkan tipe yang benar-benar
 *    dikirim backend adalah `withdrawal_rejected`. Perbandingannya TIDAK
 *    PERNAH cocok, jadi mengklik notifikasi penarikan yang ditolak tidak
 *    membawa pengguna ke mana pun.
 *  - Tab "transaksi" menyaring `includes('order') || includes('payment')`,
 *    sehingga `withdrawal_rejected` . notifikasi yang menyangkut UANG .
 *    tidak muncul di sana.
 *  - `support_reply` / `support_resolved` membawa reference_id dan karenanya
 *    diarahkan ke `/orders/<id>`, bukan ke percakapan bantuannya.
 *
 * Sumber kebenaran daftar ini: nilai `type` yang benar-benar ditulis backend
 * (`notify.ToUser` / `notify.ToPartner`) dan yang ada di tabel `notifications`
 * produksi per 2026-08-10.
 */

export type NotificationCategory = 'transaction' | 'system';

export type NotificationIcon =
  | 'payment'
  | 'dispute'
  | 'withdrawal'
  | 'review'
  | 'order'
  | 'support'
  | 'system';

/** Ke mana notifikasi ini membawa pengguna saat diklik. */
export type NotificationTarget =
  | { kind: 'order' }
  | { kind: 'payment' }
  | { kind: 'wallet' }
  | { kind: 'support' }
  | { kind: 'none' };

interface NotificationSpec {
  icon: NotificationIcon;
  category: NotificationCategory;
  target: NotificationTarget;
}

/**
 * Daftar EKSPLISIT. Menambah tipe baru di backend tanpa menambahkannya di sini
 * akan jatuh ke `FALLBACK` . terlihat sebagai lonceng generik yang membuka
 * pesanan, bukan salah arah yang diam-diam.
 */
const SPEC: Record<string, NotificationSpec> = {
  // Pesanan
  order_new: { icon: 'order', category: 'transaction', target: { kind: 'order' } },
  order_confirm: { icon: 'order', category: 'transaction', target: { kind: 'order' } },
  order_started: { icon: 'order', category: 'transaction', target: { kind: 'order' } },
  order_cancelled: { icon: 'order', category: 'transaction', target: { kind: 'order' } },
  order_cancelled_admin: { icon: 'order', category: 'transaction', target: { kind: 'order' } },
  order_rescheduled_admin: { icon: 'order', category: 'transaction', target: { kind: 'order' } },
  order_status_admin: { icon: 'order', category: 'transaction', target: { kind: 'order' } },
  order_adjustment_admin: { icon: 'order', category: 'transaction', target: { kind: 'order' } },

  // Uang masuk/keluar pesanan
  order_payment: { icon: 'payment', category: 'transaction', target: { kind: 'payment' } },
  order_paid: { icon: 'payment', category: 'transaction', target: { kind: 'order' } },
  order_earning: { icon: 'payment', category: 'transaction', target: { kind: 'order' } },
  // Biaya tambahan dibayar dari halaman pesanan, bukan halaman pembayaran .
  // alurnya lewat persetujuan dulu.
  order_additional_fee: { icon: 'payment', category: 'transaction', target: { kind: 'order' } },

  // Penarikan dana . TIDAK memuat "order"/"payment", jadi dulu hilang dari
  // tab transaksi sekaligus tidak bisa diklik.
  withdrawal_rejected: { icon: 'withdrawal', category: 'transaction', target: { kind: 'wallet' } },
  withdrawal_completed: { icon: 'withdrawal', category: 'transaction', target: { kind: 'wallet' } },

  // Sengketa
  order_disputed: { icon: 'dispute', category: 'transaction', target: { kind: 'order' } },
  dispute_opened: { icon: 'dispute', category: 'transaction', target: { kind: 'order' } },
  dispute_reply: { icon: 'dispute', category: 'transaction', target: { kind: 'order' } },
  dispute_resolved: { icon: 'dispute', category: 'transaction', target: { kind: 'order' } },

  // Bantuan . punya percakapannya sendiri; mengarahkannya ke /orders salah.
  support_reply: { icon: 'support', category: 'system', target: { kind: 'support' } },
  support_resolved: { icon: 'support', category: 'system', target: { kind: 'support' } },

  // Kategori mitra & lain-lain
  category_deactivated: { icon: 'system', category: 'system', target: { kind: 'none' } },
  category_request_approved: { icon: 'system', category: 'system', target: { kind: 'none' } },
  category_request_rejected: { icon: 'system', category: 'system', target: { kind: 'none' } },
  review_reminder: { icon: 'review', category: 'system', target: { kind: 'order' } },
  system: { icon: 'system', category: 'system', target: { kind: 'none' } },
};

const FALLBACK: NotificationSpec = {
  icon: 'system',
  category: 'system',
  target: { kind: 'order' },
};

export function notificationSpec(type: string | undefined): NotificationSpec {
  return SPEC[(type || '').toLowerCase()] ?? FALLBACK;
}

/** Daftar tipe yang dikenali . dipakai test untuk mendeteksi tipe baru. */
export const KNOWN_NOTIFICATION_TYPES = Object.keys(SPEC);
