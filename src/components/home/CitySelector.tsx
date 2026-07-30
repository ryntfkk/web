"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { MapPin, ChevronDown, Search, X, Check, Globe } from 'lucide-react';
import { useCities } from '@/hooks/useCities';
import { useCityFilter } from '@/lib/store/cityFilterStore';

export default function CitySelector() {
  const { data: cities, isLoading } = useCities();
  const { city, setCity } = useCityFilter();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  return (
    <>
      {/* Compact Capsule Button Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-brand-gray-100 shadow-2xs hover:shadow-xs hover:border-brand-red/40 transition-all duration-200 cursor-pointer active:scale-95 text-left group shrink-0"
      >
        <div className="w-5 h-5 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red group-hover:bg-brand-red group-hover:text-white transition-colors duration-200 shrink-0">
          <MapPin className="w-3 h-3" />
        </div>
        
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-gray-400 shrink-0 hidden xs:inline">
            Lokasi:
          </span>
          <span className="text-[12px] sm:text-[13px] font-bold text-brand-gray-900 truncate max-w-[110px] xs:max-w-[140px] sm:max-w-[180px] leading-tight">
            {city || 'Semua Kota'}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-brand-gray-400 group-hover:text-brand-red transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-brand-red' : ''
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
            className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[75vh] border border-brand-gray-100 animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200"
          >
            {/* Mobile Drag Indicator */}
            <div className="sm:hidden w-full flex justify-center pt-2.5 pb-1">
              <div className="w-10 h-1 bg-brand-gray-100 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 pt-2 sm:pt-4 pb-3 border-b border-brand-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-[16px] sm:text-[18px] font-bold text-brand-gray-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-brand-red" />
                  Pilih Lokasi Jasa
                </h3>
                <p className="text-[12px] text-brand-gray-400 mt-0.5">
                  Tampilkan mitra &amp; layanan terdekat di kota Anda
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-brand-gray-70 hover:bg-brand-gray-100 flex items-center justify-center text-brand-gray-700 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input â€” tombol GPS dihapus: lokasi diminta OTOMATIS untuk
                menghitung jarak (lihat LocationNotice); pemilih kota ini murni
                untuk memfilter wilayah, bukan menentukan lokasi presisi. */}
            <div className="p-3 sm:p-4 bg-brand-gray-50 border-b border-brand-gray-100 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-brand-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kota (misal: Jakarta, Surabaya)..."
                  className="w-full bg-white border border-brand-gray-100 rounded-xl pl-9 pr-8 py-2 text-[13px] text-brand-gray-900 placeholder:text-brand-gray-400 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-all"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-gray-400 hover:text-brand-gray-900"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Cities List */}
            <div className="p-3 sm:p-4 overflow-y-auto space-y-1.5 flex-1 min-h-0">
              {/* Option: Semua Kota */}
              <button
                type="button"
                onClick={() => handleSelectCity('')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  !city
                    ? 'bg-brand-red/5 border-brand-red text-brand-red font-bold shadow-2xs'
                    : 'border-transparent hover:bg-brand-gray-70 text-brand-gray-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      !city ? 'bg-brand-red text-white' : 'bg-brand-gray-100 text-brand-gray-700'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[13px] sm:text-[14px] font-semibold">Semua Kota</div>
                    <div className="text-[11px] text-brand-gray-400">Tampilkan seluruh layanan di Indonesia</div>
                  </div>
                </div>
                {!city && <Check className="w-4 h-4 text-brand-red shrink-0" />}
              </button>

              {/* List Header */}
              <div className="pt-2 pb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-brand-gray-400">
                Kota Tersedia ({filteredCities.length})
              </div>

              {isLoading ? (
                <div className="py-8 text-center text-[13px] text-brand-gray-400 animate-pulse">
                  Memuat daftar kota...
                </div>
              ) : filteredCities.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-brand-gray-400">
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
                          ? 'bg-brand-red/5 border-brand-red text-brand-red font-bold shadow-2xs'
                          : 'border-transparent hover:bg-brand-gray-70 text-brand-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-brand-red text-white' : 'bg-brand-gray-70 text-brand-gray-400'
                          }`}
                        >
                          <MapPin className="w-4 h-4" />
                        </div>
                        <span className="text-[13px] sm:text-[14px] font-medium">{cityName}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-brand-red shrink-0" />}
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

