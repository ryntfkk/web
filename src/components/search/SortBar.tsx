import { ChevronDown } from 'lucide-react';

export default function SortBar() {
  return (
    <div className="flex items-center gap-4 bg-[#f6f3f2] border border-[#e5e2e1] rounded-[4px] p-[9px] w-full overflow-x-auto">
      <span className="text-[14px] font-medium text-[#5b403e] whitespace-nowrap">
        Sort by:
      </span>
      <div className="flex items-center gap-2">
        <button className="bg-[#b51822] text-white text-[14px] font-medium py-[6px] px-[16px] rounded-[4px] whitespace-nowrap transition-colors">
          Terpopuler
        </button>
        <button className="bg-white border border-[#e5e2e1] text-[#1c1b1b] text-[14px] py-[7px] px-[17px] rounded-[4px] hover:border-[#b51822] whitespace-nowrap transition-all">
          Terbaru
        </button>
        <button className="bg-white border border-[#e5e2e1] text-[#1c1b1b] text-[14px] py-[7px] px-[17px] rounded-[4px] hover:border-[#b51822] whitespace-nowrap transition-all">
          Terlaris
        </button>
        <button className="bg-white border border-[#e5e2e1] text-[#1c1b1b] text-[16px] py-[7px] pl-[17px] pr-[33px] rounded-[4px] relative hover:border-[#b51822] whitespace-nowrap transition-all flex items-center">
          Harga
          <ChevronDown className="w-[12px] h-[12px] absolute right-[10px]" />
        </button>
      </div>
    </div>
  );
}
