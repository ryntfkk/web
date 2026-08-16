"use client";

import Image from 'next/image';
import Link from 'next/link';
import { usePublicServices, type PublicService } from '@/hooks/usePublicServices';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useBanners, type Banner } from '@/hooks/useBanners';
import { ServiceProductCard } from '@/components/ui/service-product-card';
import { FeedbackCard } from '@/components/home/FeedbackCard';

// Feed "Layanan Terdekat":
//   MOBILE  = masonry 2 kolom staggered (gaya Shopee), maks 6 kartu. Kartu
//             berselang ke dua kolom; "Masukan" di PUNCAK kolom kanan & ubin
//             banner di DASAR kolom kiri, keduanya bertinggi sama (FILLER_H) →
//             dua kolom rata di bawah (tanpa gap) tapi tetap staggered karena
//             filler lebih pendek dari kartu.
//   DESKTOP = grid rapi 5 kolom, 10 ubin = 8 kartu + Masukan + banner diselang-
//             seling → 2 baris penuh (5 kartu/baris), gapless.
// Banner = placement admin `home_inline`; bila belum ada → fallback CTA supaya
// slot tak pernah kosong.
const FETCH_LIMIT = 8;   // ambil cukup untuk mengisi 2 baris desktop
const MOBILE_CARDS = 6;  // mobile sengaja lebih padat/pendek
const DESKTOP_CARDS = 8; // 8 + Masukan + banner = 10 ubin = 2 baris x 5
// Tinggi kedua filler (Masukan & banner) di mobile. Disamakan agar dua kolom
// masonry berakhir di ketinggian yang sama; sengaja < tinggi kartu (~280) supaya
// efek staggered tetap ada.
const FILLER_H = 'h-[216px]';

export default function ProductsSection() {
  // Lokasi (bukan kota) = acuan jarak & urutan terdekat. Filter kota dihapus
  // dari home agar mitra kota-sebelah yang lebih dekat tak tersembunyi.
  const { latitude, longitude, hasLocation } = useUserLocation();
  const { data: services, isLoading, isError } = usePublicServices({
    limit: FETCH_LIMIT,
    latitude: hasLocation ? latitude ?? undefined : undefined,
    longitude: hasLocation ? longitude ?? undefined : undefined,
  });

  // Banner sisipan feed (admin-managed). Ambil yang teratas & aktif; endpoint
  // publik sudah menyaring is_active + urut sort_order.
  const { data: inlineBanners } = useBanners('home_inline');
  const inlineBanner = inlineBanners?.[0];

  return (
    <section className="mb-6 md:mb-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-[16px] sm:text-[18px] md:text-[20px] font-semibold leading-[1.35] text-brand-gray-900">
          Layanan Terdekat
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
        <ServiceFeed services={services.slice(0, FETCH_LIMIT)} banner={inlineBanner} />
      ) : (
        <div className="text-center text-brand-gray-450 py-8">Belum ada layanan tersedia.</div>
      )}
    </section>
  );
}

function ServiceFeed({ services, banner }: { services: PublicService[]; banner?: Banner }) {
  // Mobile masonry: maks 6 kartu, berselang (kiri = indeks genap, kanan = ganjil).
  const mobileCards = services.slice(0, MOBILE_CARDS);
  const left = mobileCards.filter((_, i) => i % 2 === 0);   // c0, c2, c4
  const right = mobileCards.filter((_, i) => i % 2 === 1);   // c1, c3, c5

  // Desktop grid: 8 kartu + Masukan (setelah 4 kartu) + banner (akhir) = 10 ubin
  // → 2 baris penuh di grid 5 kolom (gapless).
  const desktopCards = services.slice(0, DESKTOP_CARDS);
  const gridTiles: React.ReactNode[] = [];
  desktopCards.forEach((s, i) => {
    if (i === 4) gridTiles.push(<FeedbackCard key="fb-grid" />);
    gridTiles.push(<ServiceProductCard key={s.id} service={s} />);
  });
  if (desktopCards.length <= 4) gridTiles.push(<FeedbackCard key="fb-grid" />);
  gridTiles.push(<InlineBannerTile key="bnr-grid" banner={banner} />);

  return (
    <>
      {/* Mobile: masonry 2 kolom, kedua filler bertinggi FILLER_H → dasar rata. */}
      <div className="flex gap-3 md:hidden">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {left.map((s) => (
            <ServiceProductCard key={s.id} service={s} />
          ))}
          <div className={FILLER_H}>
            <InlineBannerTile banner={banner} />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className={FILLER_H}>
            <FeedbackCard />
          </div>
          {right.map((s) => (
            <ServiceProductCard key={s.id} service={s} />
          ))}
        </div>
      </div>

      {/* Desktop: grid rapi 5 kolom, 10 ubin (gapless). */}
      <div className="hidden md:grid md:grid-cols-5 gap-4">
        {gridTiles}
      </div>
    </>
  );
}

// Ubin banner sisipan. Mengisi tinggi wadahnya (h-full). Bila belum ada banner
// aktif dari admin → CTA agar slot tak pernah kosong (tanpa gap).
function InlineBannerTile({ banner }: { banner?: Banner }) {
  if (!banner) return <InlineCtaTile />;

  const inner = (
    <div className="relative h-full min-h-[180px] w-full overflow-hidden rounded-lg border border-brand-gray-100 bg-brand-gray-100">
      <Image
        src={banner.image_url}
        alt={banner.title || 'Promo Posko Jasa'}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 50vw, 20vw"
      />
    </div>
  );

  return banner.link_url ? (
    <a href={banner.link_url} target="_blank" rel="noopener noreferrer" className="block h-full">
      {inner}
    </a>
  ) : (
    <div className="h-full">{inner}</div>
  );
}

function InlineCtaTile() {
  return (
    <Link
      href="/jadi-mitra"
      className="flex h-full min-h-[180px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-brand-red/20 bg-brand-red-soft p-4 text-center transition-colors hover:bg-brand-red-light"
    >
      <span className="text-[13px] font-semibold text-brand-gray-900">Punya keahlian?</span>
      <span className="text-[11px] leading-snug text-brand-gray-700">
        Jadi mitra &amp; mulai terima pesanan di sekitarmu.
      </span>
      <span className="mt-1 rounded-full bg-brand-red px-3 py-1 text-[11px] font-semibold text-white">
        Jadi Mitra
      </span>
    </Link>
  );
}

function FeedSkeleton() {
  // Cermin layout nyata: mobile masonry (filler lebih pendek), desktop grid 5 kolom.
  return (
    <>
      <div className="flex gap-3 md:hidden">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[280px] bg-brand-gray-100 animate-pulse rounded-lg" />
          ))}
          <div className="h-[216px] bg-brand-gray-100 animate-pulse rounded-lg" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="h-[216px] bg-brand-gray-100 animate-pulse rounded-lg" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[280px] bg-brand-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
      <div className="hidden md:grid md:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-[280px] bg-brand-gray-100 animate-pulse rounded-lg" />
        ))}
      </div>
    </>
  );
}
