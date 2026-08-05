"use client";

import { useEffect, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { useRecentlyViewedStore, type ViewedService } from '@/lib/store/recentlyViewedStore';
import { ServiceProductCard } from '@/components/ui/service-product-card';
import type { PublicService } from '@/hooks/usePublicServices';
import type { ServiceDetail } from '@/hooks/useServiceDetail';
import { fetchAPI } from '@/lib/api';
import { PLACEHOLDER_SERVICE as PLACEHOLDER_IMG } from '@/lib/images';

/**
 * Entri localStorage (+ detail segar bila sudah tiba) → bentuk PublicService,
 * agar bisa dirender dengan kartu produk jasa yang sama seperti section lain.
 *
 * localStorage hanya menyimpan potongan data (dan entri yang dicatat sebelum
 * store diperluas TIDAK punya nama mitra/rating sama sekali), jadi kartu diisi
 * dari detail layanan yang di-fetch ulang; snapshot lokal cuma jadi cadangan
 * agar kartu tidak kosong selama fetch berjalan. Jarak & jumlah pesanan memang
 * tidak tersedia di sini → badge-nya otomatis tak tampil.
 */
function toPublicService(it: ViewedService, fresh?: ServiceDetail): PublicService {
  return {
    id: it.service_id,
    partner_id: fresh?.partner_id ?? '',
    partner_name: fresh?.partner_name ?? it.partner_name ?? '',
    partner_username: fresh?.partner_username ?? it.partner_username ?? '',
    partner_avatar_url: fresh?.partner_avatar_url ?? it.partner_avatar_url ?? '',
    category_id: fresh?.category_id ?? '',
    category_name: fresh?.category_name ?? it.category_name ?? '',
    name: fresh?.name ?? it.service_name,
    description: '',
    price: fresh?.price ?? it.price,
    included_items: [],
    excluded_items: [],
    estimated_duration: 0,
    photo_url: fresh?.photo_url || it.photo_url || PLACEHOLDER_IMG,
    partner_avg_rating: fresh?.partner_avg_rating ?? it.partner_avg_rating ?? 0,
    partner_total_reviews: fresh?.partner_total_reviews ?? 0,
    partner_city: fresh?.partner_city ?? it.partner_city,
    distance_meters: 0,
  };
}

export default function RecentlyViewedSection() {
  // Store dipersist di localStorage → hydrate setelah mount. Guard `mounted`
  // mencegah mismatch SSR/CSR (server tak punya akses localStorage).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const items = useRecentlyViewedStore((s) => s.items);
  const clear = useRecentlyViewedStore((s) => s.clear);

  // Ambil detail tiap layanan (maks 10 entri). queryKey-nya SAMA dengan
  // useServiceDetail → cache dipakai bersama halaman detail, tak ada fetch ganda.
  const details = useQueries({
    queries: (mounted ? items : []).map((it) => ({
      queryKey: ['serviceDetail', it.service_id],
      queryFn: async (): Promise<ServiceDetail> => {
        const res = await fetchAPI<ServiceDetail>(`/services/${it.service_id}`);
        if (!res.success || !res.data) throw new Error(res.message || 'Gagal memuat layanan');
        return res.data;
      },
      staleTime: 5 * 60 * 1000,
    })),
  });

  if (!mounted || items.length === 0) return null;

  return (
    <section className="mb-6 md:mb-8">
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

      <div
        className="flex gap-3 md:gap-4 overflow-x-auto snap-x scrollbar-hide pb-1 -mx-3 px-3 sm:-mx-1 sm:px-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {items.map((it, i) => (
          <div
            key={it.service_id}
            className="flex-shrink-0 snap-start w-[42vw] max-w-[190px] sm:w-44 lg:w-48"
          >
            <ServiceProductCard service={toPublicService(it, details[i]?.data)} />
          </div>
        ))}
      </div>
    </section>
  );
}
