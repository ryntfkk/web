import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import HeroCarousel from '@/components/ui/hero-carousel';
import CategorySection from '@/components/home/CategorySection';
import CitySelector from '@/components/home/CitySelector';
import TopPartnersSection from '@/components/home/TopPartnersSection';
import FeaturedServicesSection from '@/components/home/FeaturedServicesSection';
import ProductsSection from '@/components/home/ProductsSection';
import RecentlyViewedSection from '@/components/home/RecentlyViewedSection';
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
        {/* Hero Section - Auto-sliding Carousel */}
        <HeroCarousel />

        {/* Main Content Area - Better mobile padding */}
        <div className="container mx-auto max-w-[1200px] px-3 sm:px-4 sm:px-6 lg:px-6 py-4 sm:py-8 md:py-12 flex-1">
          <CategorySection />
          <div className="flex justify-center mb-4 sm:mb-6">
            <CitySelector />
          </div>
          <RecentlyViewedSection />
          <ProductsSection />
          <TopPartnersSection />
          <FeaturedServicesSection />
        </div>
      </div>
    </HydrationBoundary>
  );
}
