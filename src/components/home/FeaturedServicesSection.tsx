"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ServiceCard } from '@/components/ui/service-card';
import { usePartners } from '@/hooks/usePartners';

export default function FeaturedServicesSection() {
  const { data: partners, isLoading, isError } = usePartners({ per_page: 4, sort_by: 'created_at' });

  return (
    <section className="mb-6 sm:mb-10 md:mb-12">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-[16px] sm:text-[18px] md:text-[20px] font-semibold leading-[1.35] text-[#1c1b1b]">
          Rekomendasi
        </h2>
        <Button variant="ghost" className="text-[12px] sm:text-[14px] h-auto py-1">
          Lihat Semua
        </Button>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[250px] bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-sm text-red-500">Gagal memuat rekomendasi.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {partners?.map((partner: any) => (
            <Link key={partner.id} href={`/${partner.username}`} className="block">
              <ServiceCard 
                vendorName={partner.name}
                category={partner.categories?.[0]?.name || "Umum"}
                rating={partner.avg_rating || 0}
                reviewCount={partner.total_reviews || 0}
                price={partner.starting_price || 0}
                unit="Jasa"
                imageUrl={(typeof partner.avatar_url === 'object' ? partner.avatar_url?.String : partner.avatar_url) || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"}
                location={`${((partner.distance_meters || 0) / 1000).toFixed(1)} km`}
              />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
