"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Star, MapPin } from 'lucide-react';
import { usePublicServices } from '@/hooks/usePublicServices';

export default function ProductsSection() {
  const { data: services, isLoading, isError } = usePublicServices({ limit: 12 });

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
            <Link
              key={service.id}
              href={`/services?id=${service.id}`}
              className="block"
            >
              <div className="bg-white border border-[#e5e2e1] rounded-[4px] overflow-hidden hover:shadow-md transition-all h-full flex flex-col">
                {/* Image */}
                <div className="relative w-full aspect-square bg-[#e5e2e1] flex-shrink-0">
                  <Image
                    src={service.photo_url || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500"}
                    alt={service.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  />
                </div>

                {/* Content */}
                <div className="p-2 sm:p-3 flex flex-col flex-1">
                  {/* Service Name */}
                  <h3 className="text-[13px] sm:text-[14px] font-semibold text-[#1c1b1b] line-clamp-2 mb-1">
                    {service.name}
                  </h3>

                  {/* Vendor */}
                  <div className="flex items-center gap-1 mb-2">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#e5e2e1] overflow-hidden flex-shrink-0">
                      {service.partner_avatar_url ? (
                        <Image
                          src={service.partner_avatar_url}
                          alt={service.partner_name}
                          width={20}
                          height={20}
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] sm:text-[10px] font-medium text-[#5b403e]">
                          {service.partner_name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] sm:text-[12px] text-[#5b403e] truncate">
                      {service.partner_name}
                    </span>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-3 h-3 fill-[#D69E2E] text-[#D69E2E]" />
                    <span className="text-[12px] sm:text-[13px] font-medium text-[#1c1b1b]">
                      {service.partner_avg_rating?.toFixed(1) || "0.0"}
                    </span>
                    <span className="text-[11px] sm:text-[12px] text-[#5b403e]">
                      ({service.partner_total_reviews || 0})
                    </span>
                  </div>

                  {/* Price - pushed to bottom */}
                  <div className="mt-auto">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-[14px] sm:text-[16px] font-semibold text-[#b51822]">
                        Rp {(service.price || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          Belum ada layanan tersedia.
        </div>
      )}
    </section>
  );
}
