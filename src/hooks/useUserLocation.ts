'use client';

import { useEffect, useRef } from 'react';
import { useLocationStore } from '@/lib/store/locationStore';

/**
 * Requests the user's browser geolocation once on mount.
 *
 * Usage in any component that needs location-aware partner data:
 *
 *   const { latitude, longitude, hasLocation } = useUserLocation();
 *   const { data } = usePartners({ latitude, longitude, ... });
 */
export function useUserLocation() {
  const ran = useRef(false);
  const requestLocation = useLocationStore((s) => s.requestLocation);
  const latitude = useLocationStore((s) => s.latitude);
  const longitude = useLocationStore((s) => s.longitude);
  const hasLocation = useLocationStore((s) => s.hasLocation);
  const permissionStatus = useLocationStore((s) => s.permissionStatus);
  const isResolved = useLocationStore((s) => s.isResolved);

  useEffect(() => {
    // StrictMode guard + only request once per mount
    if (ran.current) return;
    ran.current = true;
    requestLocation();
  }, [requestLocation]);

  return { latitude, longitude, hasLocation, permissionStatus, isResolved };
}
