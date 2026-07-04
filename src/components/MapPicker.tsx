"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icon in Next.js
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

function LocationMarker({ position, onChange }: { position: L.LatLng | null, onChange: (pos: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={icon} />
  );
}

export default function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  const [position, setPosition] = useState<L.LatLng | null>(new L.LatLng(lat, lng));

  // Try to get user's current location if possible
  useEffect(() => {
    if (lat === -6.200000 && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const newPos = new L.LatLng(pos.coords.latitude, pos.coords.longitude);
        setPosition(newPos);
        onChange(newPos.lat, newPos.lng);
      });
    }
  }, []);

  const handlePositionChange = (pos: L.LatLng) => {
    setPosition(pos);
    onChange(pos.lat, pos.lng);
  };

  return (
    <div className="w-full h-full min-h-[300px]">
      <MapContainer
        center={position || [lat, lng]}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} onChange={handlePositionChange} />
      </MapContainer>
    </div>
  );
}
