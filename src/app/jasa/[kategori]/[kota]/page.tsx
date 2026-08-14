import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin } from 'lucide-react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { ServiceProductCard } from '@/components/ui/service-product-card';
import JsonLd from '@/components/seo/JsonLd';
import FaqSection from '@/components/seo/FaqSection';
import { AsideCard, Breadcrumbs, ChipLinks, TrustBox, type Crumb } from '@/components/seo/listing-parts';
import { API_URL } from '@/lib/api';
import { slugify } from '@/lib/slug';
import { faqJsonLd, formatRupiah, localFaq, localIntro, minServicePrice } from '@/lib/seo';
import type { PublicService } from '@/hooks/usePublicServices';
import type { Category } from '@/types/category';

interface PageProps {
  params: Promise<{ kategori: string; kota: string }>;
}

export const revalidate = 300;

const SITE = 'https://poskojasa.com';
const SERVER_API = API_URL.startsWith('http') ? API_URL : 'https://api.poskojasa.com/api/v1';
const PAGE_SIZE = 24;

async function getJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${SERVER_API}${path}`, {
      headers: { 'X-Platform': 'web', 'X-App-Version': '1.0.0' },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data as T) ?? null;
  } catch {
    return null;
  }
}

async function resolve(kategoriSlug: string, kotaSlug: string) {
  const [cat, cities] = await Promise.all([
    getJSON<Category>(`/categories/slug/${encodeURIComponent(kategoriSlug)}`),
    getJSON<string[]>('/partners/cities'),
  ]);
  // Cocokkan slug kota → nama kota persis (yg dipakai filter p.city).
  const city = (cities ?? []).find((c) => slugify(c) === kotaSlug) ?? null;
  return { cat, city };
}

/**
 * Ambil PAGE_SIZE+1: kelebihan satu baris hanya penanda "masih ada sisa", tidak
 * dirender. Tanpa ini meta description mengklaim angka pasti padahal itu batas
 * halaman . klaim keliru yang tampil di hasil pencarian.
 */
async function getServices(categoryId: string, city: string) {
  const rows =
    (await getJSON<PublicService[]>(
      `/services?category=${categoryId}&city=${encodeURIComponent(city)}&limit=${PAGE_SIZE + 1}&offset=0`,
    )) ?? [];
  return { list: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

function countLabel(count: number, hasMore: boolean) {
  return hasMore ? `${count}+` : `${count}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { kategori, kota } = await params;
  const { cat, city } = await resolve(kategori, kota);
  if (!cat || !city) {
    return { title: 'Halaman tidak ditemukan', robots: { index: false, follow: false } };
  }
  const { list, hasMore } = await getServices(cat.id, city);
  const count = list.length;
  const hasServices = count > 0;
  const minPrice = minServicePrice(list);
  // Tanpa "| Posko Jasa" . template root layout sudah menambahkannya.
  // "Mitra Terverifikasi" DIHAPUS (model mitra instan) . lihat catatan di
  // /kategori/[slug]: listing bisa memuat mitra belum-KYC, badge kartu yang jujur.
  const title = `Jasa ${cat.name} ${city} - Panggil ke Lokasi`;
  const description =
    `${count > 0 ? `${countLabel(count, hasMore)} ` : ''}jasa ${cat.name} di ${city}` +
    `${minPrice ? `, harga mulai ${formatRupiah(minPrice)}` : ''}. Pesan online, ulasan asli - Posko Jasa.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE}/jasa/${cat.slug}/${kota}` },
    openGraph: {
      title,
      description,
      url: `${SITE}/jasa/${cat.slug}/${kota}`,
      type: 'website',
      // openGraph anak mengganti milik root (bukan merge) → gambar harus disebut
      // ulang, kalau tidak halaman ini di-share tanpa preview gambar.
      images: ['/og-default.png'],
    },
    // Halaman kota-spesifik tanpa layanan = tipis → noindex agar tak jadi soft-404.
    robots: hasServices ? undefined : { index: false, follow: true },
  };
}

export default async function LocalCategoryPage({ params }: PageProps) {
  const { kategori, kota } = await params;
  const { cat, city } = await resolve(kategori, kota);
  if (!cat || !city) notFound();

  // Layanan di kota ini + layanan kategori se-nasional (untuk daftar "kota lain"
  // → tautan internal antar landing lokal, sekaligus jalan keluar bagi pengguna
  // saat kotanya belum punya mitra).
  const [{ list: serviceList, hasMore }, allInCategory] = await Promise.all([
    getServices(cat.id, city),
    getJSON<PublicService[]>(`/services?category=${cat.id}&limit=${PAGE_SIZE}&offset=0`),
  ]);

  const otherCities = Array.from(
    new Set((allInCategory ?? []).map((s) => s.partner_city).filter((c): c is string => !!c)),
  )
    .filter((c) => c !== city)
    .slice(0, 10);

  const minPrice = minServicePrice(serviceList);
  const intro = localIntro(cat.name, city, serviceList.length, minPrice);
  const faq = localFaq(cat.name, city, serviceList.length, minPrice);

  const crumbs: Crumb[] = [
    { name: 'Beranda', href: '/' },
    { name: `Jasa ${cat.name}`, href: `/kategori/${cat.slug}` },
    { name: city, href: `/jasa/${cat.slug}/${kota}` },
  ];

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${SITE}${c.href === '/' ? '' : c.href}`,
    })),
  };

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Jasa ${cat.name} di ${city}`,
    numberOfItems: serviceList.length,
    itemListElement: serviceList.slice(0, 20).map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE}/services/${s.id}`,
      name: s.name,
    })),
  };

  return (
    <div className="min-h-screen bg-brand-gray-60 flex flex-col">
      <JsonLd data={breadcrumbSchema} />
      {serviceList.length > 0 && <JsonLd data={itemListSchema} />}
      <JsonLd data={faqJsonLd(faq)} />
      {/* titleAs="p": H1 halaman ada di bawah . header ini hanya navigasi. */}
      <MobilePageHeader
        title={`${cat.name} ${city}`}
        titleAs="p"
        backHref={`/kategori/${cat.slug}`}
        maxWidthClass="max-w-[1200px]"
      />

      <div className="container mx-auto max-w-[1200px] w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-5 lg:py-6">
        <Breadcrumbs crumbs={crumbs} />

        <div className="mb-3 sm:mb-5">
          <h1 className="text-[17px] sm:text-2xl font-bold text-brand-gray-900 leading-tight">
            Jasa {cat.name} di {city}
          </h1>
          <p className="text-[12px] sm:text-[13px] text-brand-gray-400 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" /> Mitra terverifikasi di {city} &amp; sekitarnya
          </p>
        </div>

        {/* Desktop: dua kolom . kolom samping mengisi ruang kosong saat kota ini
            baru punya sedikit mitra. Mobile: menumpuk di bawah daftar. */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_296px] lg:gap-6 lg:items-start">
          <div className="min-w-0">
            {serviceList.length === 0 ? (
              <div className="rounded-xl border border-brand-gray-100 bg-white py-10 text-center text-brand-gray-400">
                <p className="text-[14px]">
                  Belum ada layanan {cat.name} di {city}.
                </p>
                <Link
                  href={`/kategori/${cat.slug}`}
                  className="inline-block mt-3 text-[13px] font-semibold text-brand-red hover:underline"
                >
                  Lihat jasa {cat.name} di kota lain →
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-[14px] sm:text-[15px] font-bold text-brand-gray-900 mb-2.5 sm:mb-3">
                  {countLabel(serviceList.length, hasMore)} layanan tersedia
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
                  {serviceList.map((s) => (
                    <ServiceProductCard key={s.id} service={s} />
                  ))}
                </div>
              </>
            )}
          </div>

          <aside className="mt-5 lg:mt-0 lg:sticky lg:top-4 space-y-3 sm:space-y-4">
            {/* Intro unik (anti thin-content). */}
            <AsideCard title={`Tentang jasa ${cat.name} di ${city}`}>
              <p className="text-[12.5px] sm:text-[13px] leading-relaxed text-brand-gray-700">{intro}</p>
            </AsideCard>

            {otherCities.length > 0 && (
              <AsideCard title={`Jasa ${cat.name} di kota lain`}>
                <ChipLinks
                  items={otherCities.map((c) => ({
                    label: c,
                    href: `/jasa/${cat.slug}/${slugify(c)}`,
                  }))}
                />
              </AsideCard>
            )}

            <TrustBox />

            <AsideCard>
              <Link href={`/kategori/${cat.slug}`} className="text-[13px] font-semibold text-brand-red hover:underline">
                Lihat semua jasa {cat.name} →
              </Link>
            </AsideCard>
          </aside>
        </div>

        <FaqSection items={faq} title={`Pertanyaan Umum - Jasa ${cat.name} di ${city}`} />
      </div>
    </div>
  );
}
