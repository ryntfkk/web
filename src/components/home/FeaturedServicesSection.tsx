import { Button } from '@/components/ui/button';
import { ServiceCard } from '@/components/ui/service-card';
import { FEATURED_SERVICES } from '@/lib/data';

export default function FeaturedServicesSection() {
  return (
    <section className="mb-6 sm:mb-10 md:mb-12">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        {/* H2: Responsive font size */}
        <h2 className="text-[16px] sm:text-[18px] md:text-[20px] font-semibold leading-[1.35] text-[#1c1b1b]">
          Rekomendasi
        </h2>
        <Button variant="ghost" className="text-[12px] sm:text-[14px] h-auto py-1">
          Lihat Semua
        </Button>
      </div>
      {/* Grid: 2 columns on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {FEATURED_SERVICES.map((service, idx) => (
          <ServiceCard key={idx} {...service} />
        ))}
      </div>
    </section>
  );
}
