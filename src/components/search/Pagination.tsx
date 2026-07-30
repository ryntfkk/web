import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination() {
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      {/* Previous Button (Disabled state) */}
      <button 
        disabled 
        className="w-[40px] h-[40px] flex items-center justify-center border border-brand-gray-100 bg-transparent opacity-50 cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-4 h-4 text-brand-gray-900" />
      </button>

      {/* Page 1 (Active state) */}
      <button className="w-[40px] h-[40px] flex items-center justify-center bg-brand-red text-white text-[14px] font-medium transition-colors">
        1
      </button>

      {/* Page 2 (Inactive state) */}
      <button className="w-[40px] h-[40px] flex items-center justify-center bg-transparent border border-brand-gray-100 text-brand-gray-900 text-[14px] hover:border-brand-red transition-colors">
        2
      </button>

      {/* Page 3 (Inactive state) */}
      <button className="w-[40px] h-[40px] flex items-center justify-center bg-transparent border border-brand-gray-100 text-brand-gray-900 text-[14px] hover:border-brand-red transition-colors">
        3
      </button>

      {/* Ellipsis */}
      <span className="px-2 text-[14px] text-brand-gray-700">...</span>

      {/* Last Page */}
      <button className="w-[40px] h-[40px] flex items-center justify-center bg-transparent border border-brand-gray-100 text-brand-gray-900 text-[14px] hover:border-brand-red transition-colors">
        12
      </button>

      {/* Next Button (Enabled state) */}
      <button className="w-[40px] h-[40px] flex items-center justify-center border border-brand-gray-100 bg-transparent hover:border-brand-red transition-colors">
        <ChevronRight className="w-4 h-4 text-brand-gray-900" />
      </button>
    </div>
  );
}
