/**
 * Lapisan analytics produk (§12).
 *
 * Satu pintu keluar untuk SEMUA event. Alasannya bukan kerapian:
 *
 * 1. **Nama event jadi enum, bukan string bebas.** String yang diketik di
 *    tempat pemakaian pasti menyimpang (`partner_order_accepted` vs
 *    `partner_order_accept`), dan penyimpangan itu baru ketahuan berbulan-bulan
 *    kemudian saat funnel-nya bolong dan datanya sudah tidak bisa diperbaiki.
 *
 * 2. **PII disaring di SATU tempat.** §12.1 melarang mengirim NIK, nomor HP,
 *    rekening, detail alamat, isi chat, dan nama pelanggan. Larangan yang hanya
 *    ditulis di dokumen akan dilanggar; di sini ia dieksekusi . properti
 *    berkunci terlarang dibuang sebelum keluar, dan di dev dilaporkan keras.
 *
 * Belum ada penyedia analytics yang dipasang. `sink` sengaja dibiarkan bisa
 * diganti supaya pemasangannya nanti tidak menyentuh satu pun pemanggil.
 */

export type AnalyticsEvent =
  // ── Mode mitra ──
  | 'partner_dashboard_viewed'
  | 'partner_availability_changed'
  | 'partner_order_action_attempted'
  | 'partner_order_action_succeeded'
  | 'partner_order_action_failed'
  | 'partner_service_created'
  | 'partner_service_updated'
  | 'partner_service_availability_changed'
  | 'partner_schedule_saved'
  | 'partner_withdrawal_submitted'
  | 'partner_profile_previewed'
  // ── Akuisisi mitra (halaman /jadi-mitra + banner home) ──
  | 'partner_landing_viewed'
  | 'partner_landing_cta_clicked'
  | 'home_partner_banner_clicked'
  // ── Sisi publik ──
  | 'public_partner_profile_viewed'
  | 'public_partner_service_clicked'
  | 'public_partner_chat_started'
  | 'public_partner_booking_started'
  | 'public_partner_booking_completed';

/** Nilai properti dibatasi ke skalar . objek bersarang menyelundupkan PII. */
export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

/**
 * Kunci yang TIDAK BOLEH keluar (§12.1). Dicocokkan sebagai substring
 * lowercase, jadi `customer_name`, `bank_account_number`, dan `ktp_number`
 * sama-sama tertangkap tanpa perlu didaftarkan satu per satu.
 *
 * `service_name` dan `partner_name` sengaja TIDAK dilarang: keduanya data
 * katalog publik, bukan identitas pribadi. Yang dilarang adalah nama ORANG.
 */
const FORBIDDEN_KEY_PATTERNS = [
  'ktp',
  'nik',
  'npwp',
  'phone',
  'whatsapp',
  'bank',
  'rekening',
  'account_number',
  'address',
  'alamat',
  'lat',
  'lon',
  'message',
  'chat',
  'content',
  'customer_name',
  'email',
];

function isForbiddenKey(key: string): boolean {
  const k = key.toLowerCase();
  return FORBIDDEN_KEY_PATTERNS.some((p) => k.includes(p));
}

/**
 * Membuang properti berkunci terlarang.
 *
 * Diekspor demi bisa diuji sendiri: aturan privasi yang tidak punya test adalah
 * aturan yang akan dilanggar diam-diam.
 */
export function sanitizeProps(props?: AnalyticsProps): AnalyticsProps {
  if (!props) return {};
  const out: AnalyticsProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (isForbiddenKey(key)) {
      if (process.env.NODE_ENV !== 'production') {
        // Keras dan berisik di dev . inilah satu-satunya momen pelanggaran ini
        // masih murah untuk diperbaiki.
        console.error(
          `[analytics] properti "${key}" mengandung data pribadi dan DIBUANG. ` +
          'Lihat §12.1: jangan kirim NIK, HP, rekening, alamat, isi chat, atau nama pelanggan.',
        );
      }
      continue;
    }
    // undefined tidak membawa informasi apa pun; membuangnya menjaga payload
    // tetap bisa dibandingkan antar-event.
    if (value !== undefined) out[key] = value;
  }
  return out;
}

type Sink = (event: AnalyticsEvent, props: AnalyticsProps) => void;

// Default no-op: belum ada penyedia yang dipasang. Bukan console.log . event
// analytics yang membanjiri console membuat log debug asli tak terbaca.
let sink: Sink = () => { };

/** Dipanggil sekali saat penyedia analytics dipasang. */
export function setAnalyticsSink(next: Sink): void {
  sink = next;
}

/**
 * Mengirim satu event. Tidak pernah melempar: analytics yang gagal tidak boleh
 * menjatuhkan alur yang sedang dijalani pengguna.
 */
export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  try {
    sink(event, sanitizeProps(props));
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[analytics] gagal mengirim event', event, err);
    }
  }
}
