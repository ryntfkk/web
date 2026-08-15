import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import MobilePageHeader from '@/components/layout/MobilePageHeader';
import { ServiceProductCard } from '@/components/ui/service-product-card';
import JsonLd from '@/components/seo/JsonLd';
import FaqSection from '@/components/seo/FaqSection';
import { AsideCard, Breadcrumbs, ChipLinks, TrustBox, type Crumb } from '@/components/seo/listing-parts';
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

/**
 * Ambil PAGE_SIZE+1 layanan: kelebihan satu baris dipakai HANYA untuk tahu masih
 * ada sisa, tidak dirender. Tanpa ini judul & meta description menyebut angka
 * pasti ("24 layanan") padahal itu cuma batas halaman . klaim yang salah di SERP.
 */
async function getServices(categoryId: string) {
  const rows = (await getJSON<PublicService[]>(`/services?category=${categoryId}&limit=${PAGE_SIZE + 1}&offset=0`)) ?? [];
  return { list: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

/** "24+" bila daftar masih terpotong batas halaman. */
function countLabel(count: number, hasMore: boolean) {
  return hasMore ? `${count}+` : `${count}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCategory(slug);
  if (!cat) {
    return { title: 'Kategori tidak ditemukan', robots: { index: false, follow: false } };
  }
  const [{ list, hasMore }, subs] = await Promise.all([
    getServices(cat.id),
    cat.parent_id ? Promise.resolve(null) : getJSON<Category[]>(`/categories/${cat.id}/subcategories`),
  ]);
  const count = list.length;
  const minPrice = minServicePrice(list);
  // Judul TANPA "| Posko Jasa": template di root layout sudah menambahkannya.
  // Sebelumnya ganda ("... | Posko Jasa | Posko Jasa") dan judul terpotong di SERP.
  // "Mitra Terverifikasi" DIHAPUS dari title/description (model mitra instan):
  // listing kini bisa memuat mitra belum-KYC, dan klaim itu jadi bohong di SERP.
  // Badge per-mitra di kartu yang bicara jujur.
  const title = `Jasa ${cat.name} - Panggil ke Lokasi`;
  const description =
    `Bandingkan ${count > 0 ? `${countLabel(count, hasMore)} ` : ''}layanan ${cat.name} di Posko Jasa` +
    `${minPrice ? `, harga mulai ${formatRupiah(minPrice)}` : ''}. Ulasan asli, pesan online.`;
  // Kategori tanpa layanan DAN tanpa subkategori = halaman tipis → noindex agar
  // tidak dinilai soft-404 (sejalan dengan aturan di /jasa/[kategori]/[kota]).
  const isThin = count === 0 && (subs?.length ?? 0) === 0;
  return {
    title,
    description,
    alternates: { canonical: `${SITE}/kategori/${cat.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE}/kategori/${cat.slug}`,
      type: 'website',
      // Wajib disebut ulang: openGraph anak MENGGANTI milik root (bukan merge),
      // jadi tanpa baris ini halaman kategori di-share tanpa gambar sama sekali.
      images: ['/og-default.png'],
    },
    robots: isThin ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const cat = await getCategory(slug);
  if (!cat) notFound();

  const isMain = !cat.parent_id;

  // Layanan kategori ini (filter hierarki: kategori utama sertakan sub).
  // + subkategori (bila utama) / induk (bila sub, untuk breadcrumb).
  const [{ list: serviceList, hasMore }, subs, parent] = await Promise.all([
    getServices(cat.id),
    isMain ? getJSON<Category[]>(`/categories/${cat.id}/subcategories`) : Promise.resolve(null),
    cat.parent_id ? getJSON<Category>(`/categories/${cat.parent_id}`) : Promise.resolve(null),
  ]);

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
  const crumbs: Crumb[] = [{ name: 'Beranda', href: '/' }];
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
    <div className="min-h-screen bg-brand-gray-60 flex flex-col">
      <JsonLd data={breadcrumbSchema} />
      {serviceList.length > 0 && <JsonLd data={itemListSchema} />}
      <JsonLd data={faqJsonLd(faq)} />
      {/* titleAs="p": H1 halaman ada di bawah . header ini hanya navigasi. */}
      <MobilePageHeader
        title={cat.name}
        titleAs="p"
        backHref={parent?.slug ? `/kategori/${parent.slug}` : '/categories'}
        maxWidthClass="max-w-[1200px]"
        gutterClass="px-3 sm:px-4 lg:px-6"
      />

      <div className="container mx-auto max-w-[1200px] w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-5 lg:py-6">
        <Breadcrumbs crumbs={crumbs} />

        {/* Judul halaman . dirapatkan di mobile, tetap lega di desktop. */}
        <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-5">
          <div className="w-10 h-10 sm:w-12 sm:h-12 relative rounded-xl overflow-hidden bg-brand-gray-50 border border-brand-gray-100 shrink-0">
            <Image src={cat.icon_url || '/icons/default.svg'} alt={cat.name} fill className="object-cover" sizes="48px" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[17px] sm:text-2xl font-bold text-brand-gray-900 leading-tight">Jasa {cat.name}</h1>
            <p className="text-[12px] sm:text-[13px] text-brand-gray-400">Mitra terverifikasi &middot; pesan online</p>
          </div>
        </div>

        {/* Subkategori: navigasi utama, tetap di atas. Satu baris menggulir di
            mobile agar kartu layanan tidak terdorong jauh ke bawah. */}
        {isMain && subList.length > 0 && (
          <div className="mb-4 sm:mb-5">
            <ChipLinks
              scrollOnMobile
              items={subList.map((sub) => ({
                label: sub.name,
                href: sub.slug ? `/kategori/${sub.slug}` : `/search?q=${encodeURIComponent(sub.name)}`,
              }))}
            />
          </div>
        )}

        {/* Desktop: dua kolom. Kolom samping mengisi ruang kosong yang dulu
            menganga saat kategori hanya punya sedikit layanan, sekaligus
            menampung tautan internal. Mobile: menumpuk di bawah daftar. */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_296px] lg:gap-6 lg:items-start">
          <div className="min-w-0">
            <h2 className="text-[14px] sm:text-[15px] font-bold text-brand-gray-900 mb-2.5 sm:mb-3">
              Layanan {cat.name}
              {serviceList.length > 0 && (
                <span className="font-normal text-brand-gray-400"> ({countLabel(serviceList.length, hasMore)})</span>
              )}
            </h2>
            {serviceList.length === 0 ? (
              <div className="rounded-xl border border-brand-gray-100 bg-white py-10 text-center text-brand-gray-400">
                <p className="text-[14px]">Belum ada layanan di kategori ini.</p>
                {isMain && subList.length > 0 && (
                  <p className="text-[13px] mt-1">Coba jelajahi subkategori di atas.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
                {serviceList.map((s) => (
                  <ServiceProductCard key={s.id} service={s} />
                ))}
              </div>
            )}
          </div>

          <aside className="mt-5 lg:mt-0 lg:sticky lg:top-4 space-y-3 sm:space-y-4">
            {/* Intro unik (anti thin-content) . di desktop mengisi kolom samping,
                di mobile turun ke bawah daftar supaya kartu tampil lebih dulu. */}
            <AsideCard title={`Tentang jasa ${cat.name}`}>
              <p className="text-[12.5px] sm:text-[13px] leading-relaxed text-brand-gray-700">{intro}</p>
            </AsideCard>

            {cities.length > 0 && (
              <AsideCard title={`Jasa ${cat.name} per kota`}>
                <ChipLinks
                  items={cities.map((city) => ({
                    label: city,
                    href: `/jasa/${cat.slug}/${slugify(city)}`,
                  }))}
                />
              </AsideCard>
            )}

            <TrustBox />

            <AsideCard>
              <Link href="/categories" className="text-[13px] font-semibold text-brand-red hover:underline">
                Lihat semua kategori jasa →
              </Link>
            </AsideCard>
          </aside>
        </div>

        <FaqSection items={faq} title={`Pertanyaan Umum - Jasa ${cat.name}`} />
      </div>
    </div>
  );
}
