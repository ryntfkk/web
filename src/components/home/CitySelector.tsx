"use client";

import { MapPin, ChevronDown } from 'lucide-react';
import { useCities } from '@/hooks/useCities';
import { useCityFilter } from '@/lib/store/cityFilterStore';

// Dropdown pilih kota untuk memfilter mitra di Home.
// Pilihan disimpan di store (persist) dan ikut dipakai halaman Search.
export default function CitySelector() {
  const { data: cities, isLoading } = useCities();
  const { city, setCity } = useCityFilter();

  return (
    <div className="flex items-center gap-2">
      <MapPin className="w-4 h-4 text-[#b51822] shrink-0" />
      <span className="text-[13px] sm:text-[14px] text-[#5b403e] shrink-0">Kota:</span>
      <div className="relative">
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          disabled={isLoading}
          className="appearance-none bg-white border border-[#e5e2e1] rounded-full pl-3 pr-8 py-1.5 text-[13px] sm:text-[14px] font-semibold text-[#1c1b1b] focus:outline-none focus:border-[#b51822] cursor-pointer"
        >
          <option value="">Semua Kota</option>
          {cities?.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-[#8f6f6d] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
}
