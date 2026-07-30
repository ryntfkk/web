import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, MapPin } from 'lucide-react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { ServiceProductCard } from '@/components/ui/service-product-card';
import JsonLd from '@/components/seo/JsonLd';
import FaqSection from '@/components/seo/FaqSection';
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { kategori, kota } = await params;
  const { cat, city } = await resolve(kategori, kota);
  if (!cat || !city) {
    return { title: 'Halaman tidak ditemukan', robots: { index: false, follow: false } };
  }
  const services = await getJSON<PublicService[]>(
    `/services?category=${cat.id}&city=${encodeURIComponent(city)}&limit=${PAGE_SIZE}&offset=0`,
  );
  const count = services?.length ?? 0;
  const hasServices = count > 0;
  const minPrice = minServicePrice(services ?? []);
  const title = `Jasa ${cat.name} ${city} — Mitra Terverifikasi | Posko Jasa`;
  const description =
    `${count > 0 ? `${count} ` : ''}jasa ${cat.name} di ${city} dari mitra terverifikasi` +
    `${minPrice ? `, harga mulai ${formatRupiah(minPrice)}` : ''}. Pesan online, ulasan asli — Posko Jasa.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE}/jasa/${cat.slug}/${kota}` },
    openGraph: { title, description, url: `${SITE}/jasa/${cat.slug}/${kota}`, type: 'website' },
    // Halaman kota-spesifik tanpa layanan = tipis → noindex agar tak jadi soft-404.
    robots: hasServices ? undefined : { index: false, follow: true },
  };
}

export default async function LocalCategoryPage({ params }: PageProps) {
  const { kategori, kota } = await params;
  const { cat, city } = await resolve(kategori, kota);
  if (!cat || !city) notFound();

  const services = await getJSON<PublicService[]>(
    `/services?category=${cat.id}&city=${encodeURIComponent(city)}&limit=${PAGE_SIZE}&offset=0`,
  );
  const serviceList = services ?? [];
  const minPrice = minServicePrice(serviceList);
  const intro = localIntro(cat.name, city, serviceList.length, minPrice);
  const faq = localFaq(cat.name, city, serviceList.length, minPrice);

  const crumbs = [
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
    <div className="min-h-screen bg-[#f7f5f4] flex flex-col">
      <JsonLd data={breadcrumbSchema} />
      {serviceList.length > 0 && <JsonLd data={itemListSchema} />}
      <JsonLd data={faqJsonLd(faq)} />
      <MobilePageHeader title={`${cat.name} ${city}`} backHref={`/kategori/${cat.slug}`} maxWidthClass="max-w-6xl" />

      <div className="max-w-6xl mx-auto w-full p-4 sm:p-6 md:p-8">
        <nav aria-label="Breadcrumb" className="mb-4 hidden sm:flex items-center gap-1.5 text-[13px] text-[#8f6f6d] flex-wrap">
          {crumbs.map((c, i) => (
            <span key={c.href} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5" />}
              {i < crumbs.length - 1 ? (
                <Link href={c.href} className="hover:text-[#b51822] transition-colors">
                  {c.name}
                </Link>
              ) : (
                <span className="font-semibold text-[#1c1b1b]">{c.name}</span>
              )}
            </span>
          ))}
        </nav>

        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1c1b1b]">
            Jasa {cat.name} di {city}
          </h1>
          <p className="text-[13px] text-[#8f6f6d] flex items-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5" /> Mitra terverifikasi di {city} &amp; sekitarnya
          </p>
        </div>

        {/* Intro unik (anti thin-content) */}
        <p className="text-[14px] leading-relaxed text-[#5b403e] mb-8 max-w-3xl">{intro}</p>

        {serviceList.length === 0 ? (
          <div className="text-center text-[#8f6f6d] py-12">
            <p className="text-[14px]">Belum ada layanan {cat.name} di {city}.</p>
            <Link href={`/kategori/${cat.slug}`} className="inline-block mt-3 text-[13px] font-semibold text-[#b51822] hover:underline">
              Lihat jasa {cat.name} di kota lain →
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-[15px] font-bold text-[#1c1b1b] mb-4">
              {serviceList.length} layanan tersedia
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {serviceList.map((s) => (
                <ServiceProductCard key={s.id} service={s} />
              ))}
            </div>
          </>
        )}

        <FaqSection items={faq} title={`Pertanyaan Umum — Jasa ${cat.name} di ${city}`} />
      </div>
    </div>
  );
}
