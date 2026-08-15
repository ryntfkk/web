"use client";

import Link from 'next/link';
import { usePublicServices } from '@/hooks/usePublicServices';
import { useUserLocation } from '@/hooks/useUserLocation';
import { ServiceProductCard } from '@/components/ui/service-product-card';
import { FeedbackCard } from '@/components/home/FeedbackCard';

// Feed gaya Shopee: mobile = masonry (staggered, kartu tidak sejajar), desktop =
// grid rapi sejajar. Multi-column (`columns-*`) di bawah md, lalu `md:columns-none
// md:grid` mengambil alih . tiap item butuh `break-inside-avoid` + margin bawah
// yang dinolkan saat sudah jadi grid (grid pakai `gap`).
const MASONRY_CLASS =
  'columns-2 gap-3 sm:columns-3 md:columns-none md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-4';
const ITEM_CLASS = 'mb-3 break-inside-avoid md:mb-0';

// Sisipkan kartu "Masukan" setelah kartu ke-4 (atau di akhir bila kurang), agar
// muncul lebih awal di feed tanpa mendominasi baris pertama.
const FEEDBACK_SLOT = 4;

export default function ProductsSection() {
  // Lokasi (bukan kota) = acuan jarak & urutan terdekat. Filter kota dihapus
  // dari home agar mitra kota-sebelah yang lebih dekat tak tersembunyi.
  const { latitude, longitude, hasLocation } = useUserLocation();
  const { data: services, isLoading, isError } = usePublicServices({
    limit: 12,
    latitude: hasLocation ? latitude ?? undefined : undefined,
    longitude: hasLocation ? longitude ?? undefined : undefined,
  });

  return (
    <section className="mb-6 md:mb-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-[16px] sm:text-[18px] md:text-[20px] font-semibold leading-[1.35] text-brand-gray-900">
          Jasa Terdekat
        </h2>
        <Link
          href="/services"
          className="text-[12px] sm:text-[14px] text-brand-red hover:underline font-medium"
        >
          Lihat Semua
        </Link>
      </div>

      {isLoading ? (
        <div className={MASONRY_CLASS}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`${ITEM_CLASS} ${i % 2 ? 'h-[240px]' : 'h-[280px]'} bg-brand-gray-100 animate-pulse rounded-lg`}
            />
          ))}
        </div>
      ) : isError ? (
        <div className="text-sm text-brand-error">Gagal memuat layanan.</div>
      ) : services && services.length > 0 ? (
        <div className={MASONRY_CLASS}>
          {services.slice(0, FEEDBACK_SLOT).map((service) => (
            <div key={service.id} className={ITEM_CLASS}>
              <ServiceProductCard service={service} />
            </div>
          ))}
          <div key="feedback-card" className={ITEM_CLASS}>
            <FeedbackCard />
          </div>
          {services.slice(FEEDBACK_SLOT).map((service) => (
            <div key={service.id} className={ITEM_CLASS}>
              <ServiceProductCard service={service} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-brand-gray-450 py-8">Belum ada layanan tersedia.</div>
      )}
    </section>
  );
}
