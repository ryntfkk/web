"use client";

import Image from 'next/image';
import Link from 'next/link';
import { usePublicServices, type PublicService } from '@/hooks/usePublicServices';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useBanners, type Banner } from '@/hooks/useBanners';
import { ServiceProductCard } from '@/components/ui/service-product-card';
import { FeedbackCard } from '@/components/home/FeedbackCard';

// Feed "Layanan Terdekat": SATU grid responsif (2 kolom mobile / 4 kolom
// desktop) berisi 8 ubin = 6 kartu layanan + kartu "Masukan" + 1 ubin banner.
// Urutan diselang-seling agar TIAP baris penuh di kedua breakpoint → tidak ada
// sel kosong / gap di dasar (permintaan: maks 6 kartu, tanpa gap, isi banner):
//   mobile cols-2 : (c0,c1)(c2,Masukan)(c3,c4)(c5,Banner)  = 4 baris penuh
//   desktop cols-4: (c0,c1,c2,Masukan)(c3,c4,c5,Banner)     = 2 baris penuh
// Semua ubin adalah item grid → tinggi tiap baris seragam (stretch), jadi kartu
// "Masukan" & banner ikut setinggi kartu layanan. Banner = placement `home_inline`
// (dikelola admin). Bila belum ada banner aktif → ubin CTA "Jadi Mitra" mengisi
// slot supaya slot tak pernah kosong.
const MAX_CARDS = 6;

export default function ProductsSection() {
  // Lokasi (bukan kota) = acuan jarak & urutan terdekat. Filter kota dihapus
  // dari home agar mitra kota-sebelah yang lebih dekat tak tersembunyi.
  const { latitude, longitude, hasLocation } = useUserLocation();
  const { data: services, isLoading, isError } = usePublicServices({
    limit: MAX_CARDS,
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
        <ServiceFeed services={services.slice(0, MAX_CARDS)} banner={inlineBanner} />
      ) : (
        <div className="text-center text-brand-gray-450 py-8">Belum ada layanan tersedia.</div>
      )}
    </section>
  );
}

function ServiceFeed({ services, banner }: { services: PublicService[]; banner?: Banner }) {
  // Sisipkan kartu "Masukan" setelah 3 kartu pertama, dan banner di paling
  // akhir. Dengan 6 kartu, urutan ini mengisi 2 baris penuh (cols-4) & 4 baris
  // penuh (cols-2) tanpa sel kosong.
  const tiles: React.ReactNode[] = [];
  services.forEach((s, i) => {
    if (i === 3) tiles.push(<FeedbackCard key="feedback" />);
    tiles.push(<ServiceProductCard key={s.id} service={s} />);
  });
  // Bila kartu < 4, "Masukan" belum sempat disisipkan di loop → taruh sebelum banner.
  if (services.length < 4) tiles.push(<FeedbackCard key="feedback" />);
  tiles.push(<InlineBannerTile key="inline-banner" banner={banner} />);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {tiles}
    </div>
  );
}

// Ubin banner sisipan. Mengisi sel grid setinggi kartu (h-full). Bila belum ada
// banner aktif dari admin → tampilkan CTA agar slot tak pernah kosong (tanpa gap).
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
  // Cermin layout nyata: grid seragam 2/4 kolom, 8 ubin.
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-[280px] bg-brand-gray-100 animate-pulse rounded-lg" />
      ))}
    </div>
  );
}
