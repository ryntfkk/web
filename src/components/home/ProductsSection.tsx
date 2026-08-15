"use client";

import Link from 'next/link';
import { usePublicServices, type PublicService } from '@/hooks/usePublicServices';
import { useUserLocation } from '@/hooks/useUserLocation';
import { ServiceProductCard } from '@/components/ui/service-product-card';
import { FeedbackCard } from '@/components/home/FeedbackCard';

// Feed gaya Shopee: MOBILE = masonry 2 kolom (staggered / tidak sejajar),
// DESKTOP = grid rapi sejajar. Dua layout dirender lalu ditukar via
// `md:hidden` / `hidden md:grid` . tak bisa satu struktur karena kolom masonry
// (flex) ≠ grid, dan yang tersembunyi tak memuat gambar (Next/Image lazy).
//
// Kunci "tidak sejajar sampai kartu teratas": kartu jasa tingginya nyaris
// seragam, jadi kalau dibiarkan tetap rata. Kartu "Masukan" yang LEBIH PENDEK
// ditaruh di PUNCAK kolom kanan → kedua kolom ter-offset dari atas ke bawah,
// sehingga baris paling atas pun tidak sejajar.
const FEEDBACK_SLOT = 4; // posisi kartu Masukan di grid desktop (sebagai 1 sel)

export default function ProductsSection() {
  // Lokasi (bukan kota) = acuan jarak & urutan terdekat. Filter kota dihapus
  // dari home agar mitra kota-sebelah yang lebih dekat tak tersembunyi.
  const { latitude, longitude, hasLocation } = useUserLocation();
  const { data: services, isLoading, isError } = usePublicServices({
    limit: 12,
    latitude: hasLocation ? latitude ?? undefined : undefined,
    longitude: hasLocation ? longitude ?? undefined : undefined,
  });

  return (
    <section className="mb-6 md:mb-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-[16px] sm:text-[18px] md:text-[20px] font-semibold leading-[1.35] text-brand-gray-900">
          Jasa Terdekat
        </h2>
        <Link
          href="/services"
          className="text-[12px] sm:text-[14px] text-brand-red hover:underline font-medium"
        >
          Lihat Semua
        </Link>
      </div>

      {isLoading ? (
        <FeedSkeleton />
      ) : isError ? (
        <div className="text-sm text-brand-error">Gagal memuat layanan.</div>
      ) : services && services.length > 0 ? (
        <ServiceFeed services={services} />
      ) : (
        <div className="text-center text-brand-gray-450 py-8">Belum ada layanan tersedia.</div>
      )}
    </section>
  );
}

function ServiceFeed({ services }: { services: PublicService[] }) {
  // Kartu berselang-seling ke dua kolom (kiri = genap, kanan = ganjil) supaya
  // urutan baca tetap kiri→kanan (terdekat dulu). Tiap kolom menumpuk sendiri
  // (tinggi independen), jadi variasi tinggi kartu langsung terlihat staggered.
  const left = services.filter((_, i) => i % 2 === 0);
  const right = services.filter((_, i) => i % 2 === 1);

  return (
    <>
      {/* Mobile: masonry 2 kolom. Kartu Masukan di PUNCAK kolom kanan = offset. */}
      <div className="flex gap-3 md:hidden">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {left.map((s) => (
            <ServiceProductCard key={s.id} service={s} />
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <FeedbackCard />
          {right.map((s) => (
            <ServiceProductCard key={s.id} service={s} />
          ))}
        </div>
      </div>

      {/* Desktop: grid sejajar, lebih rapat (5-6 kolom). Kartu Masukan = 1 sel. */}
      <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-4">
        {services.slice(0, FEEDBACK_SLOT).map((s) => (
          <ServiceProductCard key={s.id} service={s} />
        ))}
        <FeedbackCard />
        {services.slice(FEEDBACK_SLOT).map((s) => (
          <ServiceProductCard key={s.id} service={s} />
        ))}
      </div>
    </>
  );
}

function FeedSkeleton() {
  return (
    <>
      {/* Mobile: 2 kolom dengan tinggi berselang → mengesankan masonry. */}
      <div className="flex gap-3 md:hidden">
        {[0, 1].map((col) => (
          <div key={col} className="flex min-w-0 flex-1 flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`${(i + col) % 2 ? 'h-[240px]' : 'h-[280px]'} bg-brand-gray-100 animate-pulse rounded-lg`}
              />
            ))}
          </div>
        ))}
      </div>
      {/* Desktop: grid seragam (rapat, samakan dengan feed). */}
      <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-[280px] bg-brand-gray-100 animate-pulse rounded-lg" />
        ))}
      </div>
    </>
  );
}
