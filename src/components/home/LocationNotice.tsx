"use client";

import { useState } from 'react';
import { MapPinOff, RefreshCw, X } from 'lucide-react';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useLocationStore } from '@/lib/store/locationStore';

/**
 * Banner peringatan lokasi. Memicu permintaan lokasi OTOMATIS saat mount (via
 * useUserLocation) — jarak di kartu jasa/mitra butuh lokasi, jadi tak ada tombol
 * "gunakan lokasi" lagi; kita selalu meminta. Bila ditolak/gagal, tampilkan
 * notifikasi + tombol "Coba lagi". Bila diizinkan, komponen ini tak menampilkan
 * apa-apa (return null).
 */
export default function LocationNotice() {
  const { hasLocation, isResolved, permissionStatus } = useUserLocation();
  const resetLocation = useLocationStore((s) => s.resetLocation);
  const requestLocation = useLocationStore((s) => s.requestLocation);
  const [dismissed, setDismissed] = useState(false);

  // Tampil HANYA setelah percobaan selesai & tetap tanpa lokasi. Saat masih
  // menunggu izin (isResolved=false) atau sudah dapat lokasi → sembunyi.
  if (!isResolved || hasLocation || dismissed) return null;

  const retry = () => {
    resetLocation();   // buka kunci (isResolved -> false) supaya boleh minta ulang
    requestLocation(); // minta lagi — browser akan prompt bila belum diblok permanen
  };

  const denied = permissionStatus === 'denied';

  return (
    <div className="mb-5 sm:mb-6 flex items-start gap-3 rounded-xl border border-brand-error-border bg-brand-error-soft p-3 sm:p-4">
      <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0 text-brand-red">
        <MapPinOff className="w-4.5 h-4.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] sm:text-[14px] font-semibold text-brand-gray-900">
          Lokasi tidak aktif — jarak tidak ditampilkan
        </p>
        <p className="text-[12px] text-brand-gray-700 mt-0.5 leading-snug">
          {denied
            ? 'Kamu menolak izin lokasi. Aktifkan agar jarak ke mitra & layanan tampil. Jika sudah menolak permanen, ubah izin lokasi di pengaturan browser lalu muat ulang halaman.'
            : 'Kami tak bisa membaca lokasimu. Pastikan GPS/izin lokasi aktif, lalu coba lagi.'}
        </p>
      </div>
      <div className="flex flex-col gap-1.5 shrink-0">
        <button
          type="button"
          onClick={retry}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-red text-white text-[12px] font-semibold hover:bg-brand-red-dark transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Coba lagi
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Tutup notifikasi"
          className="inline-flex items-center justify-center gap-1 px-3 py-1 rounded-lg text-[11px] font-medium text-brand-gray-400 hover:text-brand-gray-900"
        >
          <X className="w-3 h-3" /> Tutup
        </button>
      </div>
    </div>
  );
}
