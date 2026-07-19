import { PartnerService, PartnerProfileData } from '@/hooks/usePartnerProfile';
import { ServiceCard } from '@/components/ui/service-card';
import { unitLabel } from '@/lib/order-utils';
import Link from 'next/link';

import { PLACEHOLDER_SERVICE as PLACEHOLDER_IMG } from '@/lib/images';

interface ServicesListProps {
  services: PartnerService[];
  profile: PartnerProfileData;
  isLoading?: boolean;
}

export default function ServicesList({ services, profile, isLoading }: ServicesListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[260px] bg-gray-100 animate-pulse rounded-[4px]" />
        ))}
      </div>
    );
  }

  // Filter out invalid service entries - ensure each service has a valid id and name
  const validServices = Array.isArray(services)
    ? services.filter(s => s && typeof s.id === 'string' && typeof s.name === 'string')
    : [];

  if (validServices.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Belum ada layanan yang ditawarkan.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      {validServices.map((service) => {
        const primaryPhoto =
          service.photos?.find(p => p.is_primary)?.photo_url ||
          service.photos?.[0]?.photo_url ||
          PLACEHOLDER_IMG;

        return (
          <Link key={service.id} href={`/services?id=${service.id}`} className="block h-full">
            <ServiceCard
              vendorName={service.name}
              category={profile.name}
              rating={profile.avg_rating}
              reviewCount={profile.total_reviews}
              price={service.price}
              unit={unitLabel(service.unit)}
              imageUrl={primaryPhoto}
              vendorAvatar={profile.avatar_url || undefined}
              className="h-full"
            />
          </Link>
        );
      })}
    </div>
  );
}
