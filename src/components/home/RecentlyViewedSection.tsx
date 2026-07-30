"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useRecentlyViewedStore } from '@/lib/store/recentlyViewedStore';
import { PLACEHOLDER_SERVICE as PLACEHOLDER_IMG } from '@/lib/images';

export default function RecentlyViewedSection() {
  // Store dipersist di localStorage â†’ hydrate setelah mount. Guard `mounted`
  // mencegah mismatch SSR/CSR (server tak punya akses localStorage).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const items = useRecentlyViewedStore((s) => s.items);
  const clear = useRecentlyViewedStore((s) => s.clear);

  if (!mounted || items.length === 0) return null;

  return (
    <section className="mb-8 md:mb-12">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-[16px] sm:text-[18px] md:text-[20px] font-semibold leading-[1.35] text-brand-gray-900 flex items-center gap-2">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-brand-red" /> Baru Dilihat
        </h2>
        <button
          onClick={clear}
          className="text-brand-gray-400 font-medium text-[12px] sm:text-[14px] hover:bg-brand-red-light px-3 py-1 rounded transition-colors"
        >
          Hapus
        </button>
      </div>

      <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-1">
        {items.map((it) => (
          <Link
            key={it.service_id}
            href={`/services/${it.service_id}`}
            className="w-32 sm:w-40 shrink-0 bg-white border border-brand-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-all"
          >
            <div className="relative aspect-square bg-brand-gray-60">
              <Image
                src={it.photo_url || PLACEHOLDER_IMG}
                alt={it.service_name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 128px, 160px"
              />
            </div>
            <div className="p-2">
              <p className="text-sm font-medium text-brand-gray-900 truncate">{it.service_name}</p>
              {it.category_name && <p className="text-[11px] text-brand-gray-400 truncate">{it.category_name}</p>}
              <p className="text-sm font-semibold text-brand-red mt-0.5">Rp {it.price.toLocaleString('id-ID')}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
