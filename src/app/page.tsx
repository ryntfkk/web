import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import HeroCarousel from '@/components/ui/hero-carousel';
import CategorySection from '@/components/home/CategorySection';
import LocationPicker from '@/components/home/LocationPicker';
import TopPartnersSection from '@/components/home/TopPartnersSection';
import FeaturedServicesSection from '@/components/home/FeaturedServicesSection';
import ProductsSection from '@/components/home/ProductsSection';
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
  description: 'Marketplace jasa terpercaya — temukan & pesan jasa profesional di dekat Anda.',
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
          <div className="container mx-auto max-w-[1200px] px-2 sm:px-4 lg:px-4 pt-2 pb-2 sm:pt-3 sm:pb-3 lg:pt-6 lg:pb-0">
            <LocationPicker />
          </div>
        </div>

        {/* Hero Section - Auto-sliding Carousel */}
        <HeroCarousel />

          {/* Main Content Area - Better mobile padding */}
        <div className="container mx-auto max-w-[1200px] px-3 sm:px-4 sm:px-6 lg:px-6 py-4 sm:py-6 flex-1">
          <CategorySection />
          <RecentlyViewedSection />
          <ProductsSection />
          <TopPartnersSection />
          <PartnerCtaBanner />
          <FeaturedServicesSection />
          <PopularCitiesSection />

          {/* Blok Teks SEO - Diletakkan di bawah agar tidak mengganggu hero/nav. 
              Gunakan sr-only pada mobile agar tidak memakan tempat, 
              dan kembalikan tampilan normal pada desktop (md:not-sr-only). */}
          <div className="mt-12 mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100 sr-only md:not-sr-only">
            <h1 className="text-xl font-bold text-gray-900 mb-3">
              Marketplace Jasa Terpercaya — Pesan Jasa Profesional di Dekat Anda
            </h1>
            <p className="text-gray-600 text-sm leading-relaxed mb-3">
              Posko Jasa adalah platform marketplace terdepan yang menghubungkan Anda dengan penyedia jasa profesional dan terverifikasi. Kami menyediakan berbagai layanan mulai dari kebersihan rumah, perbaikan elektronik, tukang bangunan, hingga layanan kecantikan dan otomotif. Dengan proses pemesanan yang mudah, transparan, dan aman, Anda bisa menyelesaikan segala kebutuhan harian tanpa ribet.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              Temukan mitra ahli terbaik di sekitar lokasi Anda. Semua mitra kami telah melalui proses kurasi ketat untuk memastikan kualitas pengerjaan dan kepuasan pelanggan. Nikmati kemudahan bertransaksi langsung dari perangkat Anda dan percayakan urusan Anda pada ahlinya bersama Posko Jasa.
            </p>
          </div>
        </div>
      </div>
    </HydrationBoundary>
  );
}
