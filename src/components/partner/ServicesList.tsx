import { PartnerService } from '@/hooks/usePartnerProfile';
import { Button } from '@/components/ui/button';

interface ServicesListProps {
  services: PartnerService[];
}

export default function ServicesList({ services }: ServicesListProps) {
  if (!services || services.length === 0) {
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
        {services.map((service) => (
          <div key={service.id} className="border border-gray-100 rounded p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:border-blue-100 hover:shadow-sm transition-all">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-base mb-1">{service.name}</h3>
              <p className="text-sm text-gray-500 line-clamp-2 mb-2">{service.description}</p>
              
              {service.included_items && service.included_items.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {service.included_items.slice(0, 3).map((item, idx) => (
                    <span key={idx} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100">
                      ✓ {item}
                    </span>
                  ))}
                  {service.included_items.length > 3 && (
                    <span className="text-xs text-gray-500 py-1">
                      +{service.included_items.length - 3} lainnya
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
        ))}
      </div>
    </div>
  );
}
