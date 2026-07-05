import Image from 'next/image';
import { PartnerService } from '@/hooks/usePartnerProfile';
import { Button } from '@/components/ui/button';

interface ServicesListProps {
  services: PartnerService[];
}

export default function ServicesList({ services }: ServicesListProps) {
  // Filter out invalid service entries - ensure each service has a valid id and name
  const validServices = Array.isArray(services)
    ? services.filter(s => s && typeof s.id === 'string' && typeof s.name === 'string')
    : [];

  if (validServices.length === 0) {
    return (
      <div className="bg-white rounded p-4 sm:p-6 shadow-sm mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">Layanan Tersedia</h2>
        <div className="text-center py-8 text-gray-500">
          Belum ada layanan yang ditawarkan.
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    if (typeof price !== 'number' || isNaN(price)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="bg-white rounded p-4 sm:p-6 shadow-sm mb-4 sm:mb-6">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Layanan Tersedia</h2>
      <div className="space-y-4">
        {validServices.map((service) => {
          // Ensure included_items is an array of strings
          const includedItems = Array.isArray(service.included_items)
            ? service.included_items.filter(item => typeof item === 'string').slice(0, 3)
            : [];

          return (
            <div key={service.id} className="border border-gray-100 rounded p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:border-blue-100 hover:shadow-sm transition-all">
              {/* Photo Section */}
              <div className="relative w-full sm:w-32 h-32 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {service.photos && service.photos.length > 0 ? (
                  <Image
                    src={service.photos.find(p => p.is_primary)?.photo_url || service.photos[0].photo_url}
                    alt={service.name}
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                {service.photos && service.photos.length > 1 && (
                  <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                    +{service.photos.length - 1}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-base mb-1">{service.name}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                  {typeof service.description === 'string' ? service.description : ''}
                </p>

                {includedItems.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {includedItems.map((item, idx) => (
                      <span key={idx} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100">
                        ✓ {item}
                      </span>
                    ))}
                    {(service.included_items?.length || 0) > 3 && (
                      <span className="text-xs text-gray-500 py-1">
                        +{(service.included_items?.length || 0) - 3} lainnya
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 sm:gap-2 border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0 mt-2 sm:mt-0">
                <div className="text-lg font-bold text-blue-600">
                  {formatPrice(service.price)}
                </div>
                <Button size="sm" className="w-full sm:w-auto">Pilih</Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
