"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import { MapPin, ExternalLink } from 'lucide-react';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

interface MapViewProps {
  lat: number;
  lng: number;
  // Teks yang tampil di label pin (mis. alamat pengerjaan).
  label?: string;
  className?: string;
  // Teks tautan ke Google Maps (default: navigasi untuk mitra).
  linkLabel?: string;
}

// ── Loader Google Maps JS (singleton, berbagi script dengan MapPicker) ──
let mapsPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if ((window as any).google?.maps?.Map) return Promise.resolve();
  if (mapsPromise) return mapsPromise;

  const p = new Promise<void>((resolve, reject) => {
    const done = () => {
      if ((window as any).google?.maps?.Map) resolve();
      else reject(new Error('gmaps not ready'));
    };
    const existing = document.getElementById('gmaps-sdk') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', done);
      existing.addEventListener('error', () => reject(new Error('gmaps load error')));
      // Script mungkin sudah selesai load sebelum listener terpasang.
      if ((window as any).google?.maps?.Map) resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = 'gmaps-sdk';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&language=id&region=ID`;
    script.async = true;
    script.defer = true;
    script.onload = done;
    script.onerror = () => reject(new Error('gmaps load error'));
    document.head.appendChild(script);
  });

  mapsPromise = p;
  p.catch(() => { if (mapsPromise === p) mapsPromise = null; });
  return p;
}

// MapView — peta READ-ONLY (marker tidak bisa digeser) untuk menampilkan
// koordinat alamat pelanggan di detail pesanan mitra. Selalu menyertakan
// tautan "Buka di Google Maps" sebagai fallback (mis. API key belum diset).
export default function MapView({ lat, lng, label, className, linkLabel }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
  const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  // API_KEY konstan → turunkan saat render, jangan setState di dalam effect.
  const showError = error !== null || !API_KEY;

  useEffect(() => {
    if (!hasCoords || !API_KEY) return;
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
          fullscreenControl: true,
          // Peta read-only: nonaktifkan interaksi ubah posisi yang tak perlu,
          // tapi biarkan zoom/geser agar mitra bisa mengorientasikan diri.
          clickableIcons: false,
          gestureHandling: 'cooperative',
        });
        markerRef.current = new google.maps.Marker({ position: center, map, title: label || 'Lokasi pengerjaan' });
        mapRef.current = map;
      })
      .catch(() => { if (!cancelled) setError('load'); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sinkronkan posisi bila koordinat berubah setelah data ter-load async.
  useEffect(() => {
    if (mapRef.current && markerRef.current && hasCoords) {
      const pos = { lat, lng };
      markerRef.current.setPosition(pos);
      mapRef.current.setCenter(pos);
    }
  }, [lat, lng, hasCoords]);

  if (!hasCoords) {
    return (
      <div className={`bg-[#f7f5f4] border border-[#e5e2e1] rounded-lg flex items-center justify-center p-4 text-center ${className || 'h-40'}`}>
        <p className="text-xs text-[#9e8e8c]">Koordinat lokasi tidak tersedia untuk pesanan ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showError ? (
        <div className={`bg-[#f7f5f4] border border-[#e5e2e1] rounded-lg flex flex-col items-center justify-center gap-1.5 p-4 text-center ${className || 'h-40'}`}>
          <MapPin className="w-5 h-5 text-[#b51822]" />
          <p className="text-xs text-[#9e8e8c]">Peta tidak dapat dimuat.</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className={`w-full rounded-lg overflow-hidden border border-[#e5e2e1] ${className || 'h-48'}`}
          style={{ zIndex: 0 }}
        />
      )}
      <a
        href={gmapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#b51822] hover:underline"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        {linkLabel || 'Buka di Google Maps (navigasi)'}
      </a>
    </div>
  );
}
