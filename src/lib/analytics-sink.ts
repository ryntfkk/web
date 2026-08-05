import { setAnalyticsSink, type AnalyticsEvent, type AnalyticsProps } from './analytics';

/**
 * Pemasangan penyedia analytics . sengaja VENDOR-NEUTRAL.
 *
 * Tidak ada SDK pihak ketiga yang dipasang, dan itu keputusan, bukan
 * kemalasan:
 *
 * - SDK analytics adalah skrip pihak ketiga yang berjalan di halaman yang
 *   memuat NIK, nomor rekening, dan alamat pelanggan. Menariknya masuk demi
 *   menghitung klik adalah pertukaran yang buruk.
 * - Mengunci diri ke satu vendor lewat import di seluruh komponen membuat
 *   penggantiannya nanti menyentuh puluhan berkas. Di sini penggantian cukup
 *   mengubah satu URL.
 *
 * Yang dikirim adalah POST JSON biasa ke endpoint yang ditentukan
 * `NEXT_PUBLIC_ANALYTICS_ENDPOINT`. Collector apa pun bisa menerimanya .
 * PostHog (`/capture`), Plausible, atau endpoint milik sendiri.
 *
 * **Tanpa env itu, tidak ada apa pun yang terkirim.** Itu keadaan default dan
 * aman: build yang belum dikonfigurasi tidak diam-diam mengirim data ke mana
 * pun.
 */

const ENDPOINT = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT;

/**
 * `sendBeacon`, bukan `fetch`.
 *
 * Event paling berharga justru terjadi tepat sebelum halaman ditinggalkan
 * (`booking_started` lalu pengguna menutup tab). `fetch` dibatalkan browser
 * saat navigasi; `sendBeacon` dijadwalkan browser untuk tetap dikirim.
 *
 * Mengembalikan false bila browser menolak . pemanggil di bawah lalu jatuh ke
 * `fetch` dengan `keepalive`.
 */
function beacon(url: string, body: string): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
    return false;
  }
  try {
    // Tipe 'text/plain' menghindari preflight CORS. Collector membaca body-nya
    // sebagai JSON; preflight untuk telemetri hanya menambah satu round-trip
    // pada jalur yang seharusnya tak terasa.
    return navigator.sendBeacon(url, new Blob([body], { type: 'text/plain;charset=UTF-8' }));
  } catch {
    return false;
  }
}

/**
 * Dipanggil sekali dari provider aplikasi. Aman dipanggil berkali-kali .
 * memasang sink adalah operasi idempoten.
 */
export function installAnalyticsSink(): void {
  if (!ENDPOINT) return;

  setAnalyticsSink((event: AnalyticsEvent, props: AnalyticsProps) => {
    // Properti sudah disaring PII oleh `track()` sebelum sampai ke sini.
    // Jangan menambahkan field baru di titik ini . apa pun yang ditambahkan
    // melewati penyaring itu.
    const body = JSON.stringify({
      event,
      props,
      // Waktu klien: satu-satunya stempel yang tahu KAPAN peristiwanya terjadi
      // bila beacon-nya baru terkirim setelah tab ditutup.
      ts: new Date().toISOString(),
      path: typeof location !== 'undefined' ? location.pathname : undefined,
    });

    if (beacon(ENDPOINT, body)) return;

    // Cadangan: keepalive membuat request tetap hidup melewati navigasi.
    // Kegagalannya sengaja ditelan . telemetri tidak boleh memunculkan error
    // di console pengguna, apalagi menjatuhkan alur yang sedang berjalan.
    void fetch(ENDPOINT, {
      method: 'POST',
      body,
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    }).catch(() => { });
  });
}
