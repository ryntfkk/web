'use client';

import { usePublicServices } from '@/hooks/usePublicServices';
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
}: {
  categoryId: string;
  excludeServiceId: string;
  excludePartnerId: string;
}) {
  const { data, isLoading } = usePublicServices({ category: categoryId, limit: 12 });

  if (isLoading || !categoryId) return null;
  const items = (data ?? [])
    .filter((s) => s.id !== excludeServiceId && s.partner_id !== excludePartnerId)
    .slice(0, 10);
  if (items.length === 0) return null;

  return (
    <section className="bg-white sm:rounded-md sm:shadow-sm mt-2 sm:mt-3 p-4">
      <h2 className="text-sm font-semibold text-brand-gray-900 mb-3">Layanan serupa</h2>
      <div
        className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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
