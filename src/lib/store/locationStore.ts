import { create } from 'zustand';

export type LocationPermission = 'idle' | 'granted' | 'denied' | 'unavailable';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  permissionStatus: LocationPermission;
  /** True once we've attempted to get the location (success or fail). */
  isResolved: boolean;
  /** True when we have real coordinates from the user. */
  hasLocation: boolean;

  /** Call once to request the user's location via the browser Geolocation API. */
  requestLocation: () => void;
  /** Reset back to idle (e.g. if the user revokes permission). */
  resetLocation: () => void;
}

export const useLocationStore = create<LocationState>()((set, get) => ({
  latitude: null,
  longitude: null,
  permissionStatus: 'idle',
  isResolved: false,
  hasLocation: false,

  requestLocation: () => {
    // Don't re-request if already resolved
    if (get().isResolved) return;

    // Browser doesn't support geolocation
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
        });
      },
      (error) => {
        const denied =
          error.code === error.PERMISSION_DENIED
            ? 'denied'
            : 'unavailable';
        set({
          latitude: null,
          longitude: null,
          permissionStatus: denied as LocationPermission,
          isResolved: true,
          hasLocation: false,
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 5 * 60 * 1000, // cache for 5 minutes
      },
    );
  },

  resetLocation: () => {
    set({
      latitude: null,
      longitude: null,
      permissionStatus: 'idle',
      isResolved: false,
      hasLocation: false,
    });
  },
}));
