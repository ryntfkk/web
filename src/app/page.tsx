import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import HeroCarousel from '@/components/ui/hero-carousel';
import CategorySection from '@/components/home/CategorySection';
import LocationPicker from '@/components/home/LocationPicker';
import TopPartnersSection from '@/components/home/TopPartnersSection';
import ProductsSection from '@/components/home/ProductsSection';
import AllServicesSection from '@/components/home/AllServicesSection';
import RecentlyViewedSection from '@/components/home/RecentlyViewedSection';
import PopularCitiesSection from '@/components/home/PopularCitiesSection';
import PartnerCtaBanner from '@/components/home/PartnerCtaBanner';
import PartnerRedirectGate from './PartnerRedirectGate';
import JsonLd from '@/components/seo/JsonLd';
import type { Category } from '@/types/category';

const SITE = 'https://poskojasa.com';

// SE6: WebSite + SearchAction → memungkinkan sitelinks searchbox di hasil Google.
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Posko Jasa',
  url: SITE,
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/search?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
};

// SE6: Organization → identitas brand di Knowledge Panel / rich result.
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Posko Jasa',
  url: SITE,
  logo: `${SITE}/logo.png`,
  description: 'Marketplace jasa terpercaya untuk menemukan & memesan jasa profesional di dekat Anda.',
};

// P2/SE2: Home kini Server Component. Hero + kategori dirender di SERVER (masuk
// HTML awal → LCP cepat + kebaca crawler), bukan `return null` sampai hidrasi.
// Section personal (lokasi/localStorage) tetap Client Component: di server mereka
// render skeleton (useQuery tak fetch di server), lalu fetch di klien.
export const revalidate = 300;

const API = 'https://api.poskojasa.com/api/v1';

// Prefetch kategori di server dengan queryKey yang SAMA (['categories']) seperti
// hook useCategories, sehingga CategorySection ter-render berisi data saat SSR
// dan klien hydrate tanpa refetch. Nilai cache = Category[] (data mentah,
// tanpa envelope) agar cocok dengan yang dibaca hook.
async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API}/categories`, {
      headers: { 'X-Platform': 'web', 'X-App-Version': '1.0.0' },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const queryClient = new QueryClient();
  // prefetchQuery menelan error sendiri → tak menggagalkan render halaman.
  await queryClient.prefetchQuery({ queryKey: ['categories'], queryFn: getCategories });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <JsonLd data={websiteSchema} />
      <JsonLd data={organizationSchema} />
      <PartnerRedirectGate />
      <div className="flex flex-col page-h">
        {/* Location Picker - Compact Banner di paling atas (Opsi 1) */}
        <div className="bg-white">
          <div className="container mx-auto max-w-[1200px] px-2 sm:px-4 lg:px-4 pt-2 pb-0 sm:pt-3 sm:pb-0 lg:pt-6 lg:pb-0">
            <LocationPicker />
          </div>
        </div>

        {/* Main Content Area - Better mobile padding */}
        <div className="container mx-auto max-w-[1200px] px-3 sm:px-4 sm:px-6 lg:px-6 pt-0 pb-4 sm:pt-0 sm:pb-6 lg:py-6 flex-1">
          
          {/* Top Layout: Hero (Left, 70%) & Categories (Right, 30%) on Desktop */}
          <div className="flex flex-col lg:flex-row lg:gap-6 lg:mb-8">
            
            {/* Hero Carousel Wrapper */}
            <div className="w-full lg:w-[70%] xl:w-[72%] -mx-3 sm:-mx-4 md:-mx-6 lg:mx-0 sm:w-auto">
              <HeroCarousel />
            </div>

            {/* Category Section Wrapper */}
            <div className="w-full lg:w-[30%] xl:w-[28%] mt-4 sm:mt-6 lg:mt-0">
              <CategorySection />
            </div>

          </div>

          <RecentlyViewedSection />
          <ProductsSection />
          <PartnerCtaBanner />
          <TopPartnersSection />
          <AllServicesSection />

          {/* Blok teks SEO . ditaruh di bawah agar tidak mengganggu hero/nav.
              sr-only di mobile (tak memakan tempat), tampil normal di desktop.
              Ini pemegang <h1> halaman, jadi teksnya wajib memuat kata kunci
              utama . tetapi tampilannya dibuat tenang: tanpa kotak abu-abu,
              cukup garis pemisah + prosa dua kolom. */}
          <section className="mt-12 mb-8 border-t border-brand-gray-100 pt-8 sr-only md:not-sr-only">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-red mb-2">
              Tentang Posko Jasa
            </p>
            <h1 className="text-[20px] lg:text-[24px] font-semibold leading-[1.35] text-brand-gray-900 max-w-2xl mb-4">
              Marketplace jasa terpercaya untuk memesan jasa profesional di dekat Anda
            </h1>
            <div className="lg:columns-2 lg:gap-10 max-w-4xl">
              <p className="text-[14px] leading-[1.8] text-brand-gray-700 mb-4 break-inside-avoid">
                Posko Jasa menghubungkan Anda dengan penyedia jasa profesional yang sudah
                terverifikasi: mulai dari kebersihan rumah, perbaikan elektronik, tukang
                bangunan, hingga layanan kecantikan dan otomotif. Harga tampil di awal,
                jadwal Anda yang tentukan, dan pembayaran ditahan sampai pekerjaan beres.
              </p>
              <p className="text-[14px] leading-[1.8] text-brand-gray-700 break-inside-avoid">
                Setiap mitra melewati kurasi identitas dan dokumen sebelum bisa menerima
                pesanan, lalu dinilai langsung oleh pelanggan sesudahnya. Cari yang terdekat
                dari lokasi Anda, bandingkan rating dan ulasannya, lalu pesan dalam hitungan
                menit.
              </p>
            </div>
          </section>

          {/* Layanan populer per kota . sengaja paling bawah (jangkar SEO lokal,
              bukan section belanja utama). */}
          <PopularCitiesSection />
        </div>
      </div>
    </HydrationBoundary>
  );
}
