'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePartnerServices } from '@/hooks/usePartnerProfile';
import { PLACEHOLDER_SERVICE } from '@/lib/images';

/**
 * "Layanan lain dari mitra ini" — pola cross-sell standar marketplace besar
 * (Tokopedia "Produk lainnya dari toko ini", Amazon "More from this seller").
 * Memakai endpoint yang sudah ada (usePartnerServices → /partners/:username/services)
 * sehingga tak perlu perubahan backend. Menyembunyikan diri saat loading/kosong.
 */
export default function MoreFromPartner({
  username,
  excludeId,
}: {
  username: string;
  excludeId: string;
}) {
  const { data, isLoading } = usePartnerServices(username);

  if (isLoading || !username) return null;
  const others = (data ?? []).filter((s) => s.id !== excludeId);
  if (others.length === 0) return null;

  return (
    <section className="bg-white sm:rounded-md sm:shadow-sm mt-2 sm:mt-3 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold text-brand-gray-900">Layanan lain dari mitra ini</h2>
        <Link href={`/${username}`} className="text-xs font-medium text-brand-red hover:underline">
          Lihat semua
        </Link>
      </div>

      <div
        className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {others.map((s) => {
          const photo =
            s.photos?.find((p) => p.is_primary)?.photo_url ||
            s.photos?.[0]?.photo_url ||
            PLACEHOLDER_SERVICE;
          return (
            <Link
              key={s.id}
              href={`/services/${s.id}`}
              className="flex-shrink-0 w-36 sm:w-40 snap-start border border-brand-gray-100 rounded-md overflow-hidden bg-white hover:shadow-md transition-shadow"
            >
              <div className="relative w-full aspect-square bg-brand-gray-100">
                <Image src={photo} alt={s.name} fill className="object-cover" sizes="160px" />
              </div>
              <div className="p-2">
                <p className="text-[12px] font-medium text-brand-gray-900 line-clamp-2 leading-tight min-h-[2.4em]">
                  {s.name}
                </p>
                <p className="text-[13px] font-semibold text-brand-red mt-1">
                  Rp {(s.price || 0).toLocaleString('id-ID')}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
