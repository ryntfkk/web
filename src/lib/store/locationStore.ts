import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LocationPermission = 'idle' | 'granted' | 'denied' | 'unavailable';
/** Asal koordinat aktif: GPS, alamat tersimpan, atau belum ada. */
export type LocationSource = 'idle' | 'gps' | 'address';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  permissionStatus: LocationPermission;
  /** True once we've attempted to get the location (success or fail). */
  isResolved: boolean;
  /** True when we have real coordinates from the user. */
  hasLocation: boolean;
  /** Label lokasi aktif untuk kapsul home (mis. "Lokasi saat ini" / "Rumah . Jl. …"). */
  label: string;
  /** Asal koordinat aktif. */
  source: LocationSource;

  /** Minta lokasi via browser Geolocation API (GPS). */
  requestLocation: () => void;
  /** Set lokasi manual dari alamat tersimpan / pilih di peta. */
  setManualLocation: (latitude: number, longitude: number, label: string) => void;
  /** Reset ke idle. */
  resetLocation: () => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      latitude: null,
      longitude: null,
      permissionStatus: 'idle',
      isResolved: false,
      hasLocation: false,
      label: '',
      source: 'idle',

      requestLocation: () => {
        // Sudah punya lokasi terpilih (GPS/alamat) → jangan timpa.
        if (get().isResolved && get().hasLocation) return;

        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          set({ permissionStatus: 'unavailable', isResolved: true, hasLocation: false });
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            set({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              permissionStatus: 'granted',
              isResolved: true,
              hasLocation: true,
              label: 'Lokasi GPS saat ini',
              source: 'gps',
            });
          },
          (error) => {
            const denied = error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable';
            set({
              latitude: null,
              longitude: null,
              permissionStatus: denied as LocationPermission,
              isResolved: true,
              hasLocation: false,
              label: '',
              source: 'idle',
            });
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
        );
      },

      setManualLocation: (latitude, longitude, label) => {
        set({
          latitude,
          longitude,
          label: label || 'Lokasi terpilih',
          source: 'address',
          isResolved: true,
          hasLocation: true,
        });
      },

      resetLocation: () => {
        set({
          latitude: null,
          longitude: null,
          permissionStatus: 'idle',
          isResolved: false,
          hasLocation: false,
          label: '',
          source: 'idle',
        });
      },
    }),
    {
      name: 'posko-location',
      // Persist HANYA saat ada lokasi nyata → pilihan user (GPS/alamat) bertahan
      // antar-reload. Saat gagal/denied jangan persist agar auto-request bisa
      // dicoba lagi di kunjungan berikutnya.
      partialize: (s) =>
        s.hasLocation
          ? {
            latitude: s.latitude,
            longitude: s.longitude,
            permissionStatus: s.permissionStatus,
            isResolved: true,
            hasLocation: true,
            label: s.label,
            source: s.source,
          }
          : ({} as Partial<LocationState>),
    },
  ),
);
