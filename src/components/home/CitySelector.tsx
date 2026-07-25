"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { MapPin, ChevronDown, Search, X, Check, Globe, Navigation, Sparkles } from 'lucide-react';
import { useCities } from '@/hooks/useCities';
import { useCityFilter } from '@/lib/store/cityFilterStore';
import { useLocationStore } from '@/lib/store/locationStore';

export default function CitySelector() {
  const { data: cities, isLoading } = useCities();
  const { city, setCity } = useCityFilter();
  const { requestLocation, permissionStatus } = useLocationStore();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when modal is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setSearchQuery('');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Filtered cities list based on search query
  const filteredCities = useMemo(() => {
    if (!cities) return [];
    if (!searchQuery.trim()) return cities;
    const query = searchQuery.toLowerCase().trim();
    return cities.filter((c) => c.toLowerCase().includes(query));
  }, [cities, searchQuery]);

  const handleSelectCity = (selectedCity: string) => {
    setCity(selectedCity);
    setIsOpen(false);
  };

  const handleGPSLocation = () => {
    setIsLocating(true);
    requestLocation();
    setTimeout(() => {
      setIsLocating(false);
      // If we have cities, we leave default or user notification
    }, 1200);
  };

  return (
    <>
      {/* Compact Capsule Button Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#e5e2e1] shadow-2xs hover:shadow-xs hover:border-[#b51822]/40 transition-all duration-200 cursor-pointer active:scale-95 text-left group shrink-0"
      >
        <div className="w-5 h-5 rounded-full bg-[#b51822]/10 flex items-center justify-center text-[#b51822] group-hover:bg-[#b51822] group-hover:text-white transition-colors duration-200 shrink-0">
          <MapPin className="w-3 h-3" />
        </div>
        
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8f6f6d] shrink-0 hidden xs:inline">
            Lokasi:
          </span>
          <span className="text-[12px] sm:text-[13px] font-bold text-[#1c1b1b] truncate max-w-[110px] xs:max-w-[140px] sm:max-w-[180px] leading-tight">
            {city || 'Semua Kota'}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-[#8f6f6d] group-hover:text-[#b51822] transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-[#b51822]' : ''
          }`}
        />
      </button>

      {/* Modal / Bottom Sheet Drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Content Box */}
          <div
            ref={modalRef}
            className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[75vh] border border-[#e5e2e1] animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200"
          >
            {/* Mobile Drag Indicator */}
            <div className="sm:hidden w-full flex justify-center pt-2.5 pb-1">
              <div className="w-10 h-1 bg-[#e5e2e1] rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 pt-2 sm:pt-4 pb-3 border-b border-[#e5e2e1] flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-[16px] sm:text-[18px] font-bold text-[#1c1b1b] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#b51822]" />
                  Pilih Lokasi Jasa
                </h3>
                <p className="text-[12px] text-[#8f6f6d] mt-0.5">
                  Tampilkan mitra &amp; layanan terdekat di kota Anda
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-[#f5f3f2] hover:bg-[#e5e2e1] flex items-center justify-center text-[#5b403e] transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 sm:p-4 bg-[#faf8f7] border-b border-[#e5e2e1] shrink-0 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-[#8f6f6d] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kota (misal: Jakarta, Surabaya)..."
                  className="w-full bg-white border border-[#e5e2e1] rounded-xl pl-9 pr-8 py-2 text-[13px] text-[#1c1b1b] placeholder:text-[#8f6f6d] focus:outline-none focus:border-[#b51822] focus:ring-1 focus:ring-[#b51822] transition-all"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8f6f6d] hover:text-[#1c1b1b]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* GPS button */}
              <button
                type="button"
                onClick={handleGPSLocation}
                disabled={isLocating}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white border border-[#e5e2e1] hover:border-[#b51822]/40 rounded-xl text-[12px] font-semibold text-[#5b403e] hover:text-[#b51822] transition-colors shadow-2xs"
              >
                <Navigation className={`w-3.5 h-3.5 text-[#b51822] ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Mendeteksi Lokasi...' : 'Gunakan Lokasi Saya Saat Ini'}</span>
              </button>
            </div>

            {/* Cities List */}
            <div className="p-3 sm:p-4 overflow-y-auto space-y-1.5 flex-1 min-h-0">
              {/* Option: Semua Kota */}
              <button
                type="button"
                onClick={() => handleSelectCity('')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  !city
                    ? 'bg-[#b51822]/5 border-[#b51822] text-[#b51822] font-bold shadow-2xs'
                    : 'border-transparent hover:bg-[#f5f3f2] text-[#1c1b1b]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      !city ? 'bg-[#b51822] text-white' : 'bg-[#e5e2e1] text-[#5b403e]'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[13px] sm:text-[14px] font-semibold">Semua Kota</div>
                    <div className="text-[11px] text-[#8f6f6d]">Tampilkan seluruh layanan di Indonesia</div>
                  </div>
                </div>
                {!city && <Check className="w-4 h-4 text-[#b51822] shrink-0" />}
              </button>

              {/* List Header */}
              <div className="pt-2 pb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-[#8f6f6d]">
                Kota Tersedia ({filteredCities.length})
              </div>

              {isLoading ? (
                <div className="py-8 text-center text-[13px] text-[#8f6f6d] animate-pulse">
                  Memuat daftar kota...
                </div>
              ) : filteredCities.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-[#8f6f6d]">
                  Tidak ada kota &quot;{searchQuery}&quot; ditemukan.
                </div>
              ) : (
                filteredCities.map((cityName) => {
                  const isSelected = city === cityName;
                  return (
                    <button
                      key={cityName}
                      type="button"
                      onClick={() => handleSelectCity(cityName)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-[#b51822]/5 border-[#b51822] text-[#b51822] font-bold shadow-2xs'
                          : 'border-transparent hover:bg-[#f5f3f2] text-[#1c1b1b]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-[#b51822] text-white' : 'bg-[#f5f3f2] text-[#8f6f6d]'
                          }`}
                        >
                          <MapPin className="w-4 h-4" />
                        </div>
                        <span className="text-[13px] sm:text-[14px] font-medium">{cityName}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#b51822] shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

