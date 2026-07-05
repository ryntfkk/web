import HeroCarousel from '@/components/ui/hero-carousel';
import CategorySection from '@/components/home/CategorySection';
import TopPartnersSection from '@/components/home/TopPartnersSection';
import FeaturedServicesSection from '@/components/home/FeaturedServicesSection';
import ProductsSection from '@/components/home/ProductsSection';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section - Auto-sliding Carousel */}
      <HeroCarousel />

      {/* Main Content Area - Better mobile padding */}
      <div className="container mx-auto max-w-[1200px] px-3 sm:px-4 sm:px-6 lg:px-6 py-6 sm:py-8 md:py-12 flex-1">
        <CategorySection />
        <ProductsSection />
        <TopPartnersSection />
        <FeaturedServicesSection />
      </div>
    </div>
  );
}
