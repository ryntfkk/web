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
}

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
}: FilterPanelProps) {
  const { data: cities } = useCities();
  const hasActiveFilter = Boolean(city) || minRating > 0;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-[60] md:hidden" onClick={onClose} />}

      {/* Panel */}
      <aside
        className={`
        fixed md:static inset-y-0 right-0 z-[61] w-[280px] md:w-[256px] shrink-0 bg-white border-l md:border border-[#e5e2e1] md:rounded-[4px] p-[17px]
        flex flex-col gap-6 h-full md:h-max overflow-y-auto md:overflow-visible transition-transform duration-300
        ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        ${!isOpen && 'hidden md:flex'}
      `}
      >
        {/* Filter Header */}
        <div className="flex items-center justify-between pb-[9px] border-b border-[#e5e2e1]">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#1c1b1b]" />
            <h3 className="text-[16px] font-semibold text-[#1c1b1b]">Filter</h3>
          </div>
          <button onClick={onClose} className="md:hidden text-[#1c1b1b]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* City Filter */}
        <div className="flex flex-col gap-2">
          <h4 className="text-[16px] font-semibold text-[#1c1b1b] mb-1">Kota</h4>
          <select
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            className="w-full p-2.5 border border-[#e5e2e1] rounded-[4px] text-[14px] text-[#1c1b1b] bg-white focus:outline-none focus:border-[#b51822]"
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
          <h4 className="text-[16px] font-semibold text-[#1c1b1b] mb-1">Minimum Rating</h4>
          {RATING_OPTIONS.map((opt) => {
            const active = minRating === opt.value;
            return (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
                <div
                  className={`w-[16px] h-[16px] rounded-full flex items-center justify-center transition-colors ${
                    active ? 'bg-[#b51822]' : 'border border-[#8f6f6d] group-hover:border-[#b51822]'
                  }`}
                >
                  {active && <div className="w-[6px] h-[6px] bg-white rounded-full" />}
                </div>
                <div className="flex items-center gap-1">
                  {opt.value > 0 && (
                    <Star className="w-[13px] h-[13px] fill-[#FFC107] text-[#FFC107]" />
                  )}
                  <span className="text-[14px] text-[#1c1b1b]">{opt.label}</span>
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

        {/* Reset */}
        <Button
          variant="secondary"
          className="w-full mt-2 rounded-[4px] py-[9px] h-auto text-[14px] font-bold disabled:opacity-50"
          disabled={!hasActiveFilter}
          onClick={() => {
            onCityChange('');
            onMinRatingChange(0);
          }}
        >
          Reset Filter
        </Button>
      </aside>
    </>
  );
}
