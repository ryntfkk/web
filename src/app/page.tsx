"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import HeroCarousel from '@/components/ui/hero-carousel';
import CategorySection from '@/components/home/CategorySection';
import CitySelector from '@/components/home/CitySelector';
import TopPartnersSection from '@/components/home/TopPartnersSection';
import FeaturedServicesSection from '@/components/home/FeaturedServicesSection';
import ProductsSection from '@/components/home/ProductsSection';
import RecentlyViewedSection from '@/components/home/RecentlyViewedSection';
import { Skeleton } from '@/components/ui/skeleton';

// U5: shell skeleton menggantikan `return null` agar tidak ada blank flash saat
// hidrasi/inisialisasi auth. Meniru layout Home (hero + baris kategori + kartu).
function HomeSkeleton() {
  return (
    <div className="flex flex-col page-h" aria-hidden="true">
      <Skeleton className="w-full h-40 sm:h-56 md:h-72 rounded-none" />
      <div className="container mx-auto max-w-[1200px] px-3 sm:px-4 lg:px-6 py-4 sm:py-8 md:py-12 flex-1">
        <div className="flex gap-3 overflow-hidden mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 shrink-0">
              <Skeleton className="w-14 h-14 rounded-full" />
              <Skeleton className="w-12 h-3" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="w-full aspect-square rounded-lg" />
              <Skeleton className="w-3/4 h-4" />
              <Skeleton className="w-1/2 h-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, isInitializing } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isInitializing && isAuthenticated && user?.active_role === 'partner') {
      router.replace('/mitra/dashboard');
    }
  }, [mounted, isInitializing, isAuthenticated, user, router]);

  if (!mounted || isInitializing || (isAuthenticated && user?.active_role === 'partner')) {
    return <HomeSkeleton />;
  }

  return (
    <div className="flex flex-col page-h">
      {/* Hero Section - Auto-sliding Carousel */}
      <HeroCarousel />

      {/* Main Content Area - Better mobile padding */}
      <div className="container mx-auto max-w-[1200px] px-3 sm:px-4 sm:px-6 lg:px-6 py-4 sm:py-8 md:py-12 flex-1">
        <CategorySection />
        <div className="flex justify-center mb-4 sm:mb-6">
          <CitySelector />
        </div>
        <RecentlyViewedSection />
        <ProductsSection />
        <TopPartnersSection />
        <FeaturedServicesSection />
      </div>
    </div>
  );
}

