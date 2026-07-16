"use client";

import Link from 'next/link';
import { usePublicServices } from '@/hooks/usePublicServices';
import { useCityFilter } from '@/lib/store/cityFilterStore';
import { ServiceProductCard } from '@/components/ui/service-product-card';

export default function ProductsSection() {
  const { city } = useCityFilter();
  const { data: services, isLoading, isError } = usePublicServices({ limit: 12, city: city || undefined });

  return (
    <section className="mb-6 sm:mb-10 md:mb-12">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-[16px] sm:text-[18px] md:text-[20px] font-semibold leading-[1.35] text-[#1c1b1b]">
          Produk & Layanan
        </h2>
        <Link
          href="/search"
          className="text-[12px] sm:text-[14px] text-[#b51822] hover:underline font-medium"
        >
          Lihat Semua
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[280px] bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-sm text-red-500">Gagal memuat layanan.</div>
      ) : services && services.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
          {services.map((service) => (
            <ServiceProductCard key={service.id} service={service} />
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          {city ? `Belum ada layanan di ${city}.` : 'Belum ada layanan tersedia.'}
        </div>
      )}
    </section>
  );
}
