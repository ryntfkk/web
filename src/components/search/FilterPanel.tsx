"use client";

import { Filter, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCities } from '@/hooks/useCities';

interface FilterPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  city: string;
  onCityChange: (c: string) => void;
  minRating: number;
  onMinRatingChange: (r: number) => void;
  /** '' = semua, 'individual', 'vendor' (M2). */
  partnerType: string;
  onPartnerTypeChange: (t: string) => void;
  /** Filter harga (rupiah); 0 = tanpa batas. Disaring server (E5). */
  minPrice: number;
  onMinPriceChange: (v: number) => void;
  maxPrice: number;
  onMaxPriceChange: (v: number) => void;
}

/**
 * M2: pelanggan bisa memilih berurusan dengan perorangan atau badan usaha.
 *
 * Labelnya sengaja bukan "Individual/Vendor" . itu istilah internal. Yang
 * dilihat pelanggan adalah bentuk pihak yang akan datang ke rumahnya dan
 * menerima pembayarannya.
 */
const PARTNER_TYPE_OPTIONS = [
  { label: 'Semua mitra', value: '', hint: '' },
  { label: 'Perorangan', value: 'individual', hint: 'Dikerjakan langsung oleh pemilik layanan' },
  { label: 'Badan usaha', value: 'vendor', hint: 'PT/CV dengan tim & penanggung jawab' },
];

const RATING_OPTIONS = [
  { label: 'Semua rating', value: 0 },
  { label: '4 ke atas', value: 4 },
  { label: '3 ke atas', value: 3 },
];

export default function FilterPanel({
  isOpen,
  onClose,
  city,
  onCityChange,
  minRating,
  onMinRatingChange,
  partnerType,
  onPartnerTypeChange,
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange,
}: FilterPanelProps) {
  const { data: cities } = useCities();
  const hasActiveFilter =
    Boolean(city) || minRating > 0 || Boolean(partnerType) || minPrice > 0 || maxPrice > 0;

  // Input harga: 0 di state = kosong di UI. Angka saja; string non-angka → 0.
  const priceValue = (v: number) => (v > 0 ? String(v) : '');
  const parsePrice = (s: string) => {
    const n = parseInt(s.replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-[60] md:hidden" onClick={onClose} />}

      {/* Panel */}
      <aside
        className={`
        fixed md:static inset-y-0 right-0 z-[61] w-[280px] md:w-[256px] shrink-0 bg-white border-l md:border border-brand-gray-100 md:rounded-xs p-[17px]
        flex flex-col gap-6 h-full md:h-max overflow-y-auto md:overflow-visible transition-transform duration-300
        ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        ${!isOpen && 'hidden md:flex'}
      `}
      >
        {/* Filter Header */}
        <div className="flex items-center justify-between pb-[9px] border-b border-brand-gray-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-brand-gray-900" />
            <h3 className="text-[16px] font-semibold text-brand-gray-900">Filter</h3>
          </div>
          <button onClick={onClose} className="md:hidden text-brand-gray-900" aria-label="Tutup filter">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* City Filter */}
        <div className="flex flex-col gap-2">
          <h4 className="text-[16px] font-semibold text-brand-gray-900 mb-1">Kota</h4>
          <select
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            className="w-full p-2.5 border border-brand-gray-100 rounded-xs text-[14px] text-brand-gray-900 bg-white focus:outline-none focus:border-brand-red"
          >
            <option value="">Semua Kota</option>
            {cities?.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Minimum Rating Filter */}
        <div className="flex flex-col gap-2">
          <h4 className="text-[16px] font-semibold text-brand-gray-900 mb-1">Minimum Rating</h4>
          {RATING_OPTIONS.map((opt) => {
            const active = minRating === opt.value;
            return (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer group rounded-md focus-within:ring-2 focus-within:ring-brand-blue">
                <div
                  className={`w-[16px] h-[16px] rounded-full flex items-center justify-center transition-colors ${
                    active ? 'bg-brand-red' : 'border border-brand-gray-400 group-hover:border-brand-red'
                  }`}
                >
                  {active && <div className="w-[6px] h-[6px] bg-white rounded-full" />}
                </div>
                <div className="flex items-center gap-1">
                  {opt.value > 0 && (
                    <Star className="w-[13px] h-[13px] fill-brand-warning text-brand-warning" />
                  )}
                  <span className="text-[14px] text-brand-gray-900">{opt.label}</span>
                </div>
                <input
                  type="radio"
                  name="min-rating"
                  className="sr-only"
                  checked={active}
                  onChange={() => onMinRatingChange(opt.value)}
                />
              </label>
            );
          })}
        </div>

        {/* Jenis Mitra (M2) */}
        <div className="flex flex-col gap-2">
          <h4 className="text-[16px] font-semibold text-brand-gray-900 mb-1">Jenis Mitra</h4>
          {PARTNER_TYPE_OPTIONS.map((opt) => {
            const active = partnerType === opt.value;
            return (
              <label key={opt.value || 'all'} className="flex items-start gap-2 cursor-pointer group rounded-md focus-within:ring-2 focus-within:ring-brand-blue">
                <div
                  className={`w-[16px] h-[16px] mt-0.5 shrink-0 rounded-full flex items-center justify-center transition-colors ${
                    active ? 'bg-brand-red' : 'border border-brand-gray-400 group-hover:border-brand-red'
                  }`}
                >
                  {active && <div className="w-[6px] h-[6px] bg-white rounded-full" />}
                </div>
                <span className="min-w-0">
                  <span className="block text-[14px] text-brand-gray-900">{opt.label}</span>
                  {opt.hint && (
                    <span className="block text-[12px] leading-snug text-brand-gray-450">{opt.hint}</span>
                  )}
                </span>
                <input
                  type="radio"
                  name="partner-type"
                  className="sr-only"
                  checked={active}
                  onChange={() => onPartnerTypeChange(opt.value)}
                />
              </label>
            );
          })}
        </div>

        {/* Rentang Harga (E5) . disaring server, jadi aman untuk paginasi. */}
        <div className="flex flex-col gap-2">
          <h4 className="text-[16px] font-semibold text-brand-gray-900 mb-1">Rentang Harga</h4>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={priceValue(minPrice)}
              onChange={(e) => onMinPriceChange(parsePrice(e.target.value))}
              placeholder="Min"
              aria-label="Harga minimum"
              className="w-full p-2.5 border border-brand-gray-100 rounded-xs text-[14px] text-brand-gray-900 bg-white focus:outline-none focus:border-brand-red"
            />
            <span className="text-brand-gray-400">–</span>
            <input
              type="text"
              inputMode="numeric"
              value={priceValue(maxPrice)}
              onChange={(e) => onMaxPriceChange(parsePrice(e.target.value))}
              placeholder="Maks"
              aria-label="Harga maksimum"
              className="w-full p-2.5 border border-brand-gray-100 rounded-xs text-[14px] text-brand-gray-900 bg-white focus:outline-none focus:border-brand-red"
            />
          </div>
        </div>

        {/* Reset */}
        <Button
          variant="secondary"
          className="w-full mt-2 rounded-xs py-[9px] h-auto text-[14px] font-bold disabled:opacity-50"
          disabled={!hasActiveFilter}
          onClick={() => {
            onCityChange('');
            onMinRatingChange(0);
            onPartnerTypeChange('');
            onMinPriceChange(0);
            onMaxPriceChange(0);
          }}
        >
          Reset Filter
        </Button>
      </aside>
    </>
  );
}
