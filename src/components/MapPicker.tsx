"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

// ── Loader Google Maps JS (singleton) ──
let mapsPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if ((window as any).google?.maps?.Map) return Promise.resolve();
  if (mapsPromise) return mapsPromise;

  const p = new Promise<void>((resolve, reject) => {
    const done = () => {
      // Pastikan library benar-benar siap sebelum dianggap sukses.
      if ((window as any).google?.maps?.Map) resolve();
      else reject(new Error('gmaps not ready'));
    };
    const existing = document.getElementById('gmaps-sdk') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', done);
      existing.addEventListener('error', () => reject(new Error('gmaps load error')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'gmaps-sdk';
    // Loader klasik: window.google.maps siap saat onload.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&language=id&region=ID`;
    script.async = true;
    script.defer = true;
    script.onload = done;
    script.onerror = () => reject(new Error('gmaps load error'));
    document.head.appendChild(script);
  });

  // Jangan cache promise yang gagal — supaya bisa retry saat mount berikutnya.
  mapsPromise = p;
  p.catch(() => { if (mapsPromise === p) mapsPromise = null; });
  return p;
}

export default function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

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
        mapRef.current = map;
        markerRef.current = marker;

        const setPos = (pos: { lat: number; lng: number }) => {
          marker.setPosition(pos);
          onChangeRef.current(pos.lat, pos.lng);
        };
        marker.addListener('dragend', () => {
          const p = marker.getPosition();
          if (p) setPos({ lat: p.lat(), lng: p.lng() });
        });
        map.addListener('click', (e: any) => {
          if (e.latLng) setPos({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        });
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

  const locateMe = () => {
    if (!navigator.geolocation) {
      setError('Perangkat tidak mendukung GPS.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (mapRef.current && markerRef.current) {
          markerRef.current.setPosition(p);
          mapRef.current.setCenter(p);
          mapRef.current.setZoom(17);
        }
        onChangeRef.current(p.lat, p.lng);
        setLocating(false);
      },
      () => {
        setError('Gagal mengambil lokasi GPS. Pastikan izin lokasi diaktifkan.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (error && !mapRef.current) {
    return (
      <div className="w-full h-full min-h-[256px] bg-[#f7f5f4] border border-[#e5e2e1] rounded-lg flex items-center justify-center p-4 text-center">
        <p className="text-sm text-[#E53E3E]">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[256px]">
      <div ref={containerRef} className="w-full h-full min-h-[256px]" style={{ zIndex: 0 }} />
      {/* Tombol GPS: arahkan pin ke lokasi user saat ini */}
      <button
        type="button"
        onClick={locateMe}
        disabled={locating}
        title="Gunakan lokasi saya"
        className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 bg-white text-[#1c1b1b] text-xs font-semibold px-3 py-2 rounded-lg shadow-md border border-[#e5e2e1] hover:bg-[#f7f5f4] disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#b51822" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
        {locating ? 'Mencari…' : 'Lokasi saya'}
      </button>
      {error && (
        <div className="absolute top-2 left-2 right-2 z-10 bg-[#FFF5F5] border border-[#FEB2B2] text-[#C53030] text-xs px-3 py-2 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
}
