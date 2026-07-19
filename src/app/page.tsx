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
    return null; 
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

