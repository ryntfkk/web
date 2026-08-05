'use client';

import { useEffect, useState } from 'react';
import { MapPin, MapPinOff, ChevronDown, Navigation, Home, Check, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import MapView from '@/components/MapView';
import { fetchAPI } from '@/lib/api';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useLocationStore } from '@/lib/store/locationStore';

interface Address {
  id: string;
  label: string;
  address: string;
  address_detail?: string;
  is_default: boolean;
  lat: number;
  lon: number;
}

/**
 * Pemilih lokasi home ala Grab/ShopeeFood. Koordinat aktif (GPS / alamat
 * tersimpan) men-drive JARAK di kartu jasa & mitra . menggantikan filter kota.
 */
export default function LocationPicker() {
  // Picu permintaan lokasi OTOMATIS saat home dimuat (dulu tugas LocationNotice
  // yang kini dilebur ke modal ini). Store men-guard agar tak minta berulang.
  useUserLocation();
  const label = useLocationStore((s) => s.label);
  const hasLocation = useLocationStore((s) => s.hasLocation);
  const source = useLocationStore((s) => s.source);
  const latitude = useLocationStore((s) => s.latitude);
  const longitude = useLocationStore((s) => s.longitude);
  const isResolved = useLocationStore((s) => s.isResolved);
  const permissionStatus = useLocationStore((s) => s.permissionStatus);
  const setManualLocation = useLocationStore((s) => s.setManualLocation);

  const [open, setOpen] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddr, setLoadingAddr] = useState(false);
  const [locating, setLocating] = useState(false);

  // Muat alamat tersimpan saat modal dibuka (best-effort; tamu → kosong).
  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      setLoadingAddr(true);
      try {
        const res = await fetchAPI<unknown>('/users/me/addresses');
        if (alive && res.success && res.data) {
          const data = (res.data as Address[]);
          setAddresses(Array.isArray(data) ? data.filter((a) => a.lat && a.lon) : []);
        }
      } catch {
        /* tamu / tak ada alamat */
      }
      if (alive) setLoadingAddr(false);
    })();
    return () => {
      alive = false;
    };
  }, [open]);

  // Tutup modal begitu GPS selesai (berhasil).
  useEffect(() => {
    if (locating && isResolved) {
      setLocating(false);
      if (hasLocation) setOpen(false);
    }
  }, [locating, isResolved, hasLocation]);

  const handleGPS = () => {
    setLocating(true);
    // Paksa ambil ulang GPS meski sudah ada lokasi (guard requestLocation skip
    // saat sudah punya lokasi) → reset dulu.
    useLocationStore.getState().resetLocation();
    useLocationStore.getState().requestLocation();
  };

  const pickAddress = (a: Address) => {
    setManualLocation(a.lat, a.lon, a.label ? `${a.label} . ${a.address}` : a.address);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="group flex w-full max-w-fit cursor-pointer items-center gap-1.5 sm:gap-2 px-2 py-1 rounded-full transition-all duration-200 hover:bg-brand-gray-50 active:scale-[0.98]"
      >
        <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-red shrink-0" />
        <div className="flex min-w-0 items-center text-left">
          <span className="truncate text-[11px] sm:text-[13px] font-medium text-brand-gray-700 group-hover:text-brand-red transition-colors">
            {hasLocation ? (
              <>
                <span className="text-brand-gray-500 mr-1 hidden sm:inline">Dikirim ke:</span>
                <span className="font-bold text-brand-gray-900 group-hover:text-brand-red">{label === 'Lokasi saat ini' ? 'Lokasi GPS saat ini' : label}</span>
              </>
            ) : (
              <span className="font-bold">Pilih lokasi pengiriman</span>
            )}
          </span>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-brand-gray-400 group-hover:text-brand-red transition-colors shrink-0" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Lokasi Kamu">
        <p className="mb-4 text-[12px] leading-relaxed text-brand-gray-400">
          Jarak pada kartu jasa &amp; mitra dihitung dari lokasi ini ke basecamp mitra. Pilih lokasi
          saat ini atau salah satu alamat tersimpan.
        </p>

        {/* Notice lokasi tidak aktif (dilebur dari LocationNotice home) */}
        {isResolved && !hasLocation && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-brand-error-border bg-brand-error-soft p-3">
            <MapPinOff className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" />
            <p className="text-[12px] leading-snug text-brand-gray-700">
              <span className="font-semibold text-brand-gray-900">Lokasi tidak aktif . jarak tidak ditampilkan.</span>{' '}
              {permissionStatus === 'denied'
                ? 'Kamu menolak izin lokasi. Tekan "Gunakan lokasi saat ini" di bawah, atau ubah izin lokasi di pengaturan browser lalu muat ulang.'
                : 'Aktifkan GPS/izin lokasi, lalu tekan "Gunakan lokasi saat ini" di bawah.'}
            </p>
          </div>
        )}

        {/* Mini-map lokasi aktif */}
        {hasLocation && latitude != null && longitude != null && (
          <div className="mb-4 overflow-hidden rounded-xl border border-brand-gray-100">
            <MapView lat={latitude} lng={longitude} label={label} className="h-40" />
          </div>
        )}

        {/* Gunakan lokasi saat ini (GPS) */}
        <button
          type="button"
          onClick={handleGPS}
          disabled={locating}
          className="mb-2 flex w-full items-center gap-3 rounded-xl border border-brand-gray-100 p-3 text-left transition-colors hover:border-brand-red/50 disabled:opacity-60"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-red/10 text-brand-red">
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-brand-gray-900">Gunakan lokasi saat ini</p>
            <p className="text-[12px] text-brand-gray-400">
              {locating
                ? 'Mengambil lokasi…'
                : permissionStatus === 'denied'
                  ? 'Izin lokasi ditolak . aktifkan di pengaturan browser'
                  : 'Deteksi otomatis via GPS'}
            </p>
          </div>
          {useLocationStore.getState().source === 'gps' && hasLocation && (
            <Check className="h-4 w-4 shrink-0 text-brand-red" />
          )}
        </button>

        {/* Alamat tersimpan */}
        <div className="mt-3">
          <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-brand-gray-400">
            Alamat tersimpan
          </p>
          {loadingAddr ? (
            <div className="py-6 text-center text-[13px] text-brand-gray-400">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-red" />
            </div>
          ) : addresses.length === 0 ? (
            <p className="px-1 py-3 text-[12px] text-brand-gray-400">
              Belum ada alamat tersimpan berkoordinat. Tambahkan di menu Alamat pada profil.
            </p>
          ) : (
            <div className="space-y-2">
              {addresses.map((a) => {
                const active =
                  hasLocation && latitude === a.lat && longitude === a.lon;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => pickAddress(a)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${active ? 'border-brand-red bg-brand-red/5' : 'border-brand-gray-100 hover:border-brand-red/50'
                      }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-gray-70 text-brand-gray-700">
                      <Home className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-brand-gray-900">
                        {a.label || 'Alamat'}
                        {a.is_default && (
                          <span className="ml-2 rounded bg-brand-gray-70 px-1.5 py-0.5 text-[10px] font-medium text-brand-gray-400">
                            Utama
                          </span>
                        )}
                      </p>
                      <p className="truncate text-[12px] text-brand-gray-400">{a.address}</p>
                    </div>
                    {active && <Check className="h-4 w-4 shrink-0 text-brand-red" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
