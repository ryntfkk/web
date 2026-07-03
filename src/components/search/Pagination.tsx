import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination() {
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      {/* Previous Button (Disabled state) */}
      <button 
        disabled 
        className="w-[40px] h-[40px] flex items-center justify-center border border-[#e5e2e1] bg-transparent opacity-50 cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-4 h-4 text-[#1c1b1b]" />
      </button>

      {/* Page 1 (Active state) */}
      <button className="w-[40px] h-[40px] flex items-center justify-center bg-[#b51822] text-white text-[14px] font-medium transition-colors">
        1
      </button>

      {/* Page 2 (Inactive state) */}
      <button className="w-[40px] h-[40px] flex items-center justify-center bg-transparent border border-[#e5e2e1] text-[#1c1b1b] text-[14px] hover:border-[#b51822] transition-colors">
        2
      </button>

      {/* Page 3 (Inactive state) */}
      <button className="w-[40px] h-[40px] flex items-center justify-center bg-transparent border border-[#e5e2e1] text-[#1c1b1b] text-[14px] hover:border-[#b51822] transition-colors">
        3
      </button>

      {/* Ellipsis */}
      <span className="px-2 text-[14px] text-[#5b403e]">...</span>

      {/* Last Page */}
      <button className="w-[40px] h-[40px] flex items-center justify-center bg-transparent border border-[#e5e2e1] text-[#1c1b1b] text-[14px] hover:border-[#b51822] transition-colors">
        12
      </button>

      {/* Next Button (Enabled state) */}
      <button className="w-[40px] h-[40px] flex items-center justify-center border border-[#e5e2e1] bg-transparent hover:border-[#b51822] transition-colors">
        <ChevronRight className="w-4 h-4 text-[#1c1b1b]" />
      </button>
    </div>
  );
}
