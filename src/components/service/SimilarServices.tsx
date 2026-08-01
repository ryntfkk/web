'use client';

import Link from 'next/link';
import { usePublicServices } from '@/hooks/usePublicServices';
import { useUserLocation } from '@/hooks/useUserLocation';
import { ServiceProductCard } from '@/components/ui/service-product-card';

/**
 * "Layanan serupa" — rekomendasi lintas-mitra pada kategori yang sama
 * (pola "Kamu mungkin suka" Shopee / "Produk terkait" Tokopedia). Melengkapi
 * MoreFromPartner (yang menampilkan mitra yang sama). Memakai filter kategori
 * server-side pada endpoint /services. Menyembunyikan diri saat kosong.
 */
export default function SimilarServices({
  categoryId,
  excludeServiceId,
  excludePartnerId,
  categoryName,
  partnerCity,
  localLandingHref,
}: {
  categoryId: string;
  excludeServiceId: string;
  excludePartnerId: string;
  categoryName?: string;
  partnerCity?: string;
  localLandingHref?: string;
}) {
  // Kirim lokasi user agar badge jarak di kartu terisi (tanpa lat/lon backend
  // mengembalikan distance_meters = 0 → badge disembunyikan).
  const { latitude, longitude, hasLocation } = useUserLocation();
  const { data, isLoading } = usePublicServices({
    category: categoryId,
    limit: 12,
    latitude: hasLocation ? latitude ?? undefined : undefined,
    longitude: hasLocation ? longitude ?? undefined : undefined,
  });

  if (isLoading || !categoryId) return null;
  const items = (data ?? [])
    .filter((s) => s.id !== excludeServiceId && s.partner_id !== excludePartnerId)
    .slice(0, 10);
  if (items.length === 0) return null;

  const showCityLink = localLandingHref && partnerCity && categoryName;

  return (
    <section className="bg-white sm:rounded-md sm:shadow-sm mt-2 sm:mt-3 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold text-brand-gray-900">
          {showCityLink ? `Layanan serupa di ${partnerCity}` : 'Layanan serupa'}
        </h2>
        {showCityLink && (
          <Link href={localLandingHref} className="text-xs font-medium text-brand-red hover:underline">
            Lihat semua
          </Link>
        )}
      </div>
      <div
        className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {items.map((s) => (
          <div key={s.id} className="flex-shrink-0 w-40 snap-start">
            <ServiceProductCard service={s} />
          </div>
        ))}
      </div>
    </section>
  );
}
