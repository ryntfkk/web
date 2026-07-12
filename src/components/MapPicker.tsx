"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export interface ResolvedLocation {
  kecamatan: string;
  kota: string;
  provinsi: string;
  /** "Kecamatan, Kota" — siap dipakai sebagai service_area / label lokasi */
  area: string;
  /** Alamat lengkap hasil geocode */
  formatted: string;
}

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  /** Dipanggil setelah reverse-geocode selesai tiap kali pin dipindah. */
  onResolveLocation?: (loc: ResolvedLocation) => void;
}

// ── Loader Google Maps JS (singleton, sekali muat untuk seluruh app) ──
let mapsPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if ((window as any).google?.maps) return Promise.resolve();
  if (mapsPromise) return mapsPromise;

  mapsPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById('gmaps-sdk') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('gmaps load error')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'gmaps-sdk';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&language=id&region=ID`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('gmaps load error'));
    document.head.appendChild(script);
  });
  return mapsPromise;
}

function pick(components: any[], type: string): string {
  const c = components.find((x) => Array.isArray(x.types) && x.types.includes(type));
  return c ? c.long_name : '';
}

function extractLocation(result: any): ResolvedLocation {
  const comp: any[] = result.address_components || [];
  const kota = pick(comp, 'administrative_area_level_2') || pick(comp, 'locality') || '';
  const kecamatan =
    pick(comp, 'administrative_area_level_3') ||
    pick(comp, 'sublocality_level_1') ||
    pick(comp, 'sublocality') ||
    '';
  const provinsi = pick(comp, 'administrative_area_level_1');
  const area = [kecamatan, kota].filter(Boolean).join(', ');
  return { kecamatan, kota, provinsi, area, formatted: result.formatted_address || '' };
}

export default function MapPicker({ lat, lng, onChange, onResolveLocation }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Simpan callback terbaru tanpa memicu re-init map.
  const onChangeRef = useRef(onChange);
  const onResolveRef = useRef(onResolveLocation);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onResolveRef.current = onResolveLocation; }, [onResolveLocation]);

  const reverseGeocode = (position: { lat: number; lng: number }) => {
    if (!geocoderRef.current || !onResolveRef.current) return;
    geocoderRef.current.geocode({ location: position }, (results: any[], status: string) => {
      if (status === 'OK' && results && results[0]) {
        onResolveRef.current?.(extractLocation(results[0]));
      }
    });
  };

  // Init map sekali.
  useEffect(() => {
    if (!API_KEY) {
      setError('Google Maps API key belum diset (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).');
      return;
    }
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const google = (window as any).google;
        const center = { lat, lng };
        const map = new google.maps.Map(containerRef.current, {
          center,
          zoom: 16,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        const marker = new google.maps.Marker({ position: center, map, draggable: true });
        const geocoder = new google.maps.Geocoder();
        mapRef.current = map;
        markerRef.current = marker;
        geocoderRef.current = geocoder;

        const setPos = (pos: { lat: number; lng: number }) => {
          marker.setPosition(pos);
          onChangeRef.current(pos.lat, pos.lng);
          reverseGeocode(pos);
        };

        marker.addListener('dragend', () => {
          const p = marker.getPosition();
          if (p) setPos({ lat: p.lat(), lng: p.lng() });
        });
        map.addListener('click', (e: any) => {
          if (e.latLng) setPos({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });

        // Resolve lokasi awal supaya field area langsung terisi.
        reverseGeocode(center);
      })
      .catch(() => {
        if (!cancelled) setError('Gagal memuat Google Maps. Cek API key & koneksi.');
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sinkronkan posisi bila lat/lng dari luar berubah (mis. data ter-load async).
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      const pos = { lat, lng };
      markerRef.current.setPosition(pos);
      mapRef.current.setCenter(pos);
    }
  }, [lat, lng]);

  if (error) {
    return (
      <div className="w-full h-full min-h-[256px] bg-[#f7f5f4] border border-[#e5e2e1] rounded-lg flex items-center justify-center p-4 text-center">
        <p className="text-sm text-[#E53E3E]">{error}</p>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full min-h-[256px]" style={{ zIndex: 0 }} />;
}
