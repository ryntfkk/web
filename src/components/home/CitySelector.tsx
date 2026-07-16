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
    <div className="flex items-center gap-1.5 sm:gap-2">
      <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#b51822] shrink-0" />
      <span className="text-[12px] sm:text-[13px] text-[#5b403e] shrink-0">Kota:</span>
      <div className="relative">
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          disabled={isLoading}
          className="appearance-none bg-white border border-[#e5e2e1] rounded-full pl-2.5 pr-7 py-1 sm:pl-3 sm:pr-8 sm:py-1.5 text-[12px] sm:text-[13px] font-semibold text-[#1c1b1b] focus:outline-none focus:border-[#b51822] cursor-pointer"
        >
          <option value="">Semua Kota</option>
          {cities?.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8f6f6d] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
}
