import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { ServiceProductCard } from '@/components/ui/service-product-card';
import JsonLd from '@/components/seo/JsonLd';
import FaqSection from '@/components/seo/FaqSection';
import { API_URL } from '@/lib/api';
import { slugify } from '@/lib/slug';
import { categoryFaq, categoryIntro, faqJsonLd, formatRupiah, minServicePrice } from '@/lib/seo';
import type { PublicService } from '@/hooks/usePublicServices';
import type { Category } from '@/types/category';

interface PageProps {
  params: Promise<{ slug: string }>;
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

async function getCategory(slug: string): Promise<Category | null> {
  return getJSON<Category>(`/categories/slug/${encodeURIComponent(slug)}`);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCategory(slug);
  if (!cat) {
    return { title: 'Kategori tidak ditemukan', robots: { index: false, follow: false } };
  }
  // Deskripsi dinamis (jumlah + harga mulai) → snippet unik per kategori.
  const services = await getJSON<PublicService[]>(`/services?category=${cat.id}&limit=${PAGE_SIZE}&offset=0`);
  const count = services?.length ?? 0;
  const minPrice = minServicePrice(services ?? []);
  const title = `Jasa ${cat.name} — Mitra Terverifikasi | Posko Jasa`;
  const description =
    `Bandingkan ${count > 0 ? `${count} ` : ''}layanan ${cat.name} dari mitra terverifikasi di Posko Jasa` +
    `${minPrice ? `, harga mulai ${formatRupiah(minPrice)}` : ''}. Ulasan asli, pesan online.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE}/kategori/${cat.slug}` },
    openGraph: { title, description, url: `${SITE}/kategori/${cat.slug}`, type: 'website' },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const cat = await getCategory(slug);
  if (!cat) notFound();

  const isMain = !cat.parent_id;

  // Layanan kategori ini (filter hierarki: kategori utama sertakan sub).
  // + subkategori (bila utama) / induk (bila sub, untuk breadcrumb).
  const [services, subs, parent] = await Promise.all([
    getJSON<PublicService[]>(`/services?category=${cat.id}&limit=${PAGE_SIZE}&offset=0`),
    isMain ? getJSON<Category[]>(`/categories/${cat.id}/subcategories`) : Promise.resolve(null),
    cat.parent_id ? getJSON<Category>(`/categories/${cat.parent_id}`) : Promise.resolve(null),
  ]);

  const serviceList = services ?? [];
  const subList = subs ?? [];

  // Kota yang punya layanan kategori ini → tautan internal /jasa/[slug]/[kota]
  // (bantu Google menemukan landing lokal + navigasi pelanggan).
  const cities = Array.from(
    new Set(serviceList.map((s) => s.partner_city).filter((c): c is string => !!c)),
  ).slice(0, 12);

  // Konten unik (anti thin-content) + FAQ ber-data.
  const minPrice = minServicePrice(serviceList);
  const intro = categoryIntro(cat.name, serviceList.length, minPrice);
  const faq = categoryFaq(cat.name, minPrice);

  // Breadcrumb: Beranda › [induk bila sub] › kategori.
  const crumbs: { name: string; href: string }[] = [{ name: 'Beranda', href: '/' }];
  if (parent?.slug) crumbs.push({ name: parent.name, href: `/kategori/${parent.slug}` });
  crumbs.push({ name: cat.name, href: `/kategori/${cat.slug}` });

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
    name: `Jasa ${cat.name}`,
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
      <MobilePageHeader title={cat.name} backHref={parent?.slug ? `/kategori/${parent.slug}` : '/categories'} maxWidthClass="max-w-6xl" />

      <div className="max-w-6xl mx-auto w-full p-4 sm:p-6 md:p-8">
        {/* Breadcrumb (terlihat) */}
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

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 relative rounded-xl overflow-hidden bg-[#fcf9f8] border border-[#e5e2e1] shrink-0">
            <Image src={cat.icon_url || '/icons/default.svg'} alt={cat.name} fill className="object-cover" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1c1b1b]">Jasa {cat.name}</h1>
            <p className="text-[13px] text-[#8f6f6d]">Mitra terverifikasi &middot; pesan online</p>
          </div>
        </div>

        {/* Intro unik (anti thin-content) */}
        <p className="text-[14px] leading-relaxed text-[#5b403e] mb-8 max-w-3xl">{intro}</p>

        {/* Subkategori (bila kategori utama) */}
        {isMain && subList.length > 0 && (
          <div className="mb-8">
            <h2 className="text-[15px] font-bold text-[#1c1b1b] mb-3">Subkategori</h2>
            <div className="flex flex-wrap gap-2">
              {subList.map((sub) => (
                <Link
                  key={sub.id}
                  href={sub.slug ? `/kategori/${sub.slug}` : `/search?q=${encodeURIComponent(sub.name)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-[#e5e2e1] text-[13px] font-medium text-[#1c1b1b] hover:border-[#b51822] hover:text-[#b51822] transition-colors"
                >
                  {sub.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tersedia di kota (tautan internal ke landing lokal) */}
        {cities.length > 0 && (
          <div className="mb-8">
            <h2 className="text-[15px] font-bold text-[#1c1b1b] mb-3">
              Jasa {cat.name} per kota
            </h2>
            <div className="flex flex-wrap gap-2">
              {cities.map((city) => (
                <Link
                  key={city}
                  href={`/jasa/${cat.slug}/${slugify(city)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-[#e5e2e1] text-[13px] font-medium text-[#1c1b1b] hover:border-[#b51822] hover:text-[#b51822] transition-colors"
                >
                  {cat.name} {city}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Daftar layanan */}
        <h2 className="text-[15px] font-bold text-[#1c1b1b] mb-4">
          Layanan {cat.name} {serviceList.length > 0 && <span className="font-normal text-[#8f6f6d]">({serviceList.length})</span>}
        </h2>
        {serviceList.length === 0 ? (
          <div className="text-center text-[#8f6f6d] py-12">
            <p className="text-[14px]">Belum ada layanan di kategori ini.</p>
            {isMain && subList.length > 0 && (
              <p className="text-[13px] mt-1">Coba jelajahi subkategori di atas.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {serviceList.map((s) => (
              <ServiceProductCard key={s.id} service={s} />
            ))}
          </div>
        )}

        <FaqSection items={faq} title={`Pertanyaan Umum — Jasa ${cat.name}`} />
      </div>
    </div>
  );
}
