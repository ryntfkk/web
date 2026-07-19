"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useRecentlyViewedStore } from '@/lib/store/recentlyViewedStore';
import { PLACEHOLDER_SERVICE as PLACEHOLDER_IMG } from '@/lib/images';

export default function RecentlyViewedSection() {
  // Store dipersist di localStorage → hydrate setelah mount. Guard `mounted`
  // mencegah mismatch SSR/CSR (server tak punya akses localStorage).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const items = useRecentlyViewedStore((s) => s.items);
  const clear = useRecentlyViewedStore((s) => s.clear);

  if (!mounted || items.length === 0) return null;

  return (
    <section className="mb-6 sm:mb-10 md:mb-12">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-[16px] sm:text-[18px] md:text-[20px] font-semibold leading-[1.35] text-[#1c1b1b] flex items-center gap-2">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#b51822]" /> Baru Dilihat
        </h2>
        <button
          onClick={clear}
          className="text-[#8f6f6d] font-medium text-[12px] sm:text-[14px] hover:bg-[#f0eded] px-3 py-1 rounded transition-colors"
        >
          Hapus
        </button>
      </div>

      <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-1">
        {items.map((it) => (
          <Link
            key={it.service_id}
            href={`/services?id=${it.service_id}`}
            className="w-32 sm:w-40 shrink-0 bg-white border border-[#e5e2e1] rounded-lg overflow-hidden hover:shadow-md transition-all"
          >
            <div className="aspect-square bg-[#f7f5f4]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.photo_url || PLACEHOLDER_IMG} alt={it.service_name} className="w-full h-full object-cover" />
            </div>
            <div className="p-2">
              <p className="text-sm font-medium text-[#1c1b1b] truncate">{it.service_name}</p>
              {it.category_name && <p className="text-[11px] text-[#8f6f6d] truncate">{it.category_name}</p>}
              <p className="text-sm font-semibold text-[#b51822] mt-0.5">Rp {it.price.toLocaleString('id-ID')}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
