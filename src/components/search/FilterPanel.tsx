import { Filter, Star, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FilterPanel() {
  return (
    <aside className="w-[256px] shrink-0 bg-white border border-[#e5e2e1] rounded-[4px] p-[17px] hidden md:flex md:flex-col gap-6 h-max">
      {/* Filter Header */}
      <div className="flex items-center gap-2 pb-[9px] border-b border-[#e5e2e1]">
        <Filter className="w-4 h-4 text-[#1c1b1b]" />
        <h3 className="text-[16px] font-semibold text-[#1c1b1b]">Filter</h3>
      </div>

      {/* Radius Filter */}
      <div className="flex flex-col gap-2">
        <h4 className="text-[16px] font-semibold text-[#1c1b1b] mb-1">Radius</h4>
        {['2 km', '5 km', '10 km', '20 km'].map((radius, idx) => (
          <label key={idx} className="flex items-center gap-2 cursor-pointer group">
            <div className={`w-[16px] h-[16px] rounded-full flex items-center justify-center transition-colors ${idx === 0 ? 'bg-[#b51822]' : 'border border-[#8f6f6d] group-hover:border-[#b51822]'}`}>
              {idx === 0 && <div className="w-[6px] h-[6px] bg-white rounded-full" />}
            </div>
            <span className="text-[14px] text-[#1c1b1b]">{radius}</span>
          </label>
        ))}
      </div>

      {/* Category Filter */}
      <div className="flex flex-col gap-2">
        <h4 className="text-[16px] font-semibold text-[#1c1b1b] mb-1">Category</h4>
        {['Cleaning', 'Repair', 'Delivery', 'Health', 'Beauty'].map((cat, idx) => (
          <label key={idx} className="flex items-center gap-2 cursor-pointer group">
            <div className={`w-[16px] h-[16px] flex items-center justify-center transition-colors ${idx === 0 ? 'bg-[#b51822]' : 'bg-white border border-[#8f6f6d] group-hover:border-[#b51822]'}`}>
              {idx === 0 && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </div>
            <span className="text-[14px] text-[#1c1b1b]">{cat}</span>
          </label>
        ))}
      </div>

      {/* Minimum Rating Filter */}
      <div className="flex flex-col gap-2">
        <h4 className="text-[16px] font-semibold text-[#1c1b1b] mb-1">Minimum Rating</h4>
        {[4, 3].map((rating, idx) => (
          <label key={idx} className="flex items-center gap-2 cursor-pointer group">
            <div className={`w-[16px] h-[16px] rounded-full flex items-center justify-center transition-colors ${idx === 0 ? 'bg-[#b51822]' : 'border border-[#8f6f6d] group-hover:border-[#b51822]'}`}>
               {idx === 0 && <div className="w-[6px] h-[6px] bg-white rounded-full" />}
            </div>
            <div className="flex items-center">
              <Star className={`w-[13px] h-[13px] ${idx === 0 ? 'fill-[#FFC107] text-[#FFC107]' : 'fill-[#e5e2e1] text-[#e5e2e1]'}`} />
              <span className="text-[14px] text-[#5b403e] ml-1">& Up</span>
            </div>
          </label>
        ))}
      </div>

      {/* Button Lihat Semua */}
      <Button variant="secondary" className="w-full mt-2 rounded-none py-[9px] h-auto text-[14px] font-bold">
        Lihat Semua Wilayah
      </Button>
    </aside>
  );
}
