"use client";

import { MapPin, ChevronDown } from 'lucide-react';
import { useCities } from '@/hooks/useCities';
import { useCityFilter } from '@/lib/store/cityFilterStore';

// Dropdown pilih kota untuk memfilter mitra di Home.
// Pilihan disimpan di store (persist) dan ikut dipakai halaman Search.
// Kompak: tampil sebagai inline text-link kecil, bukan field form besar.
export default function CitySelector() {
  const { data: cities, isLoading } = useCities();
  const { city, setCity } = useCityFilter();

  return (
    <div className="inline-flex items-center gap-1">
      <MapPin className="w-3 h-3 text-[#b51822] shrink-0" />
      <div className="relative">
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          disabled={isLoading}
          className="appearance-none bg-transparent border-none pr-4 py-0 text-[11px] sm:text-[12px] font-medium text-[#5b403e] focus:outline-none cursor-pointer hover:text-[#b51822] transition-colors"
        >
          <option value="">Semua Kota</option>
          {cities?.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3 h-3 text-[#8f6f6d] absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
}
